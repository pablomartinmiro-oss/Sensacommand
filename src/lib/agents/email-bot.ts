import { formatForChannel } from './base-bot'
import type { BotMessage, SendResult } from './base-bot'

/**
 * Email Bot — sends branded emails via Resend SDK.
 * Falls back to console logging if RESEND_API_KEY is not configured.
 */

function getSensaEmailTemplate(body: string, subject: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F8F7F4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F7F4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;border:1px solid #E8E4DD;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1A1A2E;padding:24px 32px;">
              <span style="color:#E8A838;font-size:22px;font-weight:700;font-family:'Helvetica Neue',Arial,sans-serif;">Sensa</span>
              <span style="color:#FFFFFF;font-size:22px;font-weight:700;font-family:'Helvetica Neue',Arial,sans-serif;"> Padel</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#1A1A2E;font-size:15px;line-height:1.6;">
              <h2 style="margin:0 0 16px;color:#1A1A2E;font-size:20px;">${subject}</h2>
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #E8E4DD;color:#9CA3AF;font-size:12px;">
              Sensa Padel &middot; Nashville, TN<br>
              <a href="https://sensapadel.com" style="color:#E8A838;text-decoration:none;">sensapadel.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendEmail(msg: BotMessage): Promise<SendResult> {
  const subject = msg.subject || 'Message from Sensa Padel'
  const htmlBody = formatForChannel(msg.body, 'email')
  const fullHtml = getSensaEmailTemplate(htmlBody, subject)

  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || apiKey === 'skip-for-now') {
    console.log(`[Email Bot] No RESEND_API_KEY — logging email instead:`)
    console.log(`  To: ${msg.to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Body: ${msg.body.slice(0, 200)}...`)
    return { success: true, messageId: `local-${Date.now()}` }
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    const result = await resend.emails.send({
      from: fromEmail,
      to: msg.to,
      subject,
      html: fullHtml,
    })

    if (result.error) {
      return { success: false, error: result.error.message }
    }

    return { success: true, messageId: result.data?.id }
  } catch (e) {
    const error = (e as Error).message
    console.error(`[Email Bot] Send failed:`, error)
    return { success: false, error }
  }
}
