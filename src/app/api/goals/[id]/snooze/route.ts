import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const snoozeSchema = z.object({
  days: z.number().optional(),
  date: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await request.json()
    const parsed = snoozeSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation error' }, { status: 400 })

    const goal = await prisma.goal.findUnique({ where: { id } })
    if (!goal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

    const oldDate = goal.dueDate?.toISOString() || 'none'
    let newDate: Date

    if (parsed.data.date) {
      newDate = new Date(parsed.data.date)
    } else {
      const days = parsed.data.days || 3
      newDate = new Date(Date.now() + days * 86400000)
    }

    await prisma.$transaction([
      prisma.goal.update({ where: { id }, data: { dueDate: newDate } }),
      prisma.goalActivity.create({
        data: { goalId: id, action: 'SNOOZED', fromValue: oldDate, toValue: newDate.toISOString(), performedBy: 'Pablo' },
      }),
    ])

    return NextResponse.json({ data: { success: true, newDueDate: newDate } })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
