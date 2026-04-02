import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (status) {
    where.trialStatus = status
  } else {
    where.trialStatus = { not: null, notIn: ['NONE'] }
  }

  const trials = await prisma.player.findMany({
    where,
    include: {
      visits: {
        where: {
          date: { gte: new Date(Date.now() - 30 * 86400000) },
        },
        select: { id: true, date: true },
      },
    },
    orderBy: { trialStartDate: 'desc' },
  })

  const data = trials.map((p) => {
    const trialDay = p.trialStartDate
      ? Math.ceil((Date.now() - new Date(p.trialStartDate).getTime()) / 86400000)
      : 0
    const trialDuration = p.trialStartDate && p.trialEndDate
      ? Math.ceil((new Date(p.trialEndDate).getTime() - new Date(p.trialStartDate).getTime()) / 86400000)
      : 14

    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      trialStartDate: p.trialStartDate,
      trialEndDate: p.trialEndDate,
      trialStatus: p.trialStatus,
      trialDay,
      trialDuration,
      visitsInTrial: p.visits.length,
    }
  })

  // Calculate historic conversion rate
  const allTrials = await prisma.player.count({ where: { trialStatus: { not: null, notIn: ['NONE'] } } })
  const converted = await prisma.player.count({ where: { trialStatus: 'CONVERTED' } })
  const conversionRate = allTrials > 0 ? Math.round((converted / allTrials) * 100) : 0

  return NextResponse.json({ data: { trials: data, conversionRate, total: allTrials, converted } })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { playerId, duration = 14 } = body

  if (!playerId) return NextResponse.json({ error: 'playerId required' }, { status: 400 })

  const player = await prisma.player.findUnique({ where: { id: playerId } })
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const now = new Date()
  const endDate = new Date(now.getTime() + duration * 86400000)

  const updated = await prisma.player.update({
    where: { id: playerId },
    data: {
      trialStartDate: now,
      trialEndDate: endDate,
      trialStatus: 'ACTIVE',
    },
  })

  return NextResponse.json({
    data: {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      trialStartDate: updated.trialStartDate,
      trialEndDate: updated.trialEndDate,
      trialStatus: updated.trialStatus,
    },
  })
}
