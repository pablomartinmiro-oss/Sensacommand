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
  // Social tools
  platform?: string
  scheduledFor?: string
  // Review tools
  teamMember?: string
  question?: string
  goalIds?: string[]
  daysOverdue?: number
  newDate?: string
  // Webhook tools
  eventType?: string
  // Leave tools
  requestId?: string
  // Savings & referral tools
  playerName?: string
  action?: string
  memberId?: string
  referrerId?: string
  referredId?: string
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

        // Use stored Player fields for visits/scores
        if (input.minVisits !== undefined) where.totalVisits = { ...(where.totalVisits as object || {}), gte: input.minVisits }
        if (input.maxVisits !== undefined) where.totalVisits = { ...(where.totalVisits as object || {}), lte: input.maxVisits }
        if (input.lastVisitBefore) where.lastVisitDate = { ...(where.lastVisitDate as object || {}), lt: new Date(input.lastVisitBefore) }
        if (input.lastVisitAfter) where.lastVisitDate = { ...(where.lastVisitDate as object || {}), gt: new Date(input.lastVisitAfter) }

        const players = await prisma.player.findMany({
          where,
          take: input.limit || 20,
          orderBy: { conversionScore: 'desc' },
        })

        return JSON.stringify({
          count: players.length,
          players: players.map((p) => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            email: p.email,
            phone: p.phone,
            status: p.status,
            membershipType: p.membershipType,
            monthlyRate: p.monthlyRate ? Number(p.monthlyRate) : null,
            totalVisits: p.totalVisits,
            lastVisit: p.lastVisitDate,
            entryChannel: p.entryChannel,
            conversionScore: p.conversionScore,
            funnelStage: p.funnelStage,
            firstVisitProgram: p.firstVisitProgram,
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

      case 'create_social_post': {
        if (!input.description) return JSON.stringify({ error: 'description is required' })
        const platform = input.platform || 'INSTAGRAM'

        // Generate content via internal API call
        const genRes = await fetch(new URL('/api/social/posts/generate', 'http://localhost:3000'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: input.description, platform }),
        })

        let content = input.description
        let hashtags: string[] = []
        if (genRes.ok) {
          const genData = await genRes.json()
          const key = platform.toLowerCase()
          const postData = genData.data?.[key] || Object.values(genData.data || {})[0] as { content?: string; hashtags?: string[] } | undefined
          if (postData && typeof postData === 'object' && 'content' in postData) {
            content = (postData as { content: string }).content
            hashtags = ((postData as { hashtags?: string[] }).hashtags) || []
          }
        }

        const post = await prisma.socialPost.create({
          data: {
            title: input.description.slice(0, 60),
            content,
            platform,
            hashtags,
            status: input.scheduledFor ? 'SCHEDULED' : 'DRAFT',
            scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
          },
        })

        return JSON.stringify({ success: true, post: { id: post.id, title: post.title, platform, status: post.status, content: content.slice(0, 200) } })
      }

      case 'query_social_posts': {
        const where: Record<string, unknown> = {}
        if (input.platform) where.platform = input.platform
        if (input.status) where.status = input.status
        if (input.category) where.category = input.category

        const socialPosts = await prisma.socialPost.findMany({
          where,
          take: 20,
          orderBy: { createdAt: 'desc' },
        })

        return JSON.stringify({
          count: socialPosts.length,
          posts: socialPosts.map(p => ({
            id: p.id, title: p.title, platform: p.platform, status: p.status,
            category: p.category, scheduledFor: p.scheduledFor,
          })),
        })
      }

      case 'daily_priorities': {
        const today = new Date()
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        const weekAgo = new Date(todayStart.getTime() - 7 * 86400000)

        const [dueToday, overdueHigh, drafts, weekRevenue] = await Promise.all([
          prisma.goal.findMany({ where: { dueDate: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) }, status: { notIn: ['DONE', 'ON_HOLD'] } }, include: { assignees: { select: { firstName: true } } }, take: 5 }),
          prisma.goal.findMany({ where: { dueDate: { lt: todayStart }, status: { notIn: ['DONE', 'ON_HOLD'] }, priority: 'HIGH' }, include: { assignees: { select: { firstName: true } } }, take: 5 }),
          prisma.message.count({ where: { status: 'DRAFT' } }),
          prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: weekAgo } } }),
        ])

        return JSON.stringify({
          goalsDueToday: dueToday.map(g => ({ title: g.title, assignees: g.assignees.map(a => a.firstName) })),
          overdueHighPriority: overdueHigh.map(g => ({ title: g.title, assignees: g.assignees.map(a => a.firstName) })),
          draftMessagesWaiting: drafts,
          weekRevenue: Number(weekRevenue._sum.amount ?? 0),
        })
      }

      case 'team_status': {
        const members = await prisma.teamMember.findMany({
          where: input.teamMember ? { OR: [{ firstName: { contains: input.teamMember, mode: 'insensitive' } }, { lastName: { contains: input.teamMember, mode: 'insensitive' } }] } : { isActive: true },
          include: { assignedGoals: { select: { status: true, dueDate: true, completedDate: true } } },
        })

        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 86400000)

        return JSON.stringify(members.map(m => ({
          name: `${m.firstName} ${m.lastName}`,
          role: m.role,
          inProgress: m.assignedGoals.filter(g => g.status === 'IN_PROGRESS').length,
          overdue: m.assignedGoals.filter(g => g.dueDate && new Date(g.dueDate) < now && g.status !== 'DONE' && g.status !== 'ON_HOLD').length,
          completedThisWeek: m.assignedGoals.filter(g => g.status === 'DONE' && g.completedDate && new Date(g.completedDate) >= weekAgo).length,
          dueThisWeek: m.assignedGoals.filter(g => g.dueDate && new Date(g.dueDate) >= now && new Date(g.dueDate) <= new Date(now.getTime() + 7 * 86400000) && g.status !== 'DONE').length,
          total: m.assignedGoals.length,
        })))
      }

      case 'goal_insights': {
        const allGoals = await prisma.goal.findMany({
          include: { assignees: { select: { firstName: true, lastName: true } } },
        })
        const now = new Date()
        const overdue = allGoals.filter(g => g.dueDate && new Date(g.dueDate) < now && g.status !== 'DONE' && g.status !== 'ON_HOLD')

        // Group overdue by category
        const byCategory: Record<string, number> = {}
        overdue.forEach(g => g.categories.forEach(c => { byCategory[c] = (byCategory[c] || 0) + 1 }))

        // Most stuck (oldest overdue)
        const stuckest = overdue.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 5)

        // Completions by assignee
        const completions: Record<string, number> = {}
        allGoals.filter(g => g.status === 'DONE').forEach(g => g.assignees.forEach(a => { const n = `${a.firstName} ${a.lastName}`; completions[n] = (completions[n] || 0) + 1 }))

        return JSON.stringify({
          question: input.question,
          totalGoals: allGoals.length,
          overdueCount: overdue.length,
          overdueByCategory: byCategory,
          longestStuck: stuckest.map(g => ({ title: g.title, daysOverdue: Math.ceil((now.getTime() - new Date(g.dueDate!).getTime()) / 86400000), assignees: g.assignees.map(a => `${a.firstName} ${a.lastName}`) })),
          completionsByAssignee: completions,
        })
      }

      case 'snooze_goals': {
        if (!input.newDate) return JSON.stringify({ error: 'newDate is required' })
        const newDueDate = new Date(input.newDate)
        const now = new Date()

        let goalIds: string[] = input.goalIds || []

        if (!goalIds.length && input.assignee) {
          const goals = await prisma.goal.findMany({
            where: { dueDate: { lt: now }, status: { notIn: ['DONE', 'ON_HOLD'] }, assignees: { some: { OR: [{ firstName: { contains: input.assignee, mode: 'insensitive' } }, { lastName: { contains: input.assignee, mode: 'insensitive' } }] } } },
            select: { id: true },
          })
          goalIds = goals.map(g => g.id)
        }

        if (!goalIds.length && input.daysOverdue) {
          const cutoff = new Date(now.getTime() - input.daysOverdue * 86400000)
          const goals = await prisma.goal.findMany({
            where: { dueDate: { lt: cutoff }, status: { notIn: ['DONE', 'ON_HOLD'] } },
            select: { id: true },
          })
          goalIds = goals.map(g => g.id)
        }

        if (goalIds.length === 0) return JSON.stringify({ snoozed: 0, message: 'No matching goals found' })

        await prisma.goal.updateMany({ where: { id: { in: goalIds } }, data: { dueDate: newDueDate } })
        await prisma.goalActivity.createMany({
          data: goalIds.map(id => ({ goalId: id, action: 'SNOOZED', toValue: newDueDate.toISOString(), performedBy: 'AI' })),
        })

        return JSON.stringify({ snoozed: goalIds.length, newDate: newDueDate.toISOString() })
      }

      case 'weekly_summary': {
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 86400000)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)

        const [completed, newOverdue, thisWeekRev, lastWeekRev, newMembers, churned, newPlayers] = await Promise.all([
          prisma.goal.count({ where: { status: 'DONE', completedDate: { gte: weekAgo } } }),
          prisma.goal.count({ where: { dueDate: { gte: weekAgo, lt: now }, status: { notIn: ['DONE', 'ON_HOLD'] } } }),
          prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: weekAgo } } }),
          prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: twoWeeksAgo, lt: weekAgo } } }),
          prisma.player.count({ where: { membershipType: { not: 'NONE' }, membershipStartDate: { gte: weekAgo } } }),
          prisma.player.count({ where: { status: 'CHURNED', updatedAt: { gte: weekAgo } } }),
          prisma.player.count({ where: { createdAt: { gte: weekAgo } } }),
        ])

        const twRev = Number(thisWeekRev._sum.amount ?? 0)
        const lwRev = Number(lastWeekRev._sum.amount ?? 0)

        return JSON.stringify({
          goalsCompleted: completed,
          goalsBecameOverdue: newOverdue,
          revenue: { thisWeek: twRev, lastWeek: lwRev, change: lwRev > 0 ? Math.round(((twRev - lwRev) / lwRev) * 100) : null },
          newMembers,
          churned,
          newPlayers,
        })
      }

      case 'query_leave': {
        const where: Record<string, unknown> = {}
        if (input.status) where.status = input.status
        if (input.teamMember) {
          where.teamMember = { OR: [{ firstName: { contains: input.teamMember, mode: 'insensitive' } }, { lastName: { contains: input.teamMember, mode: 'insensitive' } }] }
        }
        if (input.startDate) where.startDate = { gte: new Date(input.startDate) }
        if (input.endDate) where.endDate = { lte: new Date(input.endDate) }

        const [requests, allowances] = await Promise.all([
          prisma.leaveRequest.findMany({
            where, take: 20, orderBy: { startDate: 'desc' },
            include: { teamMember: { select: { firstName: true, lastName: true } } },
          }),
          prisma.leaveAllowance.findMany({
            where: { year: new Date().getFullYear() },
            include: { teamMember: { select: { firstName: true, lastName: true } } },
          }),
        ])

        return JSON.stringify({
          requests: requests.map(r => ({
            id: r.id, member: `${r.teamMember.firstName} ${r.teamMember.lastName}`,
            dates: `${r.startDate.toISOString().split('T')[0]} to ${r.endDate.toISOString().split('T')[0]}`,
            days: r.days, type: r.type, status: r.status, reason: r.reason,
          })),
          allowances: allowances.map(a => ({
            member: `${a.teamMember.firstName} ${a.teamMember.lastName}`,
            total: a.totalDays, used: a.usedDays, remaining: a.totalDays - a.usedDays,
          })),
        })
      }

      case 'approve_leave': {
        const reqId = input.requestId
        if (!reqId) return JSON.stringify({ error: 'requestId is required' })

        const req = await prisma.leaveRequest.findUnique({ where: { id: reqId }, include: { teamMember: true } })
        if (!req) return JSON.stringify({ error: 'Request not found' })
        if (req.status !== 'PENDING') return JSON.stringify({ error: `Request is already ${req.status}` })

        await prisma.leaveRequest.update({ where: { id: reqId }, data: { status: 'APPROVED', approvedBy: 'Pablo Martin', approvedAt: new Date() } })
        await prisma.leaveAllowance.updateMany({ where: { teamMemberId: req.teamMemberId, year: new Date().getFullYear() }, data: { usedDays: { increment: req.days } } })

        return JSON.stringify({ success: true, approved: `${req.teamMember.firstName} ${req.teamMember.lastName} — ${req.days} days ${req.type}` })
      }

      case 'query_webhook_events': {
        const where: Record<string, unknown> = { source: 'playbypoint' }
        if (input.eventType) where.event = input.eventType
        if (input.status) where.status = input.status

        const events = await prisma.webhookEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: input.limit || 10,
          select: { id: true, event: true, status: true, createdAt: true, playerId: true, error: true },
        })

        return JSON.stringify({
          count: events.length,
          events: events.map(e => ({
            id: e.id, event: e.event, status: e.status,
            time: e.createdAt, playerId: e.playerId, error: e.error,
          })),
        })
      }

      case 'create_automation': {
        if (!input.description) return JSON.stringify({ error: 'description is required' })

        const autoRes = await fetch(new URL('/api/automations/ai-create', 'http://localhost:3000'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: input.description }),
        })

        if (!autoRes.ok) {
          const err = await autoRes.json()
          return JSON.stringify({ error: err.error || 'Failed to create automation' })
        }

        const autoData = await autoRes.json()
        return JSON.stringify({
          success: true,
          automation: {
            name: autoData.data.automation.name,
            description: autoData.data.automation.description,
            type: autoData.data.automation.type,
            enabled: autoData.data.automation.enabled,
          },
        })
      }

      case 'player_savings': {
        let player: { id: string; firstName: string; lastName: string; membershipType: string; totalVisits: number; firstVisitDate: Date | null; lastVisitDate: Date | null; entryChannel: string | null; conversionScore: number; funnelStage: string; phone: string | null } | null = null
        if (input.playerId) {
          player = await prisma.player.findUnique({ where: { id: input.playerId } })
        } else if (input.playerName) {
          const parts = input.playerName.trim().split(/\s+/)
          const first = parts[0] || ''
          const last = parts.slice(1).join(' ') || ''
          player = await prisma.player.findFirst({
            where: last
              ? { firstName: { contains: first, mode: 'insensitive' }, lastName: { contains: last, mode: 'insensitive' } }
              : { OR: [{ firstName: { contains: first, mode: 'insensitive' } }, { lastName: { contains: first, mode: 'insensitive' } }] },
          })
        }
        if (!player) return JSON.stringify({ error: 'Player not found' })

        const { calculateSavings } = await import('@/lib/funnel/savings')
        const savings = calculateSavings({
          totalVisits: player.totalVisits,
          firstVisitDate: player.firstVisitDate,
          lastVisitDate: player.lastVisitDate,
          membershipType: player.membershipType,
        })

        return JSON.stringify({
          player: `${player.firstName} ${player.lastName}`,
          membershipType: player.membershipType,
          totalVisits: player.totalVisits,
          entryChannel: player.entryChannel,
          conversionScore: player.conversionScore,
          funnelStage: player.funnelStage,
          phone: player.phone,
          savings: savings || { note: 'Not enough data or already a member' },
        })
      }

      case 'query_referrals': {
        if (input.action === 'create') {
          if (!input.referrerId || !input.referredId) {
            return JSON.stringify({ error: 'referrerId and referredId required' })
          }
          const referral = await prisma.referral.create({
            data: { referrerId: input.referrerId, referredId: input.referredId },
            include: {
              referrer: { select: { firstName: true, lastName: true } },
              referred: { select: { firstName: true, lastName: true } },
            },
          })
          return JSON.stringify({ created: true, referral })
        }

        if (input.action === 'top_referrers') {
          const counts = await prisma.referral.groupBy({
            by: ['referrerId'], _count: true,
            orderBy: { _count: { referrerId: 'desc' } }, take: 10,
          })
          const ids = counts.map(c => c.referrerId)
          const players = await prisma.player.findMany({
            where: { id: { in: ids } },
            select: { id: true, firstName: true, lastName: true },
          })
          return JSON.stringify(counts.map(c => {
            const p = players.find(pl => pl.id === c.referrerId)
            return { name: p ? `${p.firstName} ${p.lastName}` : 'Unknown', count: c._count, id: c.referrerId }
          }))
        }

        // Default: list
        const where: Record<string, unknown> = {}
        if (input.memberId) where.referrerId = input.memberId
        if (input.status) where.status = input.status
        const refs = await prisma.referral.findMany({
          where, take: 20, orderBy: { createdAt: 'desc' },
          include: {
            referrer: { select: { firstName: true, lastName: true } },
            referred: { select: { firstName: true, lastName: true, status: true } },
          },
        })
        return JSON.stringify({ count: refs.length, referrals: refs })
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
