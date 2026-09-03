# ReachInbox Email Job Scheduler & Real-Time Dashboard

A production-grade, distributed email job scheduling service and real-time dashboard built with **Node.js**, **Express**, **TypeScript**, **PostgreSQL** (Prisma ORM), **BullMQ**, **Redis**, **Elasticsearch**, **Ethereal SMTP**, and **React** with **Tailwind CSS**.

---

## 🌟 Architecture & Core Technical Highlights

### 1. Zero Cron Policy
- **Strictly Delayed Jobs**: The scheduler does **not** rely on OS cron (`crontab`), Node cron libraries (`node-cron`, `agenda`), or timer loops (`setInterval`).
- **Precision Scheduling**: When a campaign is created for future timestamp $T$, the backend calculates the millisecond delay ($\Delta = T - \text{now}$) and enqueues the task directly into **BullMQ delayed sorted sets in Redis** (`emailQueue.add('send-email', data, { delay, jobId })`).

### 2. Restart Persistence & Idempotency
- **Crash & Reboot Resiliency**: All delayed timers reside in Redis persistence data structures. When the server or worker reboots, BullMQ automatically resumes the remaining delay countdown without losing state or restarting jobs from scratch.
- **Fail-Safe Startup Sync**: On server bootstrap, `syncPendingJobsOnStartup()` checks relational database records for any pending `SCHEDULED` tasks and verifies they are registered in BullMQ with remaining delays.
- **Deterministic Job IDs**: Every scheduled job uses an idempotent unique key (`jobId: email_${id}` or `rescheduled_${id}_${count}`). Even if re-enqueued or restarted multiple times, duplicate emails are never dispatched.
- **State Check Before Send**: Workers verify the record's database state prior to dispatch (`if (record.status === 'SENT') return;`).

### 3. Atomic Rate Limiting & Safe Rescheduling
- **Per-Sender / Per-Tenant Hourly Buckets**: Rate limits are enforced dynamically per sender/tenant across workers using atomic Redis counters keyed by `ratelimit:{senderOrUser}:{YYYYMMDDHH}` with automatic 2-hour TTL expiration.
- **Race-Condition Safe**: Uses atomic Redis `INCR`. If `currentCount > hourlyLimit`:
  1. The job is **never** dropped or marked as failed.
  2. The start timestamp of the next hour window (`getStartOfNextHourMs()`) is computed.
  3. **Order Preservation**: Stagger offsets are preserved (`nextHourMs + (indexInBatch * delaySeconds * 1000)`) so rescheduled jobs do not collide simultaneously at the start of the next hour.
  4. The record in the relational database transitions to `DELAYED_RATE_LIMIT` with updated `scheduledAt` and incremented `rescheduledCount`.
  5. The job is rescheduled into BullMQ for the next hourly window.
- **Live Slack Alerting**: The exact moment a sender crosses their hourly threshold (`currentCount === hourlyLimit + 1`), a live Block Kit notification is dispatched to their connected Slack webhook. Worker execution is non-blocking and handles disconnected/invalid Slack endpoints gracefully.

### 4. Concurrency & Provider Throttling Under Load
- **Worker Concurrency**: Configurable via `WORKER_CONCURRENCY` in `.env` (default: `5` concurrent jobs per worker instance).
- **Provider Throttling**: Enforces a minimum delay (`MIN_SEND_DELAY_MS`, default: `2000ms` / 2 seconds) between individual sends in the worker execution loop to mimic SMTP provider rate pacing.
- **1,000+ Email Load Handling**: Batched relational database transactions (`prisma.scheduledEmail.createMany`) and BullMQ bulk enqueueing (`emailQueue.addBulk`) allow campaigns with 1,000+ leads at the exact same start time to be scheduled safely in a single sub-second operation.

### 5. Multi-Sender Ethereal SMTP & Test Email Previews
- Sends dynamic email campaigns via **Ethereal Email** (Nodemailer fake SMTP provider).
- Supports custom `senderEmail` per campaign/tenant (e.g. `sales@reachinbox.ai`).
- Every sent email generates a live Ethereal test message preview URL (e.g. `https://ethereal.email/message/...`), viewable directly in the dashboard UI with a single click.

### 6. Elasticsearch Full-Text Search with Database Fallback
- Scheduled and sent emails are indexed into the `reachinbox_emails` Elasticsearch index.
- Full-text search across `recipientEmail`, `subject`, and `body` with fuzziness and field boosting.
- Automatic graceful fallback to database search if Elasticsearch is offline.

### 7. Bull Board Live Monitoring Dashboard
- Live queue monitoring dashboard mounted at `http://localhost:5000/admin/queues` powered by `@bull-board/express` and `@bull-board/api`.
- Real-time visibility into **Active**, **Waiting**, **Delayed**, **Completed**, and **Failed** jobs.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express, TypeScript | REST API server & business logic |
| **Queue** | BullMQ, Redis (ioredis) | Delayed persistent job scheduling & rate-limiting |
| **Monitoring** | Bull Board (`@bull-board/express`) | Real-time queue telemetry UI |
| **Database** | PostgreSQL / SQLite (Prisma ORM) | Relational storage for users, campaigns, scheduled emails |
| **Search Engine** | Elasticsearch (`@elastic/elasticsearch`) | Full-text search across email metadata |
| **SMTP Provider** | Ethereal Email (Nodemailer) | Fake SMTP email delivery & web preview generation |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS | Modern responsive dashboard & lead uploader UI |
| **Auth & Alerting** | Google OAuth (`@react-oauth/google`), Slack Webhooks | Real user authentication & live rate-limit alerts |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)
- [Docker](https://www.docker.com/) (optional for Docker Compose setup)

---

### Option A: Running with Docker Compose (Recommended for Production)

1. Start PostgreSQL, Redis, and Elasticsearch containers:
   ```bash
   docker compose up -d
   ```

2. Setup and run backend:
   ```bash
   cd backend
   npm install
   npx prisma db push --schema=prisma/schema.postgresql.prisma
   npm run dev
   ```

3. Setup and run frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

### Option B: Zero-Docker Local Development (Works Out of the Box)

The backend includes an embedded in-memory Redis fallback and SQLite database configuration for rapid zero-dependency local evaluation on any machine.

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npx prisma db push
   npm run dev
   ```
   - API Server: `http://localhost:5000`
   - Swagger API Docs: `http://localhost:5000/docs`
   - BullMQ Board: `http://localhost:5000/admin/queues`

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Dashboard: `http://localhost:3000`

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
DATABASE_URL="postgresql://reachinbox:reachinbox_password@localhost:5432/reachinbox_db?schema=public"
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
ELASTICSEARCH_NODE="http://localhost:9200"
GOOGLE_CLIENT_ID="your_google_oauth_client_id.apps.googleusercontent.com"
WORKER_CONCURRENCY=5
MIN_SEND_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=50
FRONTEND_URL="http://localhost:3000"

# Optional: Custom Ethereal SMTP Credentials (auto-generated if omitted)
# ETHEREAL_USER="your_user@ethereal.email"
# ETHEREAL_PASS="your_password"

# Optional: Slack OAuth App Credentials
# SLACK_CLIENT_ID="your_slack_client_id"
# SLACK_CLIENT_SECRET="your_slack_client_secret"
```

### Frontend (`frontend/.env`)

```env
VITE_GOOGLE_CLIENT_ID="your_google_oauth_client_id.apps.googleusercontent.com"
```

---

## 🧪 Ethereal SMTP & Rate Limiting Verification Workflow

1. Open `http://localhost:3000` in your browser.
2. Sign in using **Google OAuth** or click **"Continue with Demo Session"**.
3. (Optional) Click **"Connect Slack"** in the top header and enter your Slack Incoming Webhook URL. Click **"Test Notification"** to verify.
4. Click **"Compose Campaign"** in the top header.
5. Fill out the campaign form:
   - **Campaign Name**: `Q4 Outreach Campaign`
   - **Sender Email**: `sales@reachinbox.ai`
   - **Subject**: `Workflow check`
   - **Body**: `Hi {{email}}, testing our BullMQ email scheduler with Ethereal SMTP.`
   - **Start Time**: Set to current time or 1 minute in future.
   - **Delay per Send**: `2` (seconds)
   - **Hourly Limit**: `2` (set to 2 to easily test rate limit safe rescheduling).
6. Upload a lead file using the **Lead Uploader dropzone** (or enter test emails like `lead1@domain.com, lead2@domain.com, lead3@domain.com`).
7. Click **"Schedule Email Campaign"**.
8. **Observe the Results**:
   - The first 2 emails will process and appear in the **"Sent Emails"** tab.
   - Click **"View Test Email"** to open the real rendered HTML email in Ethereal's web viewer!
   - The 3rd email will automatically transition to **`DELAYED_RATE_LIMIT`** and be rescheduled into the start of the next hour window (`nextHourMs`).
   - A live **Slack Notification** will be sent to your connected Slack webhook.
   - Open `http://localhost:5000/admin/queues` to inspect live BullMQ delayed job states!

---

## 🔄 Server Restart & Resiliency Scenario

To verify that future scheduled emails survive server reboots:

1. Create a campaign with a start time **2 minutes in the future**.
2. Stop the backend server process (`Ctrl + C`).
3. Wait 30 seconds.
4. Restart the backend server (`npm run dev`).
5. Notice that `syncPendingJobsOnStartup()` and BullMQ resume the exact remaining delay timer.
6. When the 2 minutes elapse, the email is dispatched at its exact target time with zero duplication.

---

## 📁 Repository Structure

```
reachinbox-scheduler/
├── docker-compose.yml              # Multi-container setup (Postgres, Redis, Elasticsearch)
├── README.md                       # Complete architecture and setup documentation
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Primary Prisma relational database schema
│   │   └── schema.postgresql.prisma# PostgreSQL Docker production schema
│   ├── src/
│   │   ├── config/
│   │   │   ├── elasticsearch.ts    # Elasticsearch client & index mappings
│   │   │   ├── prisma.ts           # Prisma database client
│   │   │   └── redis.ts            # Redis connection & embedded fallback
│   │   ├── controllers/
│   │   │   ├── authController.ts   # Google OAuth & session management
│   │   │   ├── campaignController.ts# Campaign creation & email listing
│   │   │   ├── searchController.ts # Elasticsearch query & DB fallback
│   │   │   └── slackController.ts  # Slack Webhook & OAuth handlers
│   │   ├── queue/
│   │   │   ├── emailQueue.ts       # BullMQ Queue instance & startup sync
│   │   │   └── emailWorker.ts      # BullMQ Worker, rate limiting, throttling
│   │   ├── services/
│   │   │   ├── mailer.ts           # Ethereal fake SMTP transporter & preview links
│   │   │   └── slack.ts            # Slack Block Kit rate limit alert dispatcher
│   │   └── server.ts               # Express application & Bull Board mounting
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ComposeModal.tsx    # Campaign composition form
    │   │   ├── EmailTable.tsx      # Scheduled & Sent data tables
    │   │   ├── Header.tsx          # Brand header, user avatar, Bull Board link
    │   │   ├── LeadUploader.tsx    # CSV/TXT dropzone with regex parser
    │   │   └── SlackModal.tsx      # Slack webhook connector & tester
    │   ├── pages/
    │   │   └── Dashboard.tsx       # Main dashboard, search & statistics
    │   ├── services/
    │   │   └── api.ts              # Axios API client
    │   ├── types/
    │   │   └── index.ts            # TypeScript interfaces & types
    │   ├── App.tsx
    │   ├── index.css
    │   └── main.tsx
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## 📋 Feature Checklist

| Requirement | Implementation Details | Status |
| :--- | :--- | :---: |
| **Zero Cron Scheduling** | BullMQ delayed jobs in Redis (`queue.add`) | ✅ Implemented |
| **Server Restart Resiliency** | Redis delayed sets + `syncPendingJobsOnStartup` | ✅ Implemented |
| **Idempotency** | Deterministic `jobId` & database state guard | ✅ Implemented |
| **Worker Concurrency** | Configurable concurrency in BullMQ Worker | ✅ Implemented |
| **Provider Throttling** | Minimum 2-second delay between sends (`MIN_SEND_DELAY_MS`) | ✅ Implemented |
| **Hourly Rate Limiting** | Redis atomic `INCR` hour buckets per sender/user | ✅ Implemented |
| **Safe Rescheduling** | Shift to `nextHourMs` preserving stagger offset; no dropped jobs | ✅ Implemented |
| **Slack Alerting** | Block Kit alert dispatched on rate limit breach | ✅ Implemented |
| **Google OAuth** | Real Google OAuth token verification via backend | ✅ Implemented |
| **Ethereal SMTP** | Fake SMTP sending with rendered HTML test preview URLs | ✅ Implemented |
| **Elasticsearch** | Full-text indexing and querying with DB fallback | ✅ Implemented |
| **Live Queue Dashboard** | Bull Board UI at `/admin/queues` | ✅ Implemented |
| **Frontend UI** | React + Tailwind CSS with dark theme and lead dropzone | ✅ Implemented |
| **Docker Compose** | PostgreSQL, Redis, Elasticsearch | ✅ Implemented |

---

## 📝 Assumptions, Shortcuts & Trade-Offs

1. **Dual Database Configuration**: In development environments where Docker is not installed on the host, the backend automatically uses SQLite + embedded Redis memory server so evaluators can run the project immediately with zero setup hurdles. For Docker/production environments, `schema.postgresql.prisma` and Docker Compose provide the full PostgreSQL configuration.
2. **Search Engine Graceful Fallback**: When Elasticsearch is not running locally, the search controller automatically detects connection timeouts and falls back to database ILIKE/contains filtering, ensuring searches never crash or block the UI.
3. **Slack Incoming Webhooks**: In addition to standard Slack OAuth authorization redirect endpoints, we support direct Incoming Webhook URLs for instant testing without requiring public ngrok tunnels.
