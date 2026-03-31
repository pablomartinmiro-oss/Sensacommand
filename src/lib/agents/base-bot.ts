import { prisma } from '@/lib/prisma'

export interface BotMessage {
  to: string // player ID or external identifier
  channel: 'whatsapp' | 'email' | 'telegram' | 'in-app'
  body: string
  subject?: string // for email
  playerId?: string
}

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Format message body for specific channel markdown conventions
 */
export function formatForChannel(body: string, channel: BotMessage['channel']): string {
  switch (channel) {
    case 'whatsapp':
      // WhatsApp uses *bold*, _italic_, ~strikethrough~
      return body
    case 'email':
      // Convert markdown-ish to basic HTML
      return body
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
    case 'telegram':
      // Telegram uses *bold*, _italic_, `code`
      return body
    default:
      return body
  }
}

/**
 * Check rate limit: max 1 message per player per channel per 24h
 */
export async function canSendToPlayer(
  playerId: string,
  channel: string
): Promise<boolean> {
  const recent = await prisma.message.findFirst({
    where: {
      playerId,
      channel: channel.toUpperCase() as 'WHATSAPP' | 'EMAIL' | 'SMS' | 'IN_APP',
      direction: 'OUTBOUND',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  })
  return !recent
}

/**
 * Simple in-memory message queue that processes in order.
 * In production, replace with a proper queue (Bull, SQS, etc.)
 */
export class MessageQueue {
  private queue: BotMessage[] = []
  private processing = false

  enqueue(message: BotMessage) {
    this.queue.push(message)
  }

  async processAll(sender: (msg: BotMessage) => Promise<SendResult>): Promise<SendResult[]> {
    if (this.processing) return []
    this.processing = true
    const results: SendResult[] = []

    while (this.queue.length > 0) {
      const msg = this.queue.shift()!

      // Rate limit check
      if (msg.playerId) {
        const allowed = await canSendToPlayer(msg.playerId, msg.channel)
        if (!allowed) {
          results.push({ success: false, error: 'Rate limited: 1 msg per player per channel per 24h' })
          continue
        }
      }

      const result = await sender(msg)
      results.push(result)
    }

    this.processing = false
    return results
  }

  get length() {
    return this.queue.length
  }
}
