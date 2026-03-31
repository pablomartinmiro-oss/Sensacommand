'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'
import {
  LayoutDashboard,
  DollarSign,
  Users,
  Target,
  Crown,
  Grid3X3,
  Crosshair,
  UsersRound,
  Share2,
  MessageSquare,
  Bot,
  Workflow,
  ClipboardCheck,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  DollarSign,
  Users,
  Target,
  Crown,
  Grid3X3,
  Crosshair,
  UsersRound,
  Share2,
  MessageSquare,
  Bot,
  Workflow,
  ClipboardCheck,
  Upload,
  Settings,
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-brand-card border-r border-brand-border h-screen sticky top-0 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-brand-border">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-heading font-bold text-amber-500">
              Sensa
            </span>
            <span className="text-xl font-heading font-bold text-[#1A1A2E]">
              Command
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-brand-border text-brand-muted hover:text-[#1A1A2E] transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon]
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'text-brand-muted hover:text-[#1A1A2E] hover:bg-[#F0EFE9]'
              )}
            >
              {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
