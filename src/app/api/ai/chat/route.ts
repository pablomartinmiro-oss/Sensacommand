import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { anthropic, SYSTEM_PROMPT, AI_TOOLS } from '@/lib/anthropic'
import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationId: z.string().optional().nullable(),
})

const MAX_TOOL_ROUNDS = 10

interface ToolInput {
  status?: string
  membershipType?: string
  minVisits?: number
  maxVisits?: number
  lastVisitBefore?: string
  lastVisitAfter?: string
  search?: string
  limit?: number
  startDate?: string
  endDate?: string
  groupBy?: string
  playerId?: string
  courtNumber?: number
  type?: string
  tier?: string
  churnRisk?: boolean
  expiringWithinDays?: number
  minScore?: number
  sortBy?: string
  channel?: string
  templateName?: string
  customBody?: string
  subject?: string
  query?: string
  // Goals tools
  assignee?: string
  category?: string
  priority?: string
  overdue?: boolean
  goalId?: string
  dueDate?: string
  title?: string
  assignees?: string[]
  categories?: string[]
  description?: string
}

// Types for Prisma query results used in callbacks
interface PlayerWithCounts {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  status: string
  membershipType: string
  monthlyRate: unknown
  tags: string[]
  membershipEndDate: Date | null
  source: string | null
  _count: { visits: number; payments?: number }
  visits: { date: Date }[]
  messages?: { id: string }[]
}

interface RevenueRecord {
  totalRevenue: unknown
  courtRentals: unknown
  memberships: unknown
  lessons: unknown
  proShop: unknown
  events: unknown
  other: unknown
}

interface VisitRecord {
  id: string
  playerId: string
  courtNumber: number
  date: Date
  startTime: Date
  endTime: Date
  type: string
  amountPaid: unknown
  player: { firstName: string; lastName: string }
}

interface CourtVisitRecord {
  courtNumber: number
  startTime: Date
  amountPaid: unknown
}

interface LeadResult {
  id: string
  name: string
  email: string | null
  status: string
  score: number
  factors: string[]
  totalVisits: number
  lastVisit: Date | null
}

interface MemberResult {
  id: string
  name: string
  email: string | null
  membershipType: string
  monthlyRate: number | null
  visits: number
  lastVisit: Date | undefined
  churnRisk: boolean
  daysUntilExpiry: number | null
}

async function executeToolCall(name: string, input: ToolInput): Promise<string> {
  try {
    switch (name) {
      case 'query_players': {
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
          take: input.limit || 20,
          include: {
            _count: { select: { visits: true, payments: true } },
            visits: { orderBy: { date: 'desc' }, take: 1, select: { date: true } },
          },
          orderBy: { createdAt: 'desc' },
        })

        let filtered = players as PlayerWithCounts[]
        if (input.minVisits !== undefined) {
          filtered = filtered.filter((p: PlayerWithCounts) => p._count.visits >= (input.minVisits ?? 0))
        }
        if (input.maxVisits !== undefined) {
          filtered = filtered.filter((p: PlayerWithCounts) => p._count.visits <= (input.maxVisits ?? Infinity))
        }
        if (input.lastVisitBefore) {
          const before = new Date(input.lastVisitBefore)
          filtered = filtered.filter((p: PlayerWithCounts) => {
            const last = p.visits[0]?.date
            return last && new Date(last) < before
          })
        }
        if (input.lastVisitAfter) {
          const after = new Date(input.lastVisitAfter)
          filtered = filtered.filter((p: PlayerWithCounts) => {
            const last = p.visits[0]?.date
            return last && new Date(last) > after
          })
        }

        return JSON.stringify({
          count: filtered.length,
          players: filtered.map((p: PlayerWithCounts) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            email: p.email,
            phone: p.phone,
            status: p.status,
            membershipType: p.membershipType,
            monthlyRate: p.monthlyRate ? Number(p.monthlyRate) : null,
            visits: p._count.visits,
            payments: p._count.payments,
            lastVisit: p.visits[0]?.date ?? null,
            tags: p.tags,
          })),
        })
      }

      case 'query_revenue': {
        const where: Record<string, unknown> = {}
        if (input.startDate || input.endDate) {
          const dateFilter: { gte?: Date; lte?: Date } = {}
          if (input.startDate) dateFilter.gte = new Date(input.startDate)
          if (input.endDate) dateFilter.lte = new Date(input.endDate)
          where.date = dateFilter
        }

        const revenue = await prisma.dailyRevenue.findMany({
          where,
          orderBy: { date: 'asc' },
        })

        const revenueData = revenue as RevenueRecord[]
        const summary = {
          totalRevenue: revenueData.reduce((s: number, r: RevenueRecord) => s + Number(r.totalRevenue), 0),
          courtRentals: revenueData.reduce((s: number, r: RevenueRecord) => s + Number(r.courtRentals), 0),
          memberships: revenueData.reduce((s: number, r: RevenueRecord) => s + Number(r.memberships), 0),
          lessons: revenueData.reduce((s: number, r: RevenueRecord) => s + Number(r.lessons), 0),
          proShop: revenueData.reduce((s: number, r: RevenueRecord) => s + Number(r.proShop), 0),
          events: revenueData.reduce((s: number, r: RevenueRecord) => s + Number(r.events), 0),
          other: revenueData.reduce((s: number, r: RevenueRecord) => s + Number(r.other), 0),
          days: revenueData.length,
        }

        if (input.groupBy === 'day') {
          return JSON.stringify({ summary, daily: revenue })
        }
        return JSON.stringify({ summary })
      }

      case 'query_visits': {
        const where: Record<string, unknown> = {}
        if (input.playerId) where.playerId = input.playerId
        if (input.courtNumber) where.courtNumber = input.courtNumber
        if (input.type) where.type = input.type
        if (input.startDate || input.endDate) {
          const dateFilter: { gte?: Date; lte?: Date } = {}
          if (input.startDate) dateFilter.gte = new Date(input.startDate)
          if (input.endDate) dateFilter.lte = new Date(input.endDate)
          where.date = dateFilter
        }

        const visits = await prisma.visit.findMany({
          where,
          take: input.limit || 50,
          orderBy: { date: 'desc' },
          include: { player: { select: { firstName: true, lastName: true } } },
        })

        const visitData = visits as VisitRecord[]
        return JSON.stringify({
          count: visitData.length,
          visits: visitData.map((v: VisitRecord) => ({
            id: v.id,
            player: `${v.player.firstName} ${v.player.lastName}`,
            playerId: v.playerId,
            court: v.courtNumber,
            date: v.date,
            startTime: v.startTime,
            endTime: v.endTime,
            type: v.type,
            amountPaid: Number(v.amountPaid),
          })),
        })
      }

      case 'query_members': {
        const where: Record<string, unknown> = { membershipType: { not: 'NONE' as const } }
        if (input.tier) where.membershipType = input.tier

        const members = await prisma.player.findMany({
          where,
          include: {
            visits: { orderBy: { date: 'desc' }, take: 1, select: { date: true } },
            _count: { select: { visits: true } },
          },
        })

        const now = new Date()
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
        const memberData = members as PlayerWithCounts[]

        let result: MemberResult[] = memberData.map((m: PlayerWithCounts) => {
          const lastVisit = m.visits[0]?.date
          const isChurnRisk = !lastVisit || new Date(lastVisit) < fourteenDaysAgo
          const daysUntilExpiry = m.membershipEndDate
            ? Math.ceil((new Date(m.membershipEndDate).getTime() - now.getTime()) / 86400000)
            : null

          return {
            id: m.id,
            name: `${m.firstName} ${m.lastName}`,
            email: m.email,
            membershipType: m.membershipType,
            monthlyRate: m.monthlyRate ? Number(m.monthlyRate) : null,
            visits: m._count.visits,
            lastVisit,
            churnRisk: isChurnRisk,
            daysUntilExpiry,
          }
        })

        if (input.churnRisk) result = result.filter((m: MemberResult) => m.churnRisk)
        if (input.expiringWithinDays !== undefined) {
          result = result.filter(
            (m: MemberResult) => m.daysUntilExpiry !== null && m.daysUntilExpiry <= (input.expiringWithinDays ?? 0) && m.daysUntilExpiry >= 0
          )
        }

        const totalMrr = result.reduce((s: number, m: MemberResult) => s + (m.monthlyRate ?? 0), 0)
        return JSON.stringify({ count: result.length, totalMrr, members: result })
      }

      case 'query_leads': {
        const where: Record<string, unknown> = { membershipType: 'NONE' }
        if (input.status) where.status = input.status

        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

        const players = await prisma.player.findMany({
          where,
          include: {
            visits: { select: { date: true }, orderBy: { date: 'desc' } },
            messages: { where: { direction: 'INBOUND' }, select: { id: true } },
            _count: { select: { visits: true } },
          },
        })

        const playerData = players as PlayerWithCounts[]
        const leads: LeadResult[] = playerData.map((p: PlayerWithCounts) => {
          let score = 0
          const factors: string[] = []
          const visitsLast30 = p.visits.filter((v: { date: Date }) => new Date(v.date) >= thirtyDaysAgo).length
          if (visitsLast30 > 0) { score += visitsLast30 * 20; factors.push(`${visitsLast30} visit(s) in 30d`) }
          if (p.messages && p.messages.length > 0) { score += 15; factors.push('Responded') }
          if (p.visits.some((v: { date: Date }) => new Date(v.date) >= sevenDaysAgo)) { score += 25; factors.push('Recent visit') }
          if (p.source === 'REFERRAL') { score += 10; factors.push('Referral') }
          return {
            id: p.id, name: `${p.firstName} ${p.lastName}`, email: p.email,
            status: p.status, score, factors, totalVisits: p._count.visits,
            lastVisit: p.visits[0]?.date ?? null,
          }
        })

        leads.sort((a: LeadResult, b: LeadResult) => b.score - a.score)
        const filtered = input.minScore !== undefined
          ? leads.filter((l: LeadResult) => l.score >= (input.minScore ?? 0))
          : leads
        return JSON.stringify({ count: filtered.length, leads: filtered })
      }

      case 'draft_message': {
        if (!input.playerId || !input.channel) {
          return JSON.stringify({ error: 'playerId and channel are required' })
        }

        const player = await prisma.player.findUnique({
          where: { id: input.playerId },
          select: { firstName: true, lastName: true, email: true, whatsappPhone: true },
        })
        if (!player) return JSON.stringify({ error: 'Player not found' })

        let body = input.customBody || ''
        if (input.templateName) {
          const template = await prisma.messageTemplate.findUnique({ where: { name: input.templateName } })
          if (template) {
            body = template.body
              .replace(/\{\{firstName\}\}/g, player.firstName)
              .replace(/\{\{lastName\}\}/g, player.lastName)
          }
        }

        const message = await prisma.message.create({
          data: {
            playerId: input.playerId,
            channel: input.channel as 'WHATSAPP' | 'EMAIL' | 'SMS' | 'IN_APP',
            direction: 'OUTBOUND',
            subject: input.subject ?? null,
            body,
            status: 'DRAFT',
            templateUsed: input.templateName ?? null,
          },
        })

        return JSON.stringify({
          success: true, messageId: message.id,
          to: `${player.firstName} ${player.lastName}`,
          channel: input.channel, body, status: 'DRAFT',
        })
      }

      case 'court_stats': {
        const where: Record<string, unknown> = {}
        if (input.courtNumber) where.courtNumber = input.courtNumber
        if (input.startDate || input.endDate) {
          const dateFilter: { gte?: Date; lte?: Date } = {}
          if (input.startDate) dateFilter.gte = new Date(input.startDate)
          if (input.endDate) dateFilter.lte = new Date(input.endDate)
          where.date = dateFilter
        }

        const visits = await prisma.visit.findMany({
          where,
          select: { courtNumber: true, startTime: true, amountPaid: true },
        })

        const courtVisits = visits as CourtVisitRecord[]
        const courtStats: Record<number, { count: number; revenue: number }> = {}
        const hourStats: Record<number, number> = {}
        for (const v of courtVisits) {
          const court = v.courtNumber
          const hour = new Date(v.startTime).getHours()
          if (!courtStats[court]) courtStats[court] = { count: 0, revenue: 0 }
          courtStats[court].count++
          courtStats[court].revenue += Number(v.amountPaid)
          hourStats[hour] = (hourStats[hour] || 0) + 1
        }

        const peakHours = Object.entries(hourStats)
          .sort((a, b) => b[1] - a[1]).slice(0, 3)
          .map(([h, c]) => ({ hour: Number(h), bookings: c }))

        return JSON.stringify({
          totalBookings: courtVisits.length,
          courtStats: Object.entries(courtStats).map(([c, s]) => ({ court: Number(c), bookings: s.count, revenue: s.revenue })),
          peakHours,
        })
      }

      case 'run_sql': {
        const query = input.query?.trim() || ''
        if (!query.toUpperCase().startsWith('SELECT')) {
          return JSON.stringify({ error: 'Only SELECT queries are allowed' })
        }
        const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE']
        for (const word of forbidden) {
          if (query.toUpperCase().includes(word)) {
            return JSON.stringify({ error: `Forbidden SQL keyword: ${word}` })
          }
        }
        const result = await prisma.$queryRawUnsafe(query)
        return JSON.stringify({ rows: result })
      }

      case 'query_goals': {
        const where: Record<string, unknown> = {}
        if (input.status) where.status = input.status
        if (input.priority) where.priority = input.priority
        if (input.category) where.categories = { has: input.category }
        if (input.search) where.title = { contains: input.search, mode: 'insensitive' }
        if (input.overdue) {
          where.dueDate = { lt: new Date() }
          where.status = { notIn: ['DONE', 'ON_HOLD'] }
        }
        if (input.assignee) {
          where.assignees = {
            some: {
              OR: [
                { firstName: { contains: input.assignee, mode: 'insensitive' } },
                { lastName: { contains: input.assignee, mode: 'insensitive' } },
              ],
            },
          }
        }

        const goals = await prisma.goal.findMany({
          where,
          take: input.limit || 20,
          orderBy: { createdAt: 'desc' },
          include: {
            assignees: { select: { firstName: true, lastName: true } },
          },
        })

        return JSON.stringify({
          count: goals.length,
          goals: goals.map(g => ({
            id: g.id,
            title: g.title,
            status: g.status,
            priority: g.priority,
            categories: g.categories,
            assignees: g.assignees.map(a => `${a.firstName} ${a.lastName}`),
            dueDate: g.dueDate,
            isOverdue: g.dueDate && new Date(g.dueDate) < new Date() && g.status !== 'DONE' && g.status !== 'ON_HOLD',
          })),
        })
      }

      case 'update_goal': {
        if (!input.goalId) return JSON.stringify({ error: 'goalId is required' })
        const updateData: Record<string, unknown> = {}
        if (input.status) {
          updateData.status = input.status
          if (input.status === 'DONE') updateData.completedDate = new Date()
        }
        if (input.priority) updateData.priority = input.priority
        if (input.dueDate) updateData.dueDate = new Date(input.dueDate)

        const updated = await prisma.goal.update({
          where: { id: input.goalId },
          data: updateData,
          include: { assignees: { select: { firstName: true, lastName: true } } },
        })

        return JSON.stringify({
          success: true,
          goal: {
            id: updated.id,
            title: updated.title,
            status: updated.status,
            priority: updated.priority,
            assignees: updated.assignees.map(a => `${a.firstName} ${a.lastName}`),
          },
        })
      }

      case 'create_goal': {
        if (!input.title) return JSON.stringify({ error: 'title is required' })

        // Resolve assignee names to IDs
        let assigneeConnect: { id: string }[] = []
        if (input.assignees && input.assignees.length > 0) {
          const allMembers = await prisma.teamMember.findMany({ where: { isActive: true } })
          assigneeConnect = input.assignees.map(name => {
            const member = allMembers.find(m =>
              `${m.firstName} ${m.lastName}`.toLowerCase().includes(name.toLowerCase()) ||
              m.firstName.toLowerCase().includes(name.toLowerCase())
            )
            return member ? { id: member.id } : null
          }).filter((m): m is { id: string } => m !== null)
        }

        const created = await prisma.goal.create({
          data: {
            title: input.title,
            description: input.description || null,
            priority: (input.priority as 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE') || 'NONE',
            categories: input.categories || [],
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            assignees: assigneeConnect.length > 0 ? { connect: assigneeConnect } : undefined,
          },
          include: { assignees: { select: { firstName: true, lastName: true } } },
        })

        return JSON.stringify({
          success: true,
          goal: {
            id: created.id,
            title: created.title,
            status: created.status,
            assignees: created.assignees.map(a => `${a.firstName} ${a.lastName}`),
          },
        })
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (e) {
    return JSON.stringify({ error: (e as Error).message })
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const conversationId = searchParams.get('conversationId')

    if (conversationId) {
      const conversation = await prisma.aIConversation.findUnique({
        where: { id: conversationId },
      })
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      }
      return NextResponse.json({ data: conversation })
    }

    const conversations = await prisma.aIConversation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, title: true, createdAt: true },
    })

    return NextResponse.json({ data: conversations })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = chatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { message, conversationId } = parsed.data

    let conversation: { id: string; messages: Anthropic.MessageParam[] }

    if (conversationId) {
      const existing = await prisma.aIConversation.findUnique({
        where: { id: conversationId },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Not found', message: 'Conversation not found' }, { status: 404 })
      }

      const storedMsgs = (existing.messages as unknown as { role: string; content: string }[]) || []
      conversation = {
        id: existing.id,
        messages: storedMsgs.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      }
    } else {
      const created = await prisma.aIConversation.create({
        data: { title: message.slice(0, 100), messages: [] },
      })
      conversation = { id: created.id, messages: [] }
    }

    conversation.messages.push({ role: 'user', content: message })

    const currentMessages: Anthropic.MessageParam[] = [...conversation.messages]
    let finalText = ''
    let rounds = 0

    while (rounds < MAX_TOOL_ROUNDS) {
      rounds++

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: AI_TOOLS,
        messages: currentMessages,
      })

      if (response.stop_reason === 'tool_use') {
        currentMessages.push({ role: 'assistant', content: response.content })

        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await executeToolCall(block.name, block.input as ToolInput)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: result,
            })
          }
        }

        currentMessages.push({ role: 'user', content: toolResults })
      } else {
        for (const block of response.content) {
          if (block.type === 'text') {
            finalText += block.text
          }
        }
        currentMessages.push({ role: 'assistant', content: response.content })
        break
      }
    }

    const savedMessages = currentMessages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      timestamp: new Date().toISOString(),
    }))

    const title = !conversationId
      ? message.slice(0, 60) + (message.length > 60 ? '...' : '')
      : undefined

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: {
        messages: savedMessages,
        ...(title ? { title } : {}),
      },
    })

    return NextResponse.json({
      data: {
        conversationId: conversation.id,
        response: finalText,
        toolRounds: rounds,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
