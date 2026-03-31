import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseCSV } from '@/lib/csv-parser'
import { z } from 'zod'

const importSchema = z.object({
  rows: z.array(z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    courtNumber: z.number().optional().nullable(),
    amountPaid: z.number().optional().nullable(),
    visitType: z.string().optional().nullable(),
  })),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const contentType = request.headers.get('content-type') || ''

    // Handle FormData file upload: parse CSV and return preview
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json(
          { error: 'Validation error', message: 'No file uploaded' },
          { status: 400 }
        )
      }

      if (!file.name.endsWith('.csv')) {
        return NextResponse.json(
          { error: 'Validation error', message: 'File must be a CSV' },
          { status: 400 }
        )
      }

      const text = await file.text()
      const parsed = parseCSV(text)

      // Check for existing players by email
      const emails = parsed.rows
        .filter(r => r.email)
        .map(r => r.email as string)

      const existingPlayers = emails.length > 0
        ? await prisma.player.findMany({
            where: { email: { in: emails } },
            select: { email: true, id: true, firstName: true, lastName: true },
          })
        : ([] as { email: string | null; id: string; firstName: string; lastName: string }[])

      const existingEmails = new Set(existingPlayers.map(p => p.email))

      const previewRows = parsed.rows.map(row => ({
        date: row.date.toISOString(),
        startTime: row.startTime.toISOString(),
        endTime: row.endTime.toISOString(),
        courtNumber: row.courtNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        amountPaid: row.amountPaid,
        visitType: row.visitType,
        errors: row.errors,
        exists: row.email ? existingEmails.has(row.email) : false,
      }))

      return NextResponse.json({
        data: {
          rows: previewRows,
          totalRows: parsed.totalRows,
          validRows: parsed.validRows,
          errors: parsed.errors,
          existingPlayerCount: existingPlayers.length,
        },
      })
    }

    // Handle JSON body: actually import the data
    if (contentType.includes('application/json')) {
      const body = await request.json()

      // Support legacy format { csvText, action }
      if (body.csvText) {
        const parseResult = parseCSV(body.csvText)

        if (body.action === 'preview') {
          const emails = parseResult.rows.filter(r => r.email).map(r => r.email as string)
          const existingPlayers = emails.length > 0
            ? await prisma.player.findMany({
                where: { email: { in: emails } },
                select: { email: true, id: true, firstName: true, lastName: true },
              })
            : ([] as { email: string | null; id: string; firstName: string; lastName: string }[])
          const existingEmails = new Set(existingPlayers.map(p => p.email))

          return NextResponse.json({
            data: {
              rows: parseResult.rows.map(row => ({
                ...row,
                date: row.date.toISOString(),
                startTime: row.startTime.toISOString(),
                endTime: row.endTime.toISOString(),
                exists: row.email ? existingEmails.has(row.email) : false,
              })),
              errors: parseResult.errors,
              totalRows: parseResult.totalRows,
              validRows: parseResult.validRows,
              existingPlayerCount: existingPlayers.length,
            },
          })
        }

        // Import from parsed CSV text
        return await performImport(parseResult.rows.filter(r => r.errors.length === 0).map(row => ({
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          date: row.date.toISOString(),
          startTime: row.startTime.toISOString(),
          endTime: row.endTime.toISOString(),
          courtNumber: row.courtNumber,
          amountPaid: row.amountPaid,
          visitType: row.visitType,
        })))
      }

      // New format: { rows: [...] }
      const parsed = importSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
          { status: 400 }
        )
      }

      return await performImport(parsed.data.rows)
    }

    return NextResponse.json(
      { error: 'Validation error', message: 'Invalid content type. Use multipart/form-data or application/json' },
      { status: 400 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}

interface ImportRow {
  firstName?: string
  lastName?: string
  email?: string | null
  phone?: string | null
  date?: string | null
  startTime?: string | null
  endTime?: string | null
  courtNumber?: number | null
  amountPaid?: number | null
  visitType?: string | null
}

async function performImport(rows: ImportRow[]) {
  let playersCreated = 0
  let playersUpdated = 0
  let visitsCreated = 0
  let paymentsCreated = 0
  const errors: { row: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    try {
      let player = row.email
        ? await prisma.player.findUnique({ where: { email: row.email } })
        : null

      if (!player && row.firstName) {
        player = await prisma.player.findFirst({
          where: {
            firstName: { equals: row.firstName, mode: 'insensitive' },
            lastName: { equals: row.lastName || 'Player', mode: 'insensitive' },
          },
        })
      }

      if (!player) {
        player = await prisma.player.create({
          data: {
            firstName: row.firstName || 'Unknown',
            lastName: row.lastName || 'Player',
            email: row.email || undefined,
            phone: row.phone || undefined,
            source: 'PLAYBYPOINT',
            status: 'ACTIVE',
          },
        })
        playersCreated++
      } else if (row.phone && !player.phone) {
        await prisma.player.update({
          where: { id: player.id },
          data: { phone: row.phone },
        })
        playersUpdated++
      }

      if (row.date) {
        const visitDate = new Date(row.date)
        const startTime = row.startTime ? new Date(row.startTime) : visitDate
        const endTime = row.endTime ? new Date(row.endTime) : new Date(startTime.getTime() + 90 * 60000)
        const validTypes = ['CASUAL', 'MEMBER_SESSION', 'LESSON', 'TOURNAMENT', 'PRIVATE_EVENT']
        const visitType = validTypes.includes(row.visitType || '')
          ? (row.visitType as 'CASUAL' | 'MEMBER_SESSION' | 'LESSON' | 'TOURNAMENT' | 'PRIVATE_EVENT')
          : 'CASUAL'

        await prisma.visit.create({
          data: {
            playerId: player.id,
            courtNumber: Math.min(Math.max(row.courtNumber || 1, 1), 6),
            date: visitDate,
            startTime,
            endTime,
            type: visitType,
            amountPaid: row.amountPaid || 0,
          },
        })
        visitsCreated++
      }

      if (row.amountPaid && Number(row.amountPaid) > 0) {
        await prisma.payment.create({
          data: {
            playerId: player.id,
            date: row.date ? new Date(row.date) : new Date(),
            amount: Number(row.amountPaid),
            type: 'COURT_RENTAL',
            method: 'CARD',
            description: `Imported: Court ${row.courtNumber || 1}`,
          },
        })
        paymentsCreated++
      }
    } catch (e) {
      errors.push({ row: i + 1, message: (e as Error).message })
    }
  }

  return NextResponse.json({
    data: {
      playersCreated,
      playersUpdated,
      visitsCreated,
      paymentsCreated,
      errors,
      totalProcessed: rows.length,
    },
  })
}
