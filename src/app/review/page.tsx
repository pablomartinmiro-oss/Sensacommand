'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import { Target, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react'

interface ReviewData {
  thisWeek: { revenue: number; visits: number; newPlayers: number; newMembers: number; churned: number; goalsCompleted: number; goalsBecameOverdue: number }
  lastWeek: { revenue: number; visits: number }
  completedGoals: { id: string; title: string; completedDate: string; assignees: { firstName: string; lastName: string }[] }[]
  dueThisWeek: { id: string; title: string; dueDate: string; status: string; assignees: { firstName: string; lastName: string }[] }[]
  overdueBacklog: { id: string; title: string; dueDate: string; priority: string; assignees: { firstName: string; lastName: string }[] }[]
}

export default function ReviewPage() {
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    async function fetchReview() {
      try {
        const now = new Date()
        const weekAgo = new Date(now.getTime() - 7 * 86400000)
        const weekEnd = new Date(now.getTime() + 7 * 86400000)

        const [goalsRes, postsRes] = await Promise.all([
          fetch('/api/goals'),
          fetch('/api/dashboard/stats'),
        ])
        const goalsData = await goalsRes.json()
        const statsData = await postsRes.json()

        const allGoals = goalsData.data || []
        const completed = allGoals.filter((g: { status: string; completedDate: string }) => g.status === 'DONE' && g.completedDate && new Date(g.completedDate) >= weekAgo)
        const dueThisWeek = allGoals.filter((g: { dueDate: string; status: string }) => g.dueDate && new Date(g.dueDate) >= now && new Date(g.dueDate) <= weekEnd && g.status !== 'DONE' && g.status !== 'ON_HOLD')
        const overdue = allGoals.filter((g: { dueDate: string; status: string }) => g.dueDate && new Date(g.dueDate) < now && g.status !== 'DONE' && g.status !== 'ON_HOLD')
          .sort((a: { dueDate: string }, b: { dueDate: string }) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

        const stats = statsData.data || {}

        setData({
          thisWeek: {
            revenue: stats.todayRevenue || 0,
            visits: 0,
            newPlayers: 0,
            newMembers: 0,
            churned: 0,
            goalsCompleted: completed.length,
            goalsBecameOverdue: overdue.filter((g: { dueDate: string }) => new Date(g.dueDate) >= weekAgo).length,
          },
          lastWeek: { revenue: stats.yesterdayRevenue || 0, visits: 0 },
          completedGoals: completed,
          dueThisWeek,
          overdueBacklog: overdue,
        })
      } catch { /* ignore */ }
      setLoading(false)
    }
    fetchReview()
  }, [])

  const generateAnalysis = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Give me a weekly summary. What went well, what needs attention, and what should I prioritize this week? Be specific and actionable.' }),
      })
      const json = await res.json()
      setAnalysis(json.data?.response || 'Unable to generate analysis.')
    } catch { setAnalysis('Error generating analysis.') }
    setGenerating(false)
  }

  const handleSnooze = async (goalId: string) => {
    // Snooze to next Monday
    const now = new Date()
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7
    const nextMonday = new Date(now.getTime() + daysUntilMonday * 86400000)
    await fetch(`/api/goals/${goalId}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: nextMonday.toISOString() }),
    })
    window.location.reload()
  }

  if (loading) {
    return (
      <>
        <Header title="Weekly Review" />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-[#F0EFE9] rounded-xl" />)}
          </div>
        </main>
      </>
    )
  }

  if (!data) return null

  return (
    <>
      <Header title="Weekly Review" />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        {/* Scorecard */}
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3">Last Week Scorecard</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Goals Completed', value: data.thisWeek.goalsCompleted, color: 'text-emerald-600' },
              { label: 'Became Overdue', value: data.thisWeek.goalsBecameOverdue, color: data.thisWeek.goalsBecameOverdue > 0 ? 'text-red-500' : 'text-emerald-600' },
              { label: 'Overdue Total', value: data.overdueBacklog.length, color: 'text-amber-600' },
              { label: 'Due This Week', value: data.dueThisWeek.length, color: 'text-blue-600' },
              { label: 'Active Members', value: '-', color: 'text-[#1A1A2E]' },
              { label: 'New Players', value: data.thisWeek.newPlayers || '-', color: 'text-[#1A1A2E]' },
              { label: 'Churned', value: data.thisWeek.churned || '0', color: 'text-[#1A1A2E]' },
            ].map(item => (
              <div key={item.label} className="bg-white border border-[#E8E4DD] rounded-lg p-3 text-center">
                <p className={cn('text-xl font-bold', item.color)}>{item.value}</p>
                <p className="text-[10px] text-[#9CA3AF]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Completed */}
        {data.completedGoals.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" /> Completed Last Week
            </h3>
            <div className="space-y-1.5">
              {data.completedGoals.map(g => (
                <div key={g.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <span className="text-sm text-emerald-800">{g.title}</span>
                  <span className="text-xs text-emerald-600">{g.assignees?.map(a => a.firstName).join(', ') || 'Unassigned'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Due This Week */}
        {data.dueThisWeek.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" /> Due This Week
            </h3>
            <div className="space-y-1.5">
              {data.dueThisWeek.map(g => (
                <div key={g.id} className="flex items-center justify-between bg-white border border-[#E8E4DD] rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm text-[#1A1A2E]">{g.title}</span>
                    <span className="text-xs text-[#9CA3AF] ml-2">{g.assignees?.map(a => a.firstName).join(', ')}</span>
                  </div>
                  <span className="text-xs text-[#6B7280]">{g.dueDate ? formatDate(new Date(g.dueDate)) : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Backlog */}
        {data.overdueBacklog.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" /> Overdue Backlog ({data.overdueBacklog.length})
            </h3>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {data.overdueBacklog.slice(0, 20).map(g => {
                const daysOverdue = Math.ceil((Date.now() - new Date(g.dueDate).getTime()) / 86400000)
                return (
                  <div key={g.id} className="flex items-center justify-between bg-white border border-[#E8E4DD] rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[#1A1A2E] truncate block">{g.title}</span>
                      <span className="text-[10px] text-red-500">{daysOverdue}d overdue</span>
                    </div>
                    <button onClick={() => handleSnooze(g.id)} className="text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex-shrink-0 ml-2">Snooze →Mon</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* AI Weekly Analysis */}
        <div className="bg-white border border-[#E8E4DD] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> AI Weekly Analysis
            </h3>
          </div>
          {analysis ? (
            <div className="text-sm text-[#374151] whitespace-pre-wrap leading-relaxed">{analysis}</div>
          ) : (
            <button onClick={generateAnalysis} disabled={generating} className="h-9 px-4 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-50 hover:bg-amber-600 transition-colors">
              {generating ? 'Generating...' : 'Generate Weekly Analysis'}
            </button>
          )}
        </div>
      </main>
    </>
  )
}
