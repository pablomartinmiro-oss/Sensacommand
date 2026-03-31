'use client'

import { useState, useEffect } from 'react'
import { DollarSign, Users, TrendingUp, Target } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { formatCurrency, percentChange } from '@/lib/utils'
import type { DashboardStats } from '@/types'

export function StatCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const json = await res.json()
        setStats(json.data)
      } catch {
        // Silently fail — cards stay in skeleton
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>
    )
  }

  const revenueChange = percentChange(stats.todayRevenue, stats.yesterdayRevenue)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        title="Today's Revenue"
        value={formatCurrency(stats.todayRevenue)}
        change={revenueChange}
        changeLabel="vs yesterday"
        icon={<DollarSign className="h-5 w-5" />}
      />
      <StatCard
        title="Active Members"
        value={stats.activeMembers.total}
        changeLabel={`${stats.activeMembers.unlimited} unlimited, ${stats.activeMembers.standard} standard`}
        icon={<Users className="h-5 w-5" />}
      />
      <StatCard
        title="Monthly Recurring Revenue"
        value={formatCurrency(stats.mrr)}
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <StatCard
        title="Hot Leads"
        value={stats.hotLeads}
        icon={<Target className="h-5 w-5" />}
      />
    </div>
  )
}
