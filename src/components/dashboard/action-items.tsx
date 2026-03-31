'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  PhoneForwarded,
  Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkeletonCard } from '@/components/ui/skeleton'
import type { ActionItem } from '@/types'

const TYPE_CONFIG: Record<
  ActionItem['type'],
  { icon: typeof TrendingUp; color: string; bg: string }
> = {
  upsell: {
    icon: TrendingUp,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  churn_risk: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
  follow_up: {
    icon: PhoneForwarded,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  revenue: {
    icon: Target,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
}

const PRIORITY_DOT: Record<ActionItem['priority'], string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-zinc-500',
}

function ActionRow({ item }: { item: ActionItem }) {
  const config = TYPE_CONFIG[item.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        config.bg,
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          config.color,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn('inline-block h-1.5 w-1.5 rounded-full', PRIORITY_DOT[item.priority])}
          />
          <p className="text-sm font-medium text-zinc-200">{item.title}</p>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">{item.description}</p>
        {item.playerName && (
          <p className="mt-1 text-xs font-medium text-zinc-400">
            {item.playerName}
          </p>
        )}
      </div>
    </div>
  )
}

export function ActionItems() {
  const [actions, setActions] = useState<ActionItem[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActions() {
      try {
        const res = await fetch('/api/dashboard/actions')
        if (!res.ok) throw new Error('Failed to fetch actions')
        const json = await res.json()
        setActions(json.data)
      } catch {
        // Keep skeleton
      } finally {
        setLoading(false)
      }
    }
    fetchActions()
  }, [])

  if (loading || !actions) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-[#0f0f15] p-5">
        <SkeletonCard lines={8} className="border-0 p-0" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f15] p-5">
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">
        Action Items
      </h3>
      {actions.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-600">
          Nothing to action right now. Nice.
        </p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {actions.map((item, idx) => (
            <ActionRow key={`${item.type}-${item.playerId ?? idx}`} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
