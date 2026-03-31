'use client'

import { MessageSquare, ArrowRight, Eye } from 'lucide-react'
import { cn, formatDate, getInitials } from '@/lib/utils'
import type { LeadWithScore } from '@/types'

interface LeadCardProps {
  lead: LeadWithScore
  onChangeStatus: (playerId: string, newStatus: string) => void
  onSendMessage: (playerId: string) => void
}

function getScoreColor(score: number): string {
  if (score >= 60) return 'bg-emerald-500'
  if (score >= 30) return 'bg-amber-500'
  return 'bg-red-500'
}

function getScoreTrackColor(score: number): string {
  if (score >= 60) return 'bg-emerald-500/20'
  if (score >= 30) return 'bg-amber-500/20'
  return 'bg-red-500/20'
}

function getScoreTextColor(score: number): string {
  if (score >= 60) return 'text-emerald-400'
  if (score >= 30) return 'text-amber-400'
  return 'text-red-400'
}

export function LeadCard({ lead, onChangeStatus, onSendMessage }: LeadCardProps) {
  const { player, score } = lead
  const visitCount = player._count.visits
  const lastVisit =
    player.visits.length > 0 ? new Date(player.visits[0].date) : null
  const daysSinceLastVisit = lastVisit
    ? Math.floor(
        (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)
      )
    : null

  const nextStatuses: Record<string, { label: string; value: string }[]> = {
    NEW: [
      { label: 'Mark Hot', value: 'HOT_LEAD' },
      { label: 'Mark Cold', value: 'COLD_LEAD' },
    ],
    HOT_LEAD: [
      { label: 'Converted', value: 'CONVERTED' },
      { label: 'Mark Cold', value: 'COLD_LEAD' },
    ],
    COLD_LEAD: [
      { label: 'Mark Hot', value: 'HOT_LEAD' },
      { label: 'Converted', value: 'CONVERTED' },
    ],
    CONVERTED: [],
  }

  const statusActions = nextStatuses[player.status] || []

  return (
    <div className="rounded-lg border border-[#E8E4DD] bg-white p-3 space-y-3 hover:border-[#D1D5DB] transition-colors cursor-grab active:cursor-grabbing">
      {/* Header: Avatar + Name */}
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0EFE9] text-xs font-semibold text-amber-400">
          {getInitials(player.firstName, player.lastName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#1A1A2E] truncate">
            {player.firstName} {player.lastName}
          </p>
          <p className="text-xs text-[#9CA3AF]">
            {player.email || player.phone || 'No contact info'}
          </p>
        </div>
      </div>

      {/* Visit info */}
      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {visitCount} visit{visitCount !== 1 ? 's' : ''}
        </span>
        {lastVisit && (
          <span>
            {daysSinceLastVisit === 0
              ? 'Today'
              : daysSinceLastVisit === 1
                ? 'Yesterday'
                : `${daysSinceLastVisit}d ago`}
          </span>
        )}
      </div>

      {/* Last visit date */}
      {lastVisit && (
        <p className="text-xs text-[#9CA3AF]">
          Last visit: {formatDate(lastVisit)}
        </p>
      )}

      {/* Score bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#9CA3AF]">Score</span>
          <span className={cn('text-xs font-semibold', getScoreTextColor(score))}>
            {score}
          </span>
        </div>
        <div className={cn('h-1.5 w-full rounded-full', getScoreTrackColor(score))}>
          <div
            className={cn('h-full rounded-full transition-all duration-500', getScoreColor(score))}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={() => onSendMessage(player.id)}
          className="flex items-center gap-1 rounded-md bg-[#F0EFE9] px-2 py-1 text-xs text-[#374151] hover:bg-[#E8E4DD] hover:text-[#1A1A2E] transition-colors"
          title="Send message"
        >
          <MessageSquare className="h-3 w-3" />
          Message
        </button>
        {statusActions.map((action) => (
          <button
            key={action.value}
            onClick={() => onChangeStatus(player.id, action.value)}
            className="flex items-center gap-1 rounded-md bg-[#F0EFE9] px-2 py-1 text-xs text-[#374151] hover:bg-amber-500/20 hover:text-amber-400 transition-colors"
          >
            <ArrowRight className="h-3 w-3" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
