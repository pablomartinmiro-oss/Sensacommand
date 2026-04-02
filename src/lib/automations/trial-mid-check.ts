import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import type { Player } from '@/generated/prisma/client'

export class TrialMidCheck extends BaseAutomation {
  type = 'trial-mid-check'
  name = 'Trial Mid-Check'
  description = 'Sends a check-in message at day 7 of a trial'
  schedule = '0 10 * * *' // Daily 10am

  async findTargets(): Promise<Player[]> {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
    const eightDaysAgo = new Date(now.getTime() - 8 * 86400000)

    return prisma.player.findMany({
      where: {
        trialStatus: 'ACTIVE',
        trialStartDate: { gte: eightDaysAgo, lte: sevenDaysAgo },
      },
    })
  }

  async generateAction(player: Player) {
    return {
      message:
        `Hey ${player.firstName}! You're a week into your Sensa trial — how's it going? ` +
        `Been taking advantage of unlimited play? Try one of our clinics this week if you haven't yet! — Pablo`,
      channel: 'whatsapp',
    }
  }
}
