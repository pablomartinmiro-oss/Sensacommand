'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SkeletonTable } from '@/components/ui/skeleton'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  MEMBERSHIP_COLORS,
  MEMBERSHIP_LABELS,
} from '@/lib/constants'
import type { PlayerListItem } from '@/types'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'HOT_LEAD', label: 'Hot Lead' },
  { value: 'COLD_LEAD', label: 'Cold Lead' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'CHURNED', label: 'Churned' },
]

const MEMBERSHIP_OPTIONS = [
  { value: '', label: 'All Memberships' },
  { value: 'NONE', label: 'Non-Member' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'UNLIMITED', label: 'Unlimited' },
]

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PlayerTableProps {
  refreshKey?: number
}

export function PlayerTable({ refreshKey }: PlayerTableProps) {
  const router = useRouter()
  const [players, setPlayers] = useState<PlayerListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [membershipFilter, setMembershipFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (membershipFilter) params.set('membershipType', membershipFilter)
      params.set('page', String(page))
      params.set('limit', '20')
      params.set('sort', 'lastVisitDate')
      params.set('order', 'desc')

      const res = await fetch(`/api/players?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setPlayers(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, membershipFilter, page])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers, refreshKey])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, membershipFilter])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const getLifetimeRevenue = (player: PlayerListItem): number => {
    return player.payments?.reduce(
      (sum: number, p: { amount: string | number }) => sum + Number(p.amount),
      0
    ) ?? 0
  }

  const getLastVisit = (player: PlayerListItem): string => {
    // Use stored lastVisitDate from PBP, fall back to visits array
    const p = player as PlayerListItem & { lastVisitDate?: Date | string | null }
    if (p.lastVisitDate) return formatDate(p.lastVisitDate)
    if (player.visits?.length > 0) return formatDate(player.visits[0].date)
    return 'Never'
  }

  const getVisitCount = (player: PlayerListItem): number => {
    // Use stored totalVisits from PBP, fall back to _count
    const p = player as PlayerListItem & { totalVisits?: number }
    return p.totalVisits ?? player._count?.visits ?? 0
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search players..."
            className={cn(
              'h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm text-[#1A1A2E]',
              'placeholder:text-[#9CA3AF]',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white',
              'border-[#D1D5DB] focus:ring-amber-500/50 focus:border-amber-500/60'
            )}
          />
        </div>
        <div className="flex gap-3">
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          />
          <Select
            options={MEMBERSHIP_OPTIONS}
            value={membershipFilter}
            onChange={(e) => setMembershipFilter(e.target.value)}
            className="w-44"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Membership</TableHead>
              <TableHead className="text-right">Visits</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead className="text-right">Lifetime Revenue</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-[#9CA3AF] py-8">
                  No players found
                </TableCell>
              </TableRow>
            )}
            {players.map((player) => (
              <TableRow
                key={player.id}
                className="cursor-pointer"
                onClick={() => router.push(`/players/${player.id}`)}
              >
                <TableCell className="font-medium text-[#1A1A2E]">
                  {player.firstName} {player.lastName}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      STATUS_COLORS[player.status] || 'bg-zinc-500/20 text-[#6B7280] border-zinc-500/30'
                    )}
                  >
                    {STATUS_LABELS[player.status] || player.status}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                      MEMBERSHIP_COLORS[player.membershipType] || 'bg-zinc-500/20 text-[#6B7280] border-zinc-500/30'
                    )}
                  >
                    {MEMBERSHIP_LABELS[player.membershipType] || player.membershipType}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {getVisitCount(player)}
                </TableCell>
                <TableCell className="text-[#6B7280]">
                  {getLastVisit(player)}
                </TableCell>
                <TableCell className="text-right font-medium text-[#1A1A2E]">
                  {formatCurrency(getLifetimeRevenue(player))}
                </TableCell>
                <TableCell className="text-[#6B7280]">
                  {player.phone || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-[#9CA3AF]">
            Showing {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} players
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm text-[#6B7280]">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
