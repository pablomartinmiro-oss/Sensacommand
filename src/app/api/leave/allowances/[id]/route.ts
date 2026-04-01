import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  totalDays: z.number().min(0).optional(),
  usedDays: z.number().min(0).optional(),
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

    const updated = await prisma.leaveAllowance.update({ where: { id }, data: parsed.data })
    return NextResponse.json({ data: updated })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
