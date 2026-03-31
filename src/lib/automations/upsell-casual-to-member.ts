import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import type { Player } from '@/generated/prisma/client'

export class UpsellCasualToMember extends BaseAutomation {
  type = 'upsell-casual-to-member'
  name = 'Upsell: Casual → Member'
  description = 'Pitches membership savings to frequent casual players (4+ visits in 30 days)'
  schedule = '0 11 * * 1' // Monday 11am

  async findTargets(): Promise<Player[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const players = await prisma.player.findMany({
      where: {
        membershipType: 'NONE',
        visits: { some: { date: { gte: thirtyDaysAgo } } },
      },
      include: {
        visits: { where: { date: { gte: thirtyDaysAgo } }, select: { amountPaid: true } },
      },
    })

    return players.filter(p => p.visits.length >= 4)
  }

  async generateAction(player: Player & { visits?: { amountPaid: unknown }[] }) {
    const totalSpent = (player.visits || []).reduce((sum, v) => sum + Number(v.amountPaid), 0)
    const standardPrice = 200
    const savings = totalSpent > standardPrice ? totalSpent - standardPrice : 0

    return {
      message: `Hey ${player.firstName}! You've been playing a lot at Sensa lately — love to see it! Just wanted to let you know: with a Standard membership at $${standardPrice}/mo, you'd save about $${Math.round(savings)} based on your recent visits. Unlimited is $350/mo for zero booking stress. Want to chat about it? 💰`,
      channel: 'whatsapp',
    }
  }
}
