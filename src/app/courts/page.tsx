'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { CourtHeatmap } from '@/components/courts/court-heatmap'
import { CourtStats } from '@/components/courts/court-stats'
import { SkeletonCard } from '@/components/ui/skeleton'

interface HeatmapCell {
  dayOfWeek: number
  hour: number
  count: number
}

interface CourtUtilizationItem {
  courtNumber: number
  visitCount: number
  utilization: number
  revenue: number
}

interface PeakHour {
  hour: number
  count: number
}

interface CourtsData {
  heatmap: {
    all: HeatmapCell[]
    byCourt: Record<number, HeatmapCell[]>
  }
  stats: {
    mostPopularCourt: { courtNumber: number; visitCount: number } | null
    peakHours: PeakHour[]
    courtUtilization: CourtUtilizationItem[]
    revenuePerCourt: { courtNumber: number; revenue: number }[]
  }
  courts: number[]
}

export default function CourtsPage() {
  const [data, setData] = useState<CourtsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/courts/utilization')
        if (!res.ok) throw new Error('Failed to fetch court data')
        const json = await res.json()
        setData(json.data)
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading || !data) {
    return (
      <>
        <Header title="Courts" />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
          <p className="text-sm text-zinc-500">
            Court utilization, peak hours, and revenue breakdown.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={3} />
            ))}
          </div>
          <SkeletonCard lines={8} />
        </main>
      </>
    )
  }

  return (
    <>
      <Header title="Courts" />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        <div>
          <p className="text-sm text-zinc-500">
            Court utilization, peak hours, and revenue breakdown.
          </p>
        </div>

        {/* Stats cards */}
        <CourtStats
          mostPopularCourt={data.stats.mostPopularCourt}
          peakHours={data.stats.peakHours}
          courtUtilization={data.stats.courtUtilization}
          revenuePerCourt={data.stats.revenuePerCourt}
        />

        {/* Heatmap */}
        <CourtHeatmap
          heatmapAll={data.heatmap.all}
          heatmapByCourt={data.heatmap.byCourt}
          courts={data.courts}
        />
      </main>
    </>
  )
}
