import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData, emailQueue } from './emailQueue';
import { redisConnectionOptions, redisClient } from '../config/redis';
import { prisma } from '../config/prisma';
import { sendEmail } from '../services/mailer';
import { sendSlackRateLimitAlert } from '../services/slack';
import { esClient, EMAILS_INDEX } from '../config/elasticsearch';

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const minSendDelayMs = parseInt(process.env.MIN_SEND_DELAY_MS || '2000', 10); // Minimum 2s throttling delay

export function getHourBucketKey(senderOrUserId: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const sanitized = senderOrUserId.replace(/[^a-zA-Z0-9_@.-]/g, '_');
  return `ratelimit:${sanitized}:${year}${month}${day}${hour}`;
}

export function getStartOfNextHourMs(): number {
  const now = new Date();
  const nextHour = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours() + 1,
    0,
    0,
    0
  ));
  return nextHour.getTime();
}

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const {
      scheduledEmailId,
      campaignId,
      userId,
      senderEmail,
      recipientEmail,
      subject,
      body,
      hourlyLimit,
      delaySeconds = 2,
      indexInBatch = 0,
    } = job.data;

    console.log(`[Worker Processing] Processing job ${job.id} for recipient: ${recipientEmail}`);

    const record = await prisma.scheduledEmail.findUnique({
      where: { id: scheduledEmailId },
      include: { user: true, campaign: true },
    });

    if (!record) {
      console.warn(`[Worker Warning] Scheduled email record ${scheduledEmailId} not found in database.`);
      return;
    }

    // Idempotency: skip if already sent
    if (record.status === 'SENT') {
      console.log(`[Worker Skip] Email ${scheduledEmailId} is already marked SENT.`);
      return;
    }

    // Rate Limiting Key: senderEmail if present, otherwise userId
    const rateLimitIdentifier = senderEmail || record.senderEmail || record.campaign?.senderEmail || userId;
    const effectiveHourlyLimit = Number(hourlyLimit) || parseInt(process.env.MAX_EMAILS_PER_HOUR || '50', 10);
    const bucketKey = getHourBucketKey(rateLimitIdentifier);

    // 1. Atomic Rate Limiting Check using Redis INCR
    const currentCount = await redisClient.incr(bucketKey);
    if (currentCount === 1) {
      await redisClient.expire(bucketKey, 7200); // 2 hours TTL
    }

    if (currentCount > effectiveHourlyLimit) {
      // HOURLY RATE LIMIT REACHED!
      const nextHourStartMs = getStartOfNextHourMs();
      // Preserve stagger ordering when shifting to the next hour window
      const staggerOffsetMs = (indexInBatch % 100) * (delaySeconds * 1000);
      const targetRescheduledMs = nextHourStartMs + staggerOffsetMs;
      const delayMs = Math.max(1000, targetRescheduledMs - Date.now());
      const nextHourFormatted = new Date(targetRescheduledMs).toISOString();

      console.warn(
        `[Rate Limit Breached] Identifier ${rateLimitIdentifier} reached hourly limit (${effectiveHourlyLimit}). Count: ${currentCount}. Rescheduling job ${job.id} to ${nextHourFormatted} (delay ${delayMs}ms)`
      );

      const updatedRecord = await prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: {
          status: 'DELAYED_RATE_LIMIT',
          rescheduledCount: { increment: 1 },
          scheduledAt: new Date(targetRescheduledMs),
        },
      });

      try {
        await esClient.update({
          index: EMAILS_INDEX,
          id: scheduledEmailId,
          doc: {
            status: 'DELAYED_RATE_LIMIT',
            scheduledAt: new Date(targetRescheduledMs),
          },
        }).catch(() => {});
      } catch (esErr) {}

      // Dispatch live Slack alert exactly the moment the limit is breached (currentCount === limit + 1)
      if (record.user.slackWebhookUrl && currentCount === effectiveHourlyLimit + 1) {
        console.log(`[Slack Dispatch] Sending rate limit alert to connected Slack webhook for user ${record.user.email}...`);
        sendSlackRateLimitAlert({
          webhookUrl: record.user.slackWebhookUrl,
          userName: record.user.name,
          userEmail: record.user.email,
          campaignTitle: record.campaign.title,
          hourlyLimit: effectiveHourlyLimit,
          currentCount,
          recipientEmail,
          rescheduledTime: nextHourFormatted,
        }).catch((err) => console.error('[Slack Async Error]', err));
      }

      // Re-enqueue delayed job into BullMQ for the next available hour window
      await emailQueue.add(
        'send-email',
        {
          ...job.data,
          hourlyLimit: effectiveHourlyLimit,
        },
        {
          delay: delayMs,
          jobId: `rescheduled_${scheduledEmailId}_${updatedRecord.rescheduledCount}`,
        }
      );

      return;
    }

    // 2. Provider Throttling: Enforce minimum delay between individual email sends
    if (minSendDelayMs > 0) {
      console.log(`[Worker Throttle] Pausing ${minSendDelayMs}ms to mimic provider throttling...`);
      await new Promise((resolve) => setTimeout(resolve, minSendDelayMs));
    }

    // 3. Mark status as SENDING
    await prisma.scheduledEmail.update({
      where: { id: scheduledEmailId },
      data: { status: 'SENDING' },
    });

    // 4. Send Email via Ethereal SMTP
    try {
      const emailResult = await sendEmail({
        to: recipientEmail,
        senderEmail: senderEmail || record.senderEmail || record.campaign?.senderEmail || record.user.email,
        senderName: record.user.name,
        subject,
        body,
      });

      const sentTime = new Date();

      // 5. Update DB to SENT with preview URL
      const sentEmail = await prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: {
          status: 'SENT',
          sentAt: sentTime,
          etherealPreviewUrl: emailResult.previewUrl || null,
        },
      });

      try {
        await esClient.index({
          index: EMAILS_INDEX,
          id: scheduledEmailId,
          document: {
            id: sentEmail.id,
            campaignId: sentEmail.campaignId,
            userId: sentEmail.userId,
            senderEmail: sentEmail.senderEmail,
            recipientEmail: sentEmail.recipientEmail,
            subject,
            body,
            status: 'SENT',
            scheduledAt: sentEmail.scheduledAt,
            sentAt: sentTime,
            etherealPreviewUrl: sentEmail.etherealPreviewUrl,
            createdAt: sentEmail.createdAt,
          },
        });
      } catch (esErr: any) {}

      console.log(`[Worker Success] Email ${scheduledEmailId} successfully sent to ${recipientEmail}`);
    } catch (sendError: any) {
      console.error(`[Worker Failure] Failed to send email to ${recipientEmail}:`, sendError.message);

      await prisma.scheduledEmail.update({
        where: { id: scheduledEmailId },
        data: {
          status: 'FAILED',
          errorMessage: sendError.message || 'SMTP sending error',
        },
      });

      throw sendError;
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency,
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[Worker Job Completed] Job ID: ${job.id}`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker Job Failed] Job ID: ${job?.id}, Error: ${err.message}`);
});

console.log(
  `[BullMQ Worker] Worker initialized with concurrency=${concurrency}, minThrottleDelay=${minSendDelayMs}ms on Redis port ${redisConnectionOptions.port}`
);
