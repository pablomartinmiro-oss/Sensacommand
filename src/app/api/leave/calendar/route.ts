import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = request.nextUrl
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()))
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)

    const requests = await prisma.leaveRequest.findMany({
      where: {
        status: { in: ['APPROVED', 'PENDING'] },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      include: { teamMember: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { startDate: 'asc' },
    })

    return NextResponse.json({ data: requests })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
