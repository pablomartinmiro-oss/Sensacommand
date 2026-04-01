import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processWebhookEvent } from '@/lib/playbypoint/processor'

export async function POST(req: NextRequest) {
  // 1. Verify Bearer token (NOT NextAuth — webhook auth)
  const authHeader = req.headers.get('authorization')
  const expectedToken = process.env.PBP_WEBHOOK_TOKEN

  if (!expectedToken || !authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: { event?: string; webhook_id?: string; data?: any; [key: string]: any }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, webhook_id, data } = body

  // 3. Idempotency check
  const webhookId = webhook_id || `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  if (webhook_id) {
    const existing = await prisma.webhookEvent.findUnique({ where: { webhookId: webhook_id } })
    if (existing) {
      return NextResponse.json({ status: 'duplicate', id: existing.id })
    }
  }

  // 4. Create webhook event record
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      webhookId,
      event: event || 'unknown',
      payload: JSON.parse(JSON.stringify(body)),
      status: 'pending',
    },
  })

  // 5. Process the event
  try {
    const result = await processWebhookEvent(
      event || 'unknown',
      data || {}
    )

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        status: 'processed',
        processedAt: new Date(),
        playerId: result?.playerId || null,
        visitId: result?.visitId || null,
        paymentId: result?.paymentId || null,
      },
    })
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: 'failed', error: (error as Error).message },
    })
    // Still return 200 — don't make PBP retry on our errors
    console.error('[PBP Webhook] Processing error:', (error as Error).message)
  }

  // 6. Always return 200
  return NextResponse.json({ status: 'ok', id: webhookEvent.id })
}
