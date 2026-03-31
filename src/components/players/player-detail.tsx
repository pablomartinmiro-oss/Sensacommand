'use client'

import { useState } from 'react'
import { cn, formatCurrencyDecimal, formatDate, formatDateTime } from '@/lib/utils'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { TextArea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  STATUS_LABELS,
  MEMBERSHIP_LABELS,
  PAYMENT_TYPE_LABELS,
  VISIT_TYPE_LABELS,
  MESSAGE_STATUS_COLORS,
} from '@/lib/constants'
import { Save, Send, MessageSquare } from 'lucide-react'
import type { PlayerWithRelations } from '@/types'

const TABS = ['Visit History', 'Payment History', 'Messages', 'Notes'] as const
type Tab = (typeof TABS)[number]

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

interface PlayerDetailProps {
  player: PlayerWithRelations
  onUpdate?: () => void
}

export function PlayerDetail({ player, onUpdate }: PlayerDetailProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>('Visit History')
  const [notes, setNotes] = useState(player.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [statusValue, setStatusValue] = useState(player.status)
  const [membershipValue, setMembershipValue] = useState(player.membershipType)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingMembership, setUpdatingMembership] = useState(false)

  const updatePlayer = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/players/${player.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message || 'Failed to update')
    }
    return res.json()
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await updatePlayer({ notes })
      toast('success', 'Notes saved')
      onUpdate?.()
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setStatusValue(newStatus as typeof player.status)
    setUpdatingStatus(true)
    try {
      await updatePlayer({ status: newStatus })
      toast('success', `Status changed to ${STATUS_LABELS[newStatus] || newStatus}`)
      onUpdate?.()
    } catch (e) {
      setStatusValue(player.status)
      toast('error', (e as Error).message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleMembershipChange = async (newType: string) => {
    setMembershipValue(newType as typeof player.membershipType)
    setUpdatingMembership(true)
    try {
      await updatePlayer({ membershipType: newType })
      toast('success', `Membership changed to ${MEMBERSHIP_LABELS[newType] || newType}`)
      onUpdate?.()
    } catch (e) {
      setMembershipValue(player.membershipType)
      toast('error', (e as Error).message)
    } finally {
      setUpdatingMembership(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Status:</span>
          <Select
            options={STATUS_OPTIONS}
            value={statusValue}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={updatingStatus}
            className="w-36 h-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Membership:</span>
          <Select
            options={MEMBERSHIP_OPTIONS}
            value={membershipValue}
            onChange={(e) => handleMembershipChange(e.target.value)}
            disabled={updatingMembership}
            className="w-36 h-8 text-xs"
          />
        </div>
        <div className="ml-auto">
          <Button variant="secondary" size="sm">
            <Send className="h-3.5 w-3.5" />
            Send Message
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === tab
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
              )}
            >
              {tab}
              {tab === 'Visit History' && (
                <span className="ml-1.5 text-xs text-zinc-600">({player.visits.length})</span>
              )}
              {tab === 'Payment History' && (
                <span className="ml-1.5 text-xs text-zinc-600">({player.payments.length})</span>
              )}
              {tab === 'Messages' && (
                <span className="ml-1.5 text-xs text-zinc-600">({player.messages.length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'Visit History' && <VisitHistoryTab visits={player.visits} />}
      {activeTab === 'Payment History' && <PaymentHistoryTab payments={player.payments} />}
      {activeTab === 'Messages' && <MessagesTab messages={player.messages} />}
      {activeTab === 'Notes' && (
        <NotesTab
          notes={notes}
          onChange={setNotes}
          onSave={handleSaveNotes}
          saving={savingNotes}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Visit History Tab                                                  */
/* ------------------------------------------------------------------ */

function VisitHistoryTab({ visits }: { visits: PlayerWithRelations['visits'] }) {
  if (visits.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-12">
        No visits recorded
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Court</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visits.map((visit: PlayerWithRelations['visits'][number]) => {
          const start = new Date(visit.startTime)
          const end = new Date(visit.endTime)
          const durationMin = Math.round((end.getTime() - start.getTime()) / 60000)
          const hours = Math.floor(durationMin / 60)
          const mins = durationMin % 60
          const durationStr =
            hours > 0
              ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`
              : `${mins}m`

          return (
            <TableRow key={visit.id}>
              <TableCell className="font-medium text-zinc-200">
                {formatDate(visit.date)}
              </TableCell>
              <TableCell>Court {visit.courtNumber}</TableCell>
              <TableCell>{durationStr}</TableCell>
              <TableCell className="text-right font-medium text-zinc-200">
                {formatCurrencyDecimal(Number(visit.amountPaid))}
              </TableCell>
              <TableCell>
                <span className="text-xs text-zinc-400">
                  {VISIT_TYPE_LABELS[visit.type] || visit.type}
                </span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

/* ------------------------------------------------------------------ */
/*  Payment History Tab                                                */
/* ------------------------------------------------------------------ */

function PaymentHistoryTab({
  payments,
}: {
  payments: PlayerWithRelations['payments']
}) {
  if (payments.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-12">
        No payments recorded
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment: PlayerWithRelations['payments'][number]) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium text-zinc-200">
              {formatDate(payment.date)}
            </TableCell>
            <TableCell className="text-right font-medium text-zinc-200">
              {formatCurrencyDecimal(Number(payment.amount))}
            </TableCell>
            <TableCell>
              <span className="text-xs text-zinc-400">
                {PAYMENT_TYPE_LABELS[payment.type] || payment.type}
              </span>
            </TableCell>
            <TableCell className="text-zinc-400 text-xs capitalize">
              {payment.method.toLowerCase().replace('_', ' ')}
            </TableCell>
            <TableCell className="text-zinc-500 max-w-[200px] truncate">
              {payment.description || '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/* ------------------------------------------------------------------ */
/*  Messages Tab                                                       */
/* ------------------------------------------------------------------ */

function MessagesTab({
  messages,
}: {
  messages: PlayerWithRelations['messages']
}) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <MessageSquare className="h-8 w-8 text-zinc-700" />
        <p className="text-sm text-zinc-500">No messages yet</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Channel</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {messages.map((msg: PlayerWithRelations['messages'][number]) => (
          <TableRow key={msg.id}>
            <TableCell className="font-medium text-zinc-200">
              {formatDateTime(msg.createdAt)}
            </TableCell>
            <TableCell className="text-zinc-400 text-xs capitalize">
              {msg.channel.toLowerCase().replace('_', ' ')}
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  msg.direction === 'OUTBOUND'
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'bg-emerald-500/15 text-emerald-400'
                )}
              >
                {msg.direction === 'OUTBOUND' ? 'Sent' : 'Received'}
              </span>
            </TableCell>
            <TableCell className="text-zinc-300 max-w-[200px] truncate">
              {msg.subject || msg.body.slice(0, 50)}
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  MESSAGE_STATUS_COLORS[msg.status] || 'bg-zinc-500/20 text-zinc-400'
                )}
              >
                {msg.status.charAt(0) + msg.status.slice(1).toLowerCase()}
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/* ------------------------------------------------------------------ */
/*  Notes Tab                                                          */
/* ------------------------------------------------------------------ */

function NotesTab({
  notes,
  onChange,
  onSave,
  saving,
}: {
  notes: string
  onChange: (v: string) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-3">
      <TextArea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes about this player..."
        rows={8}
        className="min-h-[200px]"
      />
      <div className="flex justify-end">
        <Button onClick={onSave} loading={saving} size="sm">
          <Save className="h-3.5 w-3.5" />
          Save Notes
        </Button>
      </div>
    </div>
  )
}
