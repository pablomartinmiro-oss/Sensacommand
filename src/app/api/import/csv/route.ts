import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { mode, mapping, rows } = body as {
      mode: 'bookings' | 'members'
      mapping: Record<string, string>
      rows: Record<string, string>[]
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
    }

    const result = {
      newPlayers: 0,
      matchedPlayers: 0,
      visits: 0,
      payments: 0,
      totalRevenue: 0,
      errors: [] as string[],
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +1 for header, +1 for 1-indexed

      try {
        // Extract player name
        let firstName = '', lastName = ''
        if (mapping.name && row[mapping.name]) {
          const parts = row[mapping.name].trim().split(/\s+/)
          firstName = parts[0] || ''
          lastName = parts.slice(1).join(' ') || ''
        }
        if (mapping.firstName && row[mapping.firstName]) firstName = row[mapping.firstName].trim()
        if (mapping.lastName && row[mapping.lastName]) lastName = row[mapping.lastName].trim()

        if (!firstName && !lastName) {
          result.errors.push(`Row ${rowNum}: No name found, skipped`)
          continue
        }

        const email = mapping.email ? (row[mapping.email] || '').trim() || null : null
        const phone = mapping.phone ? (row[mapping.phone] || '').trim() || null : null

        // Find or create player — match by email first, then by full name, then phone
        let player = null
        if (email) {
          player = await prisma.player.findFirst({ where: { email } })
        }
        if (!player && firstName && lastName) {
          player = await prisma.player.findFirst({
            where: { firstName: { equals: firstName, mode: 'insensitive' }, lastName: { equals: lastName, mode: 'insensitive' } },
          })
        }
        if (!player && phone) {
          const normalizedPhone = phone.replace(/\D/g, '').slice(-10)
          if (normalizedPhone.length >= 7) {
            player = await prisma.player.findFirst({ where: { phone: { contains: normalizedPhone } } })
          }
        }

        if (player) {
          result.matchedPlayers++
        } else {
          player = await prisma.player.create({
            data: {
              firstName: firstName || 'Unknown',
              lastName: lastName || '',
              email,
              phone,
              source: 'PLAYBYPOINT',
              status: mode === 'members' ? 'CONVERTED' : 'NEW',
              membershipType: 'NONE',
            },
          })
          result.newPlayers++
        }

        if (mode === 'members') {
          // Update membership info
          const membershipType = mapping.membershipType ? row[mapping.membershipType] : ''
          const startDate = mapping.startDate ? row[mapping.startDate] : ''
          const monthlyRate = mapping.monthlyRate ? parseFloat(row[mapping.monthlyRate] || '0') : 0

          let tier: 'NONE' | 'STANDARD' | 'UNLIMITED' = 'NONE'
          const lower = (membershipType || '').toLowerCase()
          if (lower.includes('unlimited') || lower.includes('all access')) tier = 'UNLIMITED'
          else if (lower.includes('standard') || lower.includes('basic') || lower.includes('member')) tier = 'STANDARD'

          if (tier !== 'NONE') {
            await prisma.player.update({
              where: { id: player.id },
              data: {
                membershipType: tier,
                membershipStartDate: startDate ? new Date(startDate) : new Date(),
                monthlyRate: monthlyRate || (tier === 'UNLIMITED' ? 350 : 200),
                status: 'CONVERTED',
              },
            })
          }
        }

        if (mode === 'bookings') {
          const dateStr = mapping.date ? row[mapping.date] : ''
          if (!dateStr) {
            result.errors.push(`Row ${rowNum}: No date, skipped visit`)
            continue
          }

          const date = new Date(dateStr)
          if (isNaN(date.getTime())) {
            result.errors.push(`Row ${rowNum}: Invalid date "${dateStr}", skipped`)
            continue
          }

          const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          const courtStr = mapping.court ? row[mapping.court] : ''
          const courtMatch = courtStr?.match(/(\d+)/)
          const courtNumber = courtMatch ? parseInt(courtMatch[1]) : 1

          // Parse times
          let startTime = date
          let endTime = new Date(date.getTime() + 90 * 60000)

          if (mapping.startTime && row[mapping.startTime]) {
            const st = parseTime(row[mapping.startTime], dateOnly)
            if (st) startTime = st
          }
          if (mapping.endTime && row[mapping.endTime]) {
            const et = parseTime(row[mapping.endTime], dateOnly)
            if (et) endTime = et
          }

          const amount = mapping.amount ? parseFloat(row[mapping.amount] || '0') || 0 : 0

          // Dedup check: player + date + court + start time
          const existing = await prisma.visit.findFirst({
            where: { playerId: player.id, date: dateOnly, courtNumber },
          })
          if (existing) {
            result.errors.push(`Row ${rowNum}: Duplicate visit (${firstName} ${lastName}, ${dateStr}, Court ${courtNumber}), skipped`)
            continue
          }

          // Map booking type
          const typeStr = mapping.type ? (row[mapping.type] || '').toLowerCase() : ''
          let visitType: 'CASUAL' | 'MEMBER_SESSION' | 'LESSON' | 'TOURNAMENT' | 'PRIVATE_EVENT' = 'CASUAL'
          if (typeStr.includes('lesson') || typeStr.includes('clinic')) visitType = 'LESSON'
          else if (typeStr.includes('tournament')) visitType = 'TOURNAMENT'
          else if (typeStr.includes('event') || typeStr.includes('private')) visitType = 'PRIVATE_EVENT'
          else if (typeStr.includes('member')) visitType = 'MEMBER_SESSION'

          await prisma.visit.create({
            data: {
              playerId: player.id,
              courtNumber,
              date: dateOnly,
              startTime,
              endTime,
              type: visitType,
              amountPaid: amount,
              notes: 'Imported from CSV',
            },
          })
          result.visits++

          if (amount > 0) {
            await prisma.payment.create({
              data: {
                playerId: player.id,
                date: dateOnly,
                amount,
                type: visitType === 'LESSON' ? 'LESSON' : 'COURT_RENTAL',
                method: 'PLAYBYPOINT',
                description: `CSV import: ${fileName(row, mapping)}`,
              },
            })
            result.payments++
            result.totalRevenue += amount
          }

          // Update player status
          if (player.status === 'NEW') {
            await prisma.player.update({ where: { id: player.id }, data: { status: 'ACTIVE' } })
          }
        }
      } catch (e) {
        result.errors.push(`Row ${rowNum}: ${(e as Error).message}`)
      }
    }

    return NextResponse.json({ data: result })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}

function parseTime(timeStr: string, baseDate: Date): Date | null {
  const trimmed = timeStr.trim()

  // Try "HH:MM" or "H:MM AM/PM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (match12) {
    let hours = parseInt(match12[1])
    const minutes = parseInt(match12[2])
    const meridian = match12[3]?.toUpperCase()
    if (meridian === 'PM' && hours < 12) hours += 12
    if (meridian === 'AM' && hours === 12) hours = 0
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes)
  }

  // Try ISO datetime
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d

  return null
}

function fileName(row: Record<string, string>, mapping: Record<string, string>): string {
  const name = mapping.name ? row[mapping.name] : `${row[mapping.firstName] || ''} ${row[mapping.lastName] || ''}`
  return name?.trim() || 'unknown'
}
