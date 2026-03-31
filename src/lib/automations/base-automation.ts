import { prisma } from '@/lib/prisma'
import type { Player } from '@/generated/prisma/client'

export interface AutomationAction {
  message: string
  channel: string
}

export interface AutomationResult {
  type: string
  ran: number
  sent: number
  skipped: number
  failed: number
  dryRun: boolean
  details: { playerId?: string; playerName?: string; action: string; status: string }[]
}

export abstract class BaseAutomation {
  abstract type: string
  abstract name: string
  abstract description: string
  abstract schedule: string

  abstract findTargets(): Promise<Player[]>
  abstract generateAction(player: Player): Promise<AutomationAction>

  async shouldSend(playerId: string): Promise<boolean> {
    const recent = await prisma.automationLog.findFirst({
      where: {
        automationType: this.type,
        targetPlayerId: playerId,
        status: { in: ['sent', 'queued'] },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })
    return !recent
  }

  isQuietHours(): boolean {
    const now = new Date()
    // Convert to Central Time (approximate: UTC-6 CST / UTC-5 CDT)
    const centralOffset = -6
    const centralHour = (now.getUTCHours() + centralOffset + 24) % 24
    return centralHour < 9 || centralHour >= 20
  }

  async log(entry: {
    targetPlayerId?: string
    action: string
    message?: string
    channel?: string
    status: string
    error?: string
    dryRun: boolean
  }) {
    await prisma.automationLog.create({
      data: {
        automationType: this.type,
        ...entry,
      },
    })
  }

  async execute(dryRun = false): Promise<AutomationResult> {
    const result: AutomationResult = {
      type: this.type,
      ran: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      dryRun,
      details: [],
    }

    if (this.isQuietHours() && !dryRun) {
      await this.log({ action: 'quiet_hours_skip', status: 'skipped', dryRun })
      result.details.push({ action: 'quiet_hours_skip', status: 'skipped' })
      return result
    }

    const targets = await this.findTargets()
    result.ran = targets.length

    for (const player of targets) {
      try {
        const canSend = await this.shouldSend(player.id)
        if (!canSend) {
          result.skipped++
          result.details.push({
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            action: 'skipped_dedup',
            status: 'deduped',
          })
          if (dryRun) {
            await this.log({ targetPlayerId: player.id, action: 'skipped_dedup', status: 'deduped', dryRun: true })
          }
          continue
        }

        const action = await this.generateAction(player)

        if (dryRun) {
          result.sent++
          result.details.push({
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            action: 'would_send',
            status: 'dry_run',
          })
          await this.log({
            targetPlayerId: player.id,
            action: 'would_send',
            message: action.message,
            channel: action.channel,
            status: 'dry_run',
            dryRun: true,
          })
        } else {
          result.sent++
          result.details.push({
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            action: 'message_drafted',
            status: 'sent',
          })
          await this.log({
            targetPlayerId: player.id,
            action: 'message_drafted',
            message: action.message,
            channel: action.channel,
            status: 'sent',
            dryRun: false,
          })
        }
      } catch (e) {
        result.failed++
        result.details.push({
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          action: 'error',
          status: 'failed',
        })
        await this.log({
          targetPlayerId: player.id,
          action: 'error',
          status: 'failed',
          error: (e as Error).message,
          dryRun,
        })
      }
    }

    // Update config lastRun
    await prisma.automationConfig.updateMany({
      where: { type: this.type },
      data: { lastRun: new Date() },
    })

    return result
  }
}
