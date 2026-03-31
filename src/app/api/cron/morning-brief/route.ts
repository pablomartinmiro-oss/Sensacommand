import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'
import { runDue } from '@/lib/automations/engine'

async function generateBriefing(): Promise<string> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)

  const oneWeekFromNow = new Date(now.getTime() + 7 * 86400000)

  const [
    yesterdayRevenue,
    mtdRevenue,
    activeMembers,
    hotLeads,
    yesterdayVisits,
    churnRiskMembers,
    newPlayersYesterday,
    mrrResult,
    overdueGoals,
    dueThisWeek,
    inProgressGoals,
    socialScheduledToday,
    socialDrafts,
    socialPostedYesterday,
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
    prisma.player.aggregate({
      _sum: { monthlyRate: true },
      where: { membershipType: { not: 'NONE' } },
    }),
    prisma.goal.findMany({
      where: { dueDate: { lt: todayStart }, status: { notIn: ['DONE', 'ON_HOLD'] } },
      select: { title: true },
      take: 3,
    }),
    prisma.goal.count({
      where: { dueDate: { gte: todayStart, lte: oneWeekFromNow }, status: { notIn: ['DONE', 'ON_HOLD'] } },
    }),
    prisma.goal.count({
      where: { status: 'IN_PROGRESS' },
    }),
    prisma.socialPost.count({
      where: { status: 'SCHEDULED', scheduledFor: { gte: todayStart, lte: new Date(todayStart.getTime() + 86400000) } },
    }),
    prisma.socialPost.count({
      where: { status: 'DRAFT' },
    }),
    prisma.socialPost.count({
      where: { status: 'POSTED', postedAt: { gte: yesterdayStart, lt: todayStart } },
    }),
  ])

  const churnCount = churnRiskMembers.filter((m: { visits: { date: Date }[] }) => {
    const lastVisit = m.visits[0]?.date
    return !lastVisit || new Date(lastVisit) < fourteenDaysAgo
  }).length

  const yRev = Number(yesterdayRevenue._sum.amount ?? 0)
  const mRev = Number(mtdRevenue._sum.amount ?? 0)
  const mrr = Number(mrrResult._sum.monthlyRate ?? 0)
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
    `MRR: $${mrr.toLocaleString()}`,
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
    ``,
    `*📋 Goals*`,
    `• ${overdueGoals.length > 0 ? `${overdueGoals.length} overdue` : 'No overdue goals'} ${overdueGoals.length > 0 ? '⚠️' : '✅'}`,
    ...(overdueGoals.length > 0 ? overdueGoals.map((g: { title: string }) => `  → ${g.title}`) : []),
    `• ${dueThisWeek} due this week`,
    `• ${inProgressGoals} in progress across team`,
    ``,
    `*📱 Social Media*`,
    `• ${socialScheduledToday} posts scheduled today`,
    `• ${socialDrafts} drafts need attention`,
    `• ${socialPostedYesterday} posts went out yesterday`,
  ]

  if (churnCount > 0) {
    lines.push(``)
    lines.push(`⚠️ *Action needed:* ${churnCount} member(s) at churn risk`)
  }

  if (pacePercent < 80) {
    lines.push(`⚠️ *Revenue behind pace* — consider running a promo`)
  }

  lines.push(``)
  lines.push(`🔗 Open Dashboard: https://sensacommand-production.up.railway.app`)

  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  // Auth via secret header instead of session (for cron jobs)
  const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'Configuration error', message: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  const providedSecret = cronSecret?.replace('Bearer ', '')
  if (providedSecret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid cron secret' },
      { status: 401 }
    )
  }

  try {
    const briefing = await generateBriefing()
    const sent = await sendTelegramMessage(briefing)

    // Run due automations
    const automationResults = await runDue()

    if (sent) {
      return NextResponse.json({
        data: { success: true, message: 'Morning briefing sent', timestamp: new Date().toISOString(), automations: automationResults.length },
      })
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
