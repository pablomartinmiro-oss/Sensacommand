import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// Team Members
// ---------------------------------------------------------------------------

const TEAM_MEMBERS = [
  { firstName: 'Pablo', lastName: 'Martin', email: 'pablo@sensapadel.com', role: 'GM' as const },
  { firstName: 'Aditya', lastName: 'Khilnani', email: 'aditya@sensapadel.com', role: 'OPERATIONS' as const },
  { firstName: 'Marcus', lastName: 'Y', email: 'marcus@sensapadel.com', role: 'PRO_SHOP' as const },
  { firstName: 'Arianna', lastName: 'Gil', email: 'arianna@sensapadel.com', role: 'MARKETING' as const },
  { firstName: 'Maria', lastName: 'Sanz', email: 'maria@sensapadel.com', role: 'OPERATIONS' as const },
  { firstName: 'Scott', lastName: 'Mitchell', email: 'scott@sensapadel.com', role: 'FINANCE' as const },
  { firstName: 'Sebastián', lastName: 'Arce', email: 'sebastian@sensapadel.com', role: 'COACH' as const },
  { firstName: 'Tripp', lastName: 'Hostetter', email: 'tripp@sensapadel.com', role: 'FINANCE' as const },
]

// ---------------------------------------------------------------------------
// Name normalization map (CSV names → canonical names)
// ---------------------------------------------------------------------------

const NAME_ALIASES: Record<string, string> = {
  'pablo martin': 'Pablo Martin',
  'aditya khilnani': 'Aditya Khilnani',
  'marcus y': 'Marcus Y',
  'arianna gil': 'Arianna Gil',
  'arianna gil olortegui': 'Arianna Gil',
  'maria sanz': 'Maria Sanz',
  'scott mitchell': 'Scott Mitchell',
  'sebastián arce': 'Sebastián Arce',
  'sebastian arce': 'Sebastián Arce',
  'tripp hostetter': 'Tripp Hostetter',
}

function normalizeAssigneeName(raw: string): string {
  const trimmed = raw.trim()
  return NAME_ALIASES[trimmed.toLowerCase()] || trimmed
}

// ---------------------------------------------------------------------------
// Status & Priority mapping
// ---------------------------------------------------------------------------

function mapStatus(raw: string): 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'FUTURE_IDEA' | 'ON_HOLD' | 'ONGOING' {
  const s = raw.trim().toLowerCase()
  if (s === 'not started' || s === '') return 'NOT_STARTED'
  if (s === 'in progress') return 'IN_PROGRESS'
  if (s === 'done') return 'DONE'
  if (s === 'future ideas') return 'FUTURE_IDEA'
  if (s === 'on hold / cancelled' || s === 'on hold') return 'ON_HOLD'
  if (s === 'ongoing') return 'ONGOING'
  return 'NOT_STARTED'
}

function mapPriority(raw: string): 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' {
  const p = raw.trim().toLowerCase()
  if (p === 'high') return 'HIGH'
  if (p === 'medium') return 'MEDIUM'
  if (p === 'low') return 'LOW'
  return 'NONE'
}

// ---------------------------------------------------------------------------
// Date parsing — handles "Month DD, YYYY" format
// ---------------------------------------------------------------------------

function parseNotionDate(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  if (isNaN(d.getTime())) return null
  return d
}

// ---------------------------------------------------------------------------
// Simple CSV parser that handles quoted fields with commas
// ---------------------------------------------------------------------------

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    rows.push(row)
  }

  return rows
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

async function main() {
  console.log('🎯 Seeding Goals module...')

  // Clear existing goals data
  console.log('  Clearing existing goals data...')
  await prisma.goalComment.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.teamMember.deleteMany()

  // 1. Create team members
  console.log('  Creating 8 team members...')
  const memberMap = new Map<string, string>() // fullName → id

  for (const m of TEAM_MEMBERS) {
    const created = await prisma.teamMember.create({
      data: {
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        role: m.role,
        isActive: true,
      },
    })
    memberMap.set(`${m.firstName} ${m.lastName}`, created.id)
  }

  // 2. Parse CSV
  const csvPath = path.join(__dirname, 'data', 'goals-import.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csvContent)

  console.log(`  Parsed ${rows.length} rows from CSV`)

  // 3. Create goals
  let created = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const title = row['Name']?.trim()
    if (!title) {
      skipped++
      continue
    }

    // Parse assignees
    const rawAssignees = row['Assignee'] || ''
    const assigneeNames = rawAssignees
      .split(',')
      .map(a => normalizeAssigneeName(a))
      .filter(a => a && memberMap.has(a))

    const assigneeIds = assigneeNames.map(name => ({ id: memberMap.get(name)! }))

    // Parse categories
    const rawCategories = row['Category'] || ''
    const categories = rawCategories
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0)

    // Parse dates
    const dueDate = parseNotionDate(row['Date Due'] || '')
    const dateRequested = parseNotionDate(row['Date Requested'] || '')

    // Parse status and priority
    const status = mapStatus(row['Status'] || '')
    const priority = mapPriority(row['Priority'] || '')

    // Set completedDate for DONE goals
    const completedDate = status === 'DONE' ? new Date() : null

    await prisma.goal.create({
      data: {
        title,
        status,
        priority,
        categories,
        dueDate,
        dateRequested,
        completedDate,
        sortOrder: i,
        assignees: {
          connect: assigneeIds,
        },
      },
    })
    created++
  }

  console.log('')
  console.log('✅ Goals seed complete!')
  console.log(`   - 8 team members`)
  console.log(`   - ${created} goals created`)
  if (skipped > 0) console.log(`   - ${skipped} rows skipped (empty title)`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error('❌ Goals seed failed:', e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
