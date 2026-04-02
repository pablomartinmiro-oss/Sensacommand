import { z } from 'zod'

// All 24 tools defined with Zod schemas for the Vercel AI SDK.
// The `execute` functions are injected at call time (in the route handler)
// because they need access to prisma and other server-side deps.
// Here we only define schemas.

export const queryPlayersSchema = z.object({
  status: z.enum(['NEW', 'ACTIVE', 'HOT_LEAD', 'COLD_LEAD', 'CONVERTED', 'CHURNED']).optional().describe('Player status filter'),
  membershipType: z.enum(['NONE', 'STANDARD', 'UNLIMITED']).optional().describe('Membership type filter'),
  minVisits: z.number().optional().describe('Minimum number of visits'),
  maxVisits: z.number().optional().describe('Maximum number of visits'),
  lastVisitBefore: z.string().optional().describe('ISO date — players whose last visit was before this'),
  lastVisitAfter: z.string().optional().describe('ISO date — players whose last visit was after this'),
  search: z.string().optional().describe('Search by name or email'),
  limit: z.number().optional().describe('Max results (default 20)'),
})

export const queryRevenueSchema = z.object({
  startDate: z.string().describe('Start date (ISO format)'),
  endDate: z.string().describe('End date (ISO format)'),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
})

export const queryVisitsSchema = z.object({
  playerId: z.string().optional(),
  courtNumber: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(['CASUAL', 'MEMBER_SESSION', 'LESSON', 'TOURNAMENT', 'PRIVATE_EVENT']).optional(),
  limit: z.number().optional(),
})

export const queryMembersSchema = z.object({
  tier: z.enum(['STANDARD', 'UNLIMITED']).optional(),
  churnRisk: z.boolean().optional().describe('Filter for members at risk of churning'),
  expiringWithinDays: z.number().optional().describe('Members expiring within N days'),
})

export const queryLeadsSchema = z.object({
  status: z.enum(['NEW', 'HOT_LEAD', 'COLD_LEAD']).optional(),
  minScore: z.number().optional(),
  sortBy: z.enum(['score', 'lastVisit', 'visits']).optional(),
})

export const draftMessageSchema = z.object({
  playerId: z.string().describe('Player ID to send message to'),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  templateName: z.string().optional().describe('Template name to use'),
  customBody: z.string().optional().describe('Custom message body'),
  subject: z.string().optional().describe('Email subject'),
})

export const courtStatsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  courtNumber: z.number().optional(),
})

export const runSqlSchema = z.object({
  query: z.string().describe('SQL SELECT query to execute'),
})

export const queryGoalsSchema = z.object({
  assignee: z.string().optional().describe('Assignee name (partial match)'),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING']).optional(),
  category: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
  overdue: z.boolean().optional().describe('Filter for overdue goals'),
  search: z.string().optional().describe('Search by title'),
  limit: z.number().optional().describe('Max results (default 20)'),
})

export const updateGoalSchema = z.object({
  goalId: z.string().describe('Goal ID to update'),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING']).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
  dueDate: z.string().optional().describe('Due date (ISO format)'),
})

export const createGoalSchema = z.object({
  title: z.string().describe('Goal title'),
  assignees: z.array(z.string()).optional().describe('Array of assignee names'),
  categories: z.array(z.string()).optional().describe('Category names'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
  dueDate: z.string().optional().describe('Due date (ISO format)'),
  description: z.string().optional(),
})

export const createSocialPostSchema = z.object({
  description: z.string().describe('What to post about'),
  platform: z.enum(['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'ALL']).optional().describe('Target platform'),
  scheduledFor: z.string().optional().describe('Schedule date (ISO format)'),
})

export const querySocialPostsSchema = z.object({
  platform: z.enum(['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'ALL']).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'POSTED', 'CANCELLED']).optional(),
  category: z.string().optional(),
})

export const createAutomationSchema = z.object({
  description: z.string().describe('Plain-English description of the automation'),
})

export const dailyPrioritiesSchema = z.object({})

export const teamStatusSchema = z.object({
  teamMember: z.string().optional().describe('Team member name (omit for all)'),
})

export const goalInsightsSchema = z.object({
  question: z.string().describe('Analytical question about goals'),
})

export const snoozeGoalsSchema = z.object({
  goalIds: z.array(z.string()).optional().describe('Specific goal IDs to snooze'),
  assignee: z.string().optional().describe('Snooze all overdue goals for this assignee'),
  daysOverdue: z.number().optional().describe('Snooze goals overdue more than N days'),
  newDate: z.string().describe('New due date (ISO format)'),
})

export const weeklySummarySchema = z.object({})

export const queryLeaveSchema = z.object({
  teamMember: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'DENIED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export const approveLeaveSchema = z.object({
  requestId: z.string().describe('Leave request ID to approve'),
})

export const queryWebhookEventsSchema = z.object({
  eventType: z.string().optional().describe('Filter by event type'),
  status: z.enum(['processed', 'failed', 'pending', 'duplicate']).optional(),
  limit: z.number().optional().describe('Max results (default 10)'),
})

export const playerSavingsSchema = z.object({
  playerId: z.string().optional(),
  playerName: z.string().optional().describe('Player name to search for'),
})

export const queryReferralsSchema = z.object({
  action: z.enum(['list', 'top_referrers', 'create']).optional().describe('Action to perform'),
  memberId: z.string().optional(),
  status: z.enum(['PENDING', 'VISITED', 'CONVERTED', 'EXPIRED']).optional(),
  referrerId: z.string().optional().describe('Referrer player ID (for create)'),
  referredId: z.string().optional().describe('Referred player ID (for create)'),
})

// Tool description map — used by the route to build tool objects
export const TOOL_DESCRIPTIONS = {
  query_players: 'Search and filter players by various criteria',
  query_revenue: 'Get revenue data by date range, optionally grouped by day/week/month',
  query_visits: 'Get visit data filtered by player, court, date range, or type',
  query_members: 'Get member list, MRR calculation, churn risk, and renewal dates',
  query_leads: 'Get lead pipeline data with scoring and follow-up status',
  draft_message: 'Create a message draft for a player via WhatsApp or email',
  court_stats: 'Get court utilization statistics',
  run_sql: 'Execute a read-only SQL query. Only SELECT statements allowed.',
  query_goals: 'Search and filter goals by assignee, status, category, priority, or overdue',
  update_goal: 'Update a goal status, priority, due date, or assignees',
  create_goal: 'Create a new goal with title, assignees, categories, priority, and due date',
  create_social_post: 'Generate and create a social media post using AI',
  query_social_posts: 'List and filter social media posts',
  create_automation: 'Create a new automation from a plain-English description',
  daily_priorities: "Get today's prioritized action plan",
  team_status: 'Get per-person or all-team goal status overview',
  goal_insights: 'Analytical queries about goals: overdue by category, stuck goals, completion rates',
  snooze_goals: 'Bulk snooze goals by assignee, days overdue, or specific IDs',
  weekly_summary: 'Generate a weekly performance summary',
  query_leave: 'Query leave/PTO requests, allowances, and who is off',
  approve_leave: 'Approve a pending leave request',
  query_webhook_events: 'View recent PlayByPoint webhook events',
  player_savings: 'Calculate how much a player would save with a membership based on usage',
  query_referrals: 'Query referral data, top referrers, or create a new referral',
} as const
