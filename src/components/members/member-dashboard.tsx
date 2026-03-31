'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  Users,
  AlertTriangle,
  Crown,
  Calendar,
  TrendingDown,
} from 'lucide-react'
import { cn, formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { MEMBERSHIP_LABELS } from '@/lib/constants'
import { ChurnRiskCard, RenewalCard } from './member-cards'
import type { EnrichedMember } from './member-cards'

interface MemberStats {
  totalMrr: number
  standardMrr: number
  unlimitedMrr: number
  standardCount: number
  unlimitedCount: number
  totalCount: number
  churnRiskCount: number
  upcomingRenewals: EnrichedMember[]
}

interface MemberData {
  members: EnrichedMember[]
  stats: MemberStats
}

const TIER_BADGE_VARIANT: Record<string, string> = {
  STANDARD: 'info',
  UNLIMITED: 'warning',
}

export function MemberDashboard() {
  const [data, setData] = useState<MemberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState('ALL')

  useEffect(() => {
    async function fetchMembers() {
      try {
        const url =
          tierFilter === 'ALL'
            ? '/api/members'
            : `/api/members?tier=${tierFilter}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch members')
        const json = await res.json()
        setData(json.data)
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchMembers()
  }, [tierFilter])

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
        <SkeletonTable rows={5} columns={6} />
      </div>
    )
  }

  const { members, stats } = data
  const churnRiskMembers = members.filter((m) => m.isChurnRisk)
  const upcomingRenewals = stats.upcomingRenewals

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(stats.totalMrr)}
          icon={<DollarSign className="h-5 w-5" />}
          changeLabel={`${formatCurrency(stats.unlimitedMrr)} unlimited + ${formatCurrency(stats.standardMrr)} standard`}
        />
        <StatCard
          title="Total Members"
          value={stats.totalCount}
          icon={<Users className="h-5 w-5" />}
          changeLabel={`${stats.unlimitedCount} unlimited, ${stats.standardCount} standard`}
        />
        <StatCard
          title="Churn Risk"
          value={stats.churnRiskCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          changeLabel="Members with declining visits"
        />
      </div>

      {/* Middle section: Churn Risk + Upcoming Renewals */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Churn Risk List */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f0f15] p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Churn Risk</h3>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500/20 px-1.5 text-xs font-medium text-red-400">
              {churnRiskMembers.length}
            </span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {churnRiskMembers.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">
                No members at risk of churning
              </p>
            ) : (
              churnRiskMembers.map((member) => (
                <ChurnRiskCard key={member.id} member={member} />
              ))
            )}
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="rounded-xl border border-zinc-800 bg-[#0f0f15] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-200">
              Upcoming Renewals
            </h3>
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-xs font-medium text-amber-400">
              {upcomingRenewals.length}
            </span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {upcomingRenewals.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-6">
                No renewals in the next 14 days
              </p>
            ) : (
              upcomingRenewals.map((member) => (
                <RenewalCard key={member.id} member={member} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Member Table */}
      <div className="rounded-xl border border-zinc-800 bg-[#0f0f15] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-200">All Members</h3>
          </div>
          <div className="flex gap-1.5">
            {['ALL', 'STANDARD', 'UNLIMITED'].map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  setLoading(true)
                  setTierFilter(tier)
                }}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  tierFilter === tier
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                )}
              >
                {tier === 'ALL' ? 'All' : MEMBERSHIP_LABELS[tier]}
              </button>
            ))}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Monthly Rate</TableHead>
              <TableHead>Member Since</TableHead>
              <TableHead>Visits (30d)</TableHead>
              <TableHead>Last Visit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-zinc-600">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <MemberTableRow key={member.id} member={member} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function MemberTableRow({ member }: { member: EnrichedMember }) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-zinc-800/60"
      onClick={() => {
        window.location.href = `/players/${member.id}`
      }}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-amber-400">
            {getInitials(member.firstName, member.lastName)}
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100">
              {member.firstName} {member.lastName}
            </p>
            <p className="text-xs text-zinc-500">
              {member.email || member.phone || ''}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={TIER_BADGE_VARIANT[member.membershipType] || 'default'}>
          {MEMBERSHIP_LABELS[member.membershipType] || member.membershipType}
        </Badge>
      </TableCell>
      <TableCell>
        {member.monthlyRate
          ? formatCurrency(Number(member.monthlyRate))
          : '--'}
      </TableCell>
      <TableCell>
        {member.membershipStartDate
          ? formatDate(member.membershipStartDate)
          : '--'}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            'text-sm',
            member.isChurnRisk ? 'text-red-400' : 'text-zinc-300'
          )}
        >
          {member.visitsThisMonth}
        </span>
        <span className="text-xs text-zinc-600 ml-1">
          (avg {member.avgVisitsPerMonth})
        </span>
      </TableCell>
      <TableCell>
        {member.daysSinceLastVisit === 999 ? (
          <span className="text-zinc-600">Never</span>
        ) : member.daysSinceLastVisit === 0 ? (
          <span className="text-emerald-400">Today</span>
        ) : (
          <span
            className={cn(
              member.daysSinceLastVisit >= 14
                ? 'text-red-400'
                : member.daysSinceLastVisit >= 7
                  ? 'text-amber-400'
                  : 'text-zinc-300'
            )}
          >
            {member.daysSinceLastVisit}d ago
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}
