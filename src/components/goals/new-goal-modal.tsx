'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { GOAL_CATEGORY_COLORS } from '@/lib/constants'

interface TeamMemberOption {
  id: string
  firstName: string
  lastName: string
}

interface NewGoalModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  teamMembers: TeamMemberOption[]
}

const ALL_CATEGORIES = [
  'Marketing', 'Partnerships', 'Operations', 'Playing Experience', 'Site Improvement',
  'Hiring', 'Finance', 'Pro Shop', 'Buyout', 'Customer Experience', 'Culture',
  'Membership Sales', 'Programming', 'New Sites',
]

export function NewGoalModal({ open, onClose, onCreated, teamMembers }: NewGoalModalProps) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('NONE')
  const [categories, setCategories] = useState<string[]>([])
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle(''); setPriority('NONE'); setCategories([]); setAssigneeIds([]); setDueDate('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, categories, assigneeIds, dueDate: dueDate || null }),
      })
      reset()
      onCreated()
      onClose()
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Goal" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title..."
          required
          className="w-full h-10 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-[#9CA3AF] mb-1 block">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-amber-500/50">
              <option value="NONE">None</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-[#9CA3AF] mb-1 block">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>
        </div>

        <div>
          <label className="text-xs text-[#9CA3AF] mb-1.5 block">Categories</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_CATEGORIES.map(cat => (
              <button key={cat} type="button" onClick={() => setCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                className={cn('text-[11px] rounded-full border px-2 py-0.5 font-medium transition-colors', categories.includes(cat) ? GOAL_CATEGORY_COLORS[cat] || 'bg-zinc-500/15 text-[#6B7280] border-zinc-500/25' : 'bg-[#F0EFE9] text-[#9CA3AF] border-[#D1D5DB]/50 hover:text-[#6B7280]')}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-[#9CA3AF] mb-1.5 block">Assignees</label>
          <div className="flex flex-wrap gap-1.5">
            {teamMembers.map(m => (
              <button key={m.id} type="button" onClick={() => setAssigneeIds(prev => prev.includes(m.id) ? prev.filter(a => a !== m.id) : [...prev, m.id])}
                className={cn('text-xs rounded-full border px-2.5 py-1 font-medium transition-colors', assigneeIds.includes(m.id) ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'bg-[#F0EFE9] text-[#9CA3AF] border-[#D1D5DB]/50 hover:text-[#6B7280]')}>
                {m.firstName} {m.lastName}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-sm text-[#6B7280] hover:text-[#1A1A2E] transition-colors">Cancel</button>
          <button type="submit" disabled={saving || !title.trim()} className="h-9 px-4 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-50 hover:bg-amber-600 transition-colors">
            {saving ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
