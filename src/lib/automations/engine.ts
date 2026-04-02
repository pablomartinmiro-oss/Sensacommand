import { prisma } from '@/lib/prisma'
import type { BaseAutomation, AutomationResult } from './base-automation'
import { WinBack14Day } from './win-back-14-day'
import { WinBack30Day } from './win-back-30-day'
import { UpsellCasualToMember } from './upsell-casual-to-member'
import { WelcomeNewPlayer } from './welcome-new-player'
import { MembershipExpiring } from './membership-expiring'
import { ChurnRiskAlert } from './churn-risk-alert'
import { OverdueGoalsDigest } from './overdue-goals-digest'
import { WeeklyPerformanceReport } from './weekly-performance-report'
import { OverpayingAlert } from './overpaying-alert'
import { SavingsPitch } from './savings-pitch'
import { TrialMidCheck } from './trial-mid-check'
import { TrialEndingSoon } from './trial-ending-soon'
import { TrialExpiredFollowUp } from './trial-expired-followup'
import { ReferralNudge } from './referral-nudge'

const ALL_AUTOMATIONS: BaseAutomation[] = [
  new WinBack14Day(),
  new WinBack30Day(),
  new UpsellCasualToMember(),
  new WelcomeNewPlayer(),
  new MembershipExpiring(),
  new ChurnRiskAlert(),
  new OverdueGoalsDigest(),
  new WeeklyPerformanceReport(),
  new OverpayingAlert(),
  new SavingsPitch(),
  new TrialMidCheck(),
  new TrialEndingSoon(),
  new TrialExpiredFollowUp(),
  new ReferralNudge(),
]

export function loadAll(): BaseAutomation[] {
  return ALL_AUTOMATIONS
}

export async function runSingle(type: string, dryRun = false): Promise<AutomationResult | null> {
  const automation = ALL_AUTOMATIONS.find(a => a.type === type)
  if (!automation) return null

  // Check if enabled
  const config = await prisma.automationConfig.findUnique({ where: { type } })
  if (config && !config.enabled && !dryRun) {
    return { type, ran: 0, sent: 0, skipped: 1, failed: 0, dryRun, details: [{ action: 'disabled', status: 'skipped' }] }
  }

  return automation.execute(dryRun)
}

export async function runDue(): Promise<AutomationResult[]> {
  const configs = await prisma.automationConfig.findMany({ where: { enabled: true } })
  const results: AutomationResult[] = []

  for (const config of configs) {
    const automation = ALL_AUTOMATIONS.find(a => a.type === config.type)
    if (!automation) continue

    // Simple schedule check: if lastRun is null or older than expected interval
    const shouldRun = !config.lastRun || isScheduleDue(config.schedule, config.lastRun)
    if (shouldRun) {
      const result = await automation.execute(false)
      results.push(result)
    }
  }

  return results
}

export async function getStatus() {
  const configs = await prisma.automationConfig.findMany({ orderBy: { type: 'asc' } })
  const logCounts = await prisma.automationLog.groupBy({
    by: ['automationType'],
    _count: true,
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  })

  const countMap = new Map(logCounts.map(l => [l.automationType, l._count]))

  return configs.map(c => ({
    ...c,
    recentLogs: countMap.get(c.type) || 0,
  }))
}

/** Simple cron schedule check */
function isScheduleDue(cron: string, lastRun: Date): boolean {
  const parts = cron.split(' ')
  const now = new Date()
  const elapsed = now.getTime() - lastRun.getTime()

  // Parse hour and day-of-week from cron
  const cronHour = parts[1]
  const cronDow = parts[4] // day of week

  // Hourly crons (e.g., "0 */4 * * *")
  if (cronHour?.includes('/')) {
    const interval = parseInt(cronHour.split('/')[1]) * 3600000
    return elapsed >= interval
  }

  // Weekly crons (specific day of week)
  if (cronDow !== '*') {
    return elapsed >= 7 * 86400000
  }

  // Daily crons
  return elapsed >= 24 * 3600000
}
