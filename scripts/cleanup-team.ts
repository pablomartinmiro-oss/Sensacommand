import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🧹 Cleaning up team members...')

  const members = await prisma.teamMember.findMany()
  const byName = (first: string, last: string) => members.find(m => m.firstName === first && m.lastName === last)

  const pablo = byName('Pablo', 'Martin')
  const maria = byName('Maria', 'Sanz')
  const sebastian = byName('Sebastián', 'Arce')
  const scott = byName('Scott', 'Mitchell')
  const marcus = members.find(m => m.firstName === 'Marcus')

  if (!pablo || !maria) { console.error('❌ Pablo or Maria not found'); process.exit(1) }

  const reassignments: { from: typeof sebastian; to: typeof pablo; label: string }[] = [
    { from: sebastian, to: pablo, label: 'Sebastián Arce → Pablo Martin' },
    { from: scott, to: pablo, label: 'Scott Mitchell → Pablo Martin' },
    { from: marcus, to: maria, label: 'Marcus Y → Maria Sanz' },
  ]

  for (const { from, to, label } of reassignments) {
    if (!from) { console.log(`  ⏭ ${label} — source not found, skipping`); continue }

    // Find all goals assigned to this person
    const goals = await prisma.goal.findMany({
      where: { assignees: { some: { id: from.id } } },
      include: { assignees: { select: { id: true } } },
    })

    console.log(`  ${label}: ${goals.length} goals`)

    for (const goal of goals) {
      const alreadyHasTarget = goal.assignees.some(a => a.id === to!.id)

      if (alreadyHasTarget) {
        // Just remove the old assignee
        await prisma.goal.update({
          where: { id: goal.id },
          data: { assignees: { disconnect: { id: from.id } } },
        })
      } else {
        // Replace old with new
        await prisma.goal.update({
          where: { id: goal.id },
          data: {
            assignees: {
              disconnect: { id: from.id },
              connect: { id: to!.id },
            },
          },
        })
      }
    }

    // Delete any comments by this member
    await prisma.goalComment.deleteMany({ where: { authorId: from.id } })

    // Delete the team member
    await prisma.teamMember.delete({ where: { id: from.id } })
    console.log(`  ✓ Deleted ${from.firstName} ${from.lastName}`)
  }

  const remaining = await prisma.teamMember.findMany({ orderBy: { firstName: 'asc' } })
  console.log('')
  console.log(`✅ ${remaining.length} team members remain:`)
  remaining.forEach(m => console.log(`   - ${m.firstName} ${m.lastName} (${m.role})`))
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end() })
  .catch(async (e) => { console.error('❌ Failed:', e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
