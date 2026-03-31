import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import { sendTelegramMessage } from '@/lib/telegram'
import type { Player } from '@/generated/prisma/client'

export class WeeklyPerformanceReport extends BaseAutomation {
  type = 'weekly-performance-report'
  name = 'Weekly Performance Report'
  description = 'Monday morning Telegram summary of last week vs prior week'
  schedule = '0 8 * * 1' // Monday 8am

  async findTargets(): Promise<Player[]> {
    return []
  }

  async generateAction() {
    return { message: '', channel: 'telegram' }
  }

  async execute(dryRun = false) {
    const now = new Date()
    const thisWeekStart = new Date(now.getTime() - 7 * 86400000)
    const lastWeekStart = new Date(now.getTime() - 14 * 86400000)

    const [thisWeekRev, lastWeekRev, thisWeekVisits, lastWeekVisits, newPlayers, conversions] =
      await Promise.all([
        prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: thisWeekStart } } }),
        prisma.payment.aggregate({ _sum: { amount: true }, where: { date: { gte: lastWeekStart, lt: thisWeekStart } } }),
        prisma.visit.count({ where: { date: { gte: thisWeekStart } } }),
        prisma.visit.count({ where: { date: { gte: lastWeekStart, lt: thisWeekStart } } }),
        prisma.player.count({ where: { createdAt: { gte: thisWeekStart } } }),
        prisma.player.count({ where: { membershipType: { not: 'NONE' }, membershipStartDate: { gte: thisWeekStart } } }),
      ])

    const twRev = Number(thisWeekRev._sum.amount ?? 0)
    const lwRev = Number(lastWeekRev._sum.amount ?? 0)
    const revChange = lwRev > 0 ? Math.round(((twRev - lwRev) / lwRev) * 100) : 0
    const visitChange = lastWeekVisits > 0 ? Math.round(((thisWeekVisits - lastWeekVisits) / lastWeekVisits) * 100) : 0
    const revEmoji = revChange >= 0 ? '📈' : '📉'
    const visitEmoji = visitChange >= 0 ? '📈' : '📉'

    const msg = [
      `📊 *Weekly Performance Report*`,
      ``,
      `*Revenue:* $${twRev.toLocaleString()} ${revEmoji} ${revChange >= 0 ? '+' : ''}${revChange}% vs last week`,
      `*Visits:* ${thisWeekVisits} ${visitEmoji} ${visitChange >= 0 ? '+' : ''}${visitChange}% vs last week`,
      `*New Players:* ${newPlayers}`,
      `*Member Conversions:* ${conversions}`,
    ].join('\n')

    if (!dryRun) {
      await sendTelegramMessage(msg)
    }

    await this.log({ action: 'report_sent', message: msg, channel: 'telegram', status: dryRun ? 'dry_run' : 'sent', dryRun })
    await prisma.automationConfig.updateMany({ where: { type: this.type }, data: { lastRun: new Date() } })

    return {
      type: this.type,
      ran: 1,
      sent: 1,
      skipped: 0,
      failed: 0,
      dryRun,
      details: [{ action: 'report_sent', status: dryRun ? 'dry_run' : 'sent' }],
    }
  }
}
