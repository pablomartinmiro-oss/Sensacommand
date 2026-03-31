'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { GoalFilters } from '@/components/goals/goal-filters'
import { KanbanBoard } from '@/components/goals/kanban-board'
import { GoalsTable } from '@/components/goals/goals-table'
import { GoalDetail } from '@/components/goals/goal-detail'
import { NewGoalModal } from '@/components/goals/new-goal-modal'
import { Plus } from 'lucide-react'
import type { GoalListItem } from '@/types'

interface TeamMemberOption {
  id: string
  firstName: string
  lastName: string
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalListItem[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [view, setView] = useState<'kanban' | 'table'>('kanban')

  // Modals
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [showNewGoal, setShowNewGoal] = useState(false)

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals')
      const json = await res.json()
      setGoals(json.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/team-members')
      const json = await res.json()
      const members = (json.data || []).map((m: TeamMemberOption & Record<string, unknown>) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
      }))
      setTeamMembers(members)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchGoals()
    fetchTeam()
  }, [fetchGoals, fetchTeam])

  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    goals.forEach(g => g.categories.forEach(c => cats.add(c)))
    return Array.from(cats).sort()
  }, [goals])

  // Client-side filtering
  const filtered = useMemo(() => {
    return goals.filter(g => {
      if (search && !g.title.toLowerCase().includes(search.toLowerCase())) return false
      if (assigneeId && !g.assignees.some(a => a.id === assigneeId)) return false
      if (category && !g.categories.includes(category)) return false
      if (priority && g.priority !== priority) return false
      if (status && g.status !== status) return false
      return true
    })
  }, [goals, search, assigneeId, category, priority, status])

  const handleStatusChange = async (goalId: string, newStatus: string) => {
    // Optimistic update
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: newStatus as GoalListItem['status'] } : g))
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch {
      fetchGoals() // rollback
    }
  }

  const handleMyGoals = () => {
    const pablo = teamMembers.find(m => m.firstName === 'Pablo')
    if (pablo) {
      setAssigneeId(pablo.id)
    }
  }

  return (
    <>
      <Header
        title="Goals"
        action={
          <button
            onClick={() => setShowNewGoal(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-4">
        <GoalFilters
          search={search} onSearchChange={setSearch}
          assigneeId={assigneeId} onAssigneeChange={setAssigneeId}
          category={category} onCategoryChange={setCategory}
          priority={priority} onPriorityChange={setPriority}
          status={status} onStatusChange={setStatus}
          view={view} onViewChange={setView}
          teamMembers={teamMembers}
          categories={allCategories}
          onMyGoals={handleMyGoals}
        />

        {loading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-72 flex-shrink-0 space-y-2">
                <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
                {[1, 2, 3].map(j => <div key={j} className="h-24 bg-zinc-800 rounded-lg animate-pulse" />)}
              </div>
            ))}
          </div>
        ) : view === 'kanban' ? (
          <KanbanBoard
            goals={filtered}
            onGoalClick={setSelectedGoalId}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <GoalsTable
            goals={filtered}
            onGoalClick={setSelectedGoalId}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      <GoalDetail
        goalId={selectedGoalId}
        open={!!selectedGoalId}
        onClose={() => setSelectedGoalId(null)}
        onUpdated={fetchGoals}
        teamMembers={teamMembers}
      />

      <NewGoalModal
        open={showNewGoal}
        onClose={() => setShowNewGoal(false)}
        onCreated={fetchGoals}
        teamMembers={teamMembers}
      />
    </>
  )
}
