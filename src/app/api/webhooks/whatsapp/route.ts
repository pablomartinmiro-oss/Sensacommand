import { NextRequest, NextResponse } from 'next/server'
import { handleInbound } from '@/lib/agents/whatsapp-bot'

/**
 * WhatsApp webhook endpoint.
 * Receives incoming WhatsApp messages when configured with WhatsApp Business API.
 * For now: stores message and logs to console.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract message from WhatsApp webhook payload
    // Format varies by provider (Meta, Twilio, etc.) — adjust as needed
    const from = body.from || body.From || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || ''
    const text = body.body || body.Body || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || ''
    const messageId = body.messageId || body.MessageSid || body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id || ''

    if (!from || !text) {
      return NextResponse.json({ error: 'Missing from or body' }, { status: 400 })
    }

    const result = await handleInbound({
      from,
      body: text,
      timestamp: new Date().toISOString(),
      messageId,
    })

    return NextResponse.json({
      data: {
        received: true,
        playerMatched: result.matched,
        playerName: result.playerName,
      },
    })
  } catch (e) {
    console.error('[WhatsApp Webhook] Error:', (e as Error).message)
    return NextResponse.json(
      { error: 'Webhook processing failed', message: (e as Error).message },
      { status: 500 }
    )
  }
}

/**
 * GET handler for webhook verification (Meta requires this).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}
