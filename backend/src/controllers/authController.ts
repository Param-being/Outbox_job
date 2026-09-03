import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';

const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
const client = googleClientId ? new OAuth2Client(googleClientId) : null;

export async function googleLogin(req: Request, res: Response) {
  try {
    const { token, mockUser } = req.body;

    let googleId = '';
    let email = '';
    let name = '';
    let avatar = '';

    if (token && client && token !== 'mock_token') {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: 'Invalid Google OAuth Token' });
      }
      googleId = payload.sub;
      email = payload.email;
      name = payload.name || payload.email.split('@')[0];
      avatar = payload.picture || '';
    } else if (mockUser) {
      // Local dev testing mode fallback
      email = mockUser.email || 'demo.user@reachinbox.ai';
      name = mockUser.name || 'ReachInbox Demo User';
      avatar = mockUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256';
      googleId = `mock_${email}`;
    } else {
      return res.status(400).json({ error: 'Missing OAuth token or credentials' });
    }

    // Upsert User in PostgreSQL
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name,
          avatar,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name, avatar, googleId: googleId || user.googleId },
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        slackWebhookUrl: user.slackWebhookUrl,
      },
    });
  } catch (error: any) {
    console.error('[Google Login Error]:', error.message || error);
    return res.status(500).json({ error: 'Authentication failed: ' + (error.message || 'Unknown error') });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
