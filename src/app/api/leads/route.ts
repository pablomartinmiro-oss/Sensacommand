import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function calculateLeadScore(player: {
  status: string
  visits: { date: Date }[]
  createdAt: Date
}): { score: number; factors: string[] } {
  let score = 0
  const factors: string[] = []
  const visitCount = player.visits.length

  // Visit frequency factor (0-40 points)
  if (visitCount >= 5) {
    score += 40
    factors.push('Frequent visitor (5+ visits)')
  } else if (visitCount >= 3) {
    score += 30
    factors.push('Regular visitor (3-4 visits)')
  } else if (visitCount >= 2) {
    score += 20
    factors.push('Returning visitor (2 visits)')
  } else if (visitCount === 1) {
    score += 10
    factors.push('First-time visitor')
  }

  // Recency factor (0-30 points)
  if (visitCount > 0) {
    const lastVisit = new Date(
      Math.max(...player.visits.map((v) => new Date(v.date).getTime()))
    )
    const daysSinceLastVisit = Math.floor(
      (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceLastVisit <= 3) {
      score += 30
      factors.push('Visited in last 3 days')
    } else if (daysSinceLastVisit <= 7) {
      score += 20
      factors.push('Visited this week')
    } else if (daysSinceLastVisit <= 14) {
      score += 10
      factors.push('Visited in last 2 weeks')
    }
  }

  // Status factor (0-20 points)
  if (player.status === 'HOT_LEAD') {
    score += 20
    factors.push('Marked as hot lead')
  } else if (player.status === 'CONVERTED') {
    score += 20
    factors.push('Converted to member')
  } else if (player.status === 'NEW') {
    score += 10
    factors.push('New prospect')
  }

  // Engagement window factor (0-10 points)
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(player.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceCreated <= 7 && visitCount >= 1) {
    score += 10
    factors.push('Active within first week')
  }

  return { score: Math.min(score, 100), factors }
}

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const leads = await prisma.player.findMany({
      where: {
        status: {
          in: ['NEW', 'HOT_LEAD', 'COLD_LEAD', 'CONVERTED'],
        },
        membershipType: { in: ['NONE', 'STANDARD', 'UNLIMITED'] },
      },
      include: {
        visits: {
          select: { date: true, id: true },
          orderBy: { date: 'desc' },
        },
        _count: {
          select: { visits: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const leadsWithScores = leads.map((player: typeof leads[number]) => {
      const { score, factors } = calculateLeadScore(player)
      return {
        player,
        score,
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
