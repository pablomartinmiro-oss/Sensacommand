import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ActionItem } from '@/types'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const actions: ActionItem[] = []
    const now = new Date()
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [upsellCandidates, churnRiskMembers, hotLeadsNoMsg, mtdRevenue] =
      await Promise.all([
        prisma.player.findMany({
          where: {
            membershipType: 'NONE',
          },
          include: {
            _count: { select: { visits: true } },
          },
        }),
        prisma.player.findMany({
          where: {
            membershipType: { not: 'NONE' },
          },
          include: {
            visits: {
              orderBy: { date: 'desc' },
              take: 1,
              select: { date: true },
            },
          },
        }),
        prisma.player.findMany({
          where: {
            status: 'HOT_LEAD',
          },
          include: {
            messages: {
              where: { direction: 'OUTBOUND' },
              take: 1,
            },
          },
        }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            date: { gte: monthStart },
          },
        }),
      ])

    for (const player of upsellCandidates) {
      if (player._count.visits >= 3) {
        actions.push({
          type: 'upsell',
          title: 'Upsell opportunity',
          description: `${player.firstName} ${player.lastName} has ${player._count.visits} visits but no membership`,
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          priority: player._count.visits >= 6 ? 'high' : 'medium',
        })
      }
    }

    for (const member of churnRiskMembers) {
      const lastVisit = member.visits[0]?.date
      if (!lastVisit || new Date(lastVisit) < fourteenDaysAgo) {
        actions.push({
          type: 'churn_risk',
          title: 'Churn risk',
          description: `${member.firstName} ${member.lastName} (${member.membershipType}) hasn't visited in 14+ days`,
          playerId: member.id,
          playerName: `${member.firstName} ${member.lastName}`,
          priority: 'high',
        })
      }
    }

    for (const lead of hotLeadsNoMsg) {
      if (lead.messages.length === 0) {
        actions.push({
          type: 'follow_up',
          title: 'Follow-up needed',
          description: `${lead.firstName} ${lead.lastName} is a hot lead with no outbound messages`,
          playerId: lead.id,
          playerName: `${lead.firstName} ${lead.lastName}`,
          priority: 'high',
        })
      }
    }

    const mtd = Number(mtdRevenue._sum.amount ?? 0)
    const target = 45000
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const dayOfMonth = now.getDate()
    const expectedPace = (target / daysInMonth) * dayOfMonth
    const pacePercent = expectedPace > 0 ? Math.round((mtd / expectedPace) * 100) : 0

    actions.push({
      type: 'revenue',
      title: 'Revenue progress',
      description: `$${mtd.toLocaleString()} / $${target.toLocaleString()} MTD (${pacePercent}% of pace)`,
      priority: pacePercent < 80 ? 'high' : pacePercent < 95 ? 'medium' : 'low',
    })

    actions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    return NextResponse.json({ data: actions })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
