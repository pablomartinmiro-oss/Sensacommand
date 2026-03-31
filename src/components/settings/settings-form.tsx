'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { SkeletonCard } from '@/components/ui/skeleton'
import {
  Building2,
  DollarSign,
  Clock,
  MessageSquare,
  Mail,
  Database,
  Save,
  Download,
  Send,
  RotateCcw,
  Wifi,
} from 'lucide-react'

interface Settings {
  clubName: string
  courtCount: number
  timezone: string
  casualRate: number
  standardMembershipRate: number
  unlimitedMembershipRate: number
  peakHours: number[]
  telegramBotToken: string
  telegramChatId: string
  fromEmail: string
}

const TIMEZONE_OPTIONS = [
  { value: 'America/Chicago', label: 'Central (Nashville)' },
  { value: 'America/New_York', label: 'Eastern' },
  { value: 'America/Denver', label: 'Mountain' },
  { value: 'America/Los_Angeles', label: 'Pacific' },
  { value: 'UTC', label: 'UTC' },
]

const HOURS = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8 // 8AM to 10PM
  const label = hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`
  return { value: hour, label }
})

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-heading font-semibold text-[#1A1A2E] uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

export function SettingsForm() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [triggeringBriefing, setTriggeringBriefing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setSettings(json.data as Settings)
    } catch {
      toast('error', 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveSection(section: string, data: Partial<Settings>) {
    setSaving(section)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      toast('success', 'Settings saved')
    } catch {
      toast('error', 'Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  async function handleTestTelegram() {
    setTestingTelegram(true)
    try {
      const res = await fetch('/api/telegram/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Connection failed')
      }
      toast('success', 'Telegram connection successful')
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      setTestingTelegram(false)
    }
  }

  async function handleTestEmail() {
    if (!settings?.fromEmail) {
      toast('error', 'Please enter a from email first')
      return
    }
    setTestingEmail(true)
    try {
      const res = await fetch('/api/settings/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: settings.fromEmail }),
      })
      if (!res.ok) throw new Error('Failed to send test email')
      toast('success', 'Test email sent')
    } catch {
      toast('error', 'Failed to send test email')
    } finally {
      setTestingEmail(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/settings/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sensa-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('success', 'Export downloaded')
    } catch {
      toast('error', 'Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  async function handleTriggerBriefing() {
    setTriggeringBriefing(true)
    try {
      const res = await fetch('/api/telegram/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: false }),
      })
      if (!res.ok) throw new Error('Failed to send briefing')
      toast('success', 'Morning briefing sent via Telegram')
    } catch {
      toast('error', 'Failed to send briefing')
    } finally {
      setTriggeringBriefing(false)
    }
  }

  async function handleReset() {
    if (!confirm('This will reset ALL data to seed data. This cannot be undone. Continue?')) return
    if (!confirm('Are you REALLY sure? All current data will be lost.')) return
    setResetting(true)
    toast('info', 'Reset functionality requires running: npx prisma db seed')
    setResetting(false)
  }

  function togglePeakHour(hour: number) {
    if (!settings) return
    const current = settings.peakHours || []
    const updated = current.includes(hour)
      ? current.filter((h) => h !== hour)
      : [...current, hour].sort((a, b) => a - b)
    setSettings({ ...settings, peakHours: updated })
  }

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Club Settings */}
      <SectionCard icon={Building2} title="Club Settings">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Club Name"
            value={settings.clubName}
            onChange={(e) => setSettings({ ...settings, clubName: e.target.value })}
          />
          <Input
            label="Court Count"
            type="number"
            min={1}
            max={20}
            value={settings.courtCount}
            onChange={(e) => setSettings({ ...settings, courtCount: parseInt(e.target.value) || 0 })}
          />
          <Select
            label="Timezone"
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            options={TIMEZONE_OPTIONS}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={() =>
              saveSection('club', {
                clubName: settings.clubName,
                courtCount: settings.courtCount,
                timezone: settings.timezone,
              })
            }
            loading={saving === 'club'}
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </SectionCard>

      {/* Pricing */}
      <SectionCard icon={DollarSign} title="Pricing">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Casual Rate ($)"
            type="number"
            min={0}
            value={settings.casualRate}
            onChange={(e) => setSettings({ ...settings, casualRate: parseFloat(e.target.value) || 0 })}
          />
          <Input
            label="Standard Membership ($/mo)"
            type="number"
            min={0}
            value={settings.standardMembershipRate}
            onChange={(e) =>
              setSettings({ ...settings, standardMembershipRate: parseFloat(e.target.value) || 0 })
            }
          />
          <Input
            label="Unlimited Membership ($/mo)"
            type="number"
            min={0}
            value={settings.unlimitedMembershipRate}
            onChange={(e) =>
              setSettings({
                ...settings,
                unlimitedMembershipRate: parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={() =>
              saveSection('pricing', {
                casualRate: settings.casualRate,
                standardMembershipRate: settings.standardMembershipRate,
                unlimitedMembershipRate: settings.unlimitedMembershipRate,
              })
            }
            loading={saving === 'pricing'}
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </SectionCard>

      {/* Peak Hours */}
      <SectionCard icon={Clock} title="Peak Hours">
        <p className="text-xs text-[#9CA3AF] mb-3">
          Select hours considered peak time for court pricing and analytics.
        </p>
        <div className="flex flex-wrap gap-2">
          {HOURS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => togglePeakHour(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                settings.peakHours.includes(value)
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-white text-[#9CA3AF] border-[#E8E4DD] hover:border-[#D1D5DB]',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={() => saveSection('peakHours', { peakHours: settings.peakHours })}
            loading={saving === 'peakHours'}
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </SectionCard>

      {/* Telegram */}
      <SectionCard icon={MessageSquare} title="Telegram">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Bot Token"
            type="password"
            value={settings.telegramBotToken}
            onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
            placeholder="123456:ABC-DEF..."
          />
          <Input
            label="Chat ID"
            value={settings.telegramChatId}
            onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
            placeholder="-1001234567890"
          />
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleTestTelegram}
            loading={testingTelegram}
          >
            <Wifi className="w-4 h-4" />
            Test Connection
          </Button>
          <Button
            size="sm"
            onClick={() =>
              saveSection('telegram', {
                telegramBotToken: settings.telegramBotToken,
                telegramChatId: settings.telegramChatId,
              })
            }
            loading={saving === 'telegram'}
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </SectionCard>

      {/* Email */}
      <SectionCard icon={Mail} title="Email">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="From Email"
            type="email"
            value={settings.fromEmail}
            onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
            placeholder="noreply@sensapadel.com"
          />
          <div className="flex items-end">
            <Button size="sm" variant="secondary" onClick={handleTestEmail} loading={testingEmail}>
              <Send className="w-4 h-4" />
              Send Test Email
            </Button>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={() => saveSection('email', { fromEmail: settings.fromEmail })}
            loading={saving === 'email'}
          >
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </SectionCard>

      {/* Data Management */}
      <SectionCard icon={Database} title="Data Management">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button variant="secondary" onClick={handleExport} loading={exporting}>
            <Download className="w-4 h-4" />
            Export All Data
          </Button>
          <Button variant="secondary" onClick={handleTriggerBriefing} loading={triggeringBriefing}>
            <Send className="w-4 h-4" />
            Trigger Morning Briefing
          </Button>
          <Button variant="danger" onClick={handleReset} loading={resetting}>
            <RotateCcw className="w-4 h-4" />
            Reset to Seed Data
          </Button>
        </div>
        <p className="text-xs text-[#9CA3AF] mt-3">
          Export downloads all data as JSON. Reset requires re-running the database seed command.
        </p>
      </SectionCard>
    </div>
  )
}
