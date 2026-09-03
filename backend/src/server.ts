import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { ensureRedisRunning } from './config/redis';
import { emailQueue } from './queue/emailQueue';
import './queue/emailWorker';

import { initElasticsearch } from './config/elasticsearch';
import { googleLogin, getMe } from './controllers/authController';
import { createCampaign, getScheduledEmails, getSentEmails, deleteEmail } from './controllers/campaignController';
import { searchEmails } from './controllers/searchController';
import { updateSlackWebhook, testSlackWebhook, getSlackOAuthUrl, slackOAuthCallback } from './controllers/slackController';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  })
);
app.use(express.json({ limit: '10mb' }));

import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';

// 1. Mount Bull Board UI at /admin/queues for live queue monitoring
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// 2. Mount Swagger OpenAPI Documentation at /docs and /api/docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 3. REST API Routes
app.post('/api/auth/google', googleLogin);
app.get('/api/auth/me', getMe);

app.post('/api/campaigns', createCampaign);
app.get('/api/emails/scheduled', getScheduledEmails);
app.get('/api/emails/sent', getSentEmails);
app.delete('/api/emails/:id', deleteEmail);
app.get('/api/emails/search', searchEmails);
app.get('/api/search', searchEmails);

app.post('/api/slack/webhook', updateSlackWebhook);
app.post('/api/slack/test', testSlackWebhook);
app.get('/api/slack/oauth/url', getSlackOAuthUrl);
app.get('/api/slack/oauth/callback', slackOAuthCallback);

import { prisma } from './config/prisma';
import { syncPendingJobsOnStartup } from './queue/emailQueue';

// Root landing page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>ReachInbox Backend Engine</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; max-width: 540px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
        h1 { font-size: 22px; font-weight: 800; margin: 0 0 8px; color: #fff; }
        p { font-size: 13px; color: #a1a1aa; margin: 0 0 24px; line-height: 1.6; }
        .links { display: flex; flex-direction: column; gap: 10px; }
        .btn { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; border: 1px solid #27272a; }
        .btn-primary { background: #00aa4f; color: #fff; border-color: #00aa4f; }
        .btn-primary:hover { background: #009243; }
        .btn-secondary { background: #27272a; color: #f4f4f5; }
        .btn-secondary:hover { background: #3f3f46; }
        .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #27272a; font-size: 11px; color: #71717a; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge"><div class="dot"></div> Backend Service Online</div>
        <h1>ReachInbox Job Scheduler API</h1>
        <p>Production-grade distributed email job scheduler powered by BullMQ delayed jobs, Redis, PostgreSQL (Prisma), Elasticsearch, and Ethereal SMTP.</p>
        
        <div class="links">
          <a href="http://localhost:3000" class="btn btn-primary" target="_blank">
            <span>🖥️ Open Frontend Dashboard</span>
            <span>&rarr;</span>
          </a>
          <a href="/docs" class="btn btn-secondary" target="_blank">
            <span>📚 Interactive Swagger API Docs</span>
            <span>&rarr;</span>
          </a>
          <a href="/admin/queues" class="btn btn-secondary" target="_blank">
            <span>📊 BullMQ Live Queue Telemetry</span>
            <span>&rarr;</span>
          </a>
          <a href="/api/health" class="btn btn-secondary" target="_blank">
            <span>🩺 Health JSON Check</span>
            <span>&rarr;</span>
          </a>
        </div>

        <div class="footer">
          Node.js • Express • TypeScript • BullMQ • Redis • Port ${port}
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    bullBoardUrl: `http://localhost:${port}/admin/queues`,
  });
});

// Process-level safety guards
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]:', reason);
});

const server = app.listen(Number(port), '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 ReachInbox Backend API listening on 0.0.0.0:${port}`);
  console.log(`📊 Live BullMQ Board UI: http://localhost:${port}/admin/queues`);
  console.log(`📚 Swagger API Docs: http://localhost:${port}/docs`);
  console.log(`=======================================================`);
});

async function bootstrap() {
  try {
    await ensureRedisRunning();
  } catch (err: any) {
    console.error('[Bootstrap] Redis check notice:', err.message || err);
  }

  try {
    await syncPendingJobsOnStartup(prisma);
  } catch (err: any) {
    console.error('[Bootstrap] Startup job sync notice:', err.message || err);
  }

  try {
    await initElasticsearch();
  } catch (err: any) {
    console.error('[Bootstrap] Elasticsearch init notice:', err.message || err);
  }
}

bootstrap();
