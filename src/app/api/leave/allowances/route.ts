import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const year = new Date().getFullYear()
    const allowances = await prisma.leaveAllowance.findMany({
      where: { year },
      include: { teamMember: { select: { id: true, firstName: true, lastName: true, role: true } } },
    })
    return NextResponse.json({ data: allowances })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
