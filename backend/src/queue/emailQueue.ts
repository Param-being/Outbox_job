import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-queue';

export interface EmailJobData {
  scheduledEmailId: string;
  campaignId: string;
  userId: string;
  senderEmail?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  delaySeconds?: number;
  indexInBatch?: number;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export async function syncPendingJobsOnStartup(prismaClient: any) {
  try {
    const pendingEmails = await prismaClient.scheduledEmail.findMany({
      where: {
        status: { in: ['SCHEDULED', 'DELAYED_RATE_LIMIT'] },
      },
      include: { campaign: true },
    });

    if (pendingEmails.length === 0) return;

    console.log(`[Queue Sync] Verifying ${pendingEmails.length} pending scheduled email jobs in BullMQ...`);
    const nowMs = Date.now();

    for (let i = 0; i < pendingEmails.length; i++) {
      const email = pendingEmails[i];
      const targetTimeMs = email.scheduledAt.getTime();
      const delayMs = Math.max(0, targetTimeMs - nowMs);
      const isRescheduled = email.rescheduledCount > 0;
      const jobId = isRescheduled
        ? `rescheduled_${email.id}_${email.rescheduledCount}`
        : `email_${email.id}`;

      try {
        await emailQueue.add(
          'send-email',
          {
            scheduledEmailId: email.id,
            campaignId: email.campaignId,
            userId: email.userId,
            senderEmail: email.senderEmail || email.campaign?.senderEmail,
            recipientEmail: email.recipientEmail,
            subject: email.campaign?.subject || 'Scheduled Campaign',
            body: email.campaign?.body || '',
            hourlyLimit: email.campaign?.hourlyLimit || 50,
            delaySeconds: email.campaign?.delaySeconds || 2,
            indexInBatch: i,
          },
          {
            delay: delayMs,
            jobId, // Deterministic jobId ensures idempotency if already present
          }
        );
      } catch (addErr) {}
    }
    console.log(`[Queue Sync] Completed startup job sync for ${pendingEmails.length} pending emails.`);
  } catch (err: any) {
    console.warn('[Queue Sync Warning] Failed to sync pending jobs on startup:', err.message);
  }
}

console.log(`[BullMQ Queue] Initialized queue '${EMAIL_QUEUE_NAME}' on port ${redisConnectionOptions.port}`);
