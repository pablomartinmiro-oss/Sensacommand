'use client'

import { Trophy, Clock, BarChart3, DollarSign } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

interface CourtUtilization {
  courtNumber: number
  visitCount: number
  utilization: number
  revenue: number
}

interface PeakHour {
  hour: number
  count: number
}

interface CourtStatsProps {
  mostPopularCourt: { courtNumber: number; visitCount: number } | null
  peakHours: PeakHour[]
  courtUtilization: CourtUtilization[]
  revenuePerCourt: { courtNumber: number; revenue: number }[]
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${display}:00 ${suffix}`
}

export function CourtStats({
  mostPopularCourt,
  peakHours,
  courtUtilization,
  revenuePerCourt,
}: CourtStatsProps) {
  const maxUtilization = Math.max(
    ...courtUtilization.map((c) => c.utilization),
    1
  )
  const maxRevenue = Math.max(...revenuePerCourt.map((c) => c.revenue), 1)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Most Popular Court */}
      <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Trophy className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
            Most Popular Court
          </span>
        </div>
        {mostPopularCourt ? (
          <>
            <p className="text-2xl font-bold text-[#1A1A2E]">
              Court {mostPopularCourt.courtNumber}
            </p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              {mostPopularCourt.visitCount} total bookings
            </p>
          </>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No data</p>
        )}
      </div>

      {/* Peak Hours */}
      <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Clock className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
            Peak Hours
          </span>
        </div>
        {peakHours.length > 0 ? (
          <div className="space-y-2">
            {peakHours.map((ph, idx) => (
              <div key={ph.hour} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                      idx === 0
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-[#F0EFE9] text-[#9CA3AF]'
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm text-[#1A1A2E]">
                    {formatHour(ph.hour)}
                  </span>
                </div>
                <span className="text-xs text-[#9CA3AF]">
                  {ph.count} bookings
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No data</p>
        )}
      </div>

      {/* Average Utilization */}
      <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
            Utilization / Court
          </span>
        </div>
        {courtUtilization.length > 0 ? (
          <div className="space-y-2">
            {courtUtilization.map((court) => (
              <div key={court.courtNumber} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280]">
                    Court {court.courtNumber}
                  </span>
                  <span className="text-xs font-medium text-[#374151]">
                    {court.utilization}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#F0EFE9]">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      court.utilization >= 70
                        ? 'bg-emerald-500'
                        : court.utilization >= 40
                          ? 'bg-amber-500'
                          : 'bg-[#D1D5DB]'
                    )}
                    style={{
                      width: `${(court.utilization / maxUtilization) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No data</p>
        )}
      </div>

      {/* Revenue per Court */}
      <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <DollarSign className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
            Revenue / Court
          </span>
        </div>
        {revenuePerCourt.length > 0 ? (
          <div className="space-y-2">
            {revenuePerCourt.map((court) => (
              <div key={court.courtNumber} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6B7280]">
                    Court {court.courtNumber}
                  </span>
                  <span className="text-xs font-medium text-emerald-400">
                    {formatCurrency(court.revenue)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#F0EFE9]">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${(court.revenue / maxRevenue) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#9CA3AF]">No data</p>
        )}
      </div>
    </div>
  )
}
