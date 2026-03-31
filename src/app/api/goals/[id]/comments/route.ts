import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const commentSchema = z.object({
  body: z.string().min(1, 'Comment body is required'),
  authorId: z.string().min(1, 'Author is required'),
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
    const parsed = commentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const comment = await prisma.goalComment.create({
      data: {
        goalId: id,
        authorId: parsed.data.authorId,
        body: parsed.data.body,
      },
      include: { author: true },
    })

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
