import { prisma } from '@/lib/prisma'
import { formatForChannel } from './base-bot'
import type { BotMessage, SendResult } from './base-bot'

/**
 * WhatsApp Bot — skeleton for future WhatsApp Business API integration.
 *
 * For now:
 * - Inbound: logs to console + stores in Message model
 * - Outbound: creates Message records with status DRAFT (manual send)
 */

export interface InboundWhatsAppMessage {
  from: string // phone number
  body: string
  timestamp: string
  messageId?: string
}

/**
 * Handle incoming WhatsApp message.
 * Finds player by phone, stores message, and returns player context.
 */
export async function handleInbound(incoming: InboundWhatsAppMessage) {
  console.log(`[WhatsApp Bot] Incoming from ${incoming.from}: ${incoming.body}`)

  // Try to find player by phone
  const player = await prisma.player.findFirst({
    where: {
      OR: [
        { phone: { contains: incoming.from.slice(-10) } },
        { whatsappPhone: { contains: incoming.from.slice(-10) } },
      ],
    },
  })

  if (player) {
    // Store as inbound message
    await prisma.message.create({
      data: {
        playerId: player.id,
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        body: incoming.body,
        status: 'DELIVERED',
      },
    })

    return { playerId: player.id, playerName: `${player.firstName} ${player.lastName}`, matched: true }
  }

  console.log(`[WhatsApp Bot] No player match for phone: ${incoming.from}`)
  return { playerId: null, playerName: null, matched: false }
}

/**
 * Draft an outbound WhatsApp message.
 * Stores in Message model with status DRAFTED — requires manual send for now.
 */
export async function sendWhatsApp(msg: BotMessage): Promise<SendResult> {
  if (!msg.playerId) {
    return { success: false, error: 'playerId required for WhatsApp messages' }
  }

  const formatted = formatForChannel(msg.body, 'whatsapp')

  const message = await prisma.message.create({
    data: {
      playerId: msg.playerId,
      channel: 'WHATSAPP',
      direction: 'OUTBOUND',
      body: formatted,
      status: 'DRAFT',
    },
  })

  console.log(`[WhatsApp Bot] Drafted message ${message.id} for player ${msg.playerId}`)

  return { success: true, messageId: message.id }
}
