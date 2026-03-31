import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import type { Player } from '@/generated/prisma/client'

export class MembershipExpiring extends BaseAutomation {
  type = 'membership-expiring'
  name = 'Membership Expiring'
  description = 'Sends renewal reminders: 14-day soft reminder and 3-day urgent reminder'
  schedule = '0 9 * * *' // daily 9am

  async findTargets(): Promise<Player[]> {
    const now = new Date()
    const fourteenDaysFromNow = new Date(now.getTime() + 14 * 86400000)

    return prisma.player.findMany({
      where: {
        membershipType: { not: 'NONE' },
        membershipEndDate: {
          gte: now,
          lte: fourteenDaysFromNow,
        },
      },
    })
  }

  async generateAction(player: Player) {
    const now = new Date()
    const endDate = player.membershipEndDate
    const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / 86400000) : 0

    if (daysLeft <= 3) {
      return {
        message: `Hi ${player.firstName}, your ${player.membershipType} membership expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}! Don't lose your member benefits — reply to renew or stop by the pro shop. We'd hate to lose you! 🙏`,
        channel: 'email',
      }
    }

    return {
      message: `Hey ${player.firstName}, heads up — your ${player.membershipType} membership at Sensa renews in about 2 weeks. Everything look good? Let us know if you have any questions about your plan.`,
      channel: 'email',
    }
  }
}
