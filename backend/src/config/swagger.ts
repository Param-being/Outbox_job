export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ReachInbox Email Job Scheduler API',
    version: '1.0.0',
    description: `Production-grade distributed email job scheduler powered by **Node.js**, **Express**, **TypeScript**, **BullMQ**, **Redis**, **PostgreSQL** (Prisma ORM), **Elasticsearch**, and **Ethereal Fake SMTP**.
    
### Core Capabilities:
- **Zero Cron**: Precision scheduling strictly using BullMQ delayed jobs in Redis sorted sets.
- **Atomic Rate Limiting**: Redis \`INCR\` counters per sender with automatic staggering into the next hour window upon threshold breach.
- **Provider Throttling**: Minimum 2-second spacing between individual email sends.
- **Live Monitoring**: BullMQ Telemetry UI mounted at \`/admin/queues\`.
- **Ethereal SMTP**: Rendered HTML test message preview links generated for every sent email.`,
    contact: {
      name: 'ReachInbox Engineering Team',
      url: 'https://reachinbox.ai',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local Development & Testing Server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'Google OAuth & user session management' },
    { name: 'Campaigns & Scheduling', description: 'Campaign creation, bulk lead scheduling & queue dispatching' },
    { name: 'Email Queries', description: 'Retrieve scheduled and sent emails with live Ethereal preview links' },
    { name: 'Elasticsearch Search', description: 'Full-text email search with relational database fallback' },
    { name: 'Slack Integration', description: 'Incoming webhook configuration, testing & OAuth flow' },
    { name: 'System Health', description: 'Service uptime & BullMQ telemetry status' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['System Health'],
        summary: 'Service Health & Queue Status',
        description: 'Returns health status, uptime timestamp, and Bull Board UI URL.',
        responses: {
          200: {
            description: 'Service is online and healthy',
            content: {
              'application/json': {
                example: {
                  status: 'online',
                  timestamp: '2026-09-03T06:33:53.922Z',
                  bullBoardUrl: 'http://localhost:5000/admin/queues',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/google': {
      post: {
        tags: ['Authentication'],
        summary: 'Google OAuth Token Verification & Login',
        description: 'Authenticates a user using a Google OAuth ID token or dev mock payload.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string', example: 'eyJhbGciOiJSUzI1NiIs...' },
                  mockUser: {
                    type: 'object',
                    properties: {
                      email: { type: 'string', example: 'oliver.brown@domain.io' },
                      name: { type: 'string', example: 'Oliver Brown' },
                      avatar: { type: 'string', example: 'https://images.unsplash.com/...' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Successfully authenticated user',
            content: {
              'application/json': {
                example: {
                  success: true,
                  user: {
                    id: '87207f99-8927-4583-b472-c74a7beeb812',
                    email: 'oliver.brown@domain.io',
                    name: 'Oliver Brown',
                    avatar: 'https://images.unsplash.com/...',
                    slackWebhookUrl: null,
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get Current Authenticated User',
        parameters: [
          {
            name: 'x-user-id',
            in: 'header',
            required: true,
            schema: { type: 'string' },
            description: 'User ID header for session identification',
          },
        ],
        responses: {
          200: { description: 'User profile details' },
          401: { description: 'Unauthenticated' },
        },
      },
    },
    '/api/campaigns': {
      post: {
        tags: ['Campaigns & Scheduling'],
        summary: 'Schedule Email Campaign with Delayed BullMQ Jobs',
        description: 'Creates a campaign, persists leads in PostgreSQL, and enqueues delayed jobs into BullMQ with atomic rate limits.',
        parameters: [
          {
            name: 'x-user-id',
            in: 'header',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'subject', 'body', 'startTime', 'leads'],
                properties: {
                  title: { type: 'string', example: 'Q4 Product Announcement' },
                  senderEmail: { type: 'string', example: 'sales@reachinbox.ai' },
                  subject: { type: 'string', example: 'Exclusive invite for your team' },
                  body: { type: 'string', example: 'Hi {{email}}, we are excited to introduce our new feature...' },
                  startTime: { type: 'string', format: 'date-time', example: '2026-09-03T07:00:00.000Z' },
                  delaySeconds: { type: 'number', example: 2 },
                  hourlyLimit: { type: 'number', example: 50 },
                  leads: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['lead1@domain.com', 'lead2@domain.com', 'lead3@domain.com'],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Campaign scheduled successfully',
            content: {
              'application/json': {
                example: {
                  success: true,
                  campaign: {
                    id: 'c9b4e723-...',
                    title: 'Q4 Product Announcement',
                    totalLeads: 3,
                    status: 'SCHEDULED',
                  },
                  scheduledCount: 3,
                },
              },
            },
          },
        },
      },
    },
    '/api/emails/scheduled': {
      get: {
        tags: ['Email Queries'],
        summary: 'List Pending Scheduled Queue Jobs',
        parameters: [
          { name: 'x-user-id', in: 'header', required: false, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: {
            description: 'List of scheduled and rate-limited emails',
          },
        },
      },
    },
    '/api/emails/sent': {
      get: {
        tags: ['Email Queries'],
        summary: 'List Sent Emails with Ethereal SMTP Preview URLs',
        parameters: [
          { name: 'x-user-id', in: 'header', required: false, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: {
          200: {
            description: 'List of delivered and failed emails with preview links',
          },
        },
      },
    },
    '/api/search': {
      get: {
        tags: ['Elasticsearch Search'],
        summary: 'Full-Text Search Across Scheduled & Sent Emails',
        description: 'Queries Elasticsearch with field boosting & fuzziness, falling back to PostgreSQL if Elasticsearch is offline.',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, example: 'Update' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['scheduled', 'sent'], default: 'scheduled' } },
          { name: 'x-user-id', in: 'header', required: false, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Matching email records',
            content: {
              'application/json': {
                example: {
                  success: true,
                  source: 'elasticsearch',
                  results: [
                    {
                      id: 'email_123',
                      recipientEmail: 'sarah.wilson@domain.com',
                      subject: 'Re: Project Update',
                      status: 'SENT',
                      etherealPreviewUrl: 'https://ethereal.email/message/...',
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/api/slack/webhook': {
      post: {
        tags: ['Slack Integration'],
        summary: 'Connect Slack Incoming Webhook URL',
        parameters: [
          { name: 'x-user-id', in: 'header', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['webhookUrl'],
                properties: {
                  webhookUrl: { type: 'string', example: 'https://hooks.slack.com/services/T00/B00/XXXX' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Slack webhook connected successfully' },
        },
      },
    },
    '/api/slack/test': {
      post: {
        tags: ['Slack Integration'],
        summary: 'Send Live Test Slack Notification',
        parameters: [
          { name: 'x-user-id', in: 'header', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Test notification sent to Slack channel' },
        },
      },
    },
  },
};
