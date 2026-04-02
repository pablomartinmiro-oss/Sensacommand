import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSavings } from '@/lib/funnel/savings'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerId } = await params

  const player = await prisma.player.findUnique({
    where: { id: playerId },
  })

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  // Use stored Player fields instead of querying visits
  const savings = calculateSavings({
    totalVisits: player.totalVisits,
    firstVisitDate: player.firstVisitDate,
    lastVisitDate: player.lastVisitDate,
    membershipType: player.membershipType,
  })

  return NextResponse.json({
    data: {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      membershipType: player.membershipType,
      totalVisits: player.totalVisits,
      conversionScore: player.conversionScore,
      entryChannel: player.entryChannel,
      funnelStage: player.funnelStage,
      savings,
    },
  })
}
