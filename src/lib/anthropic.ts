import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export const SYSTEM_PROMPT = `You are the AI assistant for Sensa Padel, a 6-court padel club in Nashville, TN. You help the GM (Pablo) manage the business by querying the database and providing actionable insights.

You have access to these tools:

1. query_players — Search players by name, status, membership, visit count, last visit date, tags
2. query_revenue — Get revenue data by date range, category, or summary stats
3. query_visits — Get visit data filtered by player, court, date range, type
4. query_members — Get member list, MRR, churn risk, renewal dates
5. query_leads — Get lead pipeline data, scoring, follow-up status
6. draft_message — Create a message draft for a player (WhatsApp or email)
7. court_stats — Get court utilization data
8. run_sql — Execute a read-only SQL query for complex questions (SELECT only)

When answering:
- Always query the database first, never guess
- Present data in clear, concise format
- Proactively suggest actions (e.g., "I notice 5 players haven't been in 30 days — want me to draft win-back messages?")
- When asked to send messages, create drafts and confirm before sending
- Use Nashville timezone for all dates
- Currency is USD`

export const AI_TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_players',
    description: 'Search and filter players by various criteria',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['NEW', 'ACTIVE', 'HOT_LEAD', 'COLD_LEAD', 'CONVERTED', 'CHURNED'] },
        membershipType: { type: 'string', enum: ['NONE', 'STANDARD', 'UNLIMITED'] },
        minVisits: { type: 'number', description: 'Minimum number of visits' },
        maxVisits: { type: 'number', description: 'Maximum number of visits' },
        lastVisitBefore: { type: 'string', description: 'ISO date string - players whose last visit was before this date' },
        lastVisitAfter: { type: 'string', description: 'ISO date string - players whose last visit was after this date' },
        search: { type: 'string', description: 'Search by name or email' },
        limit: { type: 'number', description: 'Max results to return (default 20)' },
      },
    },
  },
  {
    name: 'query_revenue',
    description: 'Get revenue data by date range, optionally grouped by day/week/month',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate: { type: 'string', description: 'Start date (ISO format)' },
        endDate: { type: 'string', description: 'End date (ISO format)' },
        groupBy: { type: 'string', enum: ['day', 'week', 'month'] },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'query_visits',
    description: 'Get visit data filtered by player, court, date range, or type',
    input_schema: {
      type: 'object' as const,
      properties: {
        playerId: { type: 'string' },
        courtNumber: { type: 'number' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        type: { type: 'string', enum: ['CASUAL', 'MEMBER_SESSION', 'LESSON', 'TOURNAMENT', 'PRIVATE_EVENT'] },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'query_members',
    description: 'Get member list, MRR calculation, churn risk, and renewal dates',
    input_schema: {
      type: 'object' as const,
      properties: {
        tier: { type: 'string', enum: ['STANDARD', 'UNLIMITED'] },
        churnRisk: { type: 'boolean', description: 'Filter for members at risk of churning' },
        expiringWithinDays: { type: 'number', description: 'Members expiring within N days' },
      },
    },
  },
  {
    name: 'query_leads',
    description: 'Get lead pipeline data with scoring and follow-up status',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', enum: ['NEW', 'HOT_LEAD', 'COLD_LEAD'] },
        minScore: { type: 'number' },
        sortBy: { type: 'string', enum: ['score', 'lastVisit', 'visits'] },
      },
    },
  },
  {
    name: 'draft_message',
    description: 'Create a message draft for a player via WhatsApp or email',
    input_schema: {
      type: 'object' as const,
      properties: {
        playerId: { type: 'string', description: 'Player ID to send message to' },
        channel: { type: 'string', enum: ['WHATSAPP', 'EMAIL'] },
        templateName: { type: 'string', description: 'Name of template to use (optional)' },
        customBody: { type: 'string', description: 'Custom message body (optional, used if no template)' },
        subject: { type: 'string', description: 'Email subject (optional)' },
      },
      required: ['playerId', 'channel'],
    },
  },
  {
    name: 'court_stats',
    description: 'Get court utilization statistics',
    input_schema: {
      type: 'object' as const,
      properties: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        courtNumber: { type: 'number' },
      },
    },
  },
  {
    name: 'run_sql',
    description: 'Execute a read-only SQL query. Only SELECT statements are allowed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'SQL SELECT query to execute' },
      },
      required: ['query'],
    },
  },
]

export { anthropic }
