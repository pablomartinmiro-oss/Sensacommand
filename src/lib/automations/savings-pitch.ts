import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import { calculateSavings } from '@/lib/funnel/savings'
import type { Player } from '@/generated/prisma/client'

export class SavingsPitch extends BaseAutomation {
  type = 'savings-pitch'
  name = 'Savings Pitch WhatsApp'
  description = 'Drafts a savings-based membership pitch when a non-member hits 5+ visits in a month'
  schedule = '0 11 * * *' // Daily 11am

  async findTargets(): Promise<Player[]> {
    // Use stored totalVisits and check recent activity via lastVisitDate
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    return prisma.player.findMany({
      where: {
        membershipType: 'NONE',
        totalVisits: { gte: 5 },
        lastVisitDate: { gte: thirtyDaysAgo },
        firstVisitDate: { not: null },
      },
    })
  }

  async generateAction(player: Player) {
    const savings = calculateSavings({
      totalVisits: player.totalVisits,
      firstVisitDate: player.firstVisitDate,
      lastVisitDate: player.lastVisitDate,
      membershipType: player.membershipType,
    })

    return {
      message:
        `Hey ${player.firstName}! Quick heads up — I ran the numbers and at the rate you're playing ` +
        `(${savings?.visitsPerMonth ?? '~5'}x per month), you'd save around ` +
        `$${savings?.savingsPlayMore ?? '?'}/mo with our Play More membership, or ` +
        `$${savings?.savingsAllAccess ?? '?'}/mo with All Access. ` +
        `Basically pays for itself. Want me to set you up? — Pablo`,
      channel: 'whatsapp',
    }
  }
}
