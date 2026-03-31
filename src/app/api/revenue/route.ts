import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    const days = searchParams.get('days')

    // Single date lookup for form pre-fill
    if (dateParam) {
      const targetDate = new Date(dateParam + 'T00:00:00.000Z')
      const record = await prisma.dailyRevenue.findUnique({
        where: { date: targetDate },
      })
      return NextResponse.json({ data: record })
    }

    // Range lookup for history table
    const dayCount = days ? parseInt(days, 10) : 30
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - dayCount)
    startDate.setHours(0, 0, 0, 0)

    const records = await prisma.dailyRevenue.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json({ data: records })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      date,
      courtRentals = 0,
      memberships = 0,
      lessons = 0,
      proShop = 0,
      events = 0,
      other = 0,
    } = body

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const targetDate = new Date(date + 'T00:00:00.000Z')
    const totalRevenue =
      Number(courtRentals) +
      Number(memberships) +
      Number(lessons) +
      Number(proShop) +
      Number(events) +
      Number(other)

    const record = await prisma.dailyRevenue.upsert({
      where: { date: targetDate },
      update: {
        courtRentals,
        memberships,
        lessons,
        proShop,
        events,
        other,
        totalRevenue,
      },
      create: {
        date: targetDate,
        courtRentals,
        memberships,
        lessons,
        proShop,
        events,
        other,
        totalRevenue,
      },
    })

    return NextResponse.json({ data: record })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
