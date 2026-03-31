import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePlayerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsappPhone: z.string().optional().nullable(),
  source: z.enum(['WALK_IN', 'REFERRAL', 'SOCIAL_MEDIA', 'WEBSITE', 'PLAYBYPOINT', 'OTHER']).optional(),
  status: z.enum(['NEW', 'ACTIVE', 'HOT_LEAD', 'COLD_LEAD', 'CONVERTED', 'CHURNED']).optional(),
  membershipType: z.enum(['NONE', 'STANDARD', 'UNLIMITED']).optional(),
  membershipStartDate: z.string().datetime().optional().nullable(),
  membershipEndDate: z.string().datetime().optional().nullable(),
  monthlyRate: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const player = await prisma.player.findUnique({
      where: { id: params.id },
      include: {
        visits: {
          orderBy: { date: 'desc' },
        },
        payments: {
          orderBy: { date: 'desc' },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { visits: true, payments: true, messages: true },
        },
      },
    })

    if (!player) {
      return NextResponse.json({ error: 'Not found', message: 'Player not found' }, { status: 404 })
    }

    return NextResponse.json({ data: player })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.player.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found', message: 'Player not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = updatePlayerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data
    const updateData: Record<string, unknown> = {}

    if (data.firstName !== undefined) updateData.firstName = data.firstName
    if (data.lastName !== undefined) updateData.lastName = data.lastName
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.whatsappPhone !== undefined) updateData.whatsappPhone = data.whatsappPhone
    if (data.source !== undefined) updateData.source = data.source
    if (data.status !== undefined) updateData.status = data.status
    if (data.membershipType !== undefined) updateData.membershipType = data.membershipType
    if (data.membershipStartDate !== undefined) {
      updateData.membershipStartDate = data.membershipStartDate ? new Date(data.membershipStartDate) : null
    }
    if (data.membershipEndDate !== undefined) {
      updateData.membershipEndDate = data.membershipEndDate ? new Date(data.membershipEndDate) : null
    }
    if (data.monthlyRate !== undefined) updateData.monthlyRate = data.monthlyRate
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.tags !== undefined) updateData.tags = data.tags

    const player = await prisma.player.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ data: player })
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const existing = await prisma.player.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found', message: 'Player not found' }, { status: 404 })
    }

    await prisma.player.delete({ where: { id: params.id } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
