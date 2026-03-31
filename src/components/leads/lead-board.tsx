'use client'

import { useState, useEffect } from 'react'
import { LeadCard } from './lead-card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { LeadWithScore } from '@/types'

interface ColumnConfig {
  key: string
  label: string
  status: string
  description: string
  dotColor: string
}

const COLUMNS: ColumnConfig[] = [
  {
    key: 'new',
    label: 'New',
    status: 'NEW',
    description: 'First visit, no follow-up yet',
    dotColor: 'bg-blue-400',
  },
  {
    key: 'hot',
    label: 'Hot',
    status: 'HOT_LEAD',
    description: '2+ visits, high engagement',
    dotColor: 'bg-amber-400',
  },
  {
    key: 'cold',
    label: 'Cold',
    status: 'COLD_LEAD',
    description: 'Visited once, no response',
    dotColor: 'bg-zinc-400',
  },
  {
    key: 'converted',
    label: 'Converted',
    status: 'CONVERTED',
    description: 'Became a member',
    dotColor: 'bg-emerald-400',
  },
]

export function LeadBoard() {
  const [leads, setLeads] = useState<LeadWithScore[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchLeads() {
    try {
      const res = await fetch('/api/leads')
      if (!res.ok) throw new Error('Failed to fetch leads')
      const json = await res.json()
      setLeads(json.data || [])
    } catch {
      // Silently fail — board stays in skeleton
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  async function handleChangeStatus(playerId: string, newStatus: string) {
    // Optimistic update
    setLeads((prev) =>
      prev.map((lead) =>
        lead.player.id === playerId
          ? { ...lead, player: { ...lead.player, status: newStatus as typeof lead.player.status } }
          : lead
      )
    )

    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        // Rollback on failure
        fetchLeads()
      }
    } catch {
      fetchLeads()
    }
  }

  function handleSendMessage(playerId: string) {
    window.location.href = `/messages?playerId=${playerId}`
  }

  function getColumnLeads(status: string): LeadWithScore[] {
    return leads
      .filter((lead) => lead.player.status === status)
      .sort((a, b) => b.score - a.score)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="space-y-3">
            <div className="flex items-center gap-2 px-1 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-700 animate-pulse" />
              <div className="h-4 w-20 rounded bg-zinc-800 animate-pulse" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} lines={2} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const columnLeads = getColumnLeads(col.status)
        return (
          <div key={col.key} className="flex flex-col min-h-0">
            {/* Column header */}
            <div className="flex items-center justify-between px-1 py-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={cn('h-2.5 w-2.5 rounded-full', col.dotColor)} />
                <h3 className="text-sm font-semibold text-zinc-200">
                  {col.label}
                </h3>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-800 px-1.5 text-xs font-medium text-zinc-400">
                  {columnLeads.length}
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-600 px-1 mb-3">{col.description}</p>

            {/* Scrollable card area */}
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              {columnLeads.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-800 py-8 text-center">
                  <p className="text-xs text-zinc-600">No leads</p>
                </div>
              ) : (
                columnLeads.map((lead) => (
                  <LeadCard
                    key={lead.player.id}
                    lead={lead}
                    onChangeStatus={handleChangeStatus}
                    onSendMessage={handleSendMessage}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
