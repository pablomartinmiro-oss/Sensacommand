import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

    const events = await prisma.webhookEvent.findMany({
      where: { source: 'playbypoint', createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, event: true, status: true, createdAt: true,
        playerId: true, error: true, payload: true,
      },
    })

    return NextResponse.json({ data: { events } })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
