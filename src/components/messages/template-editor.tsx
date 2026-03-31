'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input, TextArea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Plus, Save, Trash2, Edit2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MessageTemplate } from '@/types'

const CHANNEL_OPTIONS = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
]

const CATEGORY_OPTIONS = [
  { value: 'WELCOME', label: 'Welcome' },
  { value: 'WIN_BACK', label: 'Win-Back' },
  { value: 'UPSELL', label: 'Upsell' },
  { value: 'REMINDER', label: 'Reminder' },
  { value: 'PROMO', label: 'Promo' },
  { value: 'CUSTOM', label: 'Custom' },
]

const VARIABLE_HINTS = ['{{firstName}}', '{{lastName}}', '{{clubName}}', '{{lastVisit}}']

interface TemplateFormData {
  name: string
  channel: string
  category: string
  subject: string
  body: string
}

const emptyForm: TemplateFormData = {
  name: '',
  channel: 'WHATSAPP',
  category: 'CUSTOM',
  subject: '',
  body: '',
}

export function TemplateEditor() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState<TemplateFormData>({ ...emptyForm })

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setTemplates(json.data || [])
    } catch {
      toast('error', 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startEdit(tpl: MessageTemplate) {
    setEditingId(tpl.id)
    setShowNew(false)
    setForm({
      name: tpl.name,
      channel: tpl.channel,
      category: tpl.category,
      subject: tpl.subject || '',
      body: tpl.body,
    })
  }

  function startNew() {
    setEditingId(null)
    setShowNew(true)
    setForm({ ...emptyForm })
  }

  function cancelEdit() {
    setEditingId(null)
    setShowNew(false)
    setForm({ ...emptyForm })
  }

  async function handleSave() {
    if (!form.name || !form.body) {
      toast('error', 'Name and body are required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        channel: form.channel,
        category: form.category,
        subject: form.subject || null,
        body: form.body,
      }

      if (editingId) {
        const res = await fetch(`/api/templates/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast('success', 'Template updated')
      } else {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed')
        }
        toast('success', 'Template created')
      }

      cancelEdit()
      await fetchTemplates()
    } catch (e) {
      toast('error', (e as Error).message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this template?')) return
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast('success', 'Template deleted')
      if (editingId === id) cancelEdit()
      await fetchTemplates()
    } catch {
      toast('error', 'Failed to delete template')
    }
  }

  if (loading) return <SkeletonCard lines={6} />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">{templates.length} template(s)</p>
        <Button size="sm" onClick={startNew} disabled={showNew}>
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* Template form (new or editing) */}
      {(showNew || editingId) && (
        <div className="rounded-xl border border-amber-500/30 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-amber-400">
              {editingId ? 'Edit Template' : 'New Template'}
            </h4>
            <button onClick={cancelEdit} className="text-[#9CA3AF] hover:text-[#1A1A2E]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Win-Back WhatsApp"
            />
            <Select
              label="Channel"
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              options={CHANNEL_OPTIONS}
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={CATEGORY_OPTIONS}
            />
          </div>

          {form.channel === 'EMAIL' && (
            <Input
              label="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Email subject line"
            />
          )}

          <div>
            <TextArea
              label="Body"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Message body with {{variables}}..."
              rows={5}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VARIABLE_HINTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, body: form.body + v })}
                  className="px-2 py-0.5 text-xs rounded bg-[#F0EFE9] text-amber-400 hover:bg-[#E8E4DD] transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4" />
              {editingId ? 'Update' : 'Create'}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-[#9CA3AF] text-sm">
          No templates yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className={cn(
                'rounded-lg border bg-white p-4 transition-colors',
                editingId === tpl.id
                  ? 'border-amber-500/40'
                  : 'border-[#E8E4DD] hover:border-[#D1D5DB]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-[#1A1A2E]">{tpl.name}</h4>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-[#F0EFE9] text-[#6B7280]">
                      {tpl.channel}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-400">
                      {tpl.category}
                    </span>
                  </div>
                  {tpl.subject && (
                    <p className="text-xs text-[#9CA3AF] mb-1">Subject: {tpl.subject}</p>
                  )}
                  <p className="text-sm text-[#6B7280] line-clamp-2">{tpl.body}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(tpl)}
                    className="p-1.5 rounded hover:bg-[#F0EFE9] text-[#9CA3AF] hover:text-amber-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tpl.id)}
                    className="p-1.5 rounded hover:bg-[#F0EFE9] text-[#9CA3AF] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
