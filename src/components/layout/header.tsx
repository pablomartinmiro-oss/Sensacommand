'use client'

import { signOut } from 'next-auth/react'
import { LogOut, Menu } from 'lucide-react'

interface HeaderProps {
  title: string
  action?: React.ReactNode
  onMenuToggle?: () => void
}

export function Header({ title, action, onMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-brand-dark/80 backdrop-blur-lg border-b border-brand-border">
      <div className="flex items-center justify-between h-14 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg hover:bg-brand-border text-brand-muted hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-heading font-semibold text-white">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {action}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-2 rounded-lg hover:bg-brand-border text-brand-muted hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
