import axios from 'axios';

export interface SlackAlertPayload {
  webhookUrl: string;
  userName: string;
  userEmail: string;
  campaignTitle: string;
  hourlyLimit: number;
  currentCount: number;
  recipientEmail: string;
  rescheduledTime: string;
}

export async function sendSlackRateLimitAlert(payload: SlackAlertPayload): Promise<boolean> {
  if (!payload.webhookUrl || payload.webhookUrl.trim() === '') {
    return false;
  }

  const slackMessage = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ ReachInbox Hourly Rate Limit Capacity Reached',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*User:* ${payload.userName} (${payload.userEmail})`,
          },
          {
            type: 'mrkdwn',
            text: `*Campaign:* ${payload.campaignTitle}`,
          },
          {
            type: 'mrkdwn',
            text: `*Hourly Limit:* ${payload.hourlyLimit} emails/hr`,
          },
          {
            type: 'mrkdwn',
            text: `*Current Hour Count:* ${payload.currentCount}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Job Status:* Safe Rescheduling Activated!\nEmail to \`${payload.recipientEmail}\` has been safely delayed to the next hourly window (*${payload.rescheduledTime}*). No emails dropped.`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `ReachInbox Scheduler | ${new Date().toISOString()}`,
          },
        ],
      },
    ],
  };

  try {
    await axios.post(payload.webhookUrl, slackMessage, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    console.log(`[Slack Integration] Live alert sent successfully to webhook.`);
    return true;
  } catch (error: any) {
    // Ensure worker does NOT crash if Slack is disconnected or errors out
    console.error(`[Slack Integration Warning] Failed to send Slack alert: ${error.message || error}`);
    return false;
  }
}
