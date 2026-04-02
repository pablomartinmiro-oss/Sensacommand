import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use stored conversionScore instead of recalculating
    const leads = await prisma.player.findMany({
      where: {
        membershipType: 'NONE',
        totalVisits: { gte: 1 },
      },
      orderBy: { conversionScore: 'desc' },
      take: 100,
      include: {
        _count: { select: { visits: true } },
        visits: { orderBy: { date: 'desc' }, take: 1 },
      },
    })

    const leadsWithScores = leads.map((player) => {
      const factors: string[] = []

      // Visit frequency
      if (player.totalVisits >= 6) factors.push(`Frequent visitor (${player.totalVisits} visits)`)
      else if (player.totalVisits >= 3) factors.push(`Regular visitor (${player.totalVisits} visits)`)
      else if (player.totalVisits >= 2) factors.push('Returning visitor')
      else factors.push('First-time visitor')

      // Recency
      if (player.lastVisitDate) {
        const days = Math.floor((Date.now() - new Date(player.lastVisitDate).getTime()) / 86400000)
        if (days <= 7) factors.push('Visited this week')
        else if (days <= 14) factors.push('Visited in last 2 weeks')
        else if (days <= 30) factors.push('Visited this month')
      }

      // Entry channel
      if (player.entryChannel) {
        const channelLabels: Record<string, string> = {
          OPEN_PLAY: 'Open Play entry (best converter)',
          LESSON: 'Lesson entry (stickiest)',
          CLINIC: 'Clinic/class entry',
          DIRECT_BOOKING: 'Direct booking',
          EVENT: 'Event entry',
          COMMUNITY_PLAY: 'Community play',
        }
        factors.push(channelLabels[player.entryChannel] || player.entryChannel)
      }

      // Funnel stage
      if (player.funnelStage === 'HOT_PROSPECT') factors.push('Hot prospect')

      return {
        player,
        score: player.conversionScore,
        factors,
      }
    })

    return NextResponse.json({ data: leadsWithScores })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
