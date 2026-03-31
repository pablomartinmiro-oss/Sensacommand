'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface HeatmapCell {
  dayOfWeek: number
  hour: number
  count: number
}

interface CourtHeatmapProps {
  heatmapAll: HeatmapCell[]
  heatmapByCourt: Record<number, HeatmapCell[]>
  courts: number[]
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOUR_LABELS = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour
  return `${display}${suffix}`
})

function getIntensityClass(count: number, maxCount: number): string {
  if (maxCount === 0 || count === 0) return 'bg-white'
  const ratio = count / maxCount
  if (ratio >= 0.8) return 'bg-amber-500'
  if (ratio >= 0.6) return 'bg-amber-500/80'
  if (ratio >= 0.4) return 'bg-amber-500/50'
  if (ratio >= 0.2) return 'bg-amber-500/30'
  return 'bg-amber-500/15'
}

export function CourtHeatmap({
  heatmapAll,
  heatmapByCourt,
  courts,
}: CourtHeatmapProps) {
  const [selectedCourt, setSelectedCourt] = useState<number | 'all'>('all')

  const currentData =
    selectedCourt === 'all' ? heatmapAll : heatmapByCourt[selectedCourt] || []

  const maxCount = Math.max(...currentData.map((c) => c.count), 1)

  // Build a lookup: `${dayOfWeek}-${hour}` -> count
  const cellMap = new Map<string, number>()
  for (const cell of currentData) {
    cellMap.set(`${cell.dayOfWeek}-${cell.hour}`, cell.count)
  }

  return (
    <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-[#1A1A2E]">
          Court Utilization Heatmap
        </h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => setSelectedCourt('all')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-colors',
              selectedCourt === 'all'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-[#F0EFE9] text-[#6B7280] hover:bg-[#E8E4DD] hover:text-[#1A1A2E]'
            )}
          >
            All Courts
          </button>
          {courts.map((court) => (
            <button
              key={court}
              onClick={() => setSelectedCourt(court)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                selectedCourt === court
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-[#F0EFE9] text-[#6B7280] hover:bg-[#E8E4DD] hover:text-[#1A1A2E]'
              )}
            >
              Court {court}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Hour labels (column headers) */}
          <div className="flex mb-1">
            <div className="w-12 shrink-0" />
            {HOUR_LABELS.map((label) => (
              <div
                key={label}
                className="flex-1 text-center text-[10px] text-[#9CA3AF]"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Rows: one per day */}
          {DAY_LABELS.map((dayLabel, dayIndex) => (
            <div key={dayLabel} className="flex items-center gap-0.5 mb-0.5">
              <div className="w-12 shrink-0 text-xs text-[#9CA3AF] text-right pr-2">
                {dayLabel}
              </div>
              {Array.from({ length: 14 }, (_, hourIndex) => {
                const hour = hourIndex + 8
                const count = cellMap.get(`${dayIndex}-${hour}`) || 0
                return (
                  <div
                    key={hour}
                    className={cn(
                      'flex-1 aspect-[2/1] rounded-sm transition-colors relative group cursor-default',
                      getIntensityClass(count, maxCount)
                    )}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                      <div className="rounded-md bg-white border border-[#D1D5DB] px-2 py-1 text-xs text-[#1A1A2E] whitespace-nowrap shadow-lg">
                        <span className="font-medium">{count}</span> booking
                        {count !== 1 ? 's' : ''}
                        <br />
                        <span className="text-[#9CA3AF]">
                          {dayLabel} {HOUR_LABELS[hourIndex]}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-[10px] text-[#9CA3AF]">Less</span>
            <div className="flex gap-0.5">
              <div className="h-3 w-5 rounded-sm bg-white" />
              <div className="h-3 w-5 rounded-sm bg-amber-500/15" />
              <div className="h-3 w-5 rounded-sm bg-amber-500/30" />
              <div className="h-3 w-5 rounded-sm bg-amber-500/50" />
              <div className="h-3 w-5 rounded-sm bg-amber-500/80" />
              <div className="h-3 w-5 rounded-sm bg-amber-500" />
            </div>
            <span className="text-[10px] text-[#9CA3AF]">More</span>
          </div>
        </div>
      </div>
    </div>
  )
}
