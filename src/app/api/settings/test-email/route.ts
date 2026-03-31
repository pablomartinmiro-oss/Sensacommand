import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { sendTestEmail } from '@/lib/resend'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Valid email required'),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map((e) => e.message).join(', ') },
        { status: 400 },
      )
    }

    const result = await sendTestEmail(parsed.data.email)
    if (result.success) {
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: result.error || 'Failed to send test email' }, { status: 500 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 },
    )
  }
}
