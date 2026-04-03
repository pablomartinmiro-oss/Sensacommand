import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Helper to make Decimal serializable
const num = (v: unknown): number => Number(v) || 0

// ─── Query Players ──────────────────────────────────────────────
const queryPlayersSchema = z.object({
  status: z.enum(['NEW', 'ACTIVE', 'HOT_LEAD', 'COLD_LEAD', 'CONVERTED', 'CHURNED']).optional(),
  membershipType: z.enum(['NONE', 'STANDARD', 'UNLIMITED']).optional(),
  minVisits: z.number().optional().describe('Minimum number of visits'),
  lastVisitBefore: z.string().optional().describe('ISO date — players whose last visit was before this'),
  lastVisitAfter: z.string().optional().describe('ISO date — players whose last visit was after this'),
  search: z.string().optional().describe('Search by name or email'),
  limit: z.number().optional().describe('Max results (default 20)'),
})

export const queryPlayers = tool({
  description: 'Search and filter players by name, status, membership type, visit count, or last visit date',
  inputSchema: zodSchema(queryPlayersSchema),
  execute: async (input: z.infer<typeof queryPlayersSchema>) => {
    const where: Record<string, unknown> = {}
    if (input.status) where.status = input.status
    if (input.membershipType) where.membershipType = input.membershipType
    if (input.search) {
      where.OR = [
        { firstName: { contains: input.search, mode: 'insensitive' } },
        { lastName: { contains: input.search, mode: 'insensitive' } },
        { email: { contains: input.search, mode: 'insensitive' } },
      ]
    }

    const players = await prisma.player.findMany({
      where,
      include: {
        _count: { select: { visits: true } },
        visits: { orderBy: { date: 'desc' as const }, take: 1, select: { date: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit ?? 20,
    })

    type P = (typeof players)[number]
    let results = players.map((p: P) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
      phone: p.phone,
      status: p.status,
      membership: p.membershipType,
      monthlyRate: num(p.monthlyRate),
      visits: p._count.visits,
      lastVisit: p.visits[0]?.date?.toISOString().split('T')[0] ?? 'Never',
      tags: p.tags,
    }))

    type PlayerResult = (typeof results)[number]
    if (input.minVisits) results = results.filter((r: PlayerResult) => r.visits >= input.minVisits!)
    if (input.lastVisitBefore) {
      const before = new Date(input.lastVisitBefore)
      results = results.filter((r: PlayerResult) => r.lastVisit !== 'Never' && new Date(r.lastVisit) < before)
    }
    if (input.lastVisitAfter) {
      const after = new Date(input.lastVisitAfter)
      results = results.filter((r: PlayerResult) => r.lastVisit !== 'Never' && new Date(r.lastVisit) > after)
    }

    return { count: results.length, players: results }
  },
})

// ─── Query Revenue ──────────────────────────────────────────────
const queryRevenueSchema = z.object({
  startDate: z.string().describe('Start date (ISO format)'),
  endDate: z.string().describe('End date (ISO format)'),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
})

export const queryRevenue = tool({
  description: 'Get revenue data by date range, optionally grouped by day/week/month',
  inputSchema: zodSchema(queryRevenueSchema),
  execute: async (input: z.infer<typeof queryRevenueSchema>) => {
    const records = await prisma.dailyRevenue.findMany({
      where: { date: { gte: new Date(input.startDate), lte: new Date(input.endDate) } },
      orderBy: { date: 'asc' },
    })

    type RevTotals = { courtRentals: number; memberships: number; lessons: number; proShop: number; events: number; other: number; totalRevenue: number }
    type Rev = (typeof records)[number]
    const totals = records.reduce<RevTotals>(
      (acc: RevTotals, r: Rev) => ({
        courtRentals: acc.courtRentals + num(r.courtRentals),
        memberships: acc.memberships + num(r.memberships),
        lessons: acc.lessons + num(r.lessons),
        proShop: acc.proShop + num(r.proShop),
        events: acc.events + num(r.events),
        other: acc.other + num(r.other),
        totalRevenue: acc.totalRevenue + num(r.totalRevenue),
      }),
      { courtRentals: 0, memberships: 0, lessons: 0, proShop: 0, events: 0, other: 0, totalRevenue: 0 }
    )

    return {
      period: `${input.startDate} to ${input.endDate}`,
      days: records.length,
      totals,
      dailyAverage: records.length > 0 ? Math.round(totals.totalRevenue / records.length) : 0,
    }
  },
})

// ─── Query Members ──────────────────────────────────────────────
const queryMembersSchema = z.object({
  tier: z.enum(['STANDARD', 'UNLIMITED']).optional(),
  churnRisk: z.boolean().optional().describe('Filter for members at risk of churning'),
})

export const queryMembers = tool({
  description: 'Get active member list, MRR, churn risk, and renewal dates',
  inputSchema: zodSchema(queryMembersSchema),
  execute: async (input: z.infer<typeof queryMembersSchema>) => {
    const where: Record<string, unknown> = {
      membershipType: input.tier ? input.tier : { not: 'NONE' },
      status: 'ACTIVE',
    }

    const members = await prisma.player.findMany({
      where,
      include: {
        _count: { select: { visits: true } },
        visits: { orderBy: { date: 'desc' as const }, take: 5, select: { date: true } },
      },
      orderBy: { lastName: 'asc' },
    })

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    type M = (typeof members)[number]
    let results = members.map((m: M) => {
      const lastVisit = m.visits[0]?.date
      return {
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        email: m.email,
        tier: m.membershipType,
        monthlyRate: num(m.monthlyRate),
        totalVisits: m._count.visits,
        lastVisit: lastVisit?.toISOString().split('T')[0] ?? 'Never',
        membershipEnd: m.membershipEndDate?.toISOString().split('T')[0] ?? null,
        churnRisk: !lastVisit || lastVisit < thirtyDaysAgo,
      }
    })

    type MemberResult = (typeof results)[number]
    if (input.churnRisk) results = results.filter((r: MemberResult) => r.churnRisk)
    const mrr = results.reduce((sum: number, m: MemberResult) => sum + m.monthlyRate, 0)

    return { totalMembers: results.length, mrr, atRisk: results.filter((r: MemberResult) => r.churnRisk).length, members: results }
  },
})

// ─── Query Leads ────────────────────────────────────────────────
const queryLeadsSchema = z.object({
  status: z.enum(['NEW', 'HOT_LEAD', 'COLD_LEAD']).optional(),
  limit: z.number().optional(),
})

export const queryLeads = tool({
  description: 'Get lead pipeline data with visit counts and follow-up status',
  inputSchema: zodSchema(queryLeadsSchema),
  execute: async (input: z.infer<typeof queryLeadsSchema>) => {
    const leads = await prisma.player.findMany({
      where: { status: input.status ? input.status : { in: ['NEW', 'HOT_LEAD', 'COLD_LEAD'] } },
      include: {
        _count: { select: { visits: true, messages: true } },
        visits: { orderBy: { date: 'desc' as const }, take: 1, select: { date: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit ?? 20,
    })

    type L = (typeof leads)[number]
    return {
      count: leads.length,
      leads: leads.map((l: L) => ({
        id: l.id,
        name: `${l.firstName} ${l.lastName}`,
        email: l.email,
        phone: l.phone,
        status: l.status,
        visits: l._count.visits,
        messagesReceived: l._count.messages,
        lastVisit: l.visits[0]?.date?.toISOString().split('T')[0] ?? 'Never',
        source: l.source,
      })),
    }
  },
})

// ─── Query Visits ───────────────────────────────────────────────
const queryVisitsSchema = z.object({
  playerId: z.string().optional(),
  courtNumber: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(['CASUAL', 'MEMBER_SESSION', 'LESSON', 'TOURNAMENT', 'PRIVATE_EVENT']).optional(),
  limit: z.number().optional(),
})

export const queryVisits = tool({
  description: 'Get visit data filtered by player, court, date range, or type',
  inputSchema: zodSchema(queryVisitsSchema),
  execute: async (input: z.infer<typeof queryVisitsSchema>) => {
    const where: Record<string, unknown> = {}
    if (input.playerId) where.playerId = input.playerId
    if (input.courtNumber) where.courtNumber = input.courtNumber
    if (input.type) where.type = input.type
    if (input.startDate || input.endDate) {
      const d: Record<string, unknown> = {}
      if (input.startDate) d.gte = new Date(input.startDate)
      if (input.endDate) d.lte = new Date(input.endDate)
      where.date = d
    }

    const visits = await prisma.visit.findMany({
      where,
      include: { player: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
      take: input.limit ?? 20,
    })

    type V = (typeof visits)[number]
    return {
      count: visits.length,
      visits: visits.map((v: V) => ({
        id: v.id,
        player: `${v.player.firstName} ${v.player.lastName}`,
        court: v.courtNumber,
        date: v.date.toISOString().split('T')[0],
        type: v.type,
        paid: num(v.amountPaid),
      })),
    }
  },
})

// ─── Court Stats ────────────────────────────────────────────────
const courtStatsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  courtNumber: z.number().optional(),
})

export const courtStats = tool({
  description: 'Get court utilization statistics for all 6 courts',
  inputSchema: zodSchema(courtStatsSchema),
  execute: async (input: z.infer<typeof courtStatsSchema>) => {
    const where: Record<string, unknown> = {}
    if (input.courtNumber) where.courtNumber = input.courtNumber
    if (input.startDate || input.endDate) {
      const d: Record<string, unknown> = {}
      if (input.startDate) d.gte = new Date(input.startDate)
      if (input.endDate) d.lte = new Date(input.endDate)
      where.date = d
    }

    const visits = await prisma.visit.findMany({
      where,
      select: { courtNumber: true, amountPaid: true },
    })

    const byCourt: Record<number, { bookings: number; revenue: number }> = {}
    for (const v of visits) {
      if (!byCourt[v.courtNumber]) byCourt[v.courtNumber] = { bookings: 0, revenue: 0 }
      byCourt[v.courtNumber].bookings++
      byCourt[v.courtNumber].revenue += num(v.amountPaid)
    }

    return {
      totalBookings: visits.length,
      courts: Object.entries(byCourt)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([court, data]) => ({ court: Number(court), ...data })),
    }
  },
})

// ─── Daily Priorities ───────────────────────────────────────────
export const dailyPriorities = tool({
  description: "Get today's prioritized action plan: overdue goals, revenue trend, members at risk, leads to follow up",
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)

    const [overdueGoals, recentRevenue, atRiskMembers, hotLeads] = await Promise.all([
      prisma.goal.findMany({
        where: { dueDate: { lt: now }, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
        include: { assignees: { select: { firstName: true, lastName: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      prisma.dailyRevenue.findMany({
        where: { date: { gte: sevenDaysAgo } },
        orderBy: { date: 'desc' },
      }),
      prisma.player.findMany({
        where: {
          membershipType: { not: 'NONE' },
          status: 'ACTIVE',
          visits: { none: { date: { gte: thirtyDaysAgo } } },
        },
        select: { id: true, firstName: true, lastName: true, membershipType: true },
      }),
      prisma.player.findMany({
        where: { status: { in: ['NEW', 'HOT_LEAD'] } },
        include: { _count: { select: { visits: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    const weekRevenue = recentRevenue.reduce((s: number, r: (typeof recentRevenue)[number]) => s + num(r.totalRevenue), 0)

    return {
      date: today,
      overdueGoals: overdueGoals.map((g: (typeof overdueGoals)[number]) => ({
        id: g.id, title: g.title, priority: g.priority,
        dueDate: g.dueDate?.toISOString().split('T')[0],
        assignees: g.assignees.map((a: { firstName: string; lastName: string }) => `${a.firstName} ${a.lastName}`),
      })),
      revenue: { last7Days: weekRevenue, dailyAvg: recentRevenue.length > 0 ? Math.round(weekRevenue / recentRevenue.length) : 0 },
      membersAtRisk: atRiskMembers.map((m: (typeof atRiskMembers)[number]) => ({ id: m.id, name: `${m.firstName} ${m.lastName}`, tier: m.membershipType })),
      hotLeads: hotLeads.map((l: (typeof hotLeads)[number]) => ({ id: l.id, name: `${l.firstName} ${l.lastName}`, visits: l._count.visits })),
    }
  },
})

// ─── Team Status ────────────────────────────────────────────────
const teamStatusSchema = z.object({
  teamMember: z.string().optional().describe('Team member name (omit for all)'),
})

export const teamStatus = tool({
  description: 'Get per-person or all-team goal status overview',
  inputSchema: zodSchema(teamStatusSchema),
  execute: async (input: z.infer<typeof teamStatusSchema>) => {
    const members = await prisma.teamMember.findMany({
      where: input.teamMember
        ? { OR: [
            { firstName: { contains: input.teamMember, mode: 'insensitive' as const } },
            { lastName: { contains: input.teamMember, mode: 'insensitive' as const } },
          ] }
        : { isActive: true },
      include: { assignedGoals: { select: { status: true, priority: true, dueDate: true } } },
    })

    const now = new Date()
    type TM = (typeof members)[number]
    type Goal = TM['assignedGoals'][number]
    return {
      team: members.map((m: TM) => ({
        name: `${m.firstName} ${m.lastName}`,
        role: m.role,
        total: m.assignedGoals.length,
        done: m.assignedGoals.filter((g: Goal) => g.status === 'DONE').length,
        inProgress: m.assignedGoals.filter((g: Goal) => g.status === 'IN_PROGRESS').length,
        overdue: m.assignedGoals.filter((g: Goal) => g.dueDate && g.dueDate < now && !['DONE', 'ON_HOLD'].includes(g.status)).length,
      })),
    }
  },
})

// ─── Run SQL ────────────────────────────────────────────────────
const runSqlSchema = z.object({
  query: z.string().describe('SQL SELECT query to execute'),
})

export const runSql = tool({
  description: 'Execute a read-only SQL query for complex questions. Only SELECT statements allowed.',
  inputSchema: zodSchema(runSqlSchema),
  execute: async (input: z.infer<typeof runSqlSchema>) => {
    const q = input.query.trim()
    if (!q.toUpperCase().startsWith('SELECT')) {
      return { error: 'Only SELECT queries are allowed' }
    }
    try {
      const result = await prisma.$queryRawUnsafe(q)
      const rows = Array.isArray(result) ? result : [result]
      return { rowCount: rows.length, rows: rows.slice(0, 50) }
    } catch (e) {
      return { error: `SQL error: ${(e as Error).message}` }
    }
  },
})

// ─── Aggregate all tools ────────────────────────────────────────
export const sensaBrainTools = {
  query_players: queryPlayers,
  query_revenue: queryRevenue,
  query_members: queryMembers,
  query_leads: queryLeads,
  query_visits: queryVisits,
  court_stats: courtStats,
  daily_priorities: dailyPriorities,
  team_status: teamStatus,
  run_sql: runSql,
}

