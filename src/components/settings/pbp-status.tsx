'use client'

import { useState, useEffect } from 'react'
import { cn, formatTimeAgo } from '@/lib/utils'
import { Webhook, ChevronDown } from 'lucide-react'

interface WebhookLog {
  id: string
  event: string
  status: string
  createdAt: string
  playerId: string | null
  error: string | null
  payload: unknown
}

export function PlayByPointStatus() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [expanded, setExpanded] = useState(false)
  const [selectedPayload, setSelectedPayload] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch('/api/automations/logs?type=&limit=1')  // dummy call to test auth
    // Actually fetch webhook events via a dedicated query
    fetch('/api/social/posts?limit=0') // ensure auth works
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/webhooks/playbypoint/status')
      if (res.ok) {
        const json = await res.json()
        setLogs(json.data?.events || [])
      }
    } catch { /* ignore */ }
  }

  const recentEvent = logs[0]
  const last24h = new Date(Date.now() - 86400000)
  const hasRecentActivity = recentEvent && new Date(recentEvent.createdAt) > last24h
  const processed7d = logs.filter(l => l.status === 'processed').length
  const failed7d = logs.filter(l => l.status === 'failed').length

  return (
    <div className="bg-white border border-[#E8E4DD] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-[#1A1A2E]">PlayByPoint Integration</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full', hasRecentActivity ? 'bg-emerald-500' : 'bg-amber-400')} />
          <span className="text-xs text-[#6B7280]">{hasRecentActivity ? 'Connected' : 'Waiting for events'}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-[#9CA3AF]">Last event</p>
          <p className="text-sm text-[#1A1A2E] font-medium">
            {recentEvent ? `${recentEvent.event} — ${formatTimeAgo(new Date(recentEvent.createdAt))}` : 'No events yet'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#9CA3AF]">Processed (7d)</p>
          <p className="text-sm text-emerald-600 font-medium">{processed7d}</p>
        </div>
        <div>
          <p className="text-xs text-[#9CA3AF]">Failed (7d)</p>
          <p className="text-sm text-red-500 font-medium">{failed7d}</p>
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700">
        <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
        {expanded ? 'Hide' : 'View'} Event Log
      </button>

      {expanded && (
        <div className="mt-3 border border-[#E8E4DD] rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E8E4DD] bg-[#F8F7F4]">
                <th className="text-left px-3 py-2 text-[#6B7280] font-medium">Time</th>
                <th className="text-left px-3 py-2 text-[#6B7280] font-medium">Event</th>
                <th className="text-left px-3 py-2 text-[#6B7280] font-medium">Status</th>
                <th className="text-left px-3 py-2 text-[#6B7280] font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-[#9CA3AF]">No webhook events yet</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-[#E8E4DD] hover:bg-[#F8F7F4]">
                  <td className="px-3 py-2 text-[#6B7280]">{formatTimeAgo(new Date(log.createdAt))}</td>
                  <td className="px-3 py-2 text-[#1A1A2E] font-medium">{log.event}</td>
                  <td className="px-3 py-2">
                    <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      log.status === 'processed' ? 'bg-emerald-50 text-emerald-700' :
                      log.status === 'failed' ? 'bg-red-50 text-red-600' :
                      log.status === 'duplicate' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-50 text-slate-600'
                    )}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => setSelectedPayload(selectedPayload?.toString() === JSON.stringify(log.payload) ? null : log.payload as Record<string, unknown>)} className="text-amber-600 hover:text-amber-700">
                      {selectedPayload?.toString() === JSON.stringify(log.payload) ? 'Hide' : 'Payload'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedPayload && (
            <pre className="px-3 py-2 text-[10px] bg-[#F8F7F4] border-t border-[#E8E4DD] overflow-x-auto max-h-[200px]">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
