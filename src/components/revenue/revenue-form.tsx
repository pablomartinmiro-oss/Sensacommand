'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface RevenueFormData {
  courtRentals: number
  memberships: number
  lessons: number
  proShop: number
  events: number
  other: number
}

const EMPTY_FORM: RevenueFormData = {
  courtRentals: 0,
  memberships: 0,
  lessons: 0,
  proShop: 0,
  events: 0,
  other: 0,
}

const FIELD_LABELS: { key: keyof RevenueFormData; label: string }[] = [
  { key: 'courtRentals', label: 'Court Rentals' },
  { key: 'memberships', label: 'Memberships' },
  { key: 'lessons', label: 'Lessons' },
  { key: 'proShop', label: 'Pro Shop' },
  { key: 'events', label: 'Events' },
  { key: 'other', label: 'Other' },
]

function todayString(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

interface RevenueFormProps {
  onSaved?: () => void
}

export function RevenueForm({ onSaved }: RevenueFormProps) {
  const { toast } = useToast()
  const [date, setDate] = useState(todayString())
  const [form, setForm] = useState<RevenueFormData>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [isEdit, setIsEdit] = useState(false)

  const total = Object.values(form).reduce((sum, v) => sum + (Number(v) || 0), 0)

  const fetchForDate = useCallback(async (targetDate: string) => {
    try {
      const res = await fetch(`/api/revenue?date=${targetDate}`)
      if (!res.ok) return
      const json = await res.json()
      if (json.data) {
        setForm({
          courtRentals: Number(json.data.courtRentals) || 0,
          memberships: Number(json.data.memberships) || 0,
          lessons: Number(json.data.lessons) || 0,
          proShop: Number(json.data.proShop) || 0,
          events: Number(json.data.events) || 0,
          other: Number(json.data.other) || 0,
        })
        setIsEdit(true)
      } else {
        setForm({ ...EMPTY_FORM })
        setIsEdit(false)
      }
    } catch {
      setForm({ ...EMPTY_FORM })
      setIsEdit(false)
    }
  }, [])

  useEffect(() => {
    fetchForDate(date)
  }, [date, fetchForDate])

  const handleFieldChange = (key: keyof RevenueFormData, value: string) => {
    const num = value === '' ? 0 : parseFloat(value)
    setForm((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...form }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to save')
      }
      toast('success', isEdit ? 'Revenue updated' : 'Revenue saved')
      setIsEdit(true)
      onSaved?.()
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-[#1A1A2E]">
          Daily Revenue Entry
        </h2>
        {isEdit && (
          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">
            Editing existing record
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <DatePicker
          label="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={todayString()}
        />
        {FIELD_LABELS.map(({ key, label }) => (
          <Input
            key={key}
            label={label}
            type="number"
            min="0"
            step="0.01"
            value={form[key] || ''}
            onChange={(e) => handleFieldChange(key, e.target.value)}
            placeholder="0"
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#E8E4DD]">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#6B7280]">Total:</span>
          <span
            className={cn(
              'text-xl font-bold',
              total > 0 ? 'text-emerald-400' : 'text-[#9CA3AF]'
            )}
          >
            {formatCurrency(total)}
          </span>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          {isEdit ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
