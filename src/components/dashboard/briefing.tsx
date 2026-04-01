'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DollarSign, Users, BarChart3, ArrowUp, ArrowDown, Lightbulb, CheckCircle, Check } from 'lucide-react'
import { GoalSlideOver } from '@/components/goals/goal-slide-over'

interface HealthData {
  mtdRevenue: number; wowRevenue: number | null; activeMembers: number
  netMembersMonth: number; visitsWeek: number; wowVisits: number | null
}

interface PabloGoal { id: string; title: string; priority: string; daysOverdue?: number; status: string }

interface BriefingData {
  health: HealthData
  pabloGoals: { dueToday: PabloGoal[]; topOverdue: PabloGoal[]; totalOverdue: number }
  aiInsight: { insight: string; actionLabel: string; actionUrl: string }
  teamPulse: { name: string; total: number; inProgress: number; overdue: number; needsCheckin: boolean }[]
  handled: { count: number; summary: string } | null
}

const SNOOZE_DAYS = [{ label: '1d', days: 1 }, { label: '3d', days: 3 }, { label: '1w', days: 7 }]

export function Briefing() {
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [slideOverGoalId, setSlideOverGoalId] = useState<string | null>(null)
  const router = useRouter()

  const fetchBriefing = async () => {
    try {
      const res = await fetch('/api/dashboard/briefing')
      const json = await res.json()
      setData(json.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchBriefing() }, [])

  const markDone = async (goalId: string) => {
    await fetch(`/api/goals/${goalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DONE' }) })
    fetchBriefing()
  }

  const snooze = async (goalId: string, days: number) => {
    await fetch(`/api/goals/${goalId}/snooze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days }) })
    fetchBriefing()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[#F0EFE9] rounded-lg animate-pulse" />)}
        </div>
        <div className="h-24 bg-[#F0EFE9] rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!data) return null

  const { health, pabloGoals, aiInsight, teamPulse, handled } = data
  const totalItems = pabloGoals.dueToday.length + Math.min(pabloGoals.topOverdue.length, 3)
  const hasGoals = totalItems > 0
  const teamIssues = teamPulse.filter(m => m.needsCheckin)
  const showInsight = aiInsight.insight && aiInsight.insight !== 'All quiet. No issues detected.'

  return (
    <div className="space-y-4">
      {/* SECTION 1: Health Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={() => router.push('/revenue')} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow text-left">
          <DollarSign className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-lg font-semibold text-slate-900">${health.mtdRevenue.toLocaleString()} <span className="text-xs font-normal text-[#9CA3AF]">MTD</span></p>
            {health.wowRevenue !== null && (
              <p className={cn('text-sm flex items-center gap-0.5', health.wowRevenue >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {health.wowRevenue >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(health.wowRevenue)}% vs last wk
              </p>
            )}
          </div>
        </button>

        <button onClick={() => router.push('/members')} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow text-left">
          <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-lg font-semibold text-slate-900">{health.activeMembers} <span className="text-xs font-normal text-[#9CA3AF]">Members</span></p>
            <p className={cn('text-sm', health.netMembersMonth >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {health.netMembersMonth >= 0 ? '+' : ''}{health.netMembersMonth} this month
            </p>
          </div>
        </button>

        <button onClick={() => router.push('/courts')} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 hover:shadow-sm transition-shadow text-left">
          <BarChart3 className="w-4 h-4 text-purple-500 flex-shrink-0" />
          <div>
            <p className="text-lg font-semibold text-slate-900">{health.visitsWeek} <span className="text-xs font-normal text-[#9CA3AF]">Visits/wk</span></p>
            {health.wowVisits !== null && (
              <p className={cn('text-sm flex items-center gap-0.5', health.wowVisits >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                {health.wowVisits >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(health.wowVisits)}% vs last wk
              </p>
            )}
          </div>
        </button>
      </div>

      {/* SECTION 2: Your Day */}
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Your Day</h3>
          {hasGoals && <span className="text-xs text-[#9CA3AF]">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>}
        </div>

        <div className="px-4 py-2">
          {!hasGoals ? (
            <div className="flex items-center gap-2 py-3 text-emerald-600">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">You&apos;re clear for today</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {/* Due Today */}
              {pabloGoals.dueToday.map(g => (
                <GoalRow key={g.id} goal={g} label="Due today" onDone={markDone} onSnooze={snooze} onOpen={setSlideOverGoalId} />
              ))}

              {/* Top Overdue */}
              {pabloGoals.topOverdue.map(g => (
                <GoalRow key={g.id} goal={g} label={`${g.daysOverdue}d overdue`} isOverdue onDone={markDone} onSnooze={snooze} onOpen={setSlideOverGoalId} />
              ))}
            </div>
          )}

          {pabloGoals.totalOverdue > 3 && (
            <button onClick={() => router.push('/goals')} className="text-xs text-amber-600 hover:text-amber-700 py-2 block">
              You have {pabloGoals.totalOverdue - 3} more overdue →
            </button>
          )}
        </div>
      </div>

      {/* SECTION 3: AI Insight */}
      {showInsight && (
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-slate-700">{aiInsight.insight}</p>
            {aiInsight.actionLabel && aiInsight.actionUrl && (
              <button onClick={() => router.push(aiInsight.actionUrl)} className="mt-2 text-xs px-3 py-1 rounded-full bg-amber-500 text-white font-medium hover:bg-amber-600">
                {aiInsight.actionLabel} →
              </button>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: Team Pulse */}
      {teamPulse.length > 0 && (
        <button onClick={() => router.push('/team')} className="text-sm text-[#6B7280] hover:text-[#1A1A2E] transition-colors text-left">
          <span className="font-medium text-[#374151]">Team:</span>{' '}
          {teamPulse.slice(0, 4).map(m => (
            <span key={m.name}>
              {m.name} {m.inProgress} in progress
              {m.needsCheckin && <span className="text-amber-600"> ({m.overdue} overdue)</span>}
              {' · '}
            </span>
          ))}
          {teamIssues.length > 0 && (
            <span className="text-amber-600">{teamIssues[0].name} may need a check-in</span>
          )}
        </button>
      )}

      {/* SECTION 5: Handled */}
      {handled && handled.count > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          <span className="text-[#6B7280]">{handled.summary}</span>
          <button onClick={() => router.push('/automations')} className="text-amber-600 text-xs hover:text-amber-700 ml-1">View →</button>
        </div>
      )}

      {/* Goal Slide-Over */}
      <GoalSlideOver goalId={slideOverGoalId} open={!!slideOverGoalId} onClose={() => setSlideOverGoalId(null)} onUpdated={fetchBriefing} />
    </div>
  )
}

function GoalRow({ goal, label, isOverdue, onDone, onSnooze, onOpen }: {
  goal: PabloGoal; label: string; isOverdue?: boolean
  onDone: (id: string) => void; onSnooze: (id: string, days: number) => void; onOpen: (id: string) => void
}) {
  const [showSnooze, setShowSnooze] = useState(false)
  const borderColor = goal.priority === 'HIGH' ? 'border-l-amber-500' : goal.priority === 'MEDIUM' ? 'border-l-blue-400' : 'border-l-slate-300'

  return (
    <div className={cn('group flex items-center gap-2 py-2 border-l-[3px] pl-3 -ml-4 hover:bg-amber-50/50 transition-colors', borderColor)}>
      <div className="flex-1 min-w-0">
        <button onClick={() => onOpen(goal.id)} className="text-sm text-slate-900 hover:text-amber-600 truncate block text-left w-full">{goal.title}</button>
        <span className={cn('text-[10px]', isOverdue ? 'text-red-500' : 'text-[#9CA3AF]')}>{label}</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 sm:opacity-100 transition-opacity">
        <button onClick={() => onDone(goal.id)} className="h-6 px-2 text-[10px] rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">Done</button>
        <div className="relative">
          <button onClick={() => setShowSnooze(!showSnooze)} className="h-6 px-2 text-[10px] rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Snooze</button>
          {showSnooze && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-[#E8E4DD] rounded shadow-lg py-1 z-10 w-20">
              {SNOOZE_DAYS.map(o => (
                <button key={o.days} onClick={() => { onSnooze(goal.id, o.days); setShowSnooze(false) }} className="w-full text-left px-2 py-1 text-[10px] text-[#374151] hover:bg-[#F0EFE9]">{o.label}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => onOpen(goal.id)} className="h-6 px-1.5 text-[10px] rounded border border-slate-200 text-slate-500 hover:bg-slate-50">→</button>
      </div>
    </div>
  )
}
