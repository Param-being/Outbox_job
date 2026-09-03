import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSlackRateLimitAlert } from '../services/slack';

export async function updateSlackWebhook(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const webhook = req.body.slackWebhookUrl || req.body.webhookUrl;

    if (!userId) {
      return res.status(401).json({ error: 'User ID header missing' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { slackWebhookUrl: webhook || null },
    });

    return res.json({
      success: true,
      message: 'Slack webhook configuration saved',
      slackWebhookUrl: user.slackWebhookUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update Slack webhook' });
  }
}

export async function testSlackWebhook(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'User ID header missing' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.slackWebhookUrl) {
      return res.status(400).json({ error: 'No Slack Webhook URL configured for this user' });
    }

    const success = await sendSlackRateLimitAlert({
      webhookUrl: user.slackWebhookUrl,
      userName: user.name,
      userEmail: user.email,
      campaignTitle: 'Test Campaign Notification',
      hourlyLimit: 50,
      currentCount: 50,
      recipientEmail: 'test.lead@reachinbox.ai',
      rescheduledTime: new Date(Date.now() + 3600000).toISOString(),
    });

    if (success) {
      return res.json({ success: true, message: 'Test message sent to Slack successfully!' });
    } else {
      return res.status(500).json({ error: 'Failed to send test message to Slack webhook. Check webhook URL.' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
export async function getSlackOAuthUrl(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/slack/oauth/callback`;
    const scopes = 'incoming-webhook,chat:write';

    if (!clientId) {
      return res.status(400).json({
        error: 'SLACK_CLIENT_ID not configured in backend environment. You can use Incoming Webhook URL directly.',
      });
    }

    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
    const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}`;

    return res.json({ success: true, oauthUrl });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function slackOAuthCallback(req: Request, res: Response) {
  try {
    const { code, state } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (!code || !state) {
      return res.redirect(`${frontendUrl}?slack_error=missing_code`);
    }

    let parsedState: any = {};
    try {
      parsedState = JSON.parse(Buffer.from(state as string, 'base64').toString('ascii'));
    } catch {}

    const userId = parsedState.userId;
    if (!userId) {
      return res.redirect(`${frontendUrl}?slack_error=invalid_state`);
    }

    // Exchange code for webhook URL via Slack API
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '',
        client_secret: process.env.SLACK_CLIENT_SECRET || '',
        code: code as string,
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/slack/oauth/callback`,
      }),
    });

    const data = await response.json();
    if (data.ok && data.incoming_webhook && data.incoming_webhook.url) {
      await prisma.user.update({
        where: { id: userId },
        data: { slackWebhookUrl: data.incoming_webhook.url },
      });
      return res.redirect(`${frontendUrl}?slack_connected=true`);
    } else {
      return res.redirect(`${frontendUrl}?slack_error=${encodeURIComponent(data.error || 'oauth_failed')}`);
    }
  } catch (error: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}?slack_error=${encodeURIComponent(error.message)}`);
  }
}
