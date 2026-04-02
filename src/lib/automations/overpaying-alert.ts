import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'
import { BaseAutomation } from './base-automation'
import { calculateSavings } from '@/lib/funnel/savings'
import type { Player } from '@/generated/prisma/client'

export class OverpayingAlert extends BaseAutomation {
  type = 'overpaying-alert'
  name = 'Overpaying Alert'
  description = 'Telegram alert when a non-member averages 5+ visits/mo and saves >$100/mo'
  schedule = '0 10 * * *' // Daily 10am

  async findTargets(): Promise<Player[]> {
    // Use stored Player fields instead of querying visits
    const players = await prisma.player.findMany({
      where: {
        membershipType: 'NONE',
        totalVisits: { gte: 5 },
        firstVisitDate: { not: null },
        lastVisitDate: { not: null },
      },
    })

    return players.filter((p) => {
      const savings = calculateSavings({
        totalVisits: p.totalVisits,
        firstVisitDate: p.firstVisitDate,
        lastVisitDate: p.lastVisitDate,
        membershipType: p.membershipType,
      })
      return savings && savings.visitsPerMonth >= 5 && savings.savingsAllAccess > 100
    })
  }

  async generateAction(player: Player) {
    const savings = calculateSavings({
      totalVisits: player.totalVisits,
      firstVisitDate: player.firstVisitDate,
      lastVisitDate: player.lastVisitDate,
      membershipType: player.membershipType,
    })

    const msg =
      `💰 OVERPAYING ALERT: ${player.firstName} ${player.lastName} ` +
      `averages ${savings?.visitsPerMonth ?? '?'} visits/mo (~$${savings?.estimatedMonthlySpend ?? '?'}). ` +
      `All Access would save them $${savings?.savingsAllAccess ?? '?'}/mo. This is an easy close.`

    await sendTelegramMessage(msg)

    return { message: msg, channel: 'telegram' }
  }
}
