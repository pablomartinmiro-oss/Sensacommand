import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED', 'CANCELLED']).optional(),
  notes: z.string().optional().nullable(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation error' }, { status: 400 })

    const existing = await prisma.leaveRequest.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes

    if (parsed.data.status) {
      data.status = parsed.data.status
      if (parsed.data.status === 'APPROVED') {
        data.approvedBy = 'Pablo Martin'
        data.approvedAt = new Date()
        // Increment used days
        await prisma.leaveAllowance.updateMany({
          where: { teamMemberId: existing.teamMemberId, year: new Date().getFullYear() },
          data: { usedDays: { increment: existing.days } },
        })
      }
      if (parsed.data.status === 'CANCELLED' && existing.status === 'APPROVED') {
        // Decrement used days
        await prisma.leaveAllowance.updateMany({
          where: { teamMemberId: existing.teamMemberId, year: new Date().getFullYear() },
          data: { usedDays: { decrement: existing.days } },
        })
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data,
      include: { teamMember: { select: { firstName: true, lastName: true } } },
    })

    return NextResponse.json({ data: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
