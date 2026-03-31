import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import { sendTelegramMessage } from '@/lib/telegram'
import type { Player } from '@/generated/prisma/client'

export class ChurnRiskAlert extends BaseAutomation {
  type = 'churn-risk-alert'
  name = 'Churn Risk Alert'
  description = 'Alerts Pablo via Telegram when a member\'s visits drop 50%+ month-over-month'
  schedule = '0 9 * * 1' // Monday 9am

  async findTargets(): Promise<Player[]> {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const members = await prisma.player.findMany({
      where: { membershipType: { in: ['UNLIMITED', 'STANDARD'] } },
      include: {
        visits: {
          where: { date: { gte: lastMonthStart } },
          select: { date: true },
        },
      },
    })

    return members.filter(m => {
      const lastMonthVisits = m.visits.filter(v => new Date(v.date) < thisMonthStart).length
      const thisMonthVisits = m.visits.filter(v => new Date(v.date) >= thisMonthStart).length
      return lastMonthVisits > 0 && thisMonthVisits < lastMonthVisits * 0.5
    })
  }

  async generateAction(player: Player) {
    return {
      message: `⚠️ Churn Risk: ${player.firstName} ${player.lastName} (${player.membershipType}) — visit frequency dropped 50%+ this month. Consider reaching out.`,
      channel: 'telegram',
    }
  }

  async execute(dryRun = false) {
    const result = await super.execute(dryRun)

    // Send consolidated Telegram alert (not dry run)
    if (!dryRun && result.sent > 0) {
      const names = result.details
        .filter(d => d.status === 'sent')
        .map(d => d.playerName)
      const msg = `🚨 *Churn Risk Alert*\n\n${result.sent} member(s) at risk:\n${names.map(n => `• ${n}`).join('\n')}\n\nCheck the dashboard for details.`
      await sendTelegramMessage(msg)
    }

    return result
  }
}
