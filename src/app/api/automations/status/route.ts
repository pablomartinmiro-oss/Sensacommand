import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getStatus } from '@/lib/automations/engine'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const status = await getStatus()
    return NextResponse.json({ data: status })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
