'use client'

import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { SkeletonCard } from '@/components/ui/skeleton'
import type { DailyRevenue } from '@/types'

interface RevenueChartsProps {
  refreshKey?: number
}

interface MonthlyData {
  category: string
  thisMonth: number
  lastMonth: number
}

interface PieData {
  name: string
  value: number
  color: string
}

const COLORS_ARRAY = [
  CHART_COLORS.courtRentals,
  CHART_COLORS.memberships,
  CHART_COLORS.lessons,
  CHART_COLORS.proShop,
  CHART_COLORS.events,
  CHART_COLORS.other,
]

const CATEGORY_KEYS: { key: 'courtRentals' | 'memberships' | 'lessons' | 'proShop' | 'events' | 'other'; label: string }[] = [
  { key: 'courtRentals', label: 'Court Rentals' },
  { key: 'memberships', label: 'Memberships' },
  { key: 'lessons', label: 'Lessons' },
  { key: 'proShop', label: 'Pro Shop' },
  { key: 'events', label: 'Events' },
  { key: 'other', label: 'Other' },
]

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#D1D5DB] bg-white p-3 shadow-xl">
      <p className="text-xs font-medium text-[#6B7280] mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[#374151]">{entry.name}</span>
          </span>
          <span className="font-medium text-[#1A1A2E]">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function RevenueCharts({ refreshKey }: RevenueChartsProps) {
  const [barData, setBarData] = useState<MonthlyData[]>([])
  const [pieData, setPieData] = useState<PieData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChartData() {
      setLoading(true)
      try {
        const res = await fetch('/api/revenue?days=60')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        const records: DailyRevenue[] = json.data || []

        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

        const thisMonthRecords = records.filter((r) => {
          const d = new Date(r.date)
          return d >= thisMonthStart
        })
        const lastMonthRecords = records.filter((r) => {
          const d = new Date(r.date)
          return d >= lastMonthStart && d < thisMonthStart
        })

        const sumCategory = (recs: DailyRevenue[], key: string) =>
          recs.reduce((sum, r) => sum + Number((r as Record<string, unknown>)[key] || 0), 0)

        const barChartData: MonthlyData[] = CATEGORY_KEYS.map(({ key, label }) => ({
          category: label,
          thisMonth: sumCategory(thisMonthRecords, key),
          lastMonth: sumCategory(lastMonthRecords, key),
        }))
        setBarData(barChartData)

        const pieChartData: PieData[] = CATEGORY_KEYS.map(({ key, label }, i) => ({
          name: label,
          value: sumCategory(thisMonthRecords, key),
          color: COLORS_ARRAY[i],
        })).filter((d) => d.value > 0)
        setPieData(pieChartData)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchChartData()
  }, [refreshKey])

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SkeletonCard lines={6} />
        <SkeletonCard lines={6} />
      </div>
    )
  }

  const pieTotal = pieData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Monthly comparison bar chart */}
      <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
        <h3 className="text-sm font-semibold text-[#1A1A2E] mb-4">
          Monthly Comparison
          <span className="ml-2 text-xs font-normal text-[#9CA3AF]">
            This month vs last month
          </span>
        </h3>
        {barData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-[#9CA3AF]">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DD" />
              <XAxis
                dataKey="category"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#E8E4DD' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: '#E8E4DD' }}
                tickLine={false}
                tickFormatter={(v: number) => `$${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, color: '#6B7280' }}
              />
              <Bar
                dataKey="thisMonth"
                name="This Month"
                fill={CHART_COLORS.courtRentals}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="lastMonth"
                name="Last Month"
                fill="#3b3b4b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Revenue by category pie chart */}
      <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
        <h3 className="text-sm font-semibold text-[#1A1A2E] mb-4">
          Revenue by Category
          <span className="ml-2 text-xs font-normal text-[#9CA3AF]">
            Current month
          </span>
        </h3>
        {pieData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-[#9CA3AF]">
            No data available
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: 8,
                    color: '#e4e4e7',
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 mt-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-[#6B7280] truncate">{entry.name}</span>
                  <span className="text-[#1A1A2E] font-medium ml-auto">
                    {pieTotal > 0
                      ? `${Math.round((entry.value / pieTotal) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
