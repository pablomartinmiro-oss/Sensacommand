'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { GOAL_STATUS_LABELS, GOAL_STATUS_COLORS, GOAL_CATEGORY_COLORS, GOAL_PRIORITY_COLORS } from '@/lib/constants'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { GoalListItem } from '@/types'

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING']

interface GoalsTableProps {
  goals: GoalListItem[]
  onGoalClick: (goalId: string) => void
  onStatusChange: (goalId: string, newStatus: string) => void
}

type SortField = 'title' | 'status' | 'priority' | 'dueDate'

export function GoalsTable({ goals, onGoalClick, onStatusChange }: GoalsTableProps) {
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 }

  const sorted = [...goals].sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'title': cmp = a.title.localeCompare(b.title); break
      case 'status': cmp = a.status.localeCompare(b.status); break
      case 'priority': cmp = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3); break
      case 'dueDate': {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
        cmp = ad - bd
        break
      }
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />
  }

  return (
    <div className="overflow-x-auto border border-brand-border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-brand-border bg-zinc-900/50">
            <th className="text-left px-4 py-3 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200" onClick={() => handleSort('title')}>
              Title <SortIcon field="title" />
            </th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Assignee(s)</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200" onClick={() => handleSort('status')}>
              Status <SortIcon field="status" />
            </th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200" onClick={() => handleSort('priority')}>
              Priority <SortIcon field="priority" />
            </th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium">Categories</th>
            <th className="text-left px-4 py-3 text-zinc-400 font-medium cursor-pointer hover:text-zinc-200" onClick={() => handleSort('dueDate')}>
              Due Date <SortIcon field="dueDate" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((goal) => {
            const isOverdue = goal.dueDate && new Date(goal.dueDate) < new Date() && goal.status !== 'DONE' && goal.status !== 'ON_HOLD'
            return (
              <tr
                key={goal.id}
                className={cn(
                  'border-b border-brand-border hover:bg-zinc-800/30 cursor-pointer transition-colors',
                  'border-l-[3px]',
                  GOAL_PRIORITY_COLORS[goal.priority]
                )}
                onClick={() => onGoalClick(goal.id)}
              >
                <td className="px-4 py-3 text-zinc-100 max-w-xs truncate">{goal.title}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {goal.assignees.map((a) => (
                      <span key={a.id} className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-700 text-[10px] font-medium text-zinc-300" title={`${a.firstName} ${a.lastName}`}>
                        {a.firstName[0]}{a.lastName[0]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={goal.status}
                    onChange={(e) => onStatusChange(goal.id, e.target.value)}
                    className={cn('text-xs rounded-full border px-2 py-1 font-medium bg-transparent focus:outline-none', GOAL_STATUS_COLORS[goal.status])}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s} className="bg-zinc-900 text-zinc-100">{GOAL_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">{goal.priority !== 'NONE' ? goal.priority : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {goal.categories.slice(0, 2).map((c) => (
                      <span key={c} className={cn('text-[10px] rounded-full border px-1.5 py-0.5 font-medium', GOAL_CATEGORY_COLORS[c] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25')}>
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className={cn('px-4 py-3 text-xs', isOverdue ? 'text-red-400' : 'text-zinc-400')}>
                  {goal.dueDate ? formatDate(new Date(goal.dueDate)) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
