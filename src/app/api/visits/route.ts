import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createVisitSchema = z.object({
  playerId: z.string().min(1, 'Player ID is required'),
  courtNumber: z.number().int().min(1).max(6),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  type: z.enum(['CASUAL', 'MEMBER_SESSION', 'LESSON', 'TOURNAMENT', 'PRIVATE_EVENT']).default('CASUAL'),
  amountPaid: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const playerId = searchParams.get('playerId')
    const courtNumber = searchParams.get('courtNumber')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (playerId) where.playerId = playerId
    if (courtNumber) where.courtNumber = parseInt(courtNumber)
    if (type) where.type = type
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate)
    }

    const [visits, total] = await Promise.all([
      prisma.visit.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          player: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.visit.count({ where }),
    ])

    return NextResponse.json({
      data: visits,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = createVisitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    const player = await prisma.player.findUnique({ where: { id: data.playerId } })
    if (!player) {
      return NextResponse.json(
        { error: 'Not found', message: 'Player not found' },
        { status: 404 }
      )
    }

    const visit = await prisma.visit.create({
      data: {
        playerId: data.playerId,
        courtNumber: data.courtNumber,
        date: new Date(data.date),
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        type: data.type,
        amountPaid: data.amountPaid,
        notes: data.notes ?? undefined,
      },
      include: {
        player: { select: { firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ data: visit }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
