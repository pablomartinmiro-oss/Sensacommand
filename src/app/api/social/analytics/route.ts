import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalThisMonth, postsWithMetrics, allPosts] = await Promise.all([
      prisma.socialPost.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.socialPost.findMany({
        where: { status: 'POSTED', metrics: { not: 'null' } },
        orderBy: { postedAt: 'desc' },
        take: 10,
      }),
      prisma.socialPost.findMany({
        where: { status: 'POSTED' },
        select: { postedAt: true },
      }),
    ])

    // Calculate avg engagement
    let totalEngagement = 0
    let engagementCount = 0
    interface PostMetrics { likes?: number; comments?: number; shares?: number; views?: number; saves?: number }
    for (const p of postsWithMetrics) {
      const m = p.metrics as PostMetrics | null
      if (m) {
        totalEngagement += (m.likes || 0) + (m.comments || 0) + (m.shares || 0)
        engagementCount++
      }
    }

    // Posts per week (last 8 weeks)
    const weeksData: { week: string; count: number }[] = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000)
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000)
      const count = allPosts.filter(p => p.postedAt && p.postedAt >= weekStart && p.postedAt < weekEnd).length
      weeksData.push({
        week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      })
    }

    return NextResponse.json({
      data: {
        totalThisMonth,
        avgEngagement: engagementCount > 0 ? Math.round(totalEngagement / engagementCount) : 0,
        recentPosts: postsWithMetrics,
        weeklyChart: weeksData,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
