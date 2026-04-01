import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  teamMemberId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().min(1),
  type: z.string().default('PTO'),
  reason: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const teamMemberId = searchParams.get('teamMemberId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (teamMemberId) where.teamMemberId = teamMemberId

    const requests = await prisma.leaveRequest.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: { teamMember: { select: { id: true, firstName: true, lastName: true, role: true } } },
    })

    return NextResponse.json({ data: requests })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') }, { status: 400 })

    const data = parsed.data

    // Check if Pablo (GM) — auto-approve his own requests
    const member = await prisma.teamMember.findUnique({ where: { id: data.teamMemberId } })
    const isGM = member?.role === 'GM'

    const req = await prisma.leaveRequest.create({
      data: {
        teamMemberId: data.teamMemberId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        days: data.days,
        type: data.type,
        reason: data.reason,
        status: isGM ? 'APPROVED' : 'PENDING',
        approvedBy: isGM ? `${member.firstName} ${member.lastName}` : null,
        approvedAt: isGM ? new Date() : null,
      },
      include: { teamMember: { select: { firstName: true, lastName: true } } },
    })

    // Update used days if approved
    if (isGM) {
      await prisma.leaveAllowance.updateMany({
        where: { teamMemberId: data.teamMemberId, year: new Date().getFullYear() },
        data: { usedDays: { increment: data.days } },
      })
    }

    return NextResponse.json({ data: req }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
