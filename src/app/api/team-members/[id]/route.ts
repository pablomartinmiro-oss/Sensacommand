import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateMemberSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  role: z.enum(['GM', 'COACH', 'FRONT_DESK', 'MARKETING', 'OPERATIONS', 'FINANCE', 'PRO_SHOP']).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const member = await prisma.teamMember.findUnique({
      where: { id },
      include: {
        assignedGoals: {
          include: {
            assignees: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { assignedGoals: true } },
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    return NextResponse.json({ data: member })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateMemberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const member = await prisma.teamMember.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ data: member })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
