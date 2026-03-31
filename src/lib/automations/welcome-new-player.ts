import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import type { Player } from '@/generated/prisma/client'

export class WelcomeNewPlayer extends BaseAutomation {
  type = 'welcome-new-player'
  name = 'Welcome New Player'
  description = 'Sends a welcome WhatsApp within 24h of a player\'s first visit'
  schedule = '0 */4 * * *' // every 4 hours

  async findTargets(): Promise<Player[]> {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const players = await prisma.player.findMany({
      where: {
        visits: { some: { date: { gte: fortyEightHoursAgo } } },
      },
      include: {
        _count: { select: { visits: true } },
      },
    })

    const firstTimers = players.filter(p => p._count.visits === 1)
    const targetIds: string[] = []

    for (const p of firstTimers) {
      const alreadyWelcomed = await prisma.automationLog.findFirst({
        where: { automationType: this.type, targetPlayerId: p.id },
      })
      if (!alreadyWelcomed) targetIds.push(p.id)
    }

    return prisma.player.findMany({ where: { id: { in: targetIds } } })
  }

  async generateAction(player: Player) {
    return {
      message: `Welcome to Sensa Padel, ${player.firstName}! 🏓 We hope you had a blast on the courts. How was your first experience? We've got open games, clinics, and tournaments running all week — check out our schedule and come play again soon!`,
      channel: 'whatsapp',
    }
  }
}
