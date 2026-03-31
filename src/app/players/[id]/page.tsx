'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { PlayerStats } from '@/components/players/player-stats'
import { PlayerDetail } from '@/components/players/player-detail'
import { PlayerForm } from '@/components/players/player-form'
import { SkeletonCard } from '@/components/ui/skeleton'
import {
  STATUS_COLORS,
  STATUS_LABELS,
  MEMBERSHIP_COLORS,
  MEMBERSHIP_LABELS,
} from '@/lib/constants'
import type { PlayerWithRelations } from '@/types'

export default function PlayerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const playerId = params.id as string

  const [player, setPlayer] = useState<PlayerWithRelations | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const fetchPlayer = useCallback(async () => {
    try {
      const res = await fetch(`/api/players/${playerId}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/players')
          return
        }
        throw new Error('Failed to fetch')
      }
      const json = await res.json()
      setPlayer(json.data)
    } catch {
      // stay on loading state
    } finally {
      setLoading(false)
    }
  }, [playerId, router])

  useEffect(() => {
    fetchPlayer()
  }, [fetchPlayer])

  if (loading || !player) {
    return (
      <>
        <Header title="Loading..." />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} lines={1} />
            ))}
          </div>
          <SkeletonCard lines={8} />
        </main>
      </>
    )
  }

  const playerName = `${player.firstName} ${player.lastName}`

  return (
    <>
      <Header
        title={playerName}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/players')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        {/* Player info badges */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
              STATUS_COLORS[player.status] || 'bg-zinc-500/20 text-[#6B7280] border-zinc-500/30'
            )}
          >
            {STATUS_LABELS[player.status] || player.status}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
              MEMBERSHIP_COLORS[player.membershipType] || 'bg-zinc-500/20 text-[#6B7280] border-zinc-500/30'
            )}
          >
            {MEMBERSHIP_LABELS[player.membershipType] || player.membershipType}
          </span>
          {player.email && (
            <span className="text-xs text-[#9CA3AF]">{player.email}</span>
          )}
          {player.phone && (
            <span className="text-xs text-[#9CA3AF]">{player.phone}</span>
          )}
        </div>

        {/* Stats Row */}
        <PlayerStats player={player} />

        {/* Detail Tabs */}
        <PlayerDetail player={player} onUpdate={fetchPlayer} />
      </main>

      <PlayerForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        player={player}
        onSaved={() => {
          fetchPlayer()
          setEditOpen(false)
        }}
      />
    </>
  )
}
