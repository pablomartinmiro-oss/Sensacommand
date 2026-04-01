import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as XLSX from 'xlsx'
import * as path from 'path'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function excelDateToJS(serial: number | string | null): Date | null {
  if (!serial) return null
  const num = typeof serial === 'string' ? parseFloat(serial) : serial
  if (isNaN(num) || num < 1) return null
  // Excel serial date: days since 1899-12-30
  const d = new Date((num - 25569) * 86400000)
  return isNaN(d.getTime()) ? null : d
}

function cleanPhone(raw: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 7) return null
  return digits.slice(-10) // last 10 digits
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  if (!trimmed || trimmed === ' ') return { firstName: 'Unknown', lastName: '' }
  const parts = trimmed.split(/\s+/)
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

async function main() {
  console.log('📥 Importing PlayByPoint players...')

  const filePath = path.join(__dirname, '..', 'data', 'players2_report_20260401150116065.xlsx')
  const wb = XLSX.readFile(filePath)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number | null)[][]

  console.log(`  Total rows in file: ${rows.length}`)

  // Row 0 = title, Row 1 = headers, Row 2+ = data
  const headers = rows[1] as string[]
  console.log(`  Headers: ${headers.length} columns`)

  // Column indices
  const COL = {
    name: 1,
    email: 4,
    phone: 9,
    association: 14,
    tags: 15,
    firstVisit: 16,
    totalVisits: 19,
    lastVisit: 20,
    dateJoined: 23,
  }

  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000)

  let imported = 0
  let skippedNoVisits = 0
  let skippedDuplicate = 0
  let skippedNoData = 0
  const existingEmails = new Set<string>()

  // Pre-load existing emails for dedup
  const existing = await prisma.player.findMany({ where: { email: { not: null } }, select: { email: true } })
  for (const p of existing) {
    if (p.email) existingEmails.add(p.email.toLowerCase())
  }
  console.log(`  Existing players in DB: ${existing.length}`)

  const dataRows = rows.slice(2)
  console.log(`  Data rows to process: ${dataRows.length}`)
  console.log('')

  // Batch for performance
  const batchSize = 50
  const playersToCreate: Parameters<typeof prisma.player.create>[0]['data'][] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]

    const name = String(row[COL.name] || '').trim()
    const email = String(row[COL.email] || '').trim().toLowerCase() || null
    const phone = cleanPhone(String(row[COL.phone] || ''))
    const association = String(row[COL.association] || '').trim()
    const totalVisits = Number(row[COL.totalVisits]) || 0
    const firstVisit = excelDateToJS(row[COL.firstVisit] as number)
    const lastVisit = excelDateToJS(row[COL.lastVisit] as number)
    const dateJoined = excelDateToJS(row[COL.dateJoined] as number)
    const tags = String(row[COL.tags] || '').trim()

    // Skip if no name AND no email
    if ((!name || name === ' ') && !email) {
      skippedNoData++
      continue
    }

    const isMember = association === 'Member'

    // Only import: members OR players with at least 1 visit
    if (!isMember && totalVisits === 0) {
      skippedNoVisits++
      continue
    }

    // Dedup by email
    if (email && existingEmails.has(email)) {
      skippedDuplicate++
      continue
    }
    if (email) existingEmails.add(email)

    const { firstName, lastName } = splitName(name)

    // Determine status
    let status: 'NEW' | 'ACTIVE' | 'HOT_LEAD' | 'COLD_LEAD' | 'CONVERTED' | 'CHURNED' = 'NEW'
    if (isMember) {
      status = 'CONVERTED'
    } else if (totalVisits > 3 && lastVisit && lastVisit > sixtyDaysAgo) {
      status = 'HOT_LEAD'
    } else if (totalVisits > 0 && lastVisit && lastVisit > ninetyDaysAgo) {
      status = 'ACTIVE'
    } else if (totalVisits > 0) {
      status = 'COLD_LEAD'
    }

    const membershipType = isMember ? 'STANDARD' : 'NONE'

    const playerTags: string[] = []
    if (tags) playerTags.push(...tags.split(',').map(t => t.trim()).filter(Boolean))
    if (totalVisits > 0) playerTags.push(`visits:${totalVisits}`)

    playersToCreate.push({
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      source: 'PLAYBYPOINT',
      status,
      membershipType,
      membershipStartDate: isMember && dateJoined ? dateJoined : undefined,
      notes: [
        totalVisits > 0 ? `PBP visits: ${totalVisits}` : null,
        firstVisit ? `First visit: ${firstVisit.toISOString().split('T')[0]}` : null,
        lastVisit ? `Last visit: ${lastVisit.toISOString().split('T')[0]}` : null,
      ].filter(Boolean).join(' | ') || undefined,
      tags: playerTags,
    })

    // Batch insert
    if (playersToCreate.length >= batchSize) {
      for (const data of playersToCreate) {
        await prisma.player.create({ data })
        imported++
      }
      playersToCreate.length = 0
    }

    if ((i + 1) % 500 === 0) {
      console.log(`  Progress: ${i + 1}/${dataRows.length} rows (${imported} imported, ${skippedNoVisits} no-visits, ${skippedDuplicate} dupes)`)
    }
  }

  // Flush remaining
  for (const data of playersToCreate) {
    await prisma.player.create({ data })
    imported++
  }

  console.log('')
  console.log('✅ Import complete!')
  console.log(`   - ${imported} players imported`)
  console.log(`   - ${skippedNoVisits} skipped (no visits, not member)`)
  console.log(`   - ${skippedDuplicate} skipped (duplicate email)`)
  console.log(`   - ${skippedNoData} skipped (no name or email)`)

  // Summary stats
  const totalPlayers = await prisma.player.count()
  const totalMembers = await prisma.player.count({ where: { membershipType: { not: 'NONE' } } })
  console.log(`   Total players in DB: ${totalPlayers}`)
  console.log(`   Total members: ${totalMembers}`)
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end() })
  .catch(async (e) => { console.error('❌ Failed:', e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
