import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  role: z.enum(['GM', 'COACH', 'FRONT_DESK', 'MARKETING', 'OPERATIONS', 'FINANCE', 'PRO_SHOP']),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const members = await prisma.teamMember.findMany({
      where: { isActive: true },
      orderBy: { firstName: 'asc' },
      include: {
        _count: { select: { assignedGoals: true } },
        assignedGoals: { select: { status: true } },
      },
    })

    return NextResponse.json({ data: members })
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
    const parsed = createMemberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const member = await prisma.teamMember.create({
      data: parsed.data,
    })

    return NextResponse.json({ data: member }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
