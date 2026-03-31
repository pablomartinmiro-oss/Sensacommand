import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    const visits = await prisma.visit.findMany({
      where: {
        date: { gte: thirtyDaysAgo },
      },
      select: { date: true },
      orderBy: { date: 'asc' },
    })

    const countsByDate: Record<string, number> = {}

    for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0]
      countsByDate[key] = 0
    }

    for (const visit of visits) {
      const key = new Date(visit.date).toISOString().split('T')[0]
      if (countsByDate[key] !== undefined) {
        countsByDate[key]++
      }
    }

    const trend = Object.entries(countsByDate).map(([date, visits]) => ({
      date,
      visits,
    }))

    return NextResponse.json({ data: trend })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
