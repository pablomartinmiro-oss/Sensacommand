import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ActivityFeedItem } from '@/types'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [recentVisits, recentPayments, newPlayers] = await Promise.all([
      prisma.visit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { player: { select: { firstName: true, lastName: true } } },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { player: { select: { firstName: true, lastName: true } } },
      }),
      prisma.player.findMany({
        where: { createdAt: { gte: todayStart } },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ])

    const activities: ActivityFeedItem[] = []

    for (const visit of recentVisits) {
      activities.push({
        id: visit.id,
        type: 'visit',
        title: `${visit.player.firstName} ${visit.player.lastName} visited`,
        description: `Court ${visit.courtNumber} - ${visit.type.replace('_', ' ').toLowerCase()}`,
        timestamp: visit.createdAt,
        playerId: visit.playerId,
      })
    }

    for (const payment of recentPayments) {
      const playerName = payment.player
        ? `${payment.player.firstName} ${payment.player.lastName}`
        : 'Unknown'
      activities.push({
        id: payment.id,
        type: 'payment',
        title: `$${Number(payment.amount).toFixed(2)} payment received`,
        description: `${playerName} - ${payment.type.replace('_', ' ').toLowerCase()}`,
        timestamp: payment.createdAt,
        playerId: payment.playerId ?? undefined,
      })
    }

    for (const player of newPlayers) {
      activities.push({
        id: player.id,
        type: 'new_player',
        title: `New player registered`,
        description: `${player.firstName} ${player.lastName} - ${player.source.replace('_', ' ').toLowerCase()}`,
        timestamp: player.createdAt,
        playerId: player.id,
      })
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ data: activities.slice(0, 15) })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
