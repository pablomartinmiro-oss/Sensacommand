import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/layout/providers'
import { AppShell } from '@/components/layout/app-shell'

export const metadata: Metadata = {
  title: 'Sensa Command — GM Dashboard',
  description: 'Command Center for Sensa Padel, Nashville TN',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F8F7F4] text-[#1A1A2E]">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
