import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'FUTURE_IDEA', 'ON_HOLD', 'ONGOING']).default('NOT_STARTED'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW', 'NONE']).default('NONE'),
  categories: z.array(z.string()).default([]),
  dueDate: z.string().optional().nullable(),
  assigneeIds: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assigneeId = searchParams.get('assigneeId')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const overdue = searchParams.get('overdue')

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (priority) where.priority = priority
    if (assigneeId) {
      where.assignees = { some: { id: assigneeId } }
    }
    if (category) {
      where.categories = { has: category }
    }
    if (search) {
      where.title = { contains: search, mode: 'insensitive' }
    }
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() }
      where.status = { notIn: ['DONE', 'ON_HOLD'] }
    }

    const goals = await prisma.goal.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignees: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { comments: true } },
      },
    })

    return NextResponse.json({ data: goals })
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
    const parsed = createGoalSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const data = parsed.data
    const goal = await prisma.goal.create({
      data: {
        title: data.title,
        description: data.description ?? undefined,
        status: data.status,
        priority: data.priority,
        categories: data.categories,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes ?? undefined,
        assignees: data.assigneeIds.length > 0
          ? { connect: data.assigneeIds.map(id => ({ id })) }
          : undefined,
      },
      include: {
        assignees: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
    })

    return NextResponse.json({ data: goal }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
