import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const POSTS = [
  { title: 'Friday Night Padel Social', content: 'New this week: Friday Night Padel Social! Courts, drinks, and good vibes. Link in bio.', platform: 'INSTAGRAM', status: 'SCHEDULED', category: 'EVENT', hashtags: ['PadelNashville', 'SensaPadel', 'FridayNight', 'PadelSocial'], scheduledFor: new Date('2026-04-03T18:00:00Z') },
  { title: 'Padel fail moment', content: 'When you think you have the point but padel says nope 😂 #PadelLife', platform: 'TIKTOK', status: 'DRAFT', category: 'COMMUNITY', hashtags: ['PadelLife', 'PadelFail', 'NashvilleLife'] },
  { title: 'New Unlimited member', content: 'Welcome to our newest Unlimited member! The padel fam keeps growing 💪', platform: 'INSTAGRAM', status: 'POSTED', category: 'COMMUNITY', hashtags: ['SensaPadel', 'PadelFamily', 'Nashville'], postedAt: new Date('2026-03-28T15:00:00Z') },
  { title: 'Volley pro tip', content: 'Pro tip: Keep your volley compact. Less backswing = more control. Coach Fonsi breaks it down.', platform: 'INSTAGRAM', status: 'DRAFT', category: 'TIPS', hashtags: ['PadelTips', 'PadelCoaching', 'SensaPadel'] },
  { title: 'Nashville padel promo', content: "Nashville's only padel facility. 6 courts. World-class coaching. Come see what you've been missing.", platform: 'LINKEDIN', status: 'SCHEDULED', category: 'PROMO', hashtags: ['Padel', 'Nashville', 'SportsStartup'], scheduledFor: new Date('2026-04-07T14:00:00Z') },
  { title: 'Fish Monger BTS', content: 'Behind the scenes: Fish Monger setup coming together! F&B coming soon to Sensa.', platform: 'INSTAGRAM', status: 'DRAFT', category: 'BEHIND_SCENES', hashtags: ['SensaPadel', 'ComingSoon', 'Nashville'] },
  { title: 'Tuesday night socials', content: 'Our members voted — Tuesday night padel socials are here to stay! Open play 6-9pm every week.', platform: 'INSTAGRAM', status: 'SCHEDULED', category: 'ANNOUNCEMENT', hashtags: ['PadelNight', 'SensaPadel', 'TuesdayVibes'], scheduledFor: new Date('2026-04-01T12:00:00Z') },
  { title: 'Member testimonial', content: 'From zero to padel obsessed in 3 weeks. Real talk from our member.', platform: 'INSTAGRAM', status: 'DRAFT', category: 'TESTIMONIAL', hashtags: ['PadelJourney', 'SensaPadel', 'Nashville'] },
  { title: 'Head Padel demo day', content: 'Partner spotlight: Demo day with Head Padel this weekend. Try the latest rackets for free!', platform: 'INSTAGRAM', status: 'SCHEDULED', category: 'PARTNERSHIP', hashtags: ['HeadPadel', 'DemoDay', 'SensaPadel'], scheduledFor: new Date('2026-04-05T10:00:00Z') },
  { title: 'First time playing padel', content: "First time playing padel? Here's what to expect: 1) It's easier than tennis to start 2) You'll be hooked after one game 3) The community is unmatched. Book your first session today.", platform: 'INSTAGRAM', status: 'DRAFT', category: 'TIPS', hashtags: ['PadelBeginner', 'TryPadel', 'SensaPadel', 'Nashville'] },
]

async function main() {
  console.log('📱 Seeding social posts...')
  await prisma.socialPost.deleteMany()

  for (const post of POSTS) {
    await prisma.socialPost.create({
      data: {
        title: post.title,
        content: post.content,
        platform: post.platform,
        status: post.status,
        category: post.category,
        hashtags: post.hashtags,
        scheduledFor: post.scheduledFor || null,
        postedAt: post.postedAt || null,
      },
    })
  }

  console.log(`✅ ${POSTS.length} social posts seeded`)
}

main()
  .then(async () => { await prisma.$disconnect(); await pool.end() })
  .catch(async (e) => { console.error('❌ Seed failed:', e); await prisma.$disconnect(); await pool.end(); process.exit(1) })
