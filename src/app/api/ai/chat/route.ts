import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateText, jsonSchema, stepCountIs } from 'ai'
import { z } from 'zod'
import { MODELS, selectModel } from '@/lib/ai/providers'
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { TOOL_DESCRIPTIONS } from '@/lib/ai/tools'

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationId: z.string().optional().nullable(),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyInput = any

const MAX_STEPS = 10

// ─── Tool execute functions ──────────────────────────────────────────

async function execQueryPlayers(input: AnyInput) {
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
  if (input.minVisits !== undefined) where.totalVisits = { ...(where.totalVisits as object || {}), gte: input.minVisits }
  if (input.maxVisits !== undefined) where.totalVisits = { ...(where.totalVisits as object || {}), lte: input.maxVisits }
  if (input.lastVisitBefore) where.lastVisitDate = { ...(where.lastVisitDate as object || {}), lt: new Date(input.lastVisitBefore) }
  if (input.lastVisitAfter) where.lastVisitDate = { ...(where.lastVisitDate as object || {}), gt: new Date(input.lastVisitAfter) }

  const players = await prisma.player.findMany({
    where, take: input.limit || 20, orderBy: { conversionScore: 'desc' },
  })

  return {
    count: players.length,
    players: players.map(p => ({
      id: p.id, name: `${p.firstName} ${p.lastName}`,
      email: p.email, phone: p.phone, status: p.status,
      membershipType: p.membershipType,
      monthlyRate: p.monthlyRate ? Number(p.monthlyRate) : null,
      totalVisits: p.totalVisits, lastVisit: p.lastVisitDate,
      entryChannel: p.entryChannel, conversionScore: p.conversionScore,
      funnelStage: p.funnelStage, firstVisitProgram: p.firstVisitProgram,
      tags: p.tags,
    })),
  }
}

async function execQueryRevenue(input: AnyInput) {
  const where: Record<string, unknown> = {}
  if (input.startDate || input.endDate) {
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (input.startDate) dateFilter.gte = new Date(input.startDate)
    if (input.endDate) dateFilter.lte = new Date(input.endDate)
    where.date = dateFilter
  }

  const revenue = await prisma.dailyRevenue.findMany({ where, orderBy: { date: 'asc' } })
  const summary = {
    totalRevenue: revenue.reduce((s, r) => s + Number(r.totalRevenue), 0),
    courtRentals: revenue.reduce((s, r) => s + Number(r.courtRentals), 0),
    memberships: revenue.reduce((s, r) => s + Number(r.memberships), 0),
    lessons: revenue.reduce((s, r) => s + Number(r.lessons), 0),
    proShop: revenue.reduce((s, r) => s + Number(r.proShop), 0),
    events: revenue.reduce((s, r) => s + Number(r.events), 0),
    other: revenue.reduce((s, r) => s + Number(r.other), 0),
    days: revenue.length,
  }
  if (input.groupBy === 'day') return { summary, daily: revenue }
  return { summary }
}

async function execQueryVisits(input: AnyInput) {
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
    where, take: input.limit || 50, orderBy: { date: 'desc' },
    include: { player: { select: { firstName: true, lastName: true } } },
  })

  return {
    count: visits.length,
    visits: visits.map(v => ({
      id: v.id, player: `${v.player.firstName} ${v.player.lastName}`,
      playerId: v.playerId, court: v.courtNumber, date: v.date,
      startTime: v.startTime, endTime: v.endTime, type: v.type,
      amountPaid: Number(v.amountPaid),
    })),
  }
}

async function execQueryMembers(input: AnyInput) {
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

  let result = members.map(m => {
    const lastVisit = m.visits[0]?.date
    const isChurnRisk = !lastVisit || new Date(lastVisit) < fourteenDaysAgo
    const daysUntilExpiry = m.membershipEndDate
      ? Math.ceil((new Date(m.membershipEndDate).getTime() - now.getTime()) / 86400000)
      : null
    return {
      id: m.id, name: `${m.firstName} ${m.lastName}`, email: m.email,
      membershipType: m.membershipType,
      monthlyRate: m.monthlyRate ? Number(m.monthlyRate) : null,
      visits: m._count.visits, lastVisit, churnRisk: isChurnRisk, daysUntilExpiry,
    }
  })

  if (input.churnRisk) result = result.filter(m => m.churnRisk)
  if (input.expiringWithinDays !== undefined) {
    result = result.filter(m => m.daysUntilExpiry !== null && m.daysUntilExpiry <= (input.expiringWithinDays ?? 0) && m.daysUntilExpiry >= 0)
  }
  const totalMrr = result.reduce((s, m) => s + (m.monthlyRate ?? 0), 0)
  return { count: result.length, totalMrr, members: result }
}

async function execQueryLeads(input: AnyInput) {
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

  const leads = players.map(p => {
    let score = 0
    const factors: string[] = []
    const visitsLast30 = p.visits.filter(v => new Date(v.date) >= thirtyDaysAgo).length
    if (visitsLast30 > 0) { score += visitsLast30 * 20; factors.push(`${visitsLast30} visit(s) in 30d`) }
    if (p.messages && p.messages.length > 0) { score += 15; factors.push('Responded') }
    if (p.visits.some(v => new Date(v.date) >= sevenDaysAgo)) { score += 25; factors.push('Recent visit') }
    if (p.source === 'REFERRAL') { score += 10; factors.push('Referral') }
    return {
      id: p.id, name: `${p.firstName} ${p.lastName}`, email: p.email,
      status: p.status, score, factors, totalVisits: p._count.visits,
      lastVisit: p.visits[0]?.date ?? null,
    }
  })

  leads.sort((a, b) => b.score - a.score)
  const filtered = input.minScore !== undefined ? leads.filter(l => l.score >= (input.minScore ?? 0)) : leads
  return { count: filtered.length, leads: filtered }
}

async function execDraftMessage(input: AnyInput) {
  const player = await prisma.player.findUnique({
    where: { id: input.playerId },
    select: { firstName: true, lastName: true, email: true, whatsappPhone: true },
  })
  if (!player) return { error: 'Player not found' }

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
      body, status: 'DRAFT',
      templateUsed: input.templateName ?? null,
    },
  })

  return {
    success: true, messageId: message.id,
    to: `${player.firstName} ${player.lastName}`,
    channel: input.channel, body, status: 'DRAFT',
  }
}

async function execCourtStats(input: AnyInput) {
  const where: Record<string, unknown> = {}
  if (input.courtNumber) where.courtNumber = input.courtNumber
  if (input.startDate || input.endDate) {
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (input.startDate) dateFilter.gte = new Date(input.startDate)
    if (input.endDate) dateFilter.lte = new Date(input.endDate)
    where.date = dateFilter
  }

  const visits = await prisma.visit.findMany({
    where, select: { courtNumber: true, startTime: true, amountPaid: true },
  })

  const courtStats: Record<number, { count: number; revenue: number }> = {}
  const hourStats: Record<number, number> = {}
  for (const v of visits) {
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

  return {
    totalBookings: visits.length,
    courtStats: Object.entries(courtStats).map(([c, s]) => ({ court: Number(c), bookings: s.count, revenue: s.revenue })),
    peakHours,
  }
}

async function execRunSql(input: AnyInput) {
  const query = input.query?.trim() || ''
  if (!query.toUpperCase().startsWith('SELECT')) {
    return { error: 'Only SELECT queries are allowed' }
  }
  const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE']
  for (const word of forbidden) {
    if (query.toUpperCase().includes(word)) {
      return { error: `Forbidden SQL keyword: ${word}` }
    }
  }
  const result = await prisma.$queryRawUnsafe(query)
  return { rows: result }
}

async function execQueryGoals(input: AnyInput) {
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
    where, take: input.limit || 20, orderBy: { createdAt: 'desc' },
    include: { assignees: { select: { firstName: true, lastName: true } } },
  })

  return {
    count: goals.length,
    goals: goals.map(g => ({
      id: g.id, title: g.title, status: g.status, priority: g.priority,
      categories: g.categories,
      assignees: g.assignees.map(a => `${a.firstName} ${a.lastName}`),
      dueDate: g.dueDate,
      isOverdue: g.dueDate && new Date(g.dueDate) < new Date() && g.status !== 'DONE' && g.status !== 'ON_HOLD',
    })),
  }
}

async function execUpdateGoal(input: AnyInput) {
  const updateData: Record<string, unknown> = {}
  if (input.status) {
    updateData.status = input.status
    if (input.status === 'DONE') updateData.completedDate = new Date()
  }
  if (input.priority) updateData.priority = input.priority
  if (input.dueDate) updateData.dueDate = new Date(input.dueDate)

  const updated = await prisma.goal.update({
    where: { id: input.goalId }, data: updateData,
    include: { assignees: { select: { firstName: true, lastName: true } } },
  })

  return {
    success: true,
    goal: {
      id: updated.id, title: updated.title, status: updated.status,
      priority: updated.priority,
      assignees: updated.assignees.map(a => `${a.firstName} ${a.lastName}`),
    },
  }
}

async function execCreateGoal(input: AnyInput) {
  let assigneeConnect: { id: string }[] = []
  if (input.assignees && input.assignees.length > 0) {
    const allMembers = await prisma.teamMember.findMany({ where: { isActive: true } })
    assigneeConnect = input.assignees.map((name: string) => {
      const member = allMembers.find((m: { firstName: string; lastName: string }) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(name.toLowerCase()) ||
        m.firstName.toLowerCase().includes(name.toLowerCase())
      )
      return member ? { id: member.id } : null
    }).filter((m: { id: string } | null): m is { id: string } => m !== null)
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

  return {
    success: true,
    goal: {
      id: created.id, title: created.title, status: created.status,
      assignees: created.assignees.map(a => `${a.firstName} ${a.lastName}`),
    },
  }
}

async function execCreateSocialPost(input: AnyInput) {
  const platform = input.platform || 'INSTAGRAM'

  // Try to generate via internal API
  let content = input.description
  let hashtags: string[] = []
  try {
    const genRes = await fetch(new URL('/api/social/posts/generate', process.env.NEXTAUTH_URL || 'http://localhost:3000'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: input.description, platform }),
    })
    if (genRes.ok) {
      const genData = await genRes.json()
      const key = platform.toLowerCase()
      const postData = genData.data?.[key] || Object.values(genData.data || {})[0] as { content?: string; hashtags?: string[] } | undefined
      if (postData && typeof postData === 'object' && 'content' in postData) {
        content = (postData as { content: string }).content
        hashtags = ((postData as { hashtags?: string[] }).hashtags) || []
      }
    }
  } catch { /* use description as fallback content */ }

  const post = await prisma.socialPost.create({
    data: {
      title: input.description.slice(0, 60), content, platform, hashtags,
      status: input.scheduledFor ? 'SCHEDULED' : 'DRAFT',
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
    },
  })

  return { success: true, post: { id: post.id, title: post.title, platform, status: post.status, content: content.slice(0, 200) } }
}

async function execQuerySocialPosts(input: AnyInput) {
  const where: Record<string, unknown> = {}
  if (input.platform) where.platform = input.platform
  if (input.status) where.status = input.status
  if (input.category) where.category = input.category

  const posts = await prisma.socialPost.findMany({ where, take: 20, orderBy: { createdAt: 'desc' } })
  return {
    count: posts.length,
    posts: posts.map(p => ({ id: p.id, title: p.title, platform: p.platform, status: p.status, category: p.category, scheduledFor: p.scheduledFor })),
  }
}

async function execCreateAutomation(input: AnyInput) {
  const autoRes = await fetch(new URL('/api/automations/ai-create', process.env.NEXTAUTH_URL || 'http://localhost:3000'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: input.description }),
  })

  if (!autoRes.ok) {
    const err = await autoRes.json()
    return { error: err.error || 'Failed to create automation' }
  }

  const autoData = await autoRes.json()
  return {
    success: true,
    automation: {
      name: autoData.data.automation.name,
      description: autoData.data.automation.description,
      type: autoData.data.automation.type,
      enabled: autoData.data.automation.enabled,
    },
  }
}

async function execDailyPriorities() {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const weekAgo = new Date(todayStart.getTime() - 7 * 86400000)

  const [dueToday, overdueHigh, drafts, weekRevenue] = await Promise.all([
    prisma.goal.findMany({ where: { dueDate: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) }, status: { notIn: ['DONE', 'ON_HOLD'] } }, include: { assignees: { select: { firstName: true } } }, take: 5 }),
    prisma.goal.findMany({ where: { dueDate: { lt: todayStart }, status: { notIn: ['DONE', 'ON_HOLD'] }, priority: 'HIGH' }, include: { assignees: { select: { firstName: true } } }, take: 5 }),
    prisma.message.count({ where: { status: 'DRAFT' } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: weekAgo } } }),
  ])

  return {
    goalsDueToday: dueToday.map(g => ({ title: g.title, assignees: g.assignees.map(a => a.firstName) })),
    overdueHighPriority: overdueHigh.map(g => ({ title: g.title, assignees: g.assignees.map(a => a.firstName) })),
    draftMessagesWaiting: drafts,
    weekRevenue: Number(weekRevenue._sum.amount ?? 0),
  }
}

async function execTeamStatus(input: AnyInput) {
  const members = await prisma.teamMember.findMany({
    where: input.teamMember ? { OR: [{ firstName: { contains: input.teamMember, mode: 'insensitive' } }, { lastName: { contains: input.teamMember, mode: 'insensitive' } }] } : { isActive: true },
    include: { assignedGoals: { select: { status: true, dueDate: true, completedDate: true } } },
  })

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)

  return members.map(m => ({
    name: `${m.firstName} ${m.lastName}`, role: m.role,
    inProgress: m.assignedGoals.filter(g => g.status === 'IN_PROGRESS').length,
    overdue: m.assignedGoals.filter(g => g.dueDate && new Date(g.dueDate) < now && g.status !== 'DONE' && g.status !== 'ON_HOLD').length,
    completedThisWeek: m.assignedGoals.filter(g => g.status === 'DONE' && g.completedDate && new Date(g.completedDate) >= weekAgo).length,
    dueThisWeek: m.assignedGoals.filter(g => g.dueDate && new Date(g.dueDate) >= now && new Date(g.dueDate) <= new Date(now.getTime() + 7 * 86400000) && g.status !== 'DONE').length,
    total: m.assignedGoals.length,
  }))
}

async function execGoalInsights(input: AnyInput) {
  const allGoals = await prisma.goal.findMany({
    include: { assignees: { select: { firstName: true, lastName: true } } },
  })
  const now = new Date()
  const overdue = allGoals.filter(g => g.dueDate && new Date(g.dueDate) < now && g.status !== 'DONE' && g.status !== 'ON_HOLD')

  const byCategory: Record<string, number> = {}
  overdue.forEach(g => g.categories.forEach(c => { byCategory[c] = (byCategory[c] || 0) + 1 }))

  const stuckest = overdue.sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 5)

  const completions: Record<string, number> = {}
  allGoals.filter(g => g.status === 'DONE').forEach(g => g.assignees.forEach(a => { const n = `${a.firstName} ${a.lastName}`; completions[n] = (completions[n] || 0) + 1 }))

  return {
    question: input.question, totalGoals: allGoals.length, overdueCount: overdue.length,
    overdueByCategory: byCategory,
    longestStuck: stuckest.map(g => ({ title: g.title, daysOverdue: Math.ceil((now.getTime() - new Date(g.dueDate!).getTime()) / 86400000), assignees: g.assignees.map(a => `${a.firstName} ${a.lastName}`) })),
    completionsByAssignee: completions,
  }
}

async function execSnoozeGoals(input: AnyInput) {
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

  if (goalIds.length === 0) return { snoozed: 0, message: 'No matching goals found' }

  await prisma.goal.updateMany({ where: { id: { in: goalIds } }, data: { dueDate: newDueDate } })
  await prisma.goalActivity.createMany({
    data: goalIds.map(id => ({ goalId: id, action: 'SNOOZED', toValue: newDueDate.toISOString(), performedBy: 'AI' })),
  })

  return { snoozed: goalIds.length, newDate: newDueDate.toISOString() }
}

async function execWeeklySummary() {
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

  return {
    goalsCompleted: completed, goalsBecameOverdue: newOverdue,
    revenue: { thisWeek: twRev, lastWeek: lwRev, change: lwRev > 0 ? Math.round(((twRev - lwRev) / lwRev) * 100) : null },
    newMembers, churned, newPlayers,
  }
}

async function execQueryLeave(input: AnyInput) {
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

  return {
    requests: requests.map(r => ({
      id: r.id, member: `${r.teamMember.firstName} ${r.teamMember.lastName}`,
      dates: `${r.startDate.toISOString().split('T')[0]} to ${r.endDate.toISOString().split('T')[0]}`,
      days: r.days, type: r.type, status: r.status, reason: r.reason,
    })),
    allowances: allowances.map(a => ({
      member: `${a.teamMember.firstName} ${a.teamMember.lastName}`,
      total: a.totalDays, used: a.usedDays, remaining: a.totalDays - a.usedDays,
    })),
  }
}

async function execApproveLeave(input: AnyInput) {
  const req = await prisma.leaveRequest.findUnique({ where: { id: input.requestId }, include: { teamMember: true } })
  if (!req) return { error: 'Request not found' }
  if (req.status !== 'PENDING') return { error: `Request is already ${req.status}` }

  await prisma.leaveRequest.update({ where: { id: input.requestId }, data: { status: 'APPROVED', approvedBy: 'Pablo Martin', approvedAt: new Date() } })
  await prisma.leaveAllowance.updateMany({ where: { teamMemberId: req.teamMemberId, year: new Date().getFullYear() }, data: { usedDays: { increment: req.days } } })

  return { success: true, approved: `${req.teamMember.firstName} ${req.teamMember.lastName} — ${req.days} days ${req.type}` }
}

async function execQueryWebhookEvents(input: AnyInput) {
  const where: Record<string, unknown> = { source: 'playbypoint' }
  if (input.eventType) where.event = input.eventType
  if (input.status) where.status = input.status

  const events = await prisma.webhookEvent.findMany({
    where, orderBy: { createdAt: 'desc' }, take: input.limit || 10,
    select: { id: true, event: true, status: true, createdAt: true, playerId: true, error: true },
  })

  return {
    count: events.length,
    events: events.map(e => ({ id: e.id, event: e.event, status: e.status, time: e.createdAt, playerId: e.playerId, error: e.error })),
  }
}

async function execPlayerSavings(input: AnyInput) {
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
  if (!player) return { error: 'Player not found' }

  const { calculateSavings } = await import('@/lib/funnel/savings')
  const savings = calculateSavings({
    totalVisits: player.totalVisits,
    firstVisitDate: player.firstVisitDate,
    lastVisitDate: player.lastVisitDate,
    membershipType: player.membershipType,
  })

  return {
    player: `${player.firstName} ${player.lastName}`,
    membershipType: player.membershipType, totalVisits: player.totalVisits,
    entryChannel: player.entryChannel, conversionScore: player.conversionScore,
    funnelStage: player.funnelStage, phone: player.phone,
    savings: savings || { note: 'Not enough data or already a member' },
  }
}

async function execQueryReferrals(input: AnyInput) {
  if (input.action === 'create') {
    if (!input.referrerId || !input.referredId) return { error: 'referrerId and referredId required' }
    const referral = await prisma.referral.create({
      data: { referrerId: input.referrerId, referredId: input.referredId },
      include: {
        referrer: { select: { firstName: true, lastName: true } },
        referred: { select: { firstName: true, lastName: true } },
      },
    })
    return { created: true, referral }
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
    return counts.map(c => {
      const p = players.find(pl => pl.id === c.referrerId)
      return { name: p ? `${p.firstName} ${p.lastName}` : 'Unknown', count: c._count, id: c.referrerId }
    })
  }

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
  return { count: refs.length, referrals: refs }
}

// ─── Tool input type ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInput = Record<string, any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolExecutor = (input: ToolInput) => Promise<any>

const TOOL_EXECUTORS: Record<string, ToolExecutor> = {
  query_players: execQueryPlayers,
  query_revenue: execQueryRevenue,
  query_visits: execQueryVisits,
  query_members: execQueryMembers,
  query_leads: execQueryLeads,
  draft_message: execDraftMessage,
  court_stats: execCourtStats,
  run_sql: execRunSql,
  query_goals: execQueryGoals,
  update_goal: execUpdateGoal,
  create_goal: execCreateGoal,
  create_social_post: execCreateSocialPost,
  query_social_posts: execQuerySocialPosts,
  create_automation: execCreateAutomation,
  daily_priorities: execDailyPriorities,
  team_status: execTeamStatus,
  goal_insights: execGoalInsights,
  snooze_goals: execSnoozeGoals,
  weekly_summary: execWeeklySummary,
  query_leave: execQueryLeave,
  approve_leave: execApproveLeave,
  query_webhook_events: execQueryWebhookEvents,
  player_savings: execPlayerSavings,
  query_referrals: execQueryReferrals,
}

// JSON Schema definitions for each tool (compatible with all AI SDK providers)
const TOOL_SCHEMAS: Record<string, { type: string; properties: Record<string, unknown>; required?: string[] }> = {
  query_players: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['NEW', 'ACTIVE', 'HOT_LEAD', 'COLD_LEAD', 'CONVERTED', 'CHURNED'] },
      membershipType: { type: 'string', enum: ['NONE', 'STANDARD', 'UNLIMITED'] },
      minVisits: { type: 'number', description: 'Minimum number of visits' },
      maxVisits: { type: 'number', description: 'Maximum number of visits' },
      lastVisitBefore: { type: 'string', description: 'ISO date — players whose last visit was before this' },
      lastVisitAfter: { type: 'string', description: 'ISO date — players whose last visit was after this' },
      search: { type: 'string', description: 'Search by name or email' },
      limit: { type: 'number', description: 'Max results (default 20)' },
    },
  },
  query_revenue: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'Start date (ISO format)' },
      endDate: { type: 'string', description: 'End date (ISO format)' },
      groupBy: { type: 'string', enum: ['day', 'week', 'month'] },
    },
    required: ['startDate', 'endDate'],
  },
  query_visits: {
    type: 'object',
    properties: {
      playerId: { type: 'string' },
      courtNumber: { type: 'number' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      type: { type: 'string', enum: ['CASUAL', 'MEMBER_SESSION', 'LESSON', 'TOURNAMENT', 'PRIVATE_EVENT'] },
      limit: { type: 'number' },
    },
  },
  query_members: {
    type: 'object',
    properties: {
      tier: { type: 'string', enum: ['STANDARD', 'UNLIMITED'] },
      churnRisk: { type: 'boolean', description: 'Filter for churn risk' },
      expiringWithinDays: { type: 'number', description: 'Expiring within N days' },
    },
  },
  query_leads: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['NEW', 'HOT_LEAD', 'COLD_LEAD'] },
      minScore: { type: 'number' },
      sortBy: { type: 'string', enum: ['score', 'lastVisit', 'visits'] },
    },
  },
  draft_message: {
    type: 'object',
    properties: {
      playerId: { type: 'string', description: 'Player ID' },
      channel: { type: 'string', enum: ['WHATSAPP', 'EMAIL'] },
      templateName: { type: 'string', description: 'Template name' },
      customBody: { type: 'string', description: 'Custom message body' },
      subject: { type: 'string', description: 'Email subject' },
    },
    required: ['playerId', 'channel'],
  },
  court_stats: {
    type: 'object',
    properties: {
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      courtNumber: { type: 'number' },
    },
  },
  run_sql: {
    type: 'object',
    properties: { query: { type: 'string', description: 'SQL SELECT query' } },
    required: ['query'],
  },
  query_goals: {
    type: 'object',
    properties: {
      assignee: { type: 'string', description: 'Assignee name (partial match)' },
      status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING'] },
      category: { type: 'string' },
      priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW', 'NONE'] },
      overdue: { type: 'boolean', description: 'Filter for overdue goals' },
      search: { type: 'string', description: 'Search by title' },
      limit: { type: 'number', description: 'Max results (default 20)' },
    },
  },
  update_goal: {
    type: 'object',
    properties: {
      goalId: { type: 'string', description: 'Goal ID' },
      status: { type: 'string', enum: ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING'] },
      priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW', 'NONE'] },
      dueDate: { type: 'string', description: 'Due date (ISO format)' },
    },
    required: ['goalId'],
  },
  create_goal: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Goal title' },
      assignees: { type: 'array', items: { type: 'string' }, description: 'Assignee names' },
      categories: { type: 'array', items: { type: 'string' }, description: 'Category names' },
      priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW', 'NONE'] },
      dueDate: { type: 'string', description: 'Due date (ISO format)' },
      description: { type: 'string' },
    },
    required: ['title'],
  },
  create_social_post: {
    type: 'object',
    properties: {
      description: { type: 'string', description: 'What to post about' },
      platform: { type: 'string', enum: ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'ALL'] },
      scheduledFor: { type: 'string', description: 'Schedule date (ISO format)' },
    },
    required: ['description'],
  },
  query_social_posts: {
    type: 'object',
    properties: {
      platform: { type: 'string', enum: ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'ALL'] },
      status: { type: 'string', enum: ['DRAFT', 'SCHEDULED', 'POSTED', 'CANCELLED'] },
      category: { type: 'string' },
    },
  },
  create_automation: {
    type: 'object',
    properties: { description: { type: 'string', description: 'Plain-English description' } },
    required: ['description'],
  },
  daily_priorities: { type: 'object', properties: {} },
  team_status: {
    type: 'object',
    properties: { teamMember: { type: 'string', description: 'Team member name (omit for all)' } },
  },
  goal_insights: {
    type: 'object',
    properties: { question: { type: 'string', description: 'Analytical question about goals' } },
    required: ['question'],
  },
  snooze_goals: {
    type: 'object',
    properties: {
      goalIds: { type: 'array', items: { type: 'string' }, description: 'Goal IDs to snooze' },
      assignee: { type: 'string', description: 'Snooze for this assignee' },
      daysOverdue: { type: 'number', description: 'Overdue threshold' },
      newDate: { type: 'string', description: 'New due date (ISO format)' },
    },
    required: ['newDate'],
  },
  weekly_summary: { type: 'object', properties: {} },
  query_leave: {
    type: 'object',
    properties: {
      teamMember: { type: 'string' },
      status: { type: 'string', enum: ['PENDING', 'APPROVED', 'DENIED', 'CANCELLED'] },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
    },
  },
  approve_leave: {
    type: 'object',
    properties: { requestId: { type: 'string', description: 'Leave request ID' } },
    required: ['requestId'],
  },
  query_webhook_events: {
    type: 'object',
    properties: {
      eventType: { type: 'string', description: 'Event type filter' },
      status: { type: 'string', enum: ['processed', 'failed', 'pending', 'duplicate'] },
      limit: { type: 'number', description: 'Max results (default 10)' },
    },
  },
  player_savings: {
    type: 'object',
    properties: {
      playerId: { type: 'string' },
      playerName: { type: 'string', description: 'Player name to search for' },
    },
  },
  query_referrals: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'top_referrers', 'create'] },
      memberId: { type: 'string' },
      status: { type: 'string', enum: ['PENDING', 'VISITED', 'CONVERTED', 'EXPIRED'] },
      referrerId: { type: 'string', description: 'Referrer player ID (for create)' },
      referredId: { type: 'string', description: 'Referred player ID (for create)' },
    },
  },
}

// Build tools map using jsonSchema() for cross-provider compatibility
function buildTools() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {}

  for (const [name, schema] of Object.entries(TOOL_SCHEMAS)) {
    tools[name] = {
      description: TOOL_DESCRIPTIONS[name as keyof typeof TOOL_DESCRIPTIONS],
      parameters: jsonSchema(schema),
      execute: TOOL_EXECUTORS[name],
    }
  }

  return tools
}

// ─── GET: List / load conversations ──────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const conversationId = searchParams.get('conversationId')

    if (conversationId) {
      const conversation = await prisma.aIConversation.findUnique({ where: { id: conversationId } })
      if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      return NextResponse.json({ data: conversation })
    }

    const conversations = await prisma.aIConversation.findMany({
      orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, title: true, createdAt: true },
    })
    return NextResponse.json({ data: conversations })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}

// ─── POST: Chat with AI ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 },
      )
    }

    const { message, conversationId } = parsed.data

    // Load or create conversation
    let conversation: { id: string; messages: { role: 'user' | 'assistant'; content: string }[] }

    if (conversationId) {
      const existing = await prisma.aIConversation.findUnique({ where: { id: conversationId } })
      if (!existing) return NextResponse.json({ error: 'Not found', message: 'Conversation not found' }, { status: 404 })

      const storedMsgs = (existing.messages as unknown as { role: string; content: string }[]) || []
      conversation = {
        id: existing.id,
        messages: storedMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      }
    } else {
      const created = await prisma.aIConversation.create({
        data: { title: message.slice(0, 100), messages: [] },
      })
      conversation = { id: created.id, messages: [] }
    }

    conversation.messages.push({ role: 'user', content: message })

    // Select model tier based on query complexity
    const tier = selectModel(message)
    const modelConfig = MODELS[tier]

    // Call AI with Vercel AI SDK — handles tool loop automatically
    const result = await generateText({
      model: modelConfig.provider(modelConfig.id),
      system: SYSTEM_PROMPT,
      messages: conversation.messages.map(m => ({ role: m.role, content: m.content })),
      tools: buildTools(),
      stopWhen: stepCountIs(MAX_STEPS),
      maxOutputTokens: 4096,
    })

    const finalText = result.text || ''

    // Save conversation
    const savedMessages = [
      ...conversation.messages,
      { role: 'assistant' as const, content: finalText, timestamp: new Date().toISOString() },
    ].map(m => ({
      role: m.role,
      content: m.content,
      timestamp: 'timestamp' in m ? m.timestamp : new Date().toISOString(),
    }))

    const title = !conversationId
      ? message.slice(0, 60) + (message.length > 60 ? '...' : '')
      : undefined

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: { messages: savedMessages, ...(title ? { title } : {}) },
    })

    return NextResponse.json({
      data: {
        conversationId: conversation.id,
        response: finalText,
        model: modelConfig.name,
        toolSteps: result.steps?.length || 0,
      },
    })
  } catch (e) {
    console.error('[AI Chat] Error:', (e as Error).message)
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 },
    )
  }
}
