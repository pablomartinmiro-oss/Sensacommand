'use client'

import { cn } from '@/lib/utils'
import { GOAL_STATUS_LABELS, GOAL_COLUMN_HEADER_COLORS } from '@/lib/constants'
import { GoalCard } from './goal-card'
import type { GoalListItem } from '@/types'

const COLUMNS: string[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'DONE',
  'FUTURE_IDEA',
  'ON_HOLD',
  'ONGOING',
]

interface KanbanBoardProps {
  goals: GoalListItem[]
  onGoalClick: (goalId: string) => void
  onStatusChange: (goalId: string, newStatus: string) => void
}

export function KanbanBoard({ goals, onGoalClick, onStatusChange }: KanbanBoardProps) {
  const grouped = COLUMNS.reduce((acc, status) => {
    acc[status] = goals.filter((g) => g.status === status)
    return acc
  }, {} as Record<string, GoalListItem[]>)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-280px)]">
      {COLUMNS.map((status) => {
        const columnGoals = grouped[status] || []
        return (
          <div key={status} className="flex-shrink-0 w-72">
            {/* Column header */}
            <div
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg border mb-3',
                GOAL_COLUMN_HEADER_COLORS[status]
              )}
            >
              <span className="text-sm font-semibold text-[#1A1A2E]">
                {GOAL_STATUS_LABELS[status]}
              </span>
              <span className="text-xs font-medium text-[#6B7280] bg-[#F0EFE9] rounded-full px-2 py-0.5">
                {columnGoals.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {columnGoals.map((goal) => (
                <div key={goal.id} className="group relative">
                  <GoalCard goal={goal} onClick={() => onGoalClick(goal.id)} />
                  {/* Quick status change */}
                  <select
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-[#F0EFE9] border border-[#D1D5DB] rounded px-1 py-0.5 text-[#374151] focus:outline-none"
                    value={goal.status}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation()
                      onStatusChange(goal.id, e.target.value)
                    }}
                  >
                    {COLUMNS.map((s) => (
                      <option key={s} value={s}>{GOAL_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
