'use client'

import { Eye } from 'lucide-react'
import { cn, formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { MEMBERSHIP_LABELS } from '@/lib/constants'

const TIER_BADGE_VARIANT: Record<string, string> = {
  STANDARD: 'info',
  UNLIMITED: 'warning',
}

export interface EnrichedMember {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  membershipType: string
  membershipStartDate: string | null
  membershipEndDate: string | null
  monthlyRate: string | number | null
  visitsThisMonth: number
  avgVisitsPerMonth: number
  daysSinceLastVisit: number
  isChurnRisk: boolean
  isUpcomingRenewal: boolean
  visits: { date: string; id: string }[]
  _count: { visits: number }
}

export function ChurnRiskCard({ member }: { member: EnrichedMember }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-xs font-semibold text-red-400">
        {getInitials(member.firstName, member.lastName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {member.firstName} {member.lastName}
        </p>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <Badge variant={TIER_BADGE_VARIANT[member.membershipType] || 'default'}>
            {MEMBERSHIP_LABELS[member.membershipType]}
          </Badge>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {member.visitsThisMonth} this month
            <span className="text-zinc-600">(avg {member.avgVisitsPerMonth})</span>
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p
          className={cn(
            'text-xs font-medium',
            member.daysSinceLastVisit >= 14 ? 'text-red-400' : 'text-amber-400'
          )}
        >
          {member.daysSinceLastVisit === 999
            ? 'Never visited'
            : `${member.daysSinceLastVisit}d since last visit`}
        </p>
      </div>
    </div>
  )
}

export function RenewalCard({ member }: { member: EnrichedMember }) {
  const daysUntilRenewal = member.membershipEndDate
    ? Math.max(
        0,
        Math.floor(
          (new Date(member.membershipEndDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-semibold text-amber-400">
        {getInitials(member.firstName, member.lastName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {member.firstName} {member.lastName}
        </p>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <Badge variant={TIER_BADGE_VARIANT[member.membershipType] || 'default'}>
            {MEMBERSHIP_LABELS[member.membershipType]}
          </Badge>
          {member.monthlyRate && (
            <span>{formatCurrency(Number(member.monthlyRate))}/mo</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p
          className={cn(
            'text-xs font-medium',
            daysUntilRenewal <= 3 ? 'text-red-400' : 'text-amber-400'
          )}
        >
          {daysUntilRenewal === 0
            ? 'Renews today'
            : `${daysUntilRenewal}d until renewal`}
        </p>
        {member.membershipEndDate && (
          <p className="text-xs text-zinc-600">
            {formatDate(member.membershipEndDate)}
          </p>
        )}
      </div>
    </div>
  )
}
