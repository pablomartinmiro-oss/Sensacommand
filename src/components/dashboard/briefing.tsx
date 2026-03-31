'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Sun, Zap, CheckCircle, ChevronDown, ChevronUp, RefreshCw, Bot, Clock, FileText, Target, TrendingDown } from 'lucide-react'

interface AttentionItem {
  id: string
  type: string
  priority: string
  title: string
  description: string
  data: Record<string, unknown>
}

interface BriefingData {
  narrative: { pulse: string; attention: string[]; handled: string }
  attentionItems: AttentionItem[]
  data: {
    yesterdayRevenue: number
    mtdRevenue: number
    activeMembers: number
    overdueGoals: number
    draftMessages: number
  }
  generatedAt: string
}

const ITEM_ICONS: Record<string, typeof Target> = {
  GOAL_DUE: Clock,
  DRAFT_MESSAGES: FileText,
  OVERDUE_GOALS: Target,
  REVENUE_ALERT: TrendingDown,
}

export function Briefing() {
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const fetchBriefing = async (force = false) => {
    if (force) setRefreshing(true)
    try {
      const url = force ? '/api/dashboard/briefing?refresh=1' : '/api/dashboard/briefing'
      const res = await fetch(url)
      const json = await res.json()
      setData(json.data)
    } catch { /* ignore */ }
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchBriefing() }, [])

  const handleGoalAction = async (goalId: string, action: 'done' | 'snooze') => {
    if (action === 'done') {
      await fetch(`/api/goals/${goalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DONE' }) })
    } else {
      await fetch(`/api/goals/${goalId}/snooze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 3 }) })
    }
    fetchBriefing(true)
  }

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) {
    return (
      <div className="rounded-xl border border-[#E8E4DD] bg-gradient-to-r from-white to-amber-50/50 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-[#F0EFE9] rounded" />
          <div className="h-4 w-full bg-[#F0EFE9] rounded" />
          <div className="h-4 w-3/4 bg-[#F0EFE9] rounded" />
          <div className="h-20 bg-[#F0EFE9] rounded" />
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="rounded-xl border border-[#E8E4DD] bg-gradient-to-r from-white to-amber-50/30 shadow-sm overflow-hidden">
      <div className="border-l-4 border-amber-400 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-heading font-semibold text-[#1A1A2E]">
              {greeting}, Pablo
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9CA3AF]">{dateStr}</span>
            <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-[#F0EFE9] text-[#9CA3AF]">
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className="space-y-5">
            {/* The Pulse */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-2">The Pulse</p>
              <p className="text-sm text-[#374151] leading-relaxed">{data.narrative.pulse}</p>
            </div>

            <div className="border-t border-[#E8E4DD]" />

            {/* Needs Your Attention */}
            {data.attentionItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Needs Your Attention
                </p>
                <div className="space-y-2">
                  {data.attentionItems.map(item => {
                    const Icon = ITEM_ICONS[item.type] || Target
                    return (
                      <div key={item.id} className="flex items-start gap-3 bg-white border border-[#E8E4DD] rounded-lg p-3">
                        <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', item.priority === 'HIGH' ? 'text-red-500' : 'text-amber-500')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A2E]">{item.title}</p>
                          <p className="text-xs text-[#6B7280]">{item.description}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.type === 'GOAL_DUE' && (
                              <>
                                <button onClick={() => handleGoalAction(item.data.goalId as string, 'done')} className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">Mark Done</button>
                                <button onClick={() => handleGoalAction(item.data.goalId as string, 'snooze')} className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">Snooze 3d</button>
                                <button onClick={() => router.push('/goals')} className="text-[10px] px-2 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100">Open Goal</button>
                              </>
                            )}
                            {item.type === 'DRAFT_MESSAGES' && (
                              <button onClick={() => router.push('/messages')} className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">Review Messages →</button>
                            )}
                            {item.type === 'OVERDUE_GOALS' && (
                              <button onClick={() => router.push('/goals')} className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">View Overdue Goals →</button>
                            )}
                            {item.type === 'REVENUE_ALERT' && (
                              <button onClick={() => router.push('/revenue')} className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">View Revenue Details →</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-[#E8E4DD]" />

            {/* Handled For You */}
            <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1.5 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Handled for You
              </p>
              <p className="text-sm text-emerald-800">{data.narrative.handled}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <button onClick={() => fetchBriefing(true)} disabled={refreshing} className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#1A1A2E] transition-colors">
                <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
                {refreshing ? 'Refreshing...' : 'Refresh Briefing'}
              </button>
              <button onClick={() => router.push('/ai')} className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 transition-colors">
                <Bot className="w-3 h-3" /> Ask AI for More Detail →
              </button>
            </div>
          </div>
        )}

        {collapsed && (
          <p className="text-sm text-[#374151]">{data.narrative.pulse}</p>
        )}
      </div>
    </div>
  )
}
