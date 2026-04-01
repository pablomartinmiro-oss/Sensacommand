'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Palmtree } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface LeaveReq { id: string; teamMember: { firstName: string; lastName: string }; startDate: string; endDate: string; days: number; type: string; status: string; reason: string | null }

export function LeaveSummary() {
  const [requests, setRequests] = useState<LeaveReq[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leave')
      .then(r => r.json())
      .then(json => setRequests(json.data || []))
      .finally(() => setLoading(false))
  }, [])

  const pending = requests.filter(r => r.status === 'PENDING')
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 86400000)
  const offThisWeek = requests.filter(r => r.status === 'APPROVED' && new Date(r.startDate) <= nextWeek && new Date(r.endDate) >= now)

  // Don't show if nothing relevant
  if (!loading && pending.length === 0 && offThisWeek.length === 0) return null

  if (loading) return null

  return (
    <div className="flex items-center gap-2 text-sm">
      <Palmtree className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      <span className="text-[#6B7280]">
        {pending.length > 0 && `${pending.length} pending request${pending.length !== 1 ? 's' : ''}`}
        {pending.length > 0 && offThisWeek.length > 0 && ' · '}
        {offThisWeek.length > 0 && offThisWeek.map(r => `${r.teamMember.firstName} off ${formatDate(new Date(r.startDate))}–${formatDate(new Date(r.endDate))}`).join(', ')}
      </span>
      <Link href="/leave" className="text-amber-600 text-xs hover:text-amber-700 ml-1">View →</Link>
    </div>
  )
}
