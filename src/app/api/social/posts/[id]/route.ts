import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  platform: z.string().optional(),
  mediaType: z.string().optional().nullable(),
  hashtags: z.array(z.string()).optional(),
  scheduledFor: z.string().optional().nullable(),
  status: z.string().optional(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const post = await prisma.socialPost.findUnique({
      where: { id },
      include: { campaign: true },
    })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    return NextResponse.json({ data: post })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
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
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') }, { status: 400 })
    }

    const data: Record<string, unknown> = { ...parsed.data }
    if (data.scheduledFor) data.scheduledFor = new Date(data.scheduledFor as string)
    if (data.status === 'POSTED') data.postedAt = new Date()

    const post = await prisma.socialPost.update({ where: { id }, data })
    return NextResponse.json({ data: post })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
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
    await prisma.socialPost.delete({ where: { id } })
    return NextResponse.json({ data: { success: true } })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
