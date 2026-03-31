import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const DEFAULT_SETTINGS: Record<string, unknown> = {
  clubName: 'Sensa Padel',
  courtCount: 6,
  timezone: 'America/Chicago',
  casualRate: 40,
  standardMembershipRate: 150,
  unlimitedMembershipRate: 250,
  peakHours: [17, 18, 19, 20],
  telegramBotToken: '',
  telegramChatId: '',
  fromEmail: 'noreply@sensapadel.com',
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const settings = await prisma.setting.findMany()
    const settingsMap: Record<string, unknown> = { ...DEFAULT_SETTINGS }

    for (const setting of settings) {
      settingsMap[setting.key] = setting.value
    }

    return NextResponse.json({ data: settingsMap })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 },
    )
  }
}

const updateSettingsSchema = z.record(z.string(), z.unknown())

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = updateSettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid settings data' },
        { status: 400 },
      )
    }

    const updates = parsed.data

    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: value as never },
        create: { key, value: value as never },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 },
    )
  }
}
