'use client'

import {
  MapPin,
  DollarSign,
  UserPlus,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickAction {
  label: string
  icon: typeof MapPin
  color: string
  onClick: () => void
}

const actions: QuickAction[] = [
  {
    label: 'Log Visit',
    icon: MapPin,
    color: 'hover:border-blue-500/40 hover:shadow-blue-500/10',
    onClick: () => alert('Log Visit modal coming soon'),
  },
  {
    label: 'Add Payment',
    icon: DollarSign,
    color: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10',
    onClick: () => alert('Add Payment modal coming soon'),
  },
  {
    label: 'New Player',
    icon: UserPlus,
    color: 'hover:border-amber-500/40 hover:shadow-amber-500/10',
    onClick: () => alert('New Player modal coming soon'),
  },
  {
    label: 'Import CSV',
    icon: Upload,
    color: 'hover:border-purple-500/40 hover:shadow-purple-500/10',
    onClick: () => alert('Import CSV modal coming soon'),
  },
]

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            onClick={action.onClick}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-[#0f0f15] px-4 py-2.5',
              'text-sm font-medium text-zinc-300 transition-all duration-200',
              'hover:text-white hover:shadow-lg',
              action.color,
            )}
          >
            <Icon className="h-4 w-4" />
            {action.label}
          </button>
        )
      })}
    </div>
  )
}
