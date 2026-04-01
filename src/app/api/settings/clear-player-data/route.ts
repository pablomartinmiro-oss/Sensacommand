import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Delete player-related data (respecting foreign keys)
    const counts = {
      automationLogs: await prisma.automationLog.count(),
      webhookEvents: await prisma.webhookEvent.count(),
      messages: await prisma.message.count(),
      visits: await prisma.visit.count(),
      payments: await prisma.payment.count(),
      dailyRevenue: await prisma.dailyRevenue.count(),
      aiConversations: await prisma.aIConversation.count(),
      players: await prisma.player.count(),
    }

    await prisma.automationLog.deleteMany()
    await prisma.webhookEvent.deleteMany()
    await prisma.message.deleteMany()
    await prisma.visit.deleteMany()
    await prisma.payment.deleteMany()
    await prisma.dailyRevenue.deleteMany()
    await prisma.aIConversation.deleteMany()
    await prisma.player.deleteMany()

    return NextResponse.json({
      data: {
        success: true,
        deleted: counts,
        kept: ['Goals', 'TeamMembers', 'Automations', 'Settings', 'MessageTemplates', 'SocialPosts'],
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
