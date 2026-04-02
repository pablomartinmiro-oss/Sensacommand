import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const churnRisk = searchParams.get('churnRisk') === 'true'
  const tier = searchParams.get('tier')

  try {
    const now = new Date()
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

    // Base where clause: only active members
    const memberWhere: Record<string, unknown> = {
      membershipType: { not: 'NONE' as const },
    }

    if (tier && tier !== 'ALL') {
      memberWhere.membershipType = tier
    }

    const members = await prisma.player.findMany({
      where: memberWhere,
      include: {
        payments: {
          where: { type: 'MEMBERSHIP' },
          select: { amount: true, date: true },
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastName: 'asc' },
    })

    type MemberRow = typeof members[number]

    // Calculate visit stats using Player fields (totalVisits, lastVisitDate)
    const enrichedMembers = members.map((member: MemberRow) => {
      const totalVisits = member.totalVisits
      const memberSinceDays = member.membershipStartDate
        ? Math.floor(
            (now.getTime() - new Date(member.membershipStartDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0
      const monthsActive = Math.max(1, Math.floor(memberSinceDays / 30))
      const avgVisitsPerMonth = Math.round((totalVisits / monthsActive) * 10) / 10

      const lastVisitDate = member.lastVisitDate ? new Date(member.lastVisitDate) : null
      const daysSinceLastVisit = lastVisitDate
        ? Math.floor(
            (now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999

      // Churn risk: no visit in 30+ days
      const isChurnRisk = daysSinceLastVisit >= 30

      const isUpcomingRenewal =
        member.membershipEndDate &&
        new Date(member.membershipEndDate) <= fourteenDaysFromNow &&
        new Date(member.membershipEndDate) >= now

      return {
        ...member,
        visitsThisMonth: 0, // Will grow from webhook data
        avgVisitsPerMonth,
        daysSinceLastVisit,
        isChurnRisk,
        isUpcomingRenewal,
      }
    })

    type EnrichedMember = typeof enrichedMembers[number]

    if (churnRisk) {
      const atRisk = enrichedMembers.filter((m: EnrichedMember) => m.isChurnRisk)
      return NextResponse.json({ data: atRisk })
    }

    // Compute stats
    const standardMembers = enrichedMembers.filter(
      (m: EnrichedMember) => m.membershipType === 'STANDARD'
    )
    const unlimitedMembers = enrichedMembers.filter(
      (m: EnrichedMember) => m.membershipType === 'UNLIMITED'
    )

    const standardMrr = standardMembers.reduce(
      (sum: number, m: EnrichedMember) => sum + Number(m.monthlyRate ?? 0),
      0
    )
    const unlimitedMrr = unlimitedMembers.reduce(
      (sum: number, m: EnrichedMember) => sum + Number(m.monthlyRate ?? 0),
      0
    )

    const stats = {
      totalMrr: standardMrr + unlimitedMrr,
      standardMrr,
      unlimitedMrr,
      standardCount: standardMembers.length,
      unlimitedCount: unlimitedMembers.length,
      totalCount: enrichedMembers.length,
      churnRiskCount: enrichedMembers.filter((m: EnrichedMember) => m.isChurnRisk).length,
      upcomingRenewals: enrichedMembers.filter((m: EnrichedMember) => m.isUpcomingRenewal),
    }

    return NextResponse.json({ data: { members: enrichedMembers, stats } })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
