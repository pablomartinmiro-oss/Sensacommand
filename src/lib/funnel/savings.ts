import { differenceInMonths } from 'date-fns'
import type { SavingsCalculation } from '@/types'

interface PlayerData {
  totalVisits: number
  firstVisitDate: Date | string | null
  lastVisitDate: Date | string | null
  membershipType: string
}

const CASUAL_RATE = 40
const ALL_ACCESS_RATE = 200
const PLAY_MORE_RATE = 79

export function calculateSavings(player: PlayerData): SavingsCalculation | null {
  if (player.membershipType !== 'NONE') return null
  if (!player.firstVisitDate || !player.lastVisitDate || player.totalVisits < 2) return null

  const first = new Date(player.firstVisitDate)
  const last = new Date(player.lastVisitDate)
  const monthsActive = Math.max(1, differenceInMonths(last, first) || 1)
  const visitsPerMonth = player.totalVisits / monthsActive
  const monthlySpend = visitsPerMonth * CASUAL_RATE

  return {
    visitsPerMonth: Math.round(visitsPerMonth * 10) / 10,
    estimatedMonthlySpend: Math.round(monthlySpend),
    savingsAllAccess: Math.round(monthlySpend - ALL_ACCESS_RATE),
    savingsPlayMore: Math.round(monthlySpend - PLAY_MORE_RATE),
    breakevenAllAccess: Math.ceil(ALL_ACCESS_RATE / CASUAL_RATE),
    breakevenPlayMore: Math.ceil(PLAY_MORE_RATE / CASUAL_RATE),
    recommendation:
      monthlySpend >= ALL_ACCESS_RATE
        ? 'ALL_ACCESS'
        : monthlySpend >= PLAY_MORE_RATE
          ? 'PLAY_MORE'
          : 'NOT_YET',
  }
}

export function calculateConversionScore(player: {
  totalVisits: number
  lastVisitDate: Date | string | null
  createdAt: Date | string
  membershipType: string
}): number {
  if (player.membershipType !== 'NONE') return 0

  let score = 0
  const now = new Date()

  // Visit frequency (0-40 points)
  score += Math.min(40, player.totalVisits * 8)

  // Recency (0-30 points)
  if (player.lastVisitDate) {
    const daysSinceLastVisit = Math.floor(
      (now.getTime() - new Date(player.lastVisitDate).getTime()) / 86400000
    )
    if (daysSinceLastVisit <= 7) score += 30
    else if (daysSinceLastVisit <= 14) score += 20
    else if (daysSinceLastVisit <= 30) score += 10
  }

  // Tenure (0-15 points)
  const daysSinceCreated = Math.floor(
    (now.getTime() - new Date(player.createdAt).getTime()) / 86400000
  )
  if (daysSinceCreated >= 30 && daysSinceCreated <= 90) score += 15
  else if (daysSinceCreated >= 14) score += 10

  // Engagement (0-15 points)
  if (player.totalVisits >= 3) score += 15
  else if (player.totalVisits >= 2) score += 10

  return Math.min(100, score)
}
