'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  UserPlus,
  MapPin,
  MessageSquare,
} from 'lucide-react'
import { cn, formatTimeAgo } from '@/lib/utils'
import { SkeletonCard } from '@/components/ui/skeleton'
import type { ActivityFeedItem } from '@/types'

const ICON_MAP: Record<ActivityFeedItem['type'], { icon: typeof DollarSign; color: string }> = {
  payment: { icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/10' },
  new_player: { icon: UserPlus, color: 'text-amber-400 bg-amber-500/10' },
  visit: { icon: MapPin, color: 'text-blue-400 bg-blue-500/10' },
  message: { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/10' },
}

function ActivityRow({ item }: { item: ActivityFeedItem }) {
  const config = ICON_MAP[item.type]
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#E8E4DD]/60 last:border-0">
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          config.color,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#1A1A2E] truncate">{item.title}</p>
        <p className="text-xs text-[#9CA3AF] truncate">{item.description}</p>
      </div>
      <span className="shrink-0 text-xs text-[#9CA3AF] whitespace-nowrap">
        {formatTimeAgo(item.timestamp)}
      </span>
    </div>
  )
}

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('/api/dashboard/activity')
        if (!res.ok) throw new Error('Failed to fetch activity')
        const json = await res.json()
        setItems(json.data)
      } catch {
        // Keep skeleton
      } finally {
        setLoading(false)
      }
    }
    fetchActivity()
  }, [])

  if (loading || !items) {
    return (
      <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
        <SkeletonCard lines={8} className="border-0 p-0" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#E8E4DD] bg-white p-5">
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-[#9CA3AF]">
        Today&apos;s Activity
      </h3>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#9CA3AF]">
          No activity recorded today.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto pr-1 scrollbar-thin">
          {items.slice(0, 15).map((item) => (
            <ActivityRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
