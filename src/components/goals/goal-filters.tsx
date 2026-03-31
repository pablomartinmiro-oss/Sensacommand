'use client'

import { Search, LayoutGrid, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_LABELS } from '@/lib/constants'

interface TeamMemberOption {
  id: string
  firstName: string
  lastName: string
}

interface GoalFiltersProps {
  search: string
  onSearchChange: (v: string) => void
  assigneeId: string
  onAssigneeChange: (v: string) => void
  category: string
  onCategoryChange: (v: string) => void
  priority: string
  onPriorityChange: (v: string) => void
  status: string
  onStatusChange: (v: string) => void
  view: 'kanban' | 'table'
  onViewChange: (v: 'kanban' | 'table') => void
  teamMembers: TeamMemberOption[]
  categories: string[]
  onMyGoals: () => void
}

export function GoalFilters({
  search, onSearchChange,
  assigneeId, onAssigneeChange,
  category, onCategoryChange,
  priority, onPriorityChange,
  status, onStatusChange,
  view, onViewChange,
  teamMembers,
  categories,
  onMyGoals,
}: GoalFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <input
          type="text"
          placeholder="Search goals..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#D1D5DB] bg-white text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>

      {/* Assignee */}
      <select
        value={assigneeId}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      >
        <option value="">All Assignees</option>
        {teamMembers.map((m) => (
          <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
        ))}
      </select>

      {/* Category */}
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Priority */}
      <select
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value)}
        className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
      >
        <option value="">All Priorities</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
        <option value="NONE">None</option>
      </select>

      {/* Status (table view only) */}
      {view === 'table' && (
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        >
          <option value="">All Statuses</option>
          {Object.entries(GOAL_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      )}

      {/* My Goals quick filter */}
      <button
        onClick={onMyGoals}
        className="h-9 px-3 rounded-lg border border-[#D1D5DB] bg-white text-sm text-[#374151] hover:text-amber-400 hover:border-amber-500/50 transition-colors"
      >
        My Goals
      </button>

      {/* View toggle */}
      <div className="flex items-center border border-[#D1D5DB] rounded-lg overflow-hidden">
        <button
          onClick={() => onViewChange('kanban')}
          className={cn(
            'p-2 transition-colors',
            view === 'kanban' ? 'bg-amber-500/20 text-amber-400' : 'text-[#9CA3AF] hover:text-[#1A1A2E]'
          )}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewChange('table')}
          className={cn(
            'p-2 transition-colors',
            view === 'table' ? 'bg-amber-500/20 text-amber-400' : 'text-[#9CA3AF] hover:text-[#1A1A2E]'
          )}
        >
          <Table2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
