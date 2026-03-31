import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS', 'IN_APP']),
  category: z.enum(['WELCOME', 'WIN_BACK', 'UPSELL', 'REMINDER', 'PROMO', 'CUSTOM']),
  subject: z.string().optional().nullable(),
  body: z.string().min(1, 'Body is required'),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const templates = await prisma.messageTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: templates })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = templateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      )
    }

    const template = await prisma.messageTemplate.create({ data: parsed.data })
    return NextResponse.json({ data: template }, { status: 201 })
  } catch (e) {
    const message = (e as Error).message
    if (message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: 'Internal server error', message }, { status: 500 })
  }
}
