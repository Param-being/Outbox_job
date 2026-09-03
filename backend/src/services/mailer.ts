import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

let transporter: nodemailer.Transporter | null = null;

export async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  try {
    const etherealUser = process.env.ETHEREAL_USER;
    const etherealPass = process.env.ETHEREAL_PASS;

    if (etherealUser && etherealPass) {
      console.log('[Ethereal SMTP] Using configured Ethereal credentials from environment:', etherealUser);
      transporter = nodemailer.createTransport({
        host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.ETHEREAL_PORT || '587', 10),
        secure: false,
        auth: {
          user: etherealUser,
          pass: etherealPass,
        },
      });
    } else {
      // Auto-generate test SMTP service account from ethereal.email
      const testAccount = await nodemailer.createTestAccount();
      console.log('[Ethereal SMTP] Auto-created temporary test account:', testAccount.user);

      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    return transporter;
  } catch (err: any) {
    console.error('[Ethereal SMTP Error] Failed to initialize transporter:', err.message);
    throw err;
  }
}

export interface SendEmailPayload {
  to: string;
  senderEmail?: string;
  senderName?: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail({
  to,
  senderEmail,
  senderName,
  subject,
  body,
}: SendEmailPayload): Promise<SendEmailResult> {
  const mailTransporter = await getTransporter();

  // Allow explicit testing of failed emails (e.g. fail@example.com or bounce@test.com)
  if (
    to.toLowerCase().includes('fail') ||
    to.toLowerCase().includes('bounce') ||
    to.toLowerCase().includes('invalid')
  ) {
    throw new Error(
      `SMTP Mail Delivery Failed: 550 5.1.1 Recipient mailbox unavailable or rejected (${to})`
    );
  }

  const fromAddress = senderEmail
    ? `"${senderName || 'ReachInbox Scheduler'}" <${senderEmail}>`
    : '"ReachInbox Scheduler" <scheduler@reachinbox.ai>';

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text: body,
    html: body.includes('<') && body.includes('>')
      ? body
      : `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111827; white-space: pre-wrap;">${body}</div>`,
  };

  const info = await mailTransporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(`[Ethereal SMTP] Email sent to ${to} from ${fromAddress}. MessageId: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[Ethereal SMTP] Live Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || false,
  };
}
