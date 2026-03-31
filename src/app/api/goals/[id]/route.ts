import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING']).optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']).optional(),
  categories: z.array(z.string()).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  linkedPlayerIds: z.array(z.string()).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const goal = await prisma.goal.findUnique({
      where: { id },
      include: {
        assignees: true,
        comments: {
          include: { author: true },
          orderBy: { createdAt: 'desc' },
        },
        linkedPlayers: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    return NextResponse.json({ data: goal })
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
    const parsed = updateGoalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Fetch old goal for activity logging
    const oldGoal = await prisma.goal.findUnique({ where: { id } })
    if (!oldGoal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

    const updateData: Record<string, unknown> = {}
    const activities: { action: string; fromValue?: string; toValue?: string }[] = []

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.status !== undefined) {
      if (data.status !== oldGoal.status) {
        activities.push({ action: 'STATUS_CHANGED', fromValue: oldGoal.status, toValue: data.status })
      }
      updateData.status = data.status
      if (data.status === 'DONE') updateData.completedDate = new Date()
      else updateData.completedDate = null
    }
    if (data.priority !== undefined) {
      if (data.priority !== oldGoal.priority) {
        activities.push({ action: 'PRIORITY_CHANGED', fromValue: oldGoal.priority, toValue: data.priority })
      }
      updateData.priority = data.priority
    }
    if (data.categories !== undefined) updateData.categories = data.categories
    if (data.dueDate !== undefined) {
      const newDue = data.dueDate ? new Date(data.dueDate).toISOString() : null
      const oldDue = oldGoal.dueDate?.toISOString() || null
      if (newDue !== oldDue) {
        activities.push({ action: 'DUE_DATE_CHANGED', fromValue: oldDue || 'none', toValue: newDue || 'none' })
      }
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }
    if (data.notes !== undefined) updateData.notes = data.notes

    if (data.assigneeIds !== undefined) {
      updateData.assignees = { set: data.assigneeIds.map(aid => ({ id: aid })) }
    }
    if (data.linkedPlayerIds !== undefined) {
      updateData.linkedPlayers = { set: data.linkedPlayerIds.map(pid => ({ id: pid })) }
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
      include: {
        assignees: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
    })

    // Log activities
    if (activities.length > 0) {
      await prisma.goalActivity.createMany({
        data: activities.map(a => ({ goalId: id, action: a.action, fromValue: a.fromValue, toValue: a.toValue, performedBy: 'Pablo' })),
      })
    }

    return NextResponse.json({ data: goal })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    await prisma.goal.delete({ where: { id } })
    return NextResponse.json({ data: { success: true } })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
