'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatTimeAgo } from '@/lib/utils'
import { Play, Eye, Zap, Clock } from 'lucide-react'

interface AutomationStatus {
  id: string
  type: string
  name: string
  description: string
  enabled: boolean
  schedule: string
  lastRun: string | null
  recentLogs: number
}

interface LogEntry {
  id: string
  automationType: string
  action: string
  status: string
  channel: string | null
  dryRun: boolean
  createdAt: string
  targetPlayer: { firstName: string; lastName: string } | null
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<AutomationStatus[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/automations/status')
      const json = await res.json()
      setAutomations(json.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/automations/logs?limit=100')
      const json = await res.json()
      setLogs(json.data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchLogs()
  }, [fetchStatus, fetchLogs])

  const runAutomation = async (type: string, dryRun: boolean) => {
    setRunning(type)
    try {
      await fetch('/api/automations/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, dryRun }),
      })
      await Promise.all([fetchStatus(), fetchLogs()])
    } catch { /* ignore */ }
    setRunning(null)
  }

  const toggleEnabled = async (type: string, enabled: boolean) => {
    try {
      await fetch(`/api/automations/${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      setAutomations(prev => prev.map(a => a.type === type ? { ...a, enabled } : a))
    } catch { /* ignore */ }
  }

  // Stats
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = logs.filter(l => l.createdAt.startsWith(today))
  const sentToday = todayLogs.filter(l => l.status === 'sent').length
  const skippedToday = todayLogs.filter(l => l.status === 'deduped' || l.status === 'skipped').length
  const failedToday = todayLogs.filter(l => l.status === 'failed').length

  const STATUS_BADGE: Record<string, string> = {
    sent: 'success', dry_run: 'info', skipped: 'inactive', deduped: 'warning', failed: 'error', queued: 'pending',
  }

  return (
    <>
      <Header title="Automations" />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{sentToday}</p>
            <p className="text-xs text-[#9CA3AF]">Sent Today</p>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{skippedToday}</p>
            <p className="text-xs text-[#9CA3AF]">Skipped (Dedup)</p>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{failedToday}</p>
            <p className="text-xs text-[#9CA3AF]">Failed</p>
          </div>
          <div className="bg-brand-card border border-brand-border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{automations.filter(a => a.enabled).length}</p>
            <p className="text-xs text-[#9CA3AF]">Active</p>
          </div>
        </div>

        {/* Automation cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-[#F0EFE9] rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map(auto => (
              <div key={auto.type} className="bg-brand-card border border-brand-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className={cn('w-4 h-4', auto.enabled ? 'text-amber-400' : 'text-[#9CA3AF]')} />
                    <h3 className="text-sm font-semibold text-[#1A1A2E]">{auto.name}</h3>
                  </div>
                  <button
                    onClick={() => toggleEnabled(auto.type, !auto.enabled)}
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                      auto.enabled ? 'bg-amber-500' : 'bg-[#E8E4DD]'
                    )}
                  >
                    <span className={cn(
                      'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                      auto.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    )} />
                  </button>
                </div>

                <p className="text-xs text-[#9CA3AF] mb-3">{auto.description}</p>

                <div className="flex items-center gap-3 text-[10px] text-[#9CA3AF] mb-3">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{auto.schedule}</span>
                  {auto.lastRun && (
                    <span>Last: {formatTimeAgo(new Date(auto.lastRun))}</span>
                  )}
                  <span>{auto.recentLogs} logs (24h)</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => runAutomation(auto.type, false)}
                    disabled={running === auto.type}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-amber-500 text-black text-xs font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    {running === auto.type ? 'Running...' : 'Run Now'}
                  </button>
                  <button
                    onClick={() => runAutomation(auto.type, true)}
                    disabled={running === auto.type}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-md border border-[#D1D5DB] text-[#374151] text-xs hover:border-[#D1D5DB] disabled:opacity-50 transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity log */}
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3">Activity Log</h3>
          <div className="overflow-x-auto border border-brand-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-[#F8F7F4]">
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Time</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Automation</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Player</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Action</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Status</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Channel</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[#9CA3AF] text-xs">No automation logs yet. Run an automation to see results here.</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="border-b border-brand-border hover:bg-[#F0EFE9]/30">
                    <td className="px-4 py-2 text-xs text-[#9CA3AF]">{formatTimeAgo(new Date(log.createdAt))}</td>
                    <td className="px-4 py-2 text-xs text-[#374151]">{log.automationType}</td>
                    <td className="px-4 py-2 text-xs text-[#374151]">
                      {log.targetPlayer ? `${log.targetPlayer.firstName} ${log.targetPlayer.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#6B7280]">{log.action}</td>
                    <td className="px-4 py-2">
                      <Badge variant={STATUS_BADGE[log.status] || 'default'}>
                        {log.dryRun && '🔍 '}{log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#9CA3AF]">{log.channel || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}
