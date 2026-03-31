'use client'

import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { GOAL_PRIORITY_COLORS, GOAL_CATEGORY_COLORS } from '@/lib/constants'
import { MessageSquare, Calendar } from 'lucide-react'
import type { GoalListItem } from '@/types'

interface GoalCardProps {
  goal: GoalListItem
  onClick: () => void
}

export function GoalCard({ goal, onClick }: GoalCardProps) {
  const isOverdue =
    goal.dueDate &&
    new Date(goal.dueDate) < new Date() &&
    goal.status !== 'DONE' &&
    goal.status !== 'ON_HOLD'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-brand-card border border-brand-border rounded-lg p-3 hover:border-[#D1D5DB] transition-colors cursor-pointer',
        'border-l-[3px]',
        GOAL_PRIORITY_COLORS[goal.priority] || 'border-l-transparent'
      )}
    >
      <p className="text-sm font-medium text-[#1A1A2E] line-clamp-2 mb-2">
        {goal.title}
      </p>

      {goal.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {goal.categories.slice(0, 2).map((cat) => (
            <span
              key={cat}
              className={cn(
                'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium',
                GOAL_CATEGORY_COLORS[cat] || 'bg-zinc-500/15 text-[#6B7280] border-zinc-500/25'
              )}
            >
              {cat}
            </span>
          ))}
          {goal.categories.length > 2 && (
            <span className="text-[10px] text-[#9CA3AF]">+{goal.categories.length - 2}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {goal.assignees.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E8E4DD] text-[9px] font-medium text-[#374151]"
              title={`${a.firstName} ${a.lastName}`}
            >
              {a.firstName[0]}{a.lastName[0]}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF]">
          {goal._count.comments > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {goal._count.comments}
            </span>
          )}
          {goal.dueDate && (
            <span className={cn('flex items-center gap-0.5', isOverdue && 'text-red-400')}>
              <Calendar className="w-3 h-3" />
              {formatDate(new Date(goal.dueDate))}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
