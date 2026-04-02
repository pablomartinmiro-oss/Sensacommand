import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import type { Player } from '@/generated/prisma/client'

export class ReferralNudge extends BaseAutomation {
  type = 'referral-nudge'
  name = 'Referral Nudge to Members'
  description = 'Nudges active members who haven\'t referred anyone in 60 days'
  schedule = '0 11 * * 3' // Wednesday 11am

  async findTargets(): Promise<Player[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000)

    // Active members (visited in last 30 days) who are actual members
    const members = await prisma.player.findMany({
      where: {
        membershipType: { not: 'NONE' },
        visits: { some: { date: { gte: thirtyDaysAgo } } },
      },
      include: {
        referralsGiven: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    })

    return members.filter((m) => {
      const lastReferral = m.referralsGiven[0]?.createdAt
      return !lastReferral || new Date(lastReferral) < sixtyDaysAgo
    })
  }

  async generateAction(player: Player) {
    return {
      message:
        `Hey ${player.firstName}! Know anyone who'd love padel? Bring a friend to Sensa ` +
        `and if they join, you both get $50 in club credit! Just have them mention your name. 🎾 — Pablo`,
      channel: 'whatsapp',
    }
  }
}
