'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CHART_COLORS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { SkeletonCard } from '@/components/ui/skeleton'

interface RevenueDayData {
  date: string
  courtRentals: number
  memberships: number
  lessons: number
  proShop: number
  events: number
  other: number
}

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const total = payload.reduce((sum, entry) => sum + entry.value, 0)

  return (
    <div className="rounded-lg border border-[#D1D5DB] bg-white p-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-[#6B7280]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[#374151]">{entry.name}</span>
          </span>
          <span className="font-medium text-[#1A1A2E]">{formatCurrency(entry.value)}</span>
        </div>
      ))}
      <div className="mt-2 border-t border-[#D1D5DB] pt-2 text-xs font-semibold text-[#1A1A2E]">
        Total: {formatCurrency(total)}
      </div>
    </div>
  )
}

export function RevenueChart() {
  const [data, setData] = useState<RevenueDayData[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const res = await fetch('/api/revenue?days=30')
        if (!res.ok) throw new Error('Failed to fetch revenue')
        const json = await res.json()
        setData(json.data)
      } catch {
        // Keep loading state — skeleton stays
      } finally {
        setLoading(false)
      }
    }
    fetchRevenue()
  }, [])

  if (loading || !data) {
    return (
      <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
        <SkeletonCard lines={6} className="border-0 p-0" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
      <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-[#9CA3AF]">
        Revenue — Last 30 Days
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DD" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={{ stroke: '#E8E4DD' }}
              interval="preserveStartEnd"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Legend
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 11, color: '#6B7280', paddingTop: 8 }}
            />
            <Bar dataKey="courtRentals" name="Courts" stackId="stack" fill={CHART_COLORS.courtRentals} radius={[0, 0, 0, 0]} />
            <Bar dataKey="memberships" name="Memberships" stackId="stack" fill={CHART_COLORS.memberships} />
            <Bar dataKey="lessons" name="Lessons" stackId="stack" fill={CHART_COLORS.lessons} />
            <Bar dataKey="proShop" name="Pro Shop" stackId="stack" fill={CHART_COLORS.proShop} />
            <Bar dataKey="events" name="Events" stackId="stack" fill={CHART_COLORS.events} />
            <Bar dataKey="other" name="Other" stackId="stack" fill={CHART_COLORS.other} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
