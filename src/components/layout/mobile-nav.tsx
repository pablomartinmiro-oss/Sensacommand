'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Bot,
  MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import { NAV_ITEMS } from '@/lib/constants'
import {
  Target,
  Crown,
  Grid3X3,
  MessageSquare,
  Upload,
  Settings,
} from 'lucide-react'

const BOTTOM_TABS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Players', href: '/players', icon: Users },
  { label: 'Revenue', href: '/revenue', icon: DollarSign },
  { label: 'AI', href: '/ai', icon: Bot },
  { label: 'More', href: '#more', icon: MoreHorizontal },
]

const MORE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Crown,
  Grid3X3,
  MessageSquare,
  Upload,
  Settings,
}

const MORE_ITEMS = NAV_ITEMS.filter(
  (item) => !['/', '/players', '/revenue', '/ai'].includes(item.href)
)

export function MobileNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          <div className="absolute bottom-16 left-0 right-0 bg-brand-card border-t border-brand-border rounded-t-2xl p-4">
            <div className="grid grid-cols-3 gap-3">
              {MORE_ITEMS.map((item) => {
                const Icon = MORE_ICONS[item.icon]
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs transition-colors',
                      isActive
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'text-brand-muted hover:text-white hover:bg-brand-border/50'
                    )}
                  >
                    {Icon && <Icon className="w-5 h-5" />}
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-card border-t border-brand-border">
        <div className="flex items-center justify-around h-16">
          {BOTTOM_TABS.map((tab) => {
            const isMore = tab.href === '#more'
            const isActive = isMore
              ? showMore
              : tab.href === '/'
              ? pathname === '/'
              : pathname.startsWith(tab.href)

            return (
              <button
                key={tab.href}
                onClick={() => {
                  if (isMore) {
                    setShowMore(!showMore)
                  } else {
                    setShowMore(false)
                    window.location.href = tab.href
                  }
                }}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'text-amber-500'
                    : 'text-brand-muted'
                )}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
