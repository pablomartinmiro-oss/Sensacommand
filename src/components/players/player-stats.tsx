'use client'

import { CalendarDays, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PlayerWithRelations } from '@/types'

interface PlayerStatsProps {
  player: PlayerWithRelations
}

export function PlayerStats({ player }: PlayerStatsProps) {
  // Use stored totalVisits from PBP data, fall back to visits array length
  const totalVisits = player.totalVisits || player.visits.length
  const totalRevenue = player.payments.reduce(
    (sum: number, p: (typeof player.payments)[number]) => sum + Number(p.amount),
    0
  )

  // Calculate avg visits per month using stored dates
  const startDate = player.firstVisitDate || player.createdAt
  const memberSince = new Date(startDate)
  const now = new Date()
  const monthsActive = Math.max(
    1,
    (now.getFullYear() - memberSince.getFullYear()) * 12 +
      (now.getMonth() - memberSince.getMonth()) +
      1
  )
  const avgVisitsPerMonth = Math.round((totalVisits / monthsActive) * 10) / 10

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Total Visits"
        value={totalVisits}
        icon={<CalendarDays className="h-5 w-5" />}
      />
      <StatCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        icon={<DollarSign className="h-5 w-5" />}
      />
      <StatCard
        title="Avg Visits / Month"
        value={avgVisitsPerMonth}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <StatCard
        title="Member Since"
        value={formatDate(memberSince)}
        icon={<Clock className="h-5 w-5" />}
      />
    </div>
  )
}
