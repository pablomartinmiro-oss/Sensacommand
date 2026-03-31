'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { formatDate, formatTimeAgo } from '@/lib/utils'
import { GOAL_STATUS_LABELS, GOAL_STATUS_COLORS, GOAL_CATEGORY_COLORS } from '@/lib/constants'
import { Send } from 'lucide-react'

interface TeamMemberOption {
  id: string
  firstName: string
  lastName: string
}

interface GoalDetailData {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  categories: string[]
  dueDate: string | null
  dateRequested: string | null
  notes: string | null
  assignees: TeamMemberOption[]
  comments: { id: string; body: string; createdAt: string; author: TeamMemberOption }[]
  linkedPlayers: { id: string; firstName: string; lastName: string }[]
}

interface GoalDetailProps {
  goalId: string | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
  teamMembers: TeamMemberOption[]
}

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING']
const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW', 'NONE']
const ALL_CATEGORIES = [
  'Marketing', 'Partnerships', 'Operations', 'Playing Experience', 'Site Improvement',
  'Hiring', 'Finance', 'Pro Shop', 'Buyout', 'Customer Experience', 'Culture',
  'Membership Sales', 'Programming', 'New Sites',
]

export function GoalDetail({ goalId, open, onClose, onUpdated, teamMembers }: GoalDetailProps) {
  const [goal, setGoal] = useState<GoalDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchGoal = useCallback(async () => {
    if (!goalId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/goals/${goalId}`)
      const json = await res.json()
      const g = json.data
      setGoal(g)
      setTitle(g.title)
      setDescription(g.description || '')
      setStatus(g.status)
      setPriority(g.priority)
      setCategories(g.categories)
      setAssigneeIds(g.assignees.map((a: TeamMemberOption) => a.id))
      setDueDate(g.dueDate ? new Date(g.dueDate).toISOString().split('T')[0] : '')
    } catch { /* ignore */ }
    setLoading(false)
  }, [goalId])

  useEffect(() => {
    if (open && goalId) fetchGoal()
  }, [open, goalId, fetchGoal])

  const save = async (updates: Record<string, unknown>) => {
    if (!goalId) return
    setSaving(true)
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      onUpdated()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const addComment = async () => {
    if (!goalId || !comment.trim() || !teamMembers[0]) return
    // Use first team member (Pablo) as default author
    const pabloId = teamMembers.find(m => m.firstName === 'Pablo')?.id || teamMembers[0].id
    try {
      await fetch(`/api/goals/${goalId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: comment, authorId: pabloId }),
      })
      setComment('')
      fetchGoal()
    } catch { /* ignore */ }
  }

  const toggleCategory = (cat: string) => {
    const next = categories.includes(cat)
      ? categories.filter(c => c !== cat)
      : [...categories, cat]
    setCategories(next)
    save({ categories: next })
  }

  const toggleAssignee = (id: string) => {
    const next = assigneeIds.includes(id)
      ? assigneeIds.filter(a => a !== id)
      : [...assigneeIds, id]
    setAssigneeIds(next)
    save({ assigneeIds: next })
  }

  return (
    <Modal open={open} onClose={onClose} title={loading ? 'Loading...' : 'Goal Detail'} maxWidth="max-w-2xl">
      {loading || !goal ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== goal.title && save({ title })}
            className="w-full text-lg font-semibold text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-amber-500 focus:outline-none pb-1 transition-colors"
          />

          {/* Status + Priority row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Status</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); save({ status: e.target.value }) }}
                className={cn('w-full h-9 rounded-lg border px-3 text-sm font-medium bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500/50', GOAL_STATUS_COLORS[status])}
              >
                {STATUSES.map(s => <option key={s} value={s} className="bg-zinc-900 text-zinc-100">{GOAL_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => { setPriority(e.target.value); save({ priority: e.target.value }) }}
                className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {PRIORITIES.map(p => <option key={p} value={p} className="bg-zinc-900">{p === 'NONE' ? 'None' : p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); save({ dueDate: e.target.value || null }) }}
                className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {goal.dateRequested && (
            <p className="text-xs text-zinc-500">Date Requested: {formatDate(new Date(goal.dateRequested))}</p>
          )}

          {/* Description */}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => description !== (goal.description || '') && save({ description: description || null })}
              rows={3}
              placeholder="Add a description..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Categories</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    'text-[11px] rounded-full border px-2 py-0.5 font-medium transition-colors',
                    categories.includes(cat)
                      ? GOAL_CATEGORY_COLORS[cat] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25'
                      : 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50 hover:text-zinc-400'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Assignees</label>
            <div className="flex flex-wrap gap-1.5">
              {teamMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => toggleAssignee(m.id)}
                  className={cn(
                    'text-xs rounded-full border px-2.5 py-1 font-medium transition-colors',
                    assigneeIds.includes(m.id)
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/25'
                      : 'bg-zinc-800/50 text-zinc-600 border-zinc-700/50 hover:text-zinc-400'
                  )}
                >
                  {m.firstName} {m.lastName}
                </button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Comments ({goal.comments.length})</label>
            <div className="space-y-2 mb-3">
              {goal.comments.map(c => (
                <div key={c.id} className="bg-zinc-900/60 rounded-lg px-3 py-2 border border-zinc-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-zinc-300">{c.author.firstName} {c.author.lastName}</span>
                    <span className="text-[10px] text-zinc-600">{formatTimeAgo(new Date(c.createdAt))}</span>
                  </div>
                  <p className="text-sm text-zinc-400">{c.body}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addComment()}
                placeholder="Add a comment..."
                className="flex-1 h-9 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                onClick={addComment}
                disabled={!comment.trim()}
                className="h-9 px-3 rounded-lg bg-amber-500 text-black text-sm font-medium disabled:opacity-50 hover:bg-amber-600 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {saving && <p className="text-xs text-amber-400">Saving...</p>}
        </div>
      )}
    </Modal>
  )
}
