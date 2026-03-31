'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { SkeletonCard } from '@/components/ui/skeleton'

interface VisitDayData {
  date: string
  visits: number
}

function VisitTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-[#D1D5DB] bg-white p-3 shadow-xl">
      <p className="mb-1 text-xs font-medium text-[#6B7280]">{label}</p>
      <p className="text-sm font-semibold text-amber-400">
        {payload[0].value} visit{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

export function VisitsChart() {
  const [data, setData] = useState<VisitDayData[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVisits() {
      try {
        const res = await fetch('/api/visits/trend')
        if (!res.ok) throw new Error('Failed to fetch visits')
        const json = await res.json()
        setData(json.data)
      } catch {
        // Keep skeleton
      } finally {
        setLoading(false)
      }
    }
    fetchVisits()
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
        Visits — Last 30 Days
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
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
              allowDecimals={false}
            />
            <Tooltip
              content={<VisitTooltipContent />}
              cursor={{ stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Line
              type="monotone"
              dataKey="visits"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#f59e0b',
                stroke: '#0f0f15',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
