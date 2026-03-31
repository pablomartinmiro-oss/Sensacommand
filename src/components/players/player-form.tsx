'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import type { Player } from '@/types'

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'HOT_LEAD', label: 'Hot Lead' },
  { value: 'COLD_LEAD', label: 'Cold Lead' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'CHURNED', label: 'Churned' },
]

const MEMBERSHIP_OPTIONS = [
  { value: 'NONE', label: 'Non-Member' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'UNLIMITED', label: 'Unlimited' },
]

const SOURCE_OPTIONS = [
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'PLAYBYPOINT', label: 'PlayByPoint' },
  { value: 'OTHER', label: 'Other' },
]

interface PlayerFormProps {
  open: boolean
  onClose: () => void
  player?: Player | null
  onSaved?: () => void
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  whatsappPhone: string
  source: string
  status: string
  membershipType: string
  notes: string
}

const EMPTY_FORM: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  whatsappPhone: '',
  source: 'OTHER',
  status: 'NEW',
  membershipType: 'NONE',
  notes: '',
}

export function PlayerForm({ open, onClose, player, onSaved }: PlayerFormProps) {
  const { toast } = useToast()
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const isEdit = !!player

  useEffect(() => {
    if (player) {
      setForm({
        firstName: player.firstName,
        lastName: player.lastName,
        email: player.email || '',
        phone: player.phone || '',
        whatsappPhone: player.whatsappPhone || '',
        source: player.source,
        status: player.status,
        membershipType: player.membershipType,
        notes: player.notes || '',
      })
    } else {
      setForm({ ...EMPTY_FORM })
    }
    setErrors({})
  }, [player, open])

  const handleChange = (key: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const url = isEdit ? `/api/players/${player.id}` : '/api/players'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: form.email || null,
          phone: form.phone || null,
          whatsappPhone: form.whatsappPhone || null,
          notes: form.notes || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Failed to save player')
      }

      toast('success', isEdit ? 'Player updated' : 'Player created')
      onSaved?.()
      onClose()
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Player' : 'Add Player'}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={form.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            error={errors.firstName}
            placeholder="John"
          />
          <Input
            label="Last Name"
            value={form.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            error={errors.lastName}
            placeholder="Doe"
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="john@example.com"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 555-0123"
          />
          <Input
            label="WhatsApp Phone"
            type="tel"
            value={form.whatsappPhone}
            onChange={(e) => handleChange('whatsappPhone', e.target.value)}
            placeholder="+1 555-0123"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
          />
          <Select
            label="Membership"
            options={MEMBERSHIP_OPTIONS}
            value={form.membershipType}
            onChange={(e) => handleChange('membershipType', e.target.value)}
          />
          <Select
            label="Source"
            options={SOURCE_OPTIONS}
            value={form.source}
            onChange={(e) => handleChange('source', e.target.value)}
          />
        </div>

        <TextArea
          label="Notes"
          value={form.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Any notes about this player..."
          rows={3}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {isEdit ? 'Update Player' : 'Add Player'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
