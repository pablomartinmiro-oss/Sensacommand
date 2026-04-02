import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import type { Player } from '@/generated/prisma/client'

export class TrialExpiredFollowUp extends BaseAutomation {
  type = 'trial-expired-followup'
  name = 'Trial Expired Follow-Up'
  description = 'Follows up 3 days after a trial expires'
  schedule = '0 10 * * *' // Daily 10am

  async findTargets(): Promise<Player[]> {
    const now = new Date()

    // First, expire any trials that have passed their end date
    await prisma.player.updateMany({
      where: {
        trialStatus: 'ACTIVE',
        trialEndDate: { lt: now },
      },
      data: { trialStatus: 'EXPIRED' },
    })

    // Find players whose trial expired ~3 days ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000)
    const fourDaysAgo = new Date(now.getTime() - 4 * 86400000)

    return prisma.player.findMany({
      where: {
        trialStatus: 'EXPIRED',
        trialEndDate: { gte: fourDaysAgo, lte: threeDaysAgo },
      },
    })
  }

  async generateAction(player: Player) {
    return {
      message:
        `Hey ${player.firstName}! Your Sensa trial ended — we hope you loved it! ` +
        `We can still get you set up on All Access ($200/mo) or Play More ($79/mo). ` +
        `Let me know what works for you. — Pablo`,
      channel: 'whatsapp',
    }
  }
}
