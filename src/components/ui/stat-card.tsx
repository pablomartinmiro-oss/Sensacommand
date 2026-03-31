'use client'

import { type ReactNode } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  title: string
  value: string | number
  /** Percentage change (positive = up, negative = down, 0 = neutral) */
  change?: number
  /** Optional label next to the change, e.g. "vs last month" */
  changeLabel?: string
  icon?: ReactNode
  className?: string
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div
      className={cn(
        'group relative rounded-xl border border-[#E8E4DD] bg-white p-5',
        'transition-all duration-300',
        /* Gradient border glow on hover */
        'before:absolute before:inset-0 before:rounded-xl before:p-[1px]',
        'before:bg-gradient-to-br before:from-amber-500/0 before:via-amber-500/0 before:to-emerald-500/0',
        'hover:before:from-amber-500/30 hover:before:via-amber-500/10 hover:before:to-emerald-500/20',
        'before:transition-all before:duration-300 before:-z-10',
        /* Glow shadow on hover */
        'hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.15)]',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF]">
            {title}
          </span>
          <span className="text-2xl font-bold text-[#1A1A2E]">{value}</span>
        </div>

        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F0EFE9] text-amber-500 group-hover:bg-amber-500/10 transition-colors">
            {icon}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {isPositive && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-400">
              <ChevronUp className="h-3.5 w-3.5" />
              {Math.abs(change)}%
            </span>
          )}
          {isNegative && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-400">
              <ChevronDown className="h-3.5 w-3.5" />
              {Math.abs(change)}%
            </span>
          )}
          {change === 0 && (
            <span className="text-xs font-medium text-[#9CA3AF]">0%</span>
          )}
          {changeLabel && (
            <span className="text-xs text-[#9CA3AF]">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
