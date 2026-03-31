import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'

// Simple in-memory cache: { data, timestamp }
let briefingCache: { data: unknown; ts: number } | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Return cached if fresh
  if (briefingCache && Date.now() - briefingCache.ts < CACHE_TTL) {
    return NextResponse.json({ data: briefingCache.data, cached: true })
  }

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const weekAgo = new Date(today.getTime() - 7 * 86400000)
    const twoWeeksAgo = new Date(today.getTime() - 14 * 86400000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      yesterdayRev, weekRev, prevWeekRev, mtdRev,
      activeMembers, newMembersMonth, churned,
      newPlayersWeek, visitsWeek, visitsLastWeek,
      overdueCount, goalsDueToday, goalsCompletedWeek,
      automationLogs24h, draftMessages,
    ] = await Promise.all([
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: yesterday, lt: today } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: weekAgo } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: twoWeeksAgo, lt: weekAgo } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart } } }),
      prisma.player.count({ where: { membershipType: { not: 'NONE' } } }),
      prisma.player.count({ where: { membershipType: { not: 'NONE' }, membershipStartDate: { gte: monthStart } } }),
      prisma.player.count({ where: { status: 'CHURNED', updatedAt: { gte: monthStart } } }),
      prisma.player.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.visit.count({ where: { date: { gte: weekAgo } } }),
      prisma.visit.count({ where: { date: { gte: twoWeeksAgo, lt: weekAgo } } }),
      prisma.goal.count({ where: { dueDate: { lt: today }, status: { notIn: ['DONE', 'ON_HOLD'] } } }),
      prisma.goal.findMany({ where: { dueDate: { gte: today, lt: new Date(today.getTime() + 86400000) }, status: { notIn: ['DONE', 'ON_HOLD'] } }, include: { assignees: { select: { firstName: true, lastName: true } } }, take: 5 }),
      prisma.goal.count({ where: { status: 'DONE', completedDate: { gte: weekAgo } } }),
      prisma.automationLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) }, status: 'sent' } }),
      prisma.message.count({ where: { status: 'DRAFT' } }),
    ])

    const yRev = Number(yesterdayRev._sum.amount ?? 0)
    const wRev = Number(weekRev._sum.amount ?? 0)
    const pwRev = Number(prevWeekRev._sum.amount ?? 0)
    const mRev = Number(mtdRev._sum.amount ?? 0)
    const wowRev = pwRev > 0 ? Math.round(((wRev - pwRev) / pwRev) * 100) : null
    const wowVisits = visitsLastWeek > 0 ? Math.round(((visitsWeek - visitsLastWeek) / visitsLastWeek) * 100) : null

    // Generate AI narrative
    const prompt = `You are the AI assistant for Sensa Padel, a 6-court padel club in Nashville. Write a morning briefing for Pablo, the GM. Be direct, specific, and actionable. Warm but business-focused. No fluff.

DATA:
- Yesterday's revenue: $${yRev}
- This week's revenue: $${wRev} (${wowRev !== null ? wowRev + '% vs last week' : 'no prior data'})
- MTD revenue: $${mRev}
- Active members: ${activeMembers} (${newMembersMonth} new this month, ${churned} churned)
- Visits this week: ${visitsWeek} (${wowVisits !== null ? wowVisits + '% vs last week' : 'no prior data'})
- New players this week: ${newPlayersWeek}
- Overdue goals: ${overdueCount}
- Goals due today: ${goalsDueToday.length} (${goalsDueToday.map(g => g.title).join(', ') || 'none'})
- Goals completed this week: ${goalsCompletedWeek}
- Draft messages waiting: ${draftMessages}
- Automation actions (24h): ${automationLogs24h}

Write exactly 3 sections. Respond with ONLY JSON (no markdown):
{
  "pulse": "2-3 sentences about business health, revenue trend, member health, visit trend. Use comparisons.",
  "attention": ["item 1 — specific action needed", "item 2", ...max 4 items],
  "handled": "1-2 sentences about what automations did overnight."
}`

    let narrative = { pulse: '', attention: [] as string[], handled: '' }
    try {
      const aiRes = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      })
      let text = ''
      for (const block of aiRes.content) {
        if (block.type === 'text') text += block.text
      }
      const match = text.match(/\{[\s\S]*\}/)
      if (match) narrative = JSON.parse(match[0])
    } catch {
      narrative = {
        pulse: `Yesterday brought in $${yRev.toLocaleString()}. Week is at $${wRev.toLocaleString()}${wowRev !== null ? ` (${wowRev}% vs last week)` : ''}. ${activeMembers} active members.`,
        attention: overdueCount > 0 ? [`${overdueCount} goals overdue — review and prioritize`] : ['All clear today'],
        handled: draftMessages > 0 ? `${draftMessages} draft messages waiting for your review.` : 'No automation actions overnight.',
      }
    }

    // Build attention items for smart action cards
    const attentionItems = []

    if (draftMessages > 0) {
      attentionItems.push({
        id: 'draft-messages', type: 'DRAFT_MESSAGES', priority: 'HIGH',
        title: `${draftMessages} draft message${draftMessages !== 1 ? 's' : ''} waiting for review`,
        description: 'Created by automations overnight',
        data: { count: draftMessages },
      })
    }

    for (const g of goalsDueToday.slice(0, 2)) {
      attentionItems.push({
        id: `goal-${g.id}`, type: 'GOAL_DUE', priority: 'HIGH',
        title: g.title,
        description: `Due today — ${g.assignees.map(a => a.firstName).join(', ') || 'Unassigned'}`,
        data: { goalId: g.id, assignees: g.assignees },
      })
    }

    if (overdueCount > 0) {
      attentionItems.push({
        id: 'overdue-goals', type: 'OVERDUE_GOALS', priority: 'MEDIUM',
        title: `${overdueCount} goals overdue`,
        description: 'Review and prioritize or snooze stale items',
        data: { count: overdueCount },
      })
    }

    if (wowRev !== null && wowRev < -15) {
      attentionItems.push({
        id: 'revenue-alert', type: 'REVENUE_ALERT', priority: 'MEDIUM',
        title: `Revenue dropped ${Math.abs(wowRev)}% vs last week`,
        description: `$${wRev.toLocaleString()} vs $${pwRev.toLocaleString()} prior week`,
        data: { thisWeek: wRev, lastWeek: pwRev, change: wowRev },
      })
    }

    const result = {
      narrative,
      attentionItems: attentionItems.slice(0, 5),
      data: {
        yesterdayRevenue: yRev, mtdRevenue: mRev, activeMembers,
        overdueGoals: overdueCount, draftMessages,
        weekOverWeekRevenue: wowRev, weekOverWeekVisits: wowVisits,
        visitsThisWeek: visitsWeek, goalsCompletedWeek,
      },
      generatedAt: new Date().toISOString(),
    }

    briefingCache = { data: result, ts: Date.now() }

    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
