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
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0a0a0f] text-gray-100">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
