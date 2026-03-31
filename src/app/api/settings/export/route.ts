import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [players, visits, payments, messages, templates, settings, dailyRevenue] =
      await Promise.all([
        prisma.player.findMany({ orderBy: { createdAt: 'desc' } }),
        prisma.visit.findMany({ orderBy: { date: 'desc' } }),
        prisma.payment.findMany({ orderBy: { date: 'desc' } }),
        prisma.message.findMany({ orderBy: { createdAt: 'desc' } }),
        prisma.messageTemplate.findMany(),
        prisma.setting.findMany(),
        prisma.dailyRevenue.findMany({ orderBy: { date: 'desc' } }),
      ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      players,
      visits,
      payments,
      messages,
      templates,
      settings,
      dailyRevenue,
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="sensa-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 },
    )
  }
}
