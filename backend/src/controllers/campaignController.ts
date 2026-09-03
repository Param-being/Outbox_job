import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { emailQueue, EmailJobData } from '../queue/emailQueue';
import { esClient, EMAILS_INDEX } from '../config/elasticsearch';

export async function createCampaign(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const {
      title,
      senderEmail,
      subject,
      body,
      startTime,
      delaySeconds = 2,
      hourlyLimit = 50,
      leads = [],
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required in headers (x-user-id)' });
    }

    if (!title || !subject || !body || !startTime || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        error: 'Missing required campaign fields: title, subject, body, startTime, leads array',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const effectiveSenderEmail = senderEmail?.trim() || user?.email || 'scheduler@reachinbox.ai';

    const parsedStartTimeMs = new Date(startTime).getTime();
    if (isNaN(parsedStartTimeMs)) {
      return res.status(400).json({ error: 'Invalid startTime format' });
    }

    // 1. Create Campaign record in Database
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        senderEmail: effectiveSenderEmail,
        title,
        subject,
        body,
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
        startTime: new Date(parsedStartTimeMs),
        totalLeads: leads.length,
        status: 'SCHEDULED',
      },
    });

    const scheduledEmailRecords = [];
    const nowMs = Date.now();

    // 2. Prepare scheduled email records with staggered scheduling
    for (let i = 0; i < leads.length; i++) {
      const recipientEmail = leads[i].trim();
      if (!recipientEmail) continue;

      // Staggered delay computation based on delaySeconds parameter
      const targetTimeMs = Math.max(parsedStartTimeMs, nowMs) + i * Number(delaySeconds) * 1000;
      const scheduledDate = new Date(targetTimeMs);

      scheduledEmailRecords.push({
        campaignId: campaign.id,
        userId,
        senderEmail: effectiveSenderEmail,
        recipientEmail,
        status: 'SCHEDULED' as const,
        scheduledAt: scheduledDate,
      });
    }

    // 3. Batch insert ScheduledEmail records into Database
    await prisma.scheduledEmail.createMany({
      data: scheduledEmailRecords,
    });

    // Retrieve inserted records to obtain generated IDs for deterministic BullMQ jobIds
    const insertedRecords = await prisma.scheduledEmail.findMany({
      where: { campaignId: campaign.id },
      orderBy: { scheduledAt: 'asc' },
    });

    const queueJobs: { name: string; data: EmailJobData; opts: { delay: number; jobId: string } }[] = [];
    const esDocuments = [];

    // 4. Build BullMQ delayed jobs
    for (let i = 0; i < insertedRecords.length; i++) {
      const record = insertedRecords[i];
      const targetTimeMs = record.scheduledAt.getTime();
      const delayMs = Math.max(0, targetTimeMs - Date.now());

      queueJobs.push({
        name: 'send-email',
        data: {
          scheduledEmailId: record.id,
          campaignId: campaign.id,
          userId,
          senderEmail: effectiveSenderEmail,
          recipientEmail: record.recipientEmail,
          subject,
          body,
          hourlyLimit: Number(hourlyLimit),
          delaySeconds: Number(delaySeconds),
          indexInBatch: i,
        },
        opts: {
          delay: delayMs,
          jobId: `email_${record.id}`, // Idempotent unique job ID across server restarts
        },
      });

      esDocuments.push({
        index: EMAILS_INDEX,
        id: record.id,
        document: {
          id: record.id,
          campaignId: campaign.id,
          userId,
          senderEmail: effectiveSenderEmail,
          recipientEmail: record.recipientEmail,
          subject,
          body,
          status: 'SCHEDULED',
          scheduledAt: record.scheduledAt,
          sentAt: null,
          etherealPreviewUrl: null,
          createdAt: record.createdAt,
        },
      });
    }

    // 5. Enqueue delayed jobs into BullMQ using addBulk for load handling efficiency (1,000+ emails safe)
    await emailQueue.addBulk(queueJobs);

    // 6. Index initial scheduled records in Elasticsearch asynchronously
    Promise.all(
      esDocuments.map((doc) => esClient.index(doc).catch((err) => console.warn('[ES Index Warning]', err.message)))
    ).catch(() => {});

    console.log(
      `[Campaign Scheduled] Campaign '${title}' created by ${effectiveSenderEmail} with ${insertedRecords.length} emails scheduled.`
    );

    return res.status(201).json({
      success: true,
      campaign,
      scheduledCount: insertedRecords.length,
    });
  } catch (error: any) {
    console.error('[Create Campaign Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to create campaign' });
  }
}

export async function getScheduledEmails(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {
      status: { in: ['SCHEDULED', 'DELAYED_RATE_LIMIT', 'SENDING'] },
    };
    if (userId) whereClause.userId = userId;

    const [total, emails] = await Promise.all([
      prisma.scheduledEmail.count({ where: whereClause }),
      prisma.scheduledEmail.findMany({
        where: whereClause,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
        include: { campaign: true },
      }),
    ]);

    return res.json({
      success: true,
      total,
      page,
      limit,
      emails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getSentEmails(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {
      status: { in: ['SENT', 'FAILED'] },
    };
    if (userId) whereClause.userId = userId;

    const [total, emails] = await Promise.all([
      prisma.scheduledEmail.count({ where: whereClause }),
      prisma.scheduledEmail.findMany({
        where: whereClause,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
        include: { campaign: true },
      }),
    ]);

    return res.json({
      success: true,
      total,
      page,
      limit,
      emails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
