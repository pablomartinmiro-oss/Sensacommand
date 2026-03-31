import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const delegateSchema = z.object({
  teamMemberId: z.string().min(1),
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
    const parsed = delegateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation error' }, { status: 400 })

    const member = await prisma.teamMember.findUnique({ where: { id: parsed.data.teamMemberId } })
    if (!member) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })

    await prisma.$transaction([
      prisma.goal.update({
        where: { id },
        data: { assignees: { connect: { id: parsed.data.teamMemberId } } },
      }),
      prisma.goalActivity.create({
        data: { goalId: id, action: 'ASSIGNEE_ADDED', toValue: `${member.firstName} ${member.lastName}`, performedBy: 'Pablo' },
      }),
    ])

    return NextResponse.json({ data: { success: true } })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
