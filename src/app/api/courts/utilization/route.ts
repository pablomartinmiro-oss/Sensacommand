import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const visits = await prisma.visit.findMany({
      select: {
        courtNumber: true,
        date: true,
        startTime: true,
        amountPaid: true,
      },
    })

    // Build heatmap data: courtNumber -> dayOfWeek -> hour -> count
    const heatmapByCourt: Record<
      number,
      Record<number, Record<number, number>>
    > = {}

    // Also build aggregate (all courts)
    const heatmapAll: Record<number, Record<number, number>> = {}

    // Court stats
    const courtVisitCounts: Record<number, number> = {}
    const courtRevenue: Record<number, number> = {}
    const hourCounts: Record<number, number> = {}

    for (const visit of visits) {
      const court = visit.courtNumber
      const visitDate = new Date(visit.startTime)
      const dayOfWeek = visitDate.getDay() // 0=Sun, 6=Sat
      const hour = visitDate.getHours()

      // Per-court heatmap
      if (!heatmapByCourt[court]) heatmapByCourt[court] = {}
      if (!heatmapByCourt[court][dayOfWeek])
        heatmapByCourt[court][dayOfWeek] = {}
      heatmapByCourt[court][dayOfWeek][hour] =
        (heatmapByCourt[court][dayOfWeek][hour] || 0) + 1

      // All-courts heatmap
      if (!heatmapAll[dayOfWeek]) heatmapAll[dayOfWeek] = {}
      heatmapAll[dayOfWeek][hour] = (heatmapAll[dayOfWeek][hour] || 0) + 1

      // Court visit counts
      courtVisitCounts[court] = (courtVisitCounts[court] || 0) + 1

      // Court revenue
      courtRevenue[court] =
        (courtRevenue[court] || 0) + Number(visit.amountPaid ?? 0)

      // Hour counts
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }

    // Convert heatmaps to array format for the frontend
    const formatHeatmap = (map: Record<number, Record<number, number>>) => {
      const result: { dayOfWeek: number; hour: number; count: number }[] = []
      for (let day = 0; day < 7; day++) {
        for (let hour = 8; hour <= 21; hour++) {
          result.push({
            dayOfWeek: day,
            hour,
            count: map[day]?.[hour] || 0,
          })
        }
      }
      return result
    }

    const heatmapByCourtFormatted: Record<
      number,
      { dayOfWeek: number; hour: number; count: number }[]
    > = {}
    for (const court of Object.keys(heatmapByCourt)) {
      heatmapByCourtFormatted[Number(court)] = formatHeatmap(
        heatmapByCourt[Number(court)]
      )
    }

    // Most popular court
    const mostPopularCourt = Object.entries(courtVisitCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]

    // Peak hours (top 3)
    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: Number(hour), count }))

    // Utilization per court (assume 14 hours/day, 7 days/week for available slots)
    // Total slots per court = 14 hours * 7 days * number_of_weeks
    const totalWeeks = visits.length > 0 ? 12 : 1 // rough estimate: 12 weeks of data
    const maxSlotsPerCourt = 14 * 7 * totalWeeks

    const courtUtilization = Object.entries(courtVisitCounts).map(
      ([court, count]) => ({
        courtNumber: Number(court),
        visitCount: count,
        utilization: Math.min(
          100,
          Math.round((count / maxSlotsPerCourt) * 100)
        ),
        revenue: courtRevenue[Number(court)] || 0,
      })
    )

    // Revenue per court
    const revenuePerCourt = Object.entries(courtRevenue)
      .map(([court, revenue]) => ({
        courtNumber: Number(court),
        revenue,
      }))
      .sort((a, b) => a.courtNumber - b.courtNumber)

    return NextResponse.json({
      data: {
        heatmap: {
          all: formatHeatmap(heatmapAll),
          byCourt: heatmapByCourtFormatted,
        },
        stats: {
          mostPopularCourt: mostPopularCourt
            ? {
                courtNumber: Number(mostPopularCourt[0]),
                visitCount: mostPopularCourt[1],
              }
            : null,
          peakHours,
          courtUtilization: courtUtilization.sort(
            (a, b) => a.courtNumber - b.courtNumber
          ),
          revenuePerCourt,
        },
        courts: Object.keys(heatmapByCourt)
          .map(Number)
          .sort((a, b) => a - b),
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
