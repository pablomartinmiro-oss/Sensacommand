import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setDate(yesterdayStart.getDate() - 1)

    const [todayPayments, yesterdayPayments, unlimitedCount, standardCount, mrrResult, hotLeadCount] =
      await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            date: {
              gte: todayStart,
              lt: new Date(todayStart.getTime() + 86400000),
            },
          },
        }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            date: {
              gte: yesterdayStart,
              lt: todayStart,
            },
          },
        }),
        prisma.player.count({
          where: { membershipType: 'UNLIMITED' },
        }),
        prisma.player.count({
          where: { membershipType: 'STANDARD' },
        }),
        prisma.player.aggregate({
          _sum: { monthlyRate: true },
          where: {
            membershipType: { not: 'NONE' },
          },
        }),
        prisma.player.count({
          where: { status: 'HOT_LEAD' },
        }),
      ])

    const todayRevenue = Number(todayPayments._sum.amount ?? 0)
    const yesterdayRevenue = Number(yesterdayPayments._sum.amount ?? 0)
    const mrr = Number(mrrResult._sum.monthlyRate ?? 0)

    return NextResponse.json({
      data: {
        todayRevenue,
        yesterdayRevenue,
        activeMembers: {
          unlimited: unlimitedCount,
          standard: standardCount,
          total: unlimitedCount + standardCount,
        },
        mrr,
        hotLeads: hotLeadCount,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
