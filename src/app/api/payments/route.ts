import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPaymentSchema = z.object({
  playerId: z.string().optional().nullable(),
  date: z.string().min(1, 'Date is required'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['COURT_RENTAL', 'MEMBERSHIP', 'LESSON', 'PRO_SHOP', 'EVENT', 'OTHER']),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'PLAYBYPOINT']).default('CARD'),
  description: z.string().optional().nullable(),
  receiptRef: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const playerId = searchParams.get('playerId')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (playerId) where.playerId = playerId
    if (type) where.type = type
    if (startDate || endDate) {
      where.date = {}
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate)
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate)
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          player: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.payment.count({ where }),
    ])

    return NextResponse.json({
      data: payments,
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
    const parsed = createPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    if (data.playerId) {
      const player = await prisma.player.findUnique({ where: { id: data.playerId } })
      if (!player) {
        return NextResponse.json(
          { error: 'Not found', message: 'Player not found' },
          { status: 404 }
        )
      }
    }

    const payment = await prisma.payment.create({
      data: {
        playerId: data.playerId ?? undefined,
        date: new Date(data.date),
        amount: data.amount,
        type: data.type,
        method: data.method,
        description: data.description ?? undefined,
        receiptRef: data.receiptRef ?? undefined,
      },
      include: {
        player: { select: { firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ data: payment }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
