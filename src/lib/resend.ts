import { Resend } from 'resend'

function getResendClient(): Resend {
  return new Resend(process.env.RESEND_API_KEY || 'dummy_key')
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sensapadel.com'

  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'Resend API key not configured' }
  }

  try {
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: `Sensa Padel <${fromEmail}>`,
      to: [to],
      subject,
      html,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to,
    subject: 'Sensa Command — Test Email',
    html: '<h1>Test Email</h1><p>This is a test email from Sensa Command Center.</p>',
  })
}
