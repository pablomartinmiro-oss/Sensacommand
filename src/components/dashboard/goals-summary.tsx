'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Crosshair, AlertTriangle } from 'lucide-react'
import type { GoalListItem } from '@/types'

export function GoalsSummary() {
  const [goals, setGoals] = useState<GoalListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then(json => setGoals(json.data || []))
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const inProgress = goals.filter(g => g.status === 'IN_PROGRESS').length
  const overdue = goals.filter(g => g.dueDate && new Date(g.dueDate) < now && g.status !== 'DONE' && g.status !== 'ON_HOLD').length
  const notStarted = goals.filter(g => g.status === 'NOT_STARTED').length

  // Pablo's top 3 HIGH priority IN_PROGRESS goals
  const pabloHighPriority = goals
    .filter(g => g.status === 'IN_PROGRESS' && g.priority === 'HIGH' && g.assignees.some(a => a.firstName === 'Pablo'))
    .slice(0, 3)

  if (loading) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-xl p-4">
        <div className="h-6 w-32 bg-[#F0EFE9] rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-4 bg-[#F0EFE9] rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-[#1A1A2E]">Goals</h3>
        </div>
        <Link href="/goals" className="text-xs text-amber-400 hover:text-amber-300">View all</Link>
      </div>

      {overdue > 0 && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400 font-medium">{overdue} overdue goal{overdue !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold text-amber-400">{inProgress}</p>
          <p className="text-[10px] text-[#9CA3AF]">In Progress</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-red-400">{overdue}</p>
          <p className="text-[10px] text-[#9CA3AF]">Overdue</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-400">{notStarted}</p>
          <p className="text-[10px] text-[#9CA3AF]">Not Started</p>
        </div>
      </div>

      {pabloHighPriority.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-2">My Top Priorities</p>
          <div className="space-y-1.5">
            {pabloHighPriority.map(g => (
              <Link key={g.id} href="/goals" className="block text-xs text-[#374151] hover:text-amber-400 transition-colors truncate border-l-2 border-amber-500 pl-2">
                {g.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
