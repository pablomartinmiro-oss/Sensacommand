import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const metricsSchema = z.object({
  likes: z.number().optional(),
  comments: z.number().optional(),
  shares: z.number().optional(),
  views: z.number().optional(),
  saves: z.number().optional(),
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
    const parsed = metricsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') }, { status: 400 })
    }

    const post = await prisma.socialPost.update({
      where: { id },
      data: { metrics: parsed.data },
    })

    return NextResponse.json({ data: post })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
