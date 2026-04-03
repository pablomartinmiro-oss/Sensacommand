'use client'

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { SensaBrain } from '@/components/ai/sensa-brain'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const isLoginPage = pathname === '/login'

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoginPage) {
      router.push('/login')
    }
  }, [status, isLoginPage, router])

  if (isLoginPage) {
    return <>{children}</>
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
        <div className="text-amber-500 text-lg font-heading">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-[#F8F7F4]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen pb-16 lg:pb-0">
        {children}
      </div>
      <MobileNav />
      <SensaBrain />
    </div>
  )
}

