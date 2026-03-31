'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { SkeletonTable } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { ComposeModal } from './compose-modal'
import { TemplateEditor } from './template-editor'
import { Plus, Send, Trash2, FileText, Inbox, Layout } from 'lucide-react'

type Tab = 'drafts' | 'sent' | 'templates'

interface MessageWithPlayer {
  id: string
  createdAt: string
  channel: string
  subject: string | null
  body: string
  status: string
  templateUsed: string | null
  player: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    whatsappPhone?: string | null
  }
}

const TAB_CONFIG: { key: Tab; label: string; icon: typeof Inbox }[] = [
  { key: 'drafts', label: 'Drafts', icon: FileText },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'templates', label: 'Templates', icon: Layout },
]

export function MessageCenter() {
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('drafts')
  const [messages, setMessages] = useState<MessageWithPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [composeOpen, setComposeOpen] = useState(false)

  const fetchMessages = useCallback(async (status?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const res = await fetch(`/api/messages?${params}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setMessages(json.data || [])
    } catch {
      toast('error', 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (tab === 'drafts') fetchMessages('DRAFT')
    else if (tab === 'sent') fetchMessages()
    else setLoading(false)
  }, [tab, fetchMessages])

  async function handleSendDraft(msg: MessageWithPlayer) {
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' }),
      })
      if (!res.ok) throw new Error()
      toast('success', 'Message sent')
      fetchMessages('DRAFT')
    } catch {
      toast('error', 'Failed to send message')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this message?')) return
    try {
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast('success', 'Message deleted')
      if (tab === 'drafts') fetchMessages('DRAFT')
      else fetchMessages()
    } catch {
      toast('error', 'Failed to delete message')
    }
  }

  function getStatusVariant(status: string): string {
    switch (status) {
      case 'SENT': return 'info'
      case 'DELIVERED': return 'success'
      case 'READ': return 'success'
      case 'FAILED': return 'error'
      case 'DRAFT': return 'default'
      default: return 'default'
    }
  }

  const sentMessages = tab === 'sent'
    ? messages.filter((m) => m.status !== 'DRAFT')
    : messages

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-white border border-[#E8E4DD] w-fit">
        {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              tab === key
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-[#6B7280] hover:text-[#1A1A2E] hover:bg-[#F0EFE9]/60',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Compose button */}
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <Plus className="w-4 h-4" />
          Compose
        </Button>
      </div>

      {/* Templates tab */}
      {tab === 'templates' && <TemplateEditor />}

      {/* Messages table (drafts / sent) */}
      {tab !== 'templates' && (
        <>
          {loading ? (
            <SkeletonTable rows={6} columns={6} />
          ) : sentMessages.length === 0 ? (
            <div className="rounded-xl border border-[#E8E4DD] bg-white py-16 text-center">
              <Inbox className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
              <p className="text-sm text-[#9CA3AF]">
                {tab === 'drafts' ? 'No drafts yet.' : 'No sent messages yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Body</TableHead>
                  {tab === 'drafts' && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sentMessages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(msg.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium text-[#1A1A2E]">
                      {msg.player.firstName} {msg.player.lastName}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'px-2 py-0.5 text-xs rounded-full',
                        msg.channel === 'WHATSAPP'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-blue-500/10 text-blue-400',
                      )}>
                        {msg.channel}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-[#6B7280]">
                      {msg.subject || '--'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(msg.status)}>
                        {msg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-[#9CA3AF] text-xs">
                      {msg.body}
                    </TableCell>
                    {tab === 'drafts' && (
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSendDraft(msg)}
                            className="p-1.5 rounded hover:bg-[#F0EFE9] text-[#9CA3AF] hover:text-emerald-400 transition-colors"
                            title="Send"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="p-1.5 rounded hover:bg-[#F0EFE9] text-[#9CA3AF] hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      {/* Compose Modal */}
      <ComposeModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSent={() => {
          if (tab === 'drafts') fetchMessages('DRAFT')
          else if (tab === 'sent') fetchMessages()
        }}
      />
    </div>
  )
}
