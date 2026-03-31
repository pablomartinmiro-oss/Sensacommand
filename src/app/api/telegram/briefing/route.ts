import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage, testTelegramConnection } from '@/lib/telegram'

async function generateBriefing(): Promise<string> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)

  const [
    yesterdayRevenue,
    mtdRevenue,
    activeMembers,
    hotLeads,
    yesterdayVisits,
    churnRiskMembers,
    newPlayersYesterday,
  ] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { date: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { date: { gte: monthStart } },
    }),
    prisma.player.count({
      where: { membershipType: { not: 'NONE' } },
    }),
    prisma.player.count({
      where: { status: 'HOT_LEAD' },
    }),
    prisma.visit.count({
      where: { date: { gte: yesterdayStart, lt: todayStart } },
    }),
    prisma.player.findMany({
      where: { membershipType: { not: 'NONE' } },
      include: {
        visits: { orderBy: { date: 'desc' }, take: 1, select: { date: true } },
      },
    }),
    prisma.player.count({
      where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
    }),
  ])

  const churnCount = churnRiskMembers.filter((m: { visits: { date: Date }[] }) => {
    const lastVisit = m.visits[0]?.date
    return !lastVisit || new Date(lastVisit) < fourteenDaysAgo
  }).length

  const yRev = Number(yesterdayRevenue._sum.amount ?? 0)
  const mRev = Number(mtdRevenue._sum.amount ?? 0)
  const target = 45000
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const expectedPace = (target / daysInMonth) * dayOfMonth
  const pacePercent = expectedPace > 0 ? Math.round((mRev / expectedPace) * 100) : 0
  const paceEmoji = pacePercent >= 100 ? '🟢' : pacePercent >= 80 ? '🟡' : '🔴'

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  })

  const lines = [
    `🏓 *Sensa Padel — Morning Briefing*`,
    `📅 ${dateStr}`,
    ``,
    `*💰 Revenue*`,
    `Yesterday: $${yRev.toLocaleString()}`,
    `MTD: $${mRev.toLocaleString()} / $${target.toLocaleString()} (${pacePercent}% of pace) ${paceEmoji}`,
    ``,
    `*📊 Activity*`,
    `Yesterday visits: ${yesterdayVisits}`,
    `New players yesterday: ${newPlayersYesterday}`,
    ``,
    `*👥 Members*`,
    `Active members: ${activeMembers}`,
    `Churn risk (14+ days inactive): ${churnCount}`,
    ``,
    `*🎯 Pipeline*`,
    `Hot leads: ${hotLeads}`,
  ]

  if (churnCount > 0) {
    lines.push(``)
    lines.push(`⚠️ *Action needed:* ${churnCount} member(s) at churn risk`)
  }

  if (pacePercent < 80) {
    lines.push(`⚠️ *Revenue behind pace* — consider running a promo`)
  }

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    if (body.test) {
      const result = await testTelegramConnection()
      if (result.ok) {
        return NextResponse.json({ data: { success: true, message: 'Connection successful' } })
      }
      return NextResponse.json(
        { error: 'Connection failed', message: result.error || 'Unknown error' },
        { status: 500 }
      )
    }

    const briefing = await generateBriefing()
    const sent = await sendTelegramMessage(briefing)

    if (sent) {
      return NextResponse.json({ data: { success: true, message: 'Briefing sent', briefing } })
    }

    return NextResponse.json(
      { error: 'Send failed', message: 'Failed to send briefing via Telegram' },
      { status: 500 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
