# CLAUDE.md — Sensa Command Center

## Tech Stack

- **Framework:** Next.js 14.2.35 (App Router), TypeScript 5 (strict)
- **UI:** Tailwind CSS 3.4 + @tailwindcss/forms, Lucide React icons, Recharts
- **Database:** PostgreSQL via Prisma 7.6 + PrismaPg adapter
- **Auth:** NextAuth v5 beta (JWT, credentials provider, trustHost: true)
- **AI:** Anthropic SDK 0.80 (Claude Sonnet 4), 11 tools
- **Email:** Resend 6.10
- **Messaging:** Telegram Bot API
- **Validation:** Zod 4.3
- **CSV:** PapaParse 5.5
- **Deploy:** Docker (node:22-alpine) on Railway

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/                # 32+ API routes
│   ├── automations/        # Automation dashboard
│   ├── goals/              # Goals kanban + table
│   ├── team/               # Team member overview
│   ├── players/            # Player list + [id] detail
│   ├── revenue/            # Revenue entry + charts
│   ├── courts/             # Court utilization heatmap
│   ├── leads/              # Lead pipeline board
│   ├── members/            # Member dashboard
│   ├── messages/           # Message center
│   ├── ai/                 # AI chat interface
│   ├── import/             # CSV import
│   ├── settings/           # App settings
│   ├── login/              # Auth login page
│   └── layout.tsx          # Root layout (light theme)
├── components/
│   ├── layout/             # AppShell, Header, Sidebar, MobileNav, Providers
│   ├── dashboard/          # StatCards, RevenueChart, VisitsChart, GoalsSummary, etc.
│   ├── goals/              # KanbanBoard, GoalsTable, GoalCard, GoalDetail, GoalFilters
│   ├── automations/        # (future components)
│   ├── players/            # PlayerTable, PlayerForm, PlayerDetail, PlayerStats
│   ├── revenue/            # RevenueForm, RevenueCharts, RevenueTable
│   ├── leads/              # LeadBoard, LeadCard
│   ├── courts/             # CourtHeatmap, CourtStats
│   ├── members/            # MemberDashboard, MemberCards
│   ├── messages/           # MessageCenter, ComposeModal, TemplateEditor
│   ├── ai/                 # ChatInterface, ConversationList
│   ├── import/             # CSVDropzone, ImportPreview
│   ├── settings/           # SettingsForm
│   └── ui/                 # Button, Badge, Input, Select, Modal, Table, Skeleton, Toast, StatCard, DatePicker
├── lib/
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma client singleton
│   ├── anthropic.ts        # AI system prompt + 11 tool definitions
│   ├── constants.ts        # Colors, labels, nav items
│   ├── utils.ts            # cn(), formatCurrency, formatDate, getInitials, etc.
│   ├── csv-parser.ts       # CSV parsing with flexible column mapping
│   ├── resend.ts           # Email service wrapper
│   ├── telegram.ts         # Telegram bot messaging
│   └── automations/        # Automation engine
│       ├── base-automation.ts
│       ├── engine.ts
│       └── (8 automation files)
├── types/index.ts          # All type exports + custom interfaces
└── generated/prisma/       # Prisma generated client (do not edit)
```

## Prisma Models (13)

| Model | Key Fields |
|-------|-----------|
| Player | firstName, lastName, email, phone, status (6 enum), membershipType (3 enum), monthlyRate, tags[] |
| Visit | playerId, courtNumber, date, startTime, endTime, type (5 enum), amountPaid |
| Payment | playerId, date, amount, type (6 enum), method (4 enum) |
| DailyRevenue | date (unique), courtRentals, memberships, lessons, proShop, events, other, totalRevenue |
| Message | playerId, channel (4 enum), direction, status (5 enum), body, templateUsed |
| MessageTemplate | name (unique), channel, category (6 enum), subject, body |
| TeamMember | firstName, lastName, email, role (7 enum), isActive |
| Goal | title, status (6 enum), priority (4 enum), categories[], dueDate, assignees[] (m2m TeamMember) |
| GoalComment | goalId, authorId, body |
| AIConversation | messages (JSON[]), title |
| Setting | key (unique), value (JSON) |
| AutomationLog | automationType, targetPlayerId, action, message, channel, status, dryRun |
| AutomationConfig | type (unique), name, description, enabled, schedule, lastRun, config (JSON) |

## Page Routes (16)

/, /login, /revenue, /players, /players/[id], /leads, /members, /courts, /goals, /team, /messages, /ai, /automations, /import, /settings, /api/health

## API Routes (32+)

CRUD: players, players/[id], visits, visits/trend, payments, revenue, messages, messages/[id], messages/templates, templates/[id], goals, goals/[id], goals/[id]/comments, team-members, team-members/[id], members, leads, settings, settings/export, settings/test-email
Dashboard: dashboard/stats, dashboard/activity, dashboard/actions
Automations: automations/run, automations/status, automations/[type], automations/logs
Integrations: ai/chat, cron/morning-brief, telegram/briefing, import/csv, courts/utilization
Infra: health, auth/[...nextauth]

## Design System (Light Theme)

- Page background: #F8F7F4
- Card background: #FFFFFF with border #E8E4DD
- Primary text: #1A1A2E
- Secondary text: #6B7280
- Muted text: #9CA3AF
- Accent (CTAs): #E8A838 (warm gold), hover: #D4971F
- Input border: #D1D5DB, focus ring: amber-500
- Status badges: color-50 bg + color-700 text + color-200 border

## Conventions

- API responses: `{ data: T }` or `{ error: string, message: string }`
- Auth check: `const session = await auth()` at top of every API route
- Validation: Zod schemas with `.safeParse(body)`
- Styling: `cn()` helper (clsx + tailwind-merge)
- Date formatting: date-fns via `formatDate()`, `formatTimeAgo()`
- Constants: colors, labels, and nav items in `src/lib/constants.ts`

## Team

Pablo Martin (GM), Aditya Khilnani (Operations), Marcus Y (Pro Shop), Arianna Gil (Marketing), Maria Sanz (Operations), Scott Mitchell (Finance), Sebastián Arce (Coach), Tripp Hostetter (Finance)

## Business Context

Sensa Padel — 6-court padel club in Nashville, TN. Membership tiers: Standard ($200/mo), Unlimited ($350/mo). Revenue target: $45k/mo. Communication: casual, bilingual, WhatsApp-first. Peak hours: 5-9pm.
