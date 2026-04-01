'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn, formatDate, formatTimeAgo } from '@/lib/utils'
import { GOAL_STATUS_LABELS, GOAL_STATUS_COLORS, GOAL_CATEGORY_COLORS } from '@/lib/constants'
import { X, Send, ChevronDown, Trash2 } from 'lucide-react'

interface GoalData {
  id: string; title: string; description: string | null; status: string; priority: string
  categories: string[]; dueDate: string | null; dateRequested: string | null; notes: string | null
  assignees: { id: string; firstName: string; lastName: string }[]
  comments: { id: string; body: string; createdAt: string; author: { firstName: string; lastName: string } }[]
}

interface Activity { id: string; action: string; fromValue: string | null; toValue: string | null; performedBy: string; createdAt: string }

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING']
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW', 'NONE']
const SNOOZE_OPTIONS = [{ label: 'Tomorrow', days: 1 }, { label: '3 days', days: 3 }, { label: 'Next week', days: 7 }, { label: '2 weeks', days: 14 }]

interface Props { goalId: string | null; open: boolean; onClose: () => void; onUpdated?: () => void }

export function GoalSlideOver({ goalId, open, onClose, onUpdated }: Props) {
  const [goal, setGoal] = useState<GoalData | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [showActivity, setShowActivity] = useState(false)
  const [showSnooze, setShowSnooze] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])

  const fetchGoal = useCallback(async () => {
    if (!goalId) return
    setLoading(true)
    try {
      const [gRes, aRes] = await Promise.all([
        fetch(`/api/goals/${goalId}`),
        fetch(`/api/goals/${goalId}/activity`),
      ])
      const gJson = await gRes.json()
      const aJson = await aRes.json()
      setGoal(gJson.data)
      setActivities(aJson.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [goalId])

  useEffect(() => { if (open && goalId) fetchGoal() }, [open, goalId, fetchGoal])

  const update = async (data: Record<string, unknown>) => {
    if (!goalId) return
    await fetch(`/api/goals/${goalId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    fetchGoal()
    onUpdated?.()
  }

  const addComment = async () => {
    if (!goalId || !comment.trim()) return
    // Find Pablo's team member ID
    const teamRes = await fetch('/api/team-members')
    const teamJson = await teamRes.json()
    const pablo = (teamJson.data || []).find((m: { firstName: string }) => m.firstName === 'Pablo')
    if (!pablo) return
    await fetch(`/api/goals/${goalId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: comment, authorId: pablo.id }) })
    setComment('')
    fetchGoal()
  }

  const snooze = async (days: number) => {
    if (!goalId) return
    await fetch(`/api/goals/${goalId}/snooze`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days }) })
    setShowSnooze(false)
    fetchGoal()
    onUpdated?.()
  }

  const handleBackdrop = (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose() }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!mounted || !open) return null

  const isOverdue = goal?.dueDate && new Date(goal.dueDate) < new Date() && goal.status !== 'DONE' && goal.status !== 'ON_HOLD'
  const daysOverdue = goal?.dueDate ? Math.ceil((Date.now() - new Date(goal.dueDate).getTime()) / 86400000) : 0

  return createPortal(
    <div ref={overlayRef} onClick={handleBackdrop} className={cn('fixed inset-0 z-50 transition-opacity duration-200', visible ? 'opacity-100' : 'opacity-0')}>
      <div className="absolute inset-0 bg-black/20" />
      <div className={cn('absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl flex flex-col transition-transform duration-200', visible ? 'translate-x-0' : 'translate-x-full')}>
        {loading || !goal ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-[#F0EFE9] rounded animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E8E4DD]">
              <div className="flex-1 min-w-0">
                <input
                  defaultValue={goal.title}
                  onBlur={e => e.target.value !== goal.title && update({ title: e.target.value })}
                  className="w-full text-lg font-semibold text-[#1A1A2E] bg-transparent border-b border-transparent hover:border-[#D1D5DB] focus:border-amber-500 focus:outline-none pb-0.5"
                />
                <div className="flex items-center gap-2 mt-2">
                  <select value={goal.status} onChange={e => update({ status: e.target.value })} className={cn('text-xs rounded-full border px-2.5 py-1 font-medium bg-transparent focus:outline-none', GOAL_STATUS_COLORS[goal.status])}>
                    {STATUSES.map(s => <option key={s} value={s}>{GOAL_STATUS_LABELS[s]}</option>)}
                  </select>
                  <select value={goal.priority} onChange={e => update({ priority: e.target.value })} className="text-xs rounded-full border border-[#D1D5DB] px-2.5 py-1 font-medium bg-transparent focus:outline-none">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p === 'NONE' ? 'No Priority' : p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-[#F0EFE9] text-[#9CA3AF]"><X className="w-5 h-5" /></button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Due date */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-[#6B7280] w-20">Due date</label>
                <input type="date" defaultValue={goal.dueDate?.split('T')[0] || ''} onChange={e => update({ dueDate: e.target.value || null })} className="h-8 rounded border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-amber-500" />
                {isOverdue && <span className="text-xs text-red-500 font-medium">{daysOverdue}d overdue</span>}
              </div>

              {/* Assignees */}
              <div className="flex items-start gap-3">
                <label className="text-xs text-[#6B7280] w-20 mt-1">Assignees</label>
                <div className="flex flex-wrap gap-1">
                  {goal.assignees.map(a => (
                    <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700">{a.firstName} {a.lastName}</span>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {goal.categories.length > 0 && (
                <div className="flex items-start gap-3">
                  <label className="text-xs text-[#6B7280] w-20 mt-1">Categories</label>
                  <div className="flex flex-wrap gap-1">
                    {goal.categories.map(c => (
                      <span key={c} className={cn('text-[10px] rounded-full border px-2 py-0.5 font-medium', GOAL_CATEGORY_COLORS[c] || 'bg-slate-50 text-slate-600 border-slate-200')}>{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs text-[#6B7280] mb-1 block">Description</label>
                <textarea
                  defaultValue={goal.description || ''}
                  onBlur={e => { const v = e.target.value; if (v !== (goal.description || '')) update({ description: v || null }) }}
                  rows={3} placeholder="Add a description..."
                  className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="border-t border-[#E8E4DD]" />

              {/* Comments */}
              <div>
                <label className="text-xs text-[#6B7280] mb-2 block">Comments ({goal.comments.length})</label>
                <div className="flex gap-2 mb-3">
                  <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Add a comment..." className="flex-1 h-8 rounded border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-amber-500" />
                  <button onClick={addComment} disabled={!comment.trim()} className="h-8 w-8 rounded bg-amber-500 text-white flex items-center justify-center disabled:opacity-50 hover:bg-amber-600"><Send className="w-3.5 h-3.5" /></button>
                </div>
                <div className="space-y-2">
                  {goal.comments.map(c => (
                    <div key={c.id} className="border-l-2 border-[#E8E4DD] pl-3 py-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#374151]">{c.author.firstName} {c.author.lastName}</span>
                        <span className="text-[10px] text-[#9CA3AF]">{formatTimeAgo(new Date(c.createdAt))}</span>
                      </div>
                      <p className="text-sm text-[#6B7280] mt-0.5">{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity log — collapsed */}
              <div>
                <button onClick={() => setShowActivity(!showActivity)} className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#6B7280]">
                  <ChevronDown className={cn('w-3 h-3 transition-transform', showActivity && 'rotate-180')} />
                  Activity ({activities.length})
                </button>
                {showActivity && (
                  <div className="mt-2 space-y-1.5">
                    {activities.map(a => (
                      <div key={a.id} className="text-[11px] text-[#9CA3AF]">
                        <span className="text-[#6B7280]">{formatDate(new Date(a.createdAt))}</span> — {a.action.replace(/_/g, ' ').toLowerCase()}
                        {a.fromValue && a.toValue && <span> ({a.fromValue} → {a.toValue})</span>}
                        <span className="text-[#9CA3AF]"> ({a.performedBy})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-5 py-3 border-t border-[#E8E4DD]">
              <button onClick={() => update({ status: 'DONE' })} className="h-8 px-3 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">Mark Done</button>
              <div className="relative">
                <button onClick={() => setShowSnooze(!showSnooze)} className="h-8 px-3 rounded-lg border border-[#D1D5DB] text-xs text-[#374151] hover:bg-[#F0EFE9] flex items-center gap-1">
                  Snooze <ChevronDown className="w-3 h-3" />
                </button>
                {showSnooze && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white border border-[#E8E4DD] rounded-lg shadow-lg py-1 w-32 z-10">
                    {SNOOZE_OPTIONS.map(o => (
                      <button key={o.days} onClick={() => snooze(o.days)} className="w-full text-left px-3 py-1.5 text-xs text-[#374151] hover:bg-[#F0EFE9]">{o.label}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => { if (confirm('Delete this goal?')) { fetch(`/api/goals/${goalId}`, { method: 'DELETE' }).then(() => { onClose(); onUpdated?.() }) } }} className="h-8 px-3 rounded-lg text-xs text-red-500 hover:bg-red-50 ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
