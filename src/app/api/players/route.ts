import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPlayerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsappPhone: z.string().optional().nullable(),
  source: z.enum(['WALK_IN', 'REFERRAL', 'SOCIAL_MEDIA', 'WEBSITE', 'PLAYBYPOINT', 'OTHER']).default('OTHER'),
  status: z.enum(['NEW', 'ACTIVE', 'HOT_LEAD', 'COLD_LEAD', 'CONVERTED', 'CHURNED']).default('NEW'),
  membershipType: z.enum(['NONE', 'STANDARD', 'UNLIMITED']).default('NONE'),
  membershipStartDate: z.string().datetime().optional().nullable(),
  membershipEndDate: z.string().datetime().optional().nullable(),
  monthlyRate: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const membershipType = searchParams.get('membershipType')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'createdAt'
    const order = searchParams.get('order') || 'desc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (membershipType) {
      where.membershipType = membershipType
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    const validSortFields = ['createdAt', 'firstName', 'lastName', 'status', 'membershipType']
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt'
    const sortOrder = order === 'asc' ? 'asc' : 'desc'

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limit,
        include: {
          _count: { select: { visits: true, payments: true, messages: true } },
          visits: {
            orderBy: { date: 'desc' },
            take: 1,
            select: { date: true },
          },
          payments: {
            select: { amount: true },
          },
        },
      }),
      prisma.player.count({ where }),
    ])

    return NextResponse.json({
      data: players,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
    const parsed = createPlayerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data
    const player = await prisma.player.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        whatsappPhone: data.whatsappPhone ?? undefined,
        source: data.source,
        status: data.status,
        membershipType: data.membershipType,
        membershipStartDate: data.membershipStartDate ? new Date(data.membershipStartDate) : undefined,
        membershipEndDate: data.membershipEndDate ? new Date(data.membershipEndDate) : undefined,
        monthlyRate: data.monthlyRate ?? undefined,
        notes: data.notes ?? undefined,
        tags: data.tags,
      },
    })

    return NextResponse.json({ data: player }, { status: 201 })
  } catch (e) {
    const message = (e as Error).message
    if (message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Duplicate entry', message: 'A player with this email already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    )
  }
}
