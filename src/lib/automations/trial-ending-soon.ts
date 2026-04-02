import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import type { Player } from '@/generated/prisma/client'

export class TrialEndingSoon extends BaseAutomation {
  type = 'trial-ending-soon'
  name = 'Trial Ending Soon'
  description = 'Sends a conversion message 2 days before trial ends'
  schedule = '0 10 * * *' // Daily 10am

  async findTargets(): Promise<Player[]> {
    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 86400000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000)

    return prisma.player.findMany({
      where: {
        trialStatus: 'ACTIVE',
        trialEndDate: { gte: twoDaysFromNow, lte: threeDaysFromNow },
      },
    })
  }

  async generateAction(player: Player) {
    return {
      message:
        `Hey ${player.firstName}! Your 2-week All Access trial wraps up in 2 days. ` +
        `If you've been enjoying the unlimited play, we can roll it right into a membership — ` +
        `$200/mo to keep the good times going. Want to lock it in? — Pablo`,
      channel: 'whatsapp',
    }
  }
}
