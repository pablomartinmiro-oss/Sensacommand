export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.error('Telegram credentials not configured')
    return false
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Telegram send failed:', err)
    return false
  }

  return true
}

export async function testTelegramConnection(): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    return { ok: false, error: 'Telegram credentials not configured' }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const data = await res.json()
    if (!data.ok) return { ok: false, error: data.description }

    const sent = await sendTelegramMessage('🏓 Sensa Command — Test connection successful!')
    return sent ? { ok: true } : { ok: false, error: 'Failed to send test message' }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
