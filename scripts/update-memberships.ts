import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Real pricing from PlayByPoint plans
const PLAN_MAP: Record<string, { tier: 'UNLIMITED' | 'STANDARD'; rate: number }> = {
  'ALL ACCESS - monthly': { tier: 'UNLIMITED', rate: 200 },
  'ALL ACCESS - yearly': { tier: 'UNLIMITED', rate: 200 },
  'ALL ACCESS ANNUAL - yearly': { tier: 'UNLIMITED', rate: 200 },
  'ALL ACCESS STUDENT - monthly': { tier: 'UNLIMITED', rate: 200 },
  'ALL ACCESS STUDENT - yearly': { tier: 'UNLIMITED', rate: 200 },
  'PLAY MORE - monthly': { tier: 'STANDARD', rate: 79 },
  'PLAY MORE - yearly': { tier: 'STANDARD', rate: 79 },
  'GERMANTOWN RESIDENTS - monthly': { tier: 'STANDARD', rate: 79 },
  'OFF-PEAK - monthly': { tier: 'STANDARD', rate: 79 },
  'OFF PEAK FAMILY - monthly': { tier: 'STANDARD', rate: 79 },
  'INDUSTRIOUS - monthly': { tier: 'STANDARD', rate: 79 },
  'NEUHOFF - 6-weeks': { tier: 'STANDARD', rate: 79 },
  'Sensa Staff - monthly': { tier: 'UNLIMITED', rate: 0 },
  'Team Sensa - yearly': { tier: 'UNLIMITED', rate: 0 },
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

function parseDate(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : d
}

async function main() {
  console.log('🏷️  Updating memberships from PBP export...')

  const csvPath = path.join(__dirname, '..', 'data', 'pbp-members.csv')
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())

  const headers = parseCSVLine(lines[0])
  console.log(`  Columns: ${headers.length}`)

  // Find column indices
  const col = (name: string) => headers.findIndex(h => h.trim() === name)
  const COL = {
    email: col('Email'),
    association: col('Association'),
    membership: col('Membership'),
    membershipEnd: col('Membership end'),
    dateJoined: col('Date Joined'),
  }

  // First: reset ALL existing members to NONE so we rebuild from scratch
  const resetResult = await prisma.player.updateMany({
    where: { membershipType: { not: 'NONE' } },
    data: { membershipType: 'NONE', monthlyRate: null },
  })
  console.log(`  Reset ${resetResult.count} existing members to NONE`)

  let unlimited = 0
  let standard = 0
  let staff = 0
  let notFound = 0
  let skipped = 0
  const notFoundEmails: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i])
    const email = (row[COL.email] || '').trim().toLowerCase()
    const association = (row[COL.association] || '').trim()
    const planName = (row[COL.membership] || '').trim()
    const membershipEnd = parseDate(row[COL.membershipEnd] || '')
    const dateJoined = parseDate(row[COL.dateJoined] || '')

    // Skip non-members and rows without a plan
    if (association !== 'Member' || !planName || planName === 'Non-Member') {
      skipped++
      continue
    }

    if (!email) {
      skipped++
      continue
    }

    const plan = PLAN_MAP[planName]
    if (!plan) {
      console.log(`  ⚠️ Unknown plan: "${planName}" for ${email}`)
      skipped++
      continue
    }

    // Find player by email
    const player = await prisma.player.findFirst({ where: { email } })
    if (!player) {
      notFound++
      notFoundEmails.push(email)
      continue
    }

    await prisma.player.update({
      where: { id: player.id },
      data: {
        membershipType: plan.tier,
        monthlyRate: plan.rate,
        membershipStartDate: dateJoined || undefined,
        membershipEndDate: membershipEnd || undefined,
        status: 'CONVERTED',
      },
    })

    if (plan.rate === 0) staff++
    else if (plan.tier === 'UNLIMITED') unlimited++
    else standard++
  }

  // Calculate MRR
  const mrr = await prisma.player.aggregate({
    _sum: { monthlyRate: true },
    where: { membershipType: { not: 'NONE' } },
  })
  const totalMembers = await prisma.player.count({ where: { membershipType: { not: 'NONE' } } })

  console.log('')
  console.log('✅ Memberships updated!')
  console.log(`   - ${unlimited} UNLIMITED members ($200/mo)`)
  console.log(`   - ${standard} STANDARD members ($79/mo)`)
  console.log(`   - ${staff} Staff members ($0)`)
  console.log(`   - Total members: ${totalMembers}`)
  console.log(`   - Total MRR: $${Number(mrr._sum.monthlyRate || 0).toLocaleString()}`)
  console.log(`   - ${notFound} players not found by email`)
  console.log(`   - ${skipped} rows skipped (non-member or no plan)`)

  if (notFoundEmails.length > 0 && notFoundEmails.length <= 20) {
    console.log(`   Not found emails: ${notFoundEmails.join(', ')}`)
  }
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end() })
  .catch(async (e) => { console.error('❌ Failed:', e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
