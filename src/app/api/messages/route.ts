import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { z } from 'zod'

const createMessageSchema = z.object({
  playerId: z.string().min(1),
  channel: z.enum(['WHATSAPP', 'EMAIL', 'SMS', 'IN_APP']),
  subject: z.string().optional().nullable(),
  body: z.string().min(1, 'Message body is required'),
  templateUsed: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SENT']).default('SENT'),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { direction: 'OUTBOUND' }
    if (status) where.status = status
    if (channel) where.channel = channel

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          player: {
            select: { id: true, firstName: true, lastName: true, email: true, whatsappPhone: true },
          },
        },
      }),
      prisma.message.count({ where }),
    ])

    return NextResponse.json({
      data: messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
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
    const parsed = createMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      )
    }

    const data = parsed.data

    const player = await prisma.player.findUnique({
      where: { id: data.playerId },
      select: { email: true, firstName: true },
    })

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // If sending via EMAIL channel and status is SENT, actually send the email
    if (data.channel === 'EMAIL' && data.status === 'SENT' && player.email) {
      const result = await sendEmail({
        to: player.email,
        subject: data.subject || 'Message from Sensa Padel',
        html: data.body.replace(/\n/g, '<br>'),
      })

      const message = await prisma.message.create({
        data: {
          playerId: data.playerId,
          channel: data.channel,
          direction: 'OUTBOUND',
          subject: data.subject,
          body: data.body,
          status: result.success ? 'SENT' : 'FAILED',
          templateUsed: data.templateUsed,
        },
        include: {
          player: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      })

      return NextResponse.json({ data: message }, { status: 201 })
    }

    // For drafts or WhatsApp messages (mark as sent manually)
    const message = await prisma.message.create({
      data: {
        playerId: data.playerId,
        channel: data.channel,
        direction: 'OUTBOUND',
        subject: data.subject,
        body: data.body,
        status: data.status,
        templateUsed: data.templateUsed,
      },
      include: {
        player: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    return NextResponse.json({ data: message }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 },
    )
  }
}
