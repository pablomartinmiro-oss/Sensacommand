import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  platform: z.string(),
  mediaType: z.string().optional().nullable(),
  hashtags: z.array(z.string()).default([]),
  scheduledFor: z.string().optional().nullable(),
  status: z.string().default('DRAFT'),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  campaignId: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}
    if (platform) where.platform = platform
    if (status) where.status = status
    if (category) where.category = category
    if (startDate || endDate) {
      const dateFilter: { gte?: Date; lte?: Date } = {}
      if (startDate) dateFilter.gte = new Date(startDate)
      if (endDate) dateFilter.lte = new Date(endDate)
      where.scheduledFor = dateFilter
    }

    const posts = await prisma.socialPost.findMany({
      where,
      orderBy: { scheduledFor: { sort: 'desc', nulls: 'last' } },
      include: { campaign: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ data: posts })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = createPostSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') }, { status: 400 })
    }

    const data = parsed.data
    const post = await prisma.socialPost.create({
      data: {
        title: data.title,
        content: data.content,
        platform: data.platform,
        mediaType: data.mediaType,
        hashtags: data.hashtags,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        status: data.status,
        category: data.category,
        notes: data.notes,
        campaignId: data.campaignId,
      },
    })

    return NextResponse.json({ data: post }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
