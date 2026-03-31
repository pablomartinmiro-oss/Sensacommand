'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, TextArea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Copy, ExternalLink, CheckCircle, Send } from 'lucide-react'
import type { MessageTemplate } from '@/types'

interface Player {
  id: string
  firstName: string
  lastName: string
  email: string | null
  whatsappPhone: string | null
}

interface ComposeModalProps {
  open: boolean
  onClose: () => void
  onSent: () => void
}

const VARIABLE_HINTS = ['{{firstName}}', '{{lastName}}', '{{clubName}}', '{{lastVisit}}']

export function ComposeModal({ open, onClose, onSent }: ComposeModalProps) {
  const { toast } = useToast()
  const [players, setPlayers] = useState<Player[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [channel, setChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP')
  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Fetch players and templates
  useEffect(() => {
    if (!open) return
    async function fetchData() {
      try {
        const [playersRes, templatesRes] = await Promise.all([
          fetch('/api/players?limit=200'),
          fetch('/api/templates'),
        ])
        if (playersRes.ok) {
          const pJson = await playersRes.json()
          setPlayers(pJson.data || [])
        }
        if (templatesRes.ok) {
          const tJson = await templatesRes.json()
          setTemplates(tJson.data || [])
        }
      } catch {
        toast('error', 'Failed to load data')
      }
    }
    fetchData()
  }, [open, toast])

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedPlayerId),
    [players, selectedPlayerId],
  )

  const channelTemplates = useMemo(
    () => templates.filter((t) => t.channel === channel),
    [templates, channel],
  )

  // Apply template
  useEffect(() => {
    if (!templateId) return
    const tpl = templates.find((t) => t.id === templateId)
    if (tpl) {
      setBody(tpl.body)
      if (tpl.subject) setSubject(tpl.subject)
    }
  }, [templateId, templates])

  // Substitute variables in preview
  const previewBody = useMemo(() => {
    if (!body) return ''
    let text = body
    if (selectedPlayer) {
      text = text.replace(/\{\{firstName\}\}/g, selectedPlayer.firstName)
      text = text.replace(/\{\{lastName\}\}/g, selectedPlayer.lastName)
    }
    text = text.replace(/\{\{clubName\}\}/g, 'Sensa Padel')
    text = text.replace(/\{\{lastVisit\}\}/g, 'recently')
    return text
  }, [body, selectedPlayer])

  const whatsappUrl = useMemo(() => {
    if (!selectedPlayer?.whatsappPhone) return ''
    const phone = selectedPlayer.whatsappPhone.replace(/\D/g, '')
    return `https://wa.me/${phone}?text=${encodeURIComponent(previewBody)}`
  }, [selectedPlayer, previewBody])

  function resetForm() {
    setSelectedPlayerId('')
    setChannel('WHATSAPP')
    setTemplateId('')
    setSubject('')
    setBody('')
    setCopied(false)
  }

  async function handleCopyToClipboard() {
    await navigator.clipboard.writeText(previewBody)
    setCopied(true)
    toast('success', 'Message copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleMarkAsSent() {
    if (!selectedPlayerId) {
      toast('error', 'Please select a player')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          channel: 'WHATSAPP',
          subject,
          body: previewBody,
          templateUsed: templateId || null,
          status: 'SENT',
        }),
      })
      if (!res.ok) throw new Error('Failed to save message')
      toast('success', 'Message marked as sent')
      resetForm()
      onSent()
      onClose()
    } catch {
      toast('error', 'Failed to save message')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendEmail() {
    if (!selectedPlayerId) {
      toast('error', 'Please select a player')
      return
    }
    if (!selectedPlayer?.email) {
      toast('error', 'Selected player has no email address')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          channel: 'EMAIL',
          subject: subject || 'Message from Sensa Padel',
          body: previewBody,
          templateUsed: templateId || null,
          status: 'SENT',
        }),
      })
      if (!res.ok) throw new Error('Failed to send email')
      toast('success', 'Email sent successfully')
      resetForm()
      onSent()
      onClose()
    } catch {
      toast('error', 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveDraft() {
    if (!selectedPlayerId) {
      toast('error', 'Please select a player')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          channel,
          subject,
          body: previewBody,
          templateUsed: templateId || null,
          status: 'DRAFT',
        }),
      })
      if (!res.ok) throw new Error('Failed to save draft')
      toast('success', 'Draft saved')
      resetForm()
      onSent()
      onClose()
    } catch {
      toast('error', 'Failed to save draft')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Compose Message" maxWidth="max-w-2xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Player select */}
        <Select
          label="Player"
          placeholder="Select a player..."
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          options={players.map((p) => ({
            value: p.id,
            label: `${p.firstName} ${p.lastName}${p.email ? ` (${p.email})` : ''}`,
          }))}
        />

        {/* Channel */}
        <Select
          label="Channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as 'WHATSAPP' | 'EMAIL')}
          options={[
            { value: 'WHATSAPP', label: 'WhatsApp' },
            { value: 'EMAIL', label: 'Email' },
          ]}
        />

        {/* Template */}
        <Select
          label="Template (optional)"
          placeholder="Write custom message..."
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          options={channelTemplates.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.category})`,
          }))}
        />

        {/* Subject (email only) */}
        {channel === 'EMAIL' && (
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
          />
        )}

        {/* Body */}
        <div>
          <TextArea
            label="Message Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type your message..."
            rows={5}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {VARIABLE_HINTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setBody((prev) => prev + v)}
                className="px-2 py-0.5 text-xs rounded bg-[#F0EFE9] text-amber-400 hover:bg-[#E8E4DD] transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {previewBody && (
          <div className="rounded-lg border border-[#E8E4DD] bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] mb-2">
              Preview
            </p>
            <p className="text-sm text-[#374151] whitespace-pre-wrap">{previewBody}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E8E4DD]">
          {channel === 'WHATSAPP' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyToClipboard}
                disabled={!previewBody}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy to Clipboard'}
              </Button>
              {whatsappUrl && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(whatsappUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open WhatsApp
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleMarkAsSent}
                loading={loading}
                disabled={!selectedPlayerId || !previewBody}
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Sent
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendEmail}
              loading={loading}
              disabled={!selectedPlayerId || !previewBody}
            >
              <Send className="w-4 h-4" />
              Send Email
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveDraft}
            disabled={!selectedPlayerId || !body}
          >
            Save as Draft
          </Button>
        </div>
      </div>
    </Modal>
  )
}
