# AGENTS.md — AI & Automation Systems

## AI Chat System

**Location:** `src/app/api/ai/chat/route.ts` (POST handler, ~650 lines)
**Config:** `src/lib/anthropic.ts` (system prompt + tool definitions)
**UI:** `src/components/ai/chat-interface.tsx` + `conversation-list.tsx`
**Page:** `src/app/ai/page.tsx`

### How It Works

1. User sends message → POST /api/ai/chat with `{ message, conversationId? }`
2. Server loads or creates AIConversation record
3. Appends user message to conversation history
4. Calls Claude Sonnet 4 with system prompt + tools + full history
5. If Claude returns `tool_use` → executes tool → feeds result back → loops (max 10 rounds)
6. Final text response saved to conversation and returned

### 11 AI Tools

| Tool | What It Does | Key Params |
|------|-------------|------------|
| query_players | Search/filter players | status, membershipType, search, minVisits, lastVisitBefore |
| query_revenue | Revenue by date range | startDate, endDate, groupBy (day/week/month) |
| query_visits | Visit data | playerId, courtNumber, startDate, endDate, type |
| query_members | Member list + MRR | tier, churnRisk, expiringWithinDays |
| query_leads | Lead pipeline + scoring | status, minScore, sortBy |
| draft_message | Create message draft | playerId, channel, templateName, customBody |
| court_stats | Court utilization | startDate, endDate, courtNumber |
| run_sql | Read-only SQL (SELECT only) | query |
| query_goals | Search goals | assignee, status, category, priority, overdue |
| update_goal | Modify a goal | goalId, status, priority, dueDate |
| create_goal | Create new goal | title, assignees[], categories[], priority, dueDate |

### Adding a New AI Tool

1. Add tool definition to `AI_TOOLS` array in `src/lib/anthropic.ts`
2. Add tool execution case in `executeToolCall()` in `src/app/api/ai/chat/route.ts`
3. Add any new input fields to the `ToolInput` interface
4. Update the system prompt tool list description

## Automation Engine

**Location:** `src/lib/automations/`
**Base class:** `base-automation.ts` — abstract class with dedup, quiet hours, logging
**Engine:** `engine.ts` — loadAll(), runDue(), runSingle(), getStatus()
**API:** `src/app/api/automations/` — run, status, [type], logs
**Page:** `src/app/automations/page.tsx`

### 8 Automations

| Type | Schedule | Channel | Description |
|------|----------|---------|-------------|
| win-back-14-day | Daily 10am | WhatsApp | "We miss you" to 14+ day inactive players |
| win-back-30-day | Daily 10am | WhatsApp | Free guest pass offer to 30+ day inactive (must have received 14-day) |
| upsell-casual-to-member | Monday 11am | WhatsApp | Membership savings pitch to 4+ visit/month casuals |
| welcome-new-player | Every 4h | WhatsApp | Welcome message after first visit |
| membership-expiring | Daily 9am | Email | 14-day soft + 3-day urgent renewal reminders |
| churn-risk-alert | Monday 9am | Telegram | Alert Pablo when member visits drop 50%+ |
| overdue-goals-digest | Daily 8am | Telegram | Digest of overdue goals with assignees |
| weekly-performance-report | Monday 8am | Telegram | Revenue, visits, conversions vs last week |

### Built-in Protections

- **Dedup:** Same automation + player won't fire within 24h
- **Quiet hours:** No messages before 9am or after 8pm Central
- **Config toggle:** Each automation can be enabled/disabled via API or UI
- **Dry run:** Preview mode that logs without sending

### Adding a New Automation

1. Create `src/lib/automations/my-automation.ts` extending `BaseAutomation`
2. Implement `findTargets()` and `generateAction(player)`
3. Set `type`, `name`, `description`, `schedule` properties
4. Import and add to `ALL_AUTOMATIONS` array in `engine.ts`
5. Add an `AutomationConfig` seed record in `prisma/seed-automations.ts`
6. Run seed: `npx tsx -r dotenv/config prisma/seed-automations.ts`

### Morning Brief Integration

The `/api/cron/morning-brief` endpoint calls `runDue()` after sending the briefing, so all due automations execute on the same schedule.
