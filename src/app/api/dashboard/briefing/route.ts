import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'

// Cache AI insight for 2 hours
let insightCache: { data: { insight: string; actionLabel: string; actionUrl: string }; ts: number } | null = null
const INSIGHT_TTL = 2 * 60 * 60 * 1000

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today.getTime() + 86400000)
    const weekAgo = new Date(today.getTime() - 7 * 86400000)
    const twoWeeksAgo = new Date(today.getTime() - 14 * 86400000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const oneDayAgo = new Date(Date.now() - 86400000)

    // 1. Find Pablo's team member ID
    const pablo = await prisma.teamMember.findFirst({
      where: { firstName: 'Pablo', lastName: 'Martin' },
    })
    const pabloId = pablo?.id

    // 2. All queries in parallel
    const [
      mtdRev, weekRev, prevWeekRev,
      activeMembers, newMembersMonth, churnedMonth,
      visitsWeek, visitsLastWeek,
      pabloDueToday, pabloOverdue,
      automationLogs24h, draftMessages,
      teamMembers,
    ] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: weekAgo } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: twoWeeksAgo, lt: weekAgo } } }),
      prisma.player.count({ where: { membershipType: { not: 'NONE' } } }),
      prisma.player.count({ where: { membershipType: { not: 'NONE' }, membershipStartDate: { gte: monthStart } } }),
      prisma.player.count({ where: { status: 'CHURNED', updatedAt: { gte: monthStart } } }),
      prisma.visit.count({ where: { date: { gte: weekAgo } } }),
      prisma.visit.count({ where: { date: { gte: twoWeeksAgo, lt: weekAgo } } }),
      // Pablo's goals only
      pabloId ? prisma.goal.findMany({
        where: { assignees: { some: { id: pabloId } }, dueDate: { gte: today, lt: tomorrow }, status: { notIn: ['DONE', 'ON_HOLD'] } },
        orderBy: { priority: 'asc' },
        include: { assignees: { select: { id: true, firstName: true, lastName: true } } },
      }) : Promise.resolve([]),
      pabloId ? prisma.goal.findMany({
        where: { assignees: { some: { id: pabloId } }, dueDate: { lt: today }, status: { notIn: ['DONE', 'ON_HOLD'] } },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        include: { assignees: { select: { id: true, firstName: true, lastName: true } } },
      }) : Promise.resolve([]),
      prisma.automationLog.findMany({
        where: { createdAt: { gte: oneDayAgo }, status: 'sent', dryRun: false },
        select: { automationType: true, channel: true, action: true },
      }),
      prisma.message.count({ where: { status: 'DRAFT' } }),
      // Team pulse: all members with goal counts
      prisma.teamMember.findMany({
        where: { isActive: true },
        select: {
          id: true, firstName: true, lastName: true,
          assignedGoals: { select: { status: true, dueDate: true } },
        },
      }),
    ])

    const mRev = Number(mtdRev._sum.amount ?? 0)
    const wRev = Number(weekRev._sum.amount ?? 0)
    const pwRev = Number(prevWeekRev._sum.amount ?? 0)
    const wowRev = pwRev > 0 ? Math.round(((wRev - pwRev) / pwRev) * 100) : null
    const wowVisits = visitsLastWeek > 0 ? Math.round(((visitsWeek - visitsLastWeek) / visitsLastWeek) * 100) : null
    const netMembers = newMembersMonth - churnedMonth

    // 3. Health bar
    const health = {
      mtdRevenue: mRev,
      wowRevenue: wowRev,
      activeMembers,
      netMembersMonth: netMembers,
      visitsWeek,
      wowVisits,
    }

    // 4. Pablo's goals (due today + top 3 overdue)
    const pabloGoals = {
      dueToday: pabloDueToday.map(g => ({
        id: g.id, title: g.title, priority: g.priority, status: g.status,
      })),
      topOverdue: pabloOverdue.slice(0, 3).map(g => ({
        id: g.id, title: g.title, priority: g.priority,
        daysOverdue: Math.ceil((now.getTime() - new Date(g.dueDate!).getTime()) / 86400000),
      })),
      totalOverdue: pabloOverdue.length,
    }

    // 5. Team pulse — per person: in-progress count, overdue count, flag if 5+ overdue
    const teamPulse = teamMembers
      .filter(m => m.id !== pabloId) // exclude Pablo from team pulse
      .map(m => {
        const inProgress = m.assignedGoals.filter(g => g.status === 'IN_PROGRESS').length
        const overdue = m.assignedGoals.filter(g => g.dueDate && new Date(g.dueDate) < today && g.status !== 'DONE' && g.status !== 'ON_HOLD').length
        const total = m.assignedGoals.length
        return { name: m.firstName, total, inProgress, overdue, needsCheckin: overdue >= 5 }
      })
      .filter(m => m.total > 0) // only show members with goals

    // 6. Handled (automation actions in last 24h)
    const handled = automationLogs24h.length > 0 ? {
      count: automationLogs24h.length,
      summary: summarizeAutomationActions(automationLogs24h),
    } : null

    // 7. AI insight (cached)
    let aiInsight = insightCache && Date.now() - insightCache.ts < INSIGHT_TTL
      ? insightCache.data
      : null

    if (!aiInsight) {
      aiInsight = await generateInsight({
        wowRev, wowVisits, draftMessages, visitsWeek, visitsLastWeek,
        automationCount: automationLogs24h.length,
        teamPulse, activeMembers, pabloOverdue: pabloOverdue.length,
      })
      insightCache = { data: aiInsight, ts: Date.now() }
    }

    return NextResponse.json({
      data: { health, pabloGoals, aiInsight, teamPulse, handled },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}

function summarizeAutomationActions(logs: { automationType: string; channel: string | null; action: string }[]): string {
  const byChannel: Record<string, number> = {}
  for (const l of logs) {
    const ch = l.channel || 'action'
    byChannel[ch] = (byChannel[ch] || 0) + 1
  }
  return Object.entries(byChannel)
    .map(([ch, count]) => `${count} ${ch} draft${count !== 1 ? 's' : ''} created`)
    .join(', ')
}

async function generateInsight(data: {
  wowRev: number | null; wowVisits: number | null; draftMessages: number;
  visitsWeek: number; visitsLastWeek: number; automationCount: number;
  teamPulse: { name: string; overdue: number; needsCheckin: boolean }[];
  activeMembers: number; pabloOverdue: number;
}): Promise<{ insight: string; actionLabel: string; actionUrl: string }> {
  const teamIssues = data.teamPulse.filter(m => m.needsCheckin)

  const prompt = `You are given data about Sensa Padel. Pick the SINGLE most important thing the GM should know right now. One sentence. Then one specific action. Nothing else.

Data:
- Revenue trend: ${data.wowRev !== null ? data.wowRev + '% week-over-week' : 'no data'}
- Visits: ${data.visitsWeek} this week ${data.wowVisits !== null ? '(' + data.wowVisits + '% vs last week)' : ''}
- Draft messages waiting: ${data.draftMessages}
- Active members: ${data.activeMembers}
- Pablo's overdue goals: ${data.pabloOverdue}
- Automation actions (24h): ${data.automationCount}
- Team members with 5+ overdue: ${teamIssues.map(m => m.name + ' (' + m.overdue + ' overdue)').join(', ') || 'none'}

Respond with ONLY JSON (no markdown): { "insight": "one sentence", "actionLabel": "2-3 word button text", "actionUrl": "/page-path" }`

  try {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })
    let text = ''
    for (const block of res.content) {
      if (block.type === 'text') text += block.text
    }
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
  } catch { /* fallback below */ }

  // Fallback: pick most relevant insight without AI
  if (data.draftMessages > 0) {
    return { insight: `${data.draftMessages} draft messages are ready from automations. Review them to re-engage players.`, actionLabel: 'Review Messages', actionUrl: '/messages' }
  }
  if (teamIssues.length > 0) {
    return { insight: `${teamIssues[0].name} has ${teamIssues[0].overdue} overdue goals. Consider checking in.`, actionLabel: 'View Team', actionUrl: '/team' }
  }
  if (data.wowVisits !== null && data.wowVisits < -20) {
    return { insight: `Visits dropped ${Math.abs(data.wowVisits)}% this week. Consider running a promo.`, actionLabel: 'View Revenue', actionUrl: '/revenue' }
  }
  return { insight: 'All quiet. No issues detected.', actionLabel: '', actionUrl: '' }
}
