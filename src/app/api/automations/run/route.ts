import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runSingle } from '@/lib/automations/engine'
import { z } from 'zod'

const runSchema = z.object({
  type: z.string().min(1),
  dryRun: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = runSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const result = await runSingle(parsed.data.type, parsed.data.dryRun)

    if (!result) {
      return NextResponse.json({ error: 'Unknown automation type' }, { status: 404 })
    }

    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
