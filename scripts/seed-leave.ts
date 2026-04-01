import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌴 Seeding leave data...')

  const members = await prisma.teamMember.findMany()
  const byName = (first: string) => members.find(m => m.firstName === first)!

  const pablo = byName('Pablo')
  const aditya = byName('Aditya')
  const arianna = byName('Arianna')
  const maria = byName('Maria')
  const tripp = byName('Tripp')

  // Clear existing
  await prisma.leaveRequest.deleteMany()
  await prisma.leaveAllowance.deleteMany()

  // Allowances for 2026
  const allowances = [
    { teamMemberId: pablo.id, year: 2026, totalDays: 20, usedDays: 3 },
    { teamMemberId: aditya.id, year: 2026, totalDays: 15, usedDays: 5 },
    { teamMemberId: arianna.id, year: 2026, totalDays: 15, usedDays: 2 },
    { teamMemberId: maria.id, year: 2026, totalDays: 15, usedDays: 4 },
    { teamMemberId: tripp.id, year: 2026, totalDays: 15, usedDays: 1 },
  ]

  for (const a of allowances) {
    await prisma.leaveAllowance.create({ data: a })
  }
  console.log('  ✓ 5 leave allowances created')

  // Leave requests
  const requests = [
    { teamMemberId: pablo.id, startDate: new Date('2026-04-18'), endDate: new Date('2026-04-22'), days: 4, type: 'PTO', reason: 'Family trip', status: 'APPROVED', approvedBy: 'Pablo Martin', approvedAt: new Date('2026-04-01') },
    { teamMemberId: aditya.id, startDate: new Date('2026-05-05'), endDate: new Date('2026-05-09'), days: 5, type: 'PTO', reason: 'Conference', status: 'APPROVED', approvedBy: 'Pablo Martin', approvedAt: new Date('2026-03-28') },
    { teamMemberId: maria.id, startDate: new Date('2026-04-07'), endDate: new Date('2026-04-08'), days: 2, type: 'PERSONAL', reason: 'Moving day', status: 'APPROVED', approvedBy: 'Pablo Martin', approvedAt: new Date('2026-03-25') },
    { teamMemberId: arianna.id, startDate: new Date('2026-06-16'), endDate: new Date('2026-06-20'), days: 5, type: 'PTO', reason: 'Summer vacation', status: 'PENDING' },
    { teamMemberId: tripp.id, startDate: new Date('2026-04-14'), endDate: new Date('2026-04-14'), days: 1, type: 'SICK', reason: 'Doctor appointment', status: 'APPROVED', approvedBy: 'Pablo Martin', approvedAt: new Date('2026-04-01') },
    { teamMemberId: pablo.id, startDate: new Date('2026-07-04'), endDate: new Date('2026-07-04'), days: 1, type: 'PTO', reason: 'Independence Day', status: 'PENDING' },
    { teamMemberId: aditya.id, startDate: new Date('2026-03-10'), endDate: new Date('2026-03-12'), days: 3, type: 'PTO', reason: 'Personal', status: 'APPROVED', approvedBy: 'Pablo Martin', approvedAt: new Date('2026-03-01') },
    { teamMemberId: maria.id, startDate: new Date('2026-02-14'), endDate: new Date('2026-02-14'), days: 1, type: 'PERSONAL', reason: "Valentine's", status: 'APPROVED', approvedBy: 'Pablo Martin', approvedAt: new Date('2026-02-10') },
  ]

  for (const r of requests) {
    await prisma.leaveRequest.create({ data: r })
  }
  console.log('  ✓ 8 leave requests created')

  console.log('✅ Leave data seeded!')
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end() })
  .catch(async (e) => { console.error('❌ Failed:', e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
