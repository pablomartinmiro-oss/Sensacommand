import { prisma } from '@/lib/prisma'
import { BaseAutomation } from './base-automation'
import { sendTelegramMessage } from '@/lib/telegram'
import type { Player } from '@/generated/prisma/client'

export class OverdueGoalsDigest extends BaseAutomation {
  type = 'overdue-goals-digest'
  name = 'Overdue Goals Digest'
  description = 'Daily Telegram digest of overdue goals with assignees'
  schedule = '0 8 * * *' // daily 8am Central

  async findTargets(): Promise<Player[]> {
    // This automation doesn't target players — returns empty
    return []
  }

  async generateAction() {
    return { message: '', channel: 'telegram' }
  }

  async execute(dryRun = false) {
    const overdueGoals = await prisma.goal.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { notIn: ['DONE', 'ON_HOLD'] },
      },
      include: {
        assignees: { select: { firstName: true, lastName: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    if (overdueGoals.length === 0) {
      await this.log({ action: 'no_overdue_goals', status: 'skipped', dryRun })
      return { type: this.type, ran: 0, sent: 0, skipped: 1, failed: 0, dryRun, details: [] }
    }

    const lines = overdueGoals.slice(0, 15).map(g => {
      const assignees = g.assignees.map(a => `${a.firstName} ${a.lastName}`).join(', ') || 'Unassigned'
      const daysOverdue = Math.ceil((Date.now() - new Date(g.dueDate!).getTime()) / 86400000)
      return `• *${g.title}* (${assignees}) — ${daysOverdue}d overdue`
    })

    const msg = `📋 *Overdue Goals Digest*\n\n${overdueGoals.length} goal(s) overdue:\n\n${lines.join('\n')}${overdueGoals.length > 15 ? `\n\n...and ${overdueGoals.length - 15} more` : ''}`

    if (!dryRun) {
      await sendTelegramMessage(msg)
    }

    await this.log({ action: 'digest_sent', message: msg, channel: 'telegram', status: dryRun ? 'dry_run' : 'sent', dryRun })
    await prisma.automationConfig.updateMany({ where: { type: this.type }, data: { lastRun: new Date() } })

    return {
      type: this.type,
      ran: overdueGoals.length,
      sent: 1,
      skipped: 0,
      failed: 0,
      dryRun,
      details: [{ action: 'digest_sent', status: dryRun ? 'dry_run' : 'sent' }],
    }
  }
}
