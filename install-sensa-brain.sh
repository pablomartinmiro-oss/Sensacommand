#!/bin/bash
# ═══════════════════════════════════════════════════
# Sensa Brain — One-script installer
# Run from your sensa-command project root
# ═══════════════════════════════════════════════════

set -e
echo "🧠 Installing Sensa Brain..."
echo ""

# Step 1: Create directories
mkdir -p src/app/api/ai/brain
mkdir -p src/components/ai

echo "✓ Directories ready"

# Step 2: Create ai-brain-tools.ts
cat > src/lib/ai-brain-tools.ts << 'EOF_TOOLS'
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
      include: { goals: { select: { status: true, priority: true, dueDate: true } } },
    })

    const now = new Date()
    type TM = (typeof members)[number]
    type Goal = TM['goals'][number]
    return {
      team: members.map((m: TM) => ({
        name: `${m.firstName} ${m.lastName}`,
        role: m.role,
        total: m.goals.length,
        done: m.goals.filter((g: Goal) => g.status === 'DONE').length,
        inProgress: m.goals.filter((g: Goal) => g.status === 'IN_PROGRESS').length,
        overdue: m.goals.filter((g: Goal) => g.dueDate && g.dueDate < now && !['DONE', 'ON_HOLD'].includes(g.status)).length,
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

EOF_TOOLS
echo "✓ Created src/lib/ai-brain-tools.ts"

# Step 3: Create brain API route
cat > src/app/api/ai/brain/route.ts << 'EOF_ROUTE'
import { streamText, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { auth } from '@/lib/auth'
import { sensaBrainTools } from '@/lib/ai-brain-tools'

export const maxDuration = 60

const BRAIN_SYSTEM_PROMPT = `You are Sensa Brain — the AI command center for Sensa Padel, a 6-court padel club in Nashville, TN (Neuhoff district).

You help the GM (Pablo) run the business by querying live data and delivering clear, actionable answers.

RULES:
- Always query the database first — never guess numbers
- Be concise and direct. Use bullet points for lists
- Proactively suggest next actions (e.g. "Want me to check churn risk for those members?")
- Nashville timezone for all dates
- Currency is USD, format nicely ($1,234)
- If a question is complex, use run_sql to write a custom query
- When presenting player lists, include relevant context (visits, membership, last seen)

TEAM: Pablo Martin (GM), Aditya Khilnani (Ops), Marcus Y (Pro Shop), Arianna Gil (Marketing), Maria Sanz (Ops), Scott Mitchell (Finance), Sebastián Arce (Head Coach), Tripp Hostetter (Finance/Membership Sales)

MEMBERSHIP TIERS: Unlimited ($350/mo), Standard ($200/mo, 8 sessions), Casual ($40/visit)

You have 9 tools for querying players, revenue, members, leads, visits, courts, goals, team status, and raw SQL. Use them liberally.`

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages } = await req.json()

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: BRAIN_SYSTEM_PROMPT,
    messages,
    tools: sensaBrainTools,
    stopWhen: stepCountIs(8),
  })

  return result.toUIMessageStreamResponse()
}

EOF_ROUTE
echo "✓ Created src/app/api/ai/brain/route.ts"

# Step 4: Create floating widget
cat > src/components/ai/sensa-brain.tsx << 'EOF_WIDGET'
'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Brain, X, Send, Loader2, ChevronDown, Sparkles } from 'lucide-react'

// Extract text content from a UIMessage's parts array
function getMessageText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text!)
    .join('')
}

export function SensaBrain() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/ai/brain' }),
    []
  )

  const { messages, sendMessage, setMessages, status } = useChat({
    transport,
    onFinish: () => {
      if (!isOpen) setHasNewMessage(true)
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Send message handler
  const doSend = () => {
    const text = inputValue.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInputValue('')
  }

  // Handle Enter to submit (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doSend()
    }
  }

  const suggestions = [
    'How many new players this week?',
    "What's today's priority list?",
    'Show me members at churn risk',
    'Revenue last 7 days',
  ]

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50
          rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${isOpen
            ? 'bg-[#1A1A2E] text-white hover:bg-[#2a2a4e] scale-90'
            : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white hover:from-amber-500 hover:to-amber-700 hover:scale-110'
          }
        `}
        style={{ width: 52, height: 52 }}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <Brain className="w-6 h-6" />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`
          fixed z-40 transition-all duration-300 ease-out
          bottom-0 right-0 lg:bottom-20 lg:right-6
          ${isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
      >
        <div className="w-screen h-[100dvh] lg:w-[420px] lg:h-[600px] lg:rounded-2xl bg-white lg:shadow-2xl border border-[#E8E4DD] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E4DD] bg-[#1A1A2E]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">Sensa Brain</h3>
                <p className="text-[11px] text-gray-400 leading-tight">
                  {isLoading ? 'Thinking...' : 'Ask me anything about the club'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors lg:hidden"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#FAFAF8]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mb-4">
                  <Brain className="w-7 h-7 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-[#1A1A2E] mb-1">Hey Pablo 👋</p>
                <p className="text-xs text-gray-500 mb-5 max-w-[260px]">
                  I have live access to the Sensa database. Ask me anything about players, revenue, members, or the club.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-[300px]">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage({ text: s })}
                      className="text-left text-xs px-3 py-2.5 rounded-xl border border-[#E8E4DD] hover:border-amber-300 hover:bg-amber-50/50 text-gray-600 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const text = getMessageText(message.parts as Array<{ type: string; text?: string }>)
                  if (!text) return null

                  if (message.role === 'user') {
                    return (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-[#1A1A2E] text-white text-sm leading-relaxed">
                          {text}
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={message.id} className="flex justify-start">
                      <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-[#E8E4DD] text-sm text-[#1A1A2E] leading-relaxed shadow-sm">
                        <BrainMessage content={text} />
                      </div>
                    </div>
                  )
                })}
                {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-[#E8E4DD] shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Querying database...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[#E8E4DD] bg-white px-3 py-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Sensa Brain..."
                rows={1}
                className="flex-1 resize-none border border-[#E8E4DD] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 bg-[#FAFAF8] placeholder-gray-400 max-h-24"
                style={{ minHeight: 40 }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={doSend}
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-[#1A1A2E] text-white flex items-center justify-center hover:bg-[#2a2a4e] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Simple markdown-ish renderer for the brain's responses
function BrainMessage({ content }: { content: string }) {
  if (!content) return null

  const parts = content.split('\n')

  return (
    <div className="space-y-1.5">
      {parts.map((line, i) => {
        const formatted = line.replace(
          /\*\*(.+?)\*\*/g,
          '<strong class="font-semibold text-[#1A1A2E]">$1</strong>'
        )

        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s*/, '') }} />
            </div>
          )
        }

        if (/^\d+\.\s/.test(line.trim())) {
          return (
            <div key={i} className="pl-1" dangerouslySetInnerHTML={{ __html: formatted }} />
          )
        }

        if (!line.trim()) return <div key={i} className="h-1" />

        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
      })}
    </div>
  )
}

EOF_WIDGET
echo "✓ Created src/components/ai/sensa-brain.tsx"

# Step 5: Update app-shell.tsx
cat > src/components/layout/app-shell.tsx << 'EOF_SHELL'
'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { SensaBrain } from '@/components/ai/sensa-brain'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoginPage) {
      router.push('/login')
    }
  }, [status, isLoginPage, router])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="text-amber-500 text-lg font-heading">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-[#F8F7F4]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen pb-16 lg:pb-0">
        {children}
      </div>
      <MobileNav />
      <SensaBrain />
    </div>
  )
}

EOF_SHELL
echo "✓ Updated src/components/layout/app-shell.tsx"


echo ""
echo "═══════════════════════════════════════════════"
echo "🧠 Sensa Brain installed!"
echo ""
echo "Next steps:"
echo "  1. npm run dev"
echo "  2. Open any page"  
echo "  3. Click the gold brain icon (bottom-right)"
echo "  4. Ask: 'how many new players this week?'"
echo "═══════════════════════════════════════════════"
