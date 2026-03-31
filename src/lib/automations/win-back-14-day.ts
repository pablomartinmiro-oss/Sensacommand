import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import type { Player } from '@/generated/prisma/client'

export class WinBack14Day extends BaseAutomation {
  type = 'win-back-14-day'
  name = '14-Day Win-Back'
  description = 'Sends a warm "we miss you" WhatsApp to players inactive for 14+ days'
  schedule = '0 10 * * *' // daily 10am

  async findTargets(): Promise<Player[]> {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000)
    const players = await prisma.player.findMany({
      where: {
        membershipType: 'NONE',
        visits: { some: {} },
      },
      include: { visits: { orderBy: { date: 'desc' }, take: 1, select: { date: true } } },
    })

    const targetIds: string[] = []
    for (const p of players) {
      const lastVisit = p.visits[0]?.date
      if (!lastVisit || new Date(lastVisit) > fourteenDaysAgo) continue
      const recentLog = await prisma.automationLog.findFirst({
        where: { automationType: this.type, targetPlayerId: p.id, createdAt: { gte: fourteenDaysAgo } },
      })
      if (!recentLog) targetIds.push(p.id)
    }

    return prisma.player.findMany({ where: { id: { in: targetIds } } })
  }

  async generateAction(player: Player) {
    return {
      message: `Hey ${player.firstName}! It's been a little while since we've seen you at Sensa. The courts miss you! Come back for a game this week — we've got some great open play sessions running. 🏓`,
      channel: 'whatsapp',
    }
  }
}
