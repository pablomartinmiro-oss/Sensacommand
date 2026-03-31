import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import type { Player } from '@/generated/prisma/client'

export class WinBack30Day extends BaseAutomation {
  type = 'win-back-30-day'
  name = '30-Day Win-Back'
  description = 'Stronger push with free guest pass for 30+ day inactive players who got the 14-day message'
  schedule = '0 10 * * *'

  async findTargets(): Promise<Player[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const players = await prisma.player.findMany({
      where: { visits: { some: {} } },
      include: { visits: { orderBy: { date: 'desc' }, take: 1, select: { date: true } } },
    })

    const targetIds: string[] = []
    for (const p of players) {
      const lastVisit = p.visits[0]?.date
      if (!lastVisit || new Date(lastVisit) > thirtyDaysAgo) continue
      // Must have received 14-day message
      const got14Day = await prisma.automationLog.findFirst({
        where: { automationType: 'win-back-14-day', targetPlayerId: p.id, status: 'sent' },
      })
      if (!got14Day) continue
      // Not already sent 30-day in last 30 days
      const recent30 = await prisma.automationLog.findFirst({
        where: { automationType: this.type, targetPlayerId: p.id, createdAt: { gte: thirtyDaysAgo } },
      })
      if (!recent30) targetIds.push(p.id)
    }

    return prisma.player.findMany({ where: { id: { in: targetIds } } })
  }

  async generateAction(player: Player) {
    return {
      message: `${player.firstName}, we've got something special for you! Bring a friend to Sensa this week — their first session is on us. We'd love to see you back on the courts! Reply to claim your free guest pass. 🎾`,
      channel: 'whatsapp',
    }
  }
}
