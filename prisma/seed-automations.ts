import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const AUTOMATIONS = [
  { type: 'win-back-14-day', name: '14-Day Win-Back', description: 'Sends a warm "we miss you" WhatsApp to players inactive for 14+ days', enabled: true, schedule: '0 10 * * *' },
  { type: 'win-back-30-day', name: '30-Day Win-Back', description: 'Stronger push with free guest pass for 30+ day inactive players', enabled: true, schedule: '0 10 * * *' },
  { type: 'upsell-casual-to-member', name: 'Upsell: Casual → Member', description: 'Pitches membership savings to frequent casual players (4+ visits in 30 days)', enabled: true, schedule: '0 11 * * 1' },
  { type: 'welcome-new-player', name: 'Welcome New Player', description: "Sends a welcome WhatsApp within 24h of a player's first visit", enabled: true, schedule: '0 */4 * * *' },
  { type: 'membership-expiring', name: 'Membership Expiring', description: 'Sends renewal reminders: 14-day soft and 3-day urgent', enabled: true, schedule: '0 9 * * *' },
  { type: 'churn-risk-alert', name: 'Churn Risk Alert', description: "Alerts Pablo via Telegram when a member's visits drop 50%+", enabled: true, schedule: '0 9 * * 1' },
  { type: 'overdue-goals-digest', name: 'Overdue Goals Digest', description: 'Daily Telegram digest of overdue goals with assignees', enabled: true, schedule: '0 8 * * *' },
  { type: 'weekly-performance-report', name: 'Weekly Performance Report', description: 'Monday morning summary of weekly performance', enabled: false, schedule: '0 8 * * 1' },
]

async function main() {
  console.log('⚡ Seeding automation configs...')

  for (const auto of AUTOMATIONS) {
    await prisma.automationConfig.upsert({
      where: { type: auto.type },
      update: { name: auto.name, description: auto.description, schedule: auto.schedule },
      create: auto,
    })
  }

  console.log(`✅ ${AUTOMATIONS.length} automation configs seeded`)
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end() })
  .catch(async (e) => { console.error('❌ Seed failed:', e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
