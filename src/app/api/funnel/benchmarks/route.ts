import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateBenchmarks } from '@/lib/funnel/benchmarks'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

  // Use stored Player fields for all calculations
  const [totalPlayers, activePlayers, members, returnData, referralMembers] = await Promise.all([
    prisma.player.count({ where: { totalVisits: { gte: 1 } } }),
    prisma.player.count({
      where: { lastVisitDate: { gte: thirtyDaysAgo } },
    }),
    prisma.player.count({ where: { membershipType: { not: 'NONE' } } }),
    // Return rate: players with 2+ visits whose 2nd visit was within 14 days of 1st
    prisma.player.findMany({
      where: { totalVisits: { gte: 1 } },
      select: { totalVisits: true, firstVisitDate: true, lastVisitDate: true },
    }),
    prisma.referral.count({ where: { status: 'CONVERTED' } }),
  ])

  // Calculate return rate (players who came back within 14 days)
  let totalFirstTimers = 0
  for (const p of returnData) {
    if (p.firstVisitDate) totalFirstTimers++
  }
  const playersWithMultipleVisits = returnData.filter(p => p.totalVisits >= 2).length
  const returnRate = totalFirstTimers > 0 ? (playersWithMultipleVisits / totalFirstTimers) * 100 : 0

  const activePercent = totalPlayers > 0 ? (activePlayers / totalPlayers) * 100 : 0
  const memberMix = totalPlayers > 0 ? (members / totalPlayers) * 100 : 0
  const conversionRate = totalPlayers > 0 ? (members / totalPlayers) * 100 : 0
  const referralPercent = members > 0 ? (referralMembers / members) * 100 : 0

  const benchmarks = calculateBenchmarks({
    returnRate14Days: returnRate,
    memberConversionRate: conversionRate,
    activePlayerPercent: activePercent,
    memberMixPercent: memberMix,
    referralDrivenPercent: referralPercent,
  })

  return NextResponse.json({
    data: {
      benchmarks,
      raw: { totalPlayers, activePlayers, members, returnedWithin14: playersWithMultipleVisits, totalFirstTimers },
    },
  })
}
