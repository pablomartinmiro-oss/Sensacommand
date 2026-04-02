import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = req.nextUrl.searchParams.get('status')
  const memberId = req.nextUrl.searchParams.get('memberId')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (memberId) where.referrerId = memberId

  const referrals = await prisma.referral.findMany({
    where,
    include: {
      referrer: { select: { id: true, firstName: true, lastName: true, membershipType: true } },
      referred: { select: { id: true, firstName: true, lastName: true, membershipType: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Top referrers
  const referrerCounts = await prisma.referral.groupBy({
    by: ['referrerId'],
    _count: true,
    orderBy: { _count: { referrerId: 'desc' } },
    take: 5,
  })

  const topReferrerIds = referrerCounts.map((r) => r.referrerId)
  const topReferrerPlayers = await prisma.player.findMany({
    where: { id: { in: topReferrerIds } },
    select: { id: true, firstName: true, lastName: true },
  })

  const convertedByReferrer = await prisma.referral.groupBy({
    by: ['referrerId'],
    where: { status: 'CONVERTED', referrerId: { in: topReferrerIds } },
    _count: true,
  })
  const convertedMap = new Map(convertedByReferrer.map((r) => [r.referrerId, r._count]))

  const topReferrers = referrerCounts.map((r) => {
    const player = topReferrerPlayers.find((p) => p.id === r.referrerId)
    return {
      id: r.referrerId,
      name: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
      totalReferrals: r._count,
      converted: convertedMap.get(r.referrerId) || 0,
    }
  })

  // Monthly stats
  const thisMonth = new Date()
  thisMonth.setDate(1)
  thisMonth.setHours(0, 0, 0, 0)

  const monthlyReferrals = await prisma.referral.count({ where: { createdAt: { gte: thisMonth } } })
  const monthlyConverted = await prisma.referral.count({ where: { createdAt: { gte: thisMonth }, status: 'CONVERTED' } })

  return NextResponse.json({
    data: {
      referrals,
      topReferrers,
      monthlyStats: { total: monthlyReferrals, converted: monthlyConverted },
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { referrerId, referredId, notes } = body

  if (!referrerId || !referredId) {
    return NextResponse.json({ error: 'referrerId and referredId required' }, { status: 400 })
  }

  if (referrerId === referredId) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
  }

  // Check both players exist
  const [referrer, referred] = await Promise.all([
    prisma.player.findUnique({ where: { id: referrerId } }),
    prisma.player.findUnique({ where: { id: referredId } }),
  ])

  if (!referrer) return NextResponse.json({ error: 'Referrer not found' }, { status: 404 })
  if (!referred) return NextResponse.json({ error: 'Referred player not found' }, { status: 404 })

  const referral = await prisma.referral.create({
    data: { referrerId, referredId, notes },
    include: {
      referrer: { select: { id: true, firstName: true, lastName: true } },
      referred: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  return NextResponse.json({ data: referral })
}
