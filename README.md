# Sensa Command — GM Dashboard

A GM Command Center for **Sensa Padel**, a 6-court padel club in Nashville, TN. Built for daily visibility into revenue, leads, members, court usage, and AI-powered insights — all in one dashboard.

## Features

- **Dashboard** — Revenue, members, MRR, hot leads at a glance with charts
- **Revenue Tracking** — Daily entry, history, category breakdown, charts
- **Player Management** — Full CRM with search, filters, detail pages
- **Lead Pipeline** — Kanban board with auto-scoring
- **Member Management** — MRR tracking, churn risk, renewal alerts
- **Court Utilization** — Heatmap visualization of booking density
- **Message Center** — WhatsApp + Email templates, compose, send
- **AI Agent** — Chat with Claude to query data and get insights
- **CSV Import** — PlayByPoint data import with validation
- **Telegram Briefings** — Automated morning summary via Telegram bot
- **Settings** — Club config, pricing, integrations

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **AI:** Anthropic Claude API (tool_use pattern)
- **Email:** Resend
- **Notifications:** Telegram Bot API
- **Styling:** Tailwind CSS (dark theme)
- **Auth:** NextAuth.js v5

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- (Optional) Anthropic API key, Resend API key, Telegram bot token

### Steps

```bash
# 1. Clone and install
git clone <repo-url>
cd sensa-command
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database URL and credentials

# 3. Set up database
npx prisma migrate dev
npx prisma db seed

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo Login

- **Email:** pablo@sensapadel.com (or whatever you set in ADMIN_EMAIL)
- **Password:** changeme (or whatever you set in ADMIN_PASSWORD)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret for session encryption |
| `NEXTAUTH_URL` | Yes | App URL (http://localhost:3000 for dev) |
| `ADMIN_EMAIL` | Yes | Login email |
| `ADMIN_PASSWORD` | Yes | Login password |
| `ANTHROPIC_API_KEY` | No | For AI chat agent |
| `RESEND_API_KEY` | No | For email sending |
| `RESEND_FROM_EMAIL` | No | Sender email address |
| `TELEGRAM_BOT_TOKEN` | No | For Telegram briefings |
| `TELEGRAM_CHAT_ID` | No | Telegram chat to send to |
| `CLUB_NAME` | No | Club name (default: Sensa Padel) |
| `CLUB_COURTS` | No | Number of courts (default: 6) |
| `CLUB_TIMEZONE` | No | Timezone (default: America/Chicago) |

## Deploy to Railway

1. Push code to GitHub
2. Create new project on [Railway](https://railway.app)
3. Add PostgreSQL plugin
4. Set environment variables
5. Railway will auto-detect the Dockerfile and deploy

The `railway.json` configures:
- Dockerfile build
- Auto-run migrations on start
- Health check at `/api/health`

## Screenshots

*Coming soon*
