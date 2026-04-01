import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🧹 Clearing seed data...')
  console.log('')

  // Order matters — respect foreign keys
  // Delete child records first

  const goalActivityCount = await prisma.goalActivity.count()
  await prisma.goalActivity.deleteMany()
  console.log(`  ✓ GoalActivity: ${goalActivityCount} deleted`)

  const goalCommentCount = await prisma.goalComment.count()
  await prisma.goalComment.deleteMany()
  console.log(`  ✓ GoalComment: ${goalCommentCount} deleted`)

  const automationLogCount = await prisma.automationLog.count()
  await prisma.automationLog.deleteMany()
  console.log(`  ✓ AutomationLog: ${automationLogCount} deleted`)

  const webhookEventCount = await prisma.webhookEvent.count()
  await prisma.webhookEvent.deleteMany()
  console.log(`  ✓ WebhookEvent: ${webhookEventCount} deleted`)

  const messageCount = await prisma.message.count()
  await prisma.message.deleteMany()
  console.log(`  ✓ Message: ${messageCount} deleted`)

  const visitCount = await prisma.visit.count()
  await prisma.visit.deleteMany()
  console.log(`  ✓ Visit: ${visitCount} deleted`)

  const paymentCount = await prisma.payment.count()
  await prisma.payment.deleteMany()
  console.log(`  ✓ Payment: ${paymentCount} deleted`)

  const dailyRevenueCount = await prisma.dailyRevenue.count()
  await prisma.dailyRevenue.deleteMany()
  console.log(`  ✓ DailyRevenue: ${dailyRevenueCount} deleted`)

  const aiConvoCount = await prisma.aIConversation.count()
  await prisma.aIConversation.deleteMany()
  console.log(`  ✓ AIConversation: ${aiConvoCount} deleted`)

  const socialPostCount = await prisma.socialPost.count()
  await prisma.socialPost.deleteMany()
  console.log(`  ✓ SocialPost: ${socialPostCount} deleted`)

  const socialCampaignCount = await prisma.socialCampaign.count()
  await prisma.socialCampaign.deleteMany()
  console.log(`  ✓ SocialCampaign: ${socialCampaignCount} deleted`)

  // Goals — delete all (can re-import from Notion)
  const goalCount = await prisma.goal.count()
  await prisma.goal.deleteMany()
  console.log(`  ✓ Goal: ${goalCount} deleted`)

  // Players — delete all
  const playerCount = await prisma.player.count()
  await prisma.player.deleteMany()
  console.log(`  ✓ Player: ${playerCount} deleted`)

  // Settings — delete
  const settingCount = await prisma.setting.count()
  await prisma.setting.deleteMany()
  console.log(`  ✓ Setting: ${settingCount} deleted`)

  // KEEP: AutomationConfig (8 built-in automations)
  const automationCount = await prisma.automationConfig.count()
  console.log(`  ⏭ AutomationConfig: ${automationCount} kept`)

  // KEEP: TeamMember (8 team members)
  const teamMemberCount = await prisma.teamMember.count()
  console.log(`  ⏭ TeamMember: ${teamMemberCount} kept`)

  // KEEP: MessageTemplate
  const templateCount = await prisma.messageTemplate.count()
  console.log(`  ⏭ MessageTemplate: ${templateCount} kept`)

  console.log('')
  console.log('✅ Seed data cleared!')
  console.log('   Players, visits, payments, revenue, goals, messages, social posts — all gone.')
  console.log('   Team members, automations, message templates — preserved.')
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end() })
  .catch(async (e) => { console.error('❌ Failed:', e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
