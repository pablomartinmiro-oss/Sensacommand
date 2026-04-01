import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const NAME_ALIASES: Record<string, string> = {
  'pablo martin': 'Pablo Martin',
  'aditya khilnani': 'Aditya Khilnani',
  'marcus y': 'Maria Sanz',
  'arianna gil': 'Arianna Gil',
  'arianna gil olortegui': 'Arianna Gil',
  'maria sanz': 'Maria Sanz',
  'scott mitchell': 'Pablo Martin',
  'sebastián arce': 'Pablo Martin',
  'sebastian arce': 'Pablo Martin',
  'tripp hostetter': 'Tripp Hostetter',
}

function normalizeAssigneeName(raw: string): string {
  const trimmed = raw.trim()
  return NAME_ALIASES[trimmed.toLowerCase()] || trimmed
}

function mapStatus(raw: string): 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'FUTURE_IDEA' | 'ON_HOLD' | 'ONGOING' {
  const s = raw.trim().toLowerCase()
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

function parseNotionDate(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : d
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
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

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim() })
    return row
  })
}

async function main() {
  console.log('🎯 Re-importing Notion goals...')

  // Clear existing goals data
  const existingGoals = await prisma.goal.count()
  if (existingGoals > 0) {
    console.log(`  Clearing ${existingGoals} existing goals...`)
    await prisma.goalActivity.deleteMany()
    await prisma.goalComment.deleteMany()
    await prisma.goal.deleteMany()
  }

  // Load team members
  const members = await prisma.teamMember.findMany()
  const memberMap = new Map<string, string>()
  for (const m of members) {
    memberMap.set(`${m.firstName} ${m.lastName}`, m.id)
  }
  console.log(`  Found ${members.length} team members`)

  // Parse CSV
  const csvPath = path.join(__dirname, '..', 'prisma', 'data', 'goals-import.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csvContent)
  console.log(`  Parsed ${rows.length} rows from CSV`)

  let created = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const title = row['Name']?.trim()
    if (!title) { skipped++; continue }

    const assigneeNames = (row['Assignee'] || '')
      .split(',')
      .map(a => normalizeAssigneeName(a))
      .filter(a => a && memberMap.has(a))

    const assigneeIds = assigneeNames.map(name => ({ id: memberMap.get(name)! }))

    const categories = (row['Category'] || '')
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0)

    const dueDate = parseNotionDate(row['Date Due'] || '')
    const dateRequested = parseNotionDate(row['Date Requested'] || '')
    const status = mapStatus(row['Status'] || '')
    const priority = mapPriority(row['Priority'] || '')
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
        assignees: { connect: assigneeIds },
      },
    })
    created++
  }

  console.log('')
  console.log('✅ Goals re-imported!')
  console.log(`   - ${created} goals created`)
  if (skipped > 0) console.log(`   - ${skipped} rows skipped (empty title)`)
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end() })
  .catch(async (e) => { console.error('❌ Failed:', e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
