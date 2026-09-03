export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  slackWebhookUrl?: string;
}

export type EmailStatus = 'SCHEDULED' | 'DELAYED_RATE_LIMIT' | 'SENDING' | 'SENT' | 'FAILED';

export interface Campaign {
  id: string;
  userId: string;
  senderEmail?: string;
  title: string;
  subject: string;
  body: string;
  delaySeconds: number;
  hourlyLimit: number;
  startTime: string;
  totalLeads: number;
  status: string;
}

export interface ScheduledEmail {
  id: string;
  campaignId: string;
  userId: string;
  senderEmail?: string;
  recipientEmail: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  rescheduledCount: number;
  etherealPreviewUrl?: string | null;
  errorMessage?: string | null;
  campaign?: Campaign;
  subject?: string;
  body?: string;
}

export interface ScheduleCampaignPayload {
  title: string;
  senderEmail?: string;
  subject: string;
  body: string;
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
  leads: string[];
}
