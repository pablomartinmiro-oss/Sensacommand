import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { subDays, addHours } from 'date-fns'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TODAY = new Date('2026-03-31T00:00:00.000Z')

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

function dayOfWeek(d: Date): number {
  return d.getUTCDay() // 0=Sun, 6=Sat
}

// Deterministic "random" based on seed string – simple hash
function seededIndex(seed: string, max: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0x7fffffff
  }
  return hash % max
}

// ---------------------------------------------------------------------------
// 1. PLAYERS (30)
// ---------------------------------------------------------------------------

interface PlayerSeed {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  whatsappPhone: string | null
  source: string
  status: string
  membershipType: string
  membershipStartDate: Date | null
  membershipEndDate: Date | null
  monthlyRate: number | null
  notes: string | null
  tags: string[]
}

const players: PlayerSeed[] = [
  // 1 – ACTIVE / UNLIMITED
  {
    id: 'player_01',
    firstName: 'Carlos',
    lastName: 'Ramirez',
    email: 'carlos.ramirez@email.com',
    phone: '+16155551001',
    whatsappPhone: '+16155551001',
    source: 'REFERRAL',
    status: 'ACTIVE',
    membershipType: 'UNLIMITED',
    membershipStartDate: subDays(TODAY, 120),
    membershipEndDate: subDays(TODAY, -60),
    monthlyRate: 350,
    notes: 'Former college tennis player, transitioned to padel.',
    tags: ['advanced', 'league'],
  },
  // 2 – ACTIVE / STANDARD
  {
    id: 'player_02',
    firstName: 'Jessica',
    lastName: 'Turner',
    email: 'jessica.turner@email.com',
    phone: '+16155551002',
    whatsappPhone: null,
    source: 'WEBSITE',
    status: 'ACTIVE',
    membershipType: 'STANDARD',
    membershipStartDate: subDays(TODAY, 90),
    membershipEndDate: subDays(TODAY, -30),
    monthlyRate: 200,
    notes: null,
    tags: ['intermediate', 'corporate'],
  },
  // 3 – HOT_LEAD / NONE
  {
    id: 'player_03',
    firstName: 'Miguel',
    lastName: 'Hernandez',
    email: 'miguel.hernandez@email.com',
    phone: '+16155551003',
    whatsappPhone: '+16155551003',
    source: 'SOCIAL_MEDIA',
    status: 'HOT_LEAD',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Played 3 casual sessions, asking about membership.',
    tags: ['beginner'],
  },
  // 4 – NEW / NONE
  {
    id: 'player_04',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    email: 'sarah.mitchell@email.com',
    phone: '+16155551004',
    whatsappPhone: null,
    source: 'WALK_IN',
    status: 'NEW',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'First-time walk-in, interested in lessons.',
    tags: ['beginner'],
  },
  // 5 – ACTIVE / UNLIMITED
  {
    id: 'player_05',
    firstName: 'Andres',
    lastName: 'Gutierrez',
    email: 'andres.gutierrez@email.com',
    phone: '+16155551005',
    whatsappPhone: '+16155551005',
    source: 'REFERRAL',
    status: 'ACTIVE',
    membershipType: 'UNLIMITED',
    membershipStartDate: subDays(TODAY, 200),
    membershipEndDate: subDays(TODAY, -30),
    monthlyRate: 350,
    notes: 'Plays almost every day. Organizes weekend mixers.',
    tags: ['advanced', 'league', 'corporate'],
  },
  // 6 – CONVERTED / STANDARD
  {
    id: 'player_06',
    firstName: 'Emily',
    lastName: 'Crawford',
    email: 'emily.crawford@email.com',
    phone: '+16155551006',
    whatsappPhone: null,
    source: 'WEBSITE',
    status: 'CONVERTED',
    membershipType: 'STANDARD',
    membershipStartDate: subDays(TODAY, 45),
    membershipEndDate: subDays(TODAY, -15),
    monthlyRate: 200,
    notes: 'Converted from casual after upsell campaign.',
    tags: ['intermediate'],
  },
  // 7 – COLD_LEAD / NONE
  {
    id: 'player_07',
    firstName: 'Roberto',
    lastName: 'Salazar',
    email: 'roberto.salazar@email.com',
    phone: '+16155551007',
    whatsappPhone: '+16155551007',
    source: 'SOCIAL_MEDIA',
    status: 'COLD_LEAD',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Came once 40 days ago. Has not returned.',
    tags: ['beginner'],
  },
  // 8 – ACTIVE / STANDARD
  {
    id: 'player_08',
    firstName: 'Ashley',
    lastName: 'Brooks',
    email: 'ashley.brooks@email.com',
    phone: '+16155551008',
    whatsappPhone: null,
    source: 'REFERRAL',
    status: 'ACTIVE',
    membershipType: 'STANDARD',
    membershipStartDate: subDays(TODAY, 60),
    membershipEndDate: subDays(TODAY, -30),
    monthlyRate: 200,
    notes: null,
    tags: ['intermediate', 'league'],
  },
  // 9 – NEW / NONE
  {
    id: 'player_09',
    firstName: 'Diego',
    lastName: 'Morales',
    email: 'diego.morales@email.com',
    phone: '+16155551009',
    whatsappPhone: '+16155551009',
    source: 'PLAYBYPOINT',
    status: 'NEW',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Booked through PlayByPoint app.',
    tags: ['beginner'],
  },
  // 10 – CHURNED / NONE
  {
    id: 'player_10',
    firstName: 'Rachel',
    lastName: 'Henderson',
    email: 'rachel.henderson@email.com',
    phone: '+16155551010',
    whatsappPhone: null,
    source: 'WEBSITE',
    status: 'CHURNED',
    membershipType: 'NONE',
    membershipStartDate: subDays(TODAY, 180),
    membershipEndDate: subDays(TODAY, 60),
    monthlyRate: null,
    notes: 'Cancelled Standard membership. Moved out of Nashville.',
    tags: ['intermediate'],
  },
  // 11 – ACTIVE / UNLIMITED
  {
    id: 'player_11',
    firstName: 'Fernando',
    lastName: 'Castillo',
    email: 'fernando.castillo@email.com',
    phone: '+16155551011',
    whatsappPhone: '+16155551011',
    source: 'REFERRAL',
    status: 'ACTIVE',
    membershipType: 'UNLIMITED',
    membershipStartDate: subDays(TODAY, 150),
    membershipEndDate: subDays(TODAY, -30),
    monthlyRate: 350,
    notes: 'Competitive player, trains 5x/week.',
    tags: ['advanced', 'league'],
  },
  // 12 – HOT_LEAD / NONE
  {
    id: 'player_12',
    firstName: 'Lauren',
    lastName: 'Foster',
    email: 'lauren.foster@email.com',
    phone: '+16155551012',
    whatsappPhone: null,
    source: 'WALK_IN',
    status: 'HOT_LEAD',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Visited twice this week, loved it. Asking about Standard.',
    tags: ['beginner', 'corporate'],
  },
  // 13 – ACTIVE / STANDARD
  {
    id: 'player_13',
    firstName: 'Alejandro',
    lastName: 'Vega',
    email: 'alejandro.vega@email.com',
    phone: '+16155551013',
    whatsappPhone: '+16155551013',
    source: 'SOCIAL_MEDIA',
    status: 'ACTIVE',
    membershipType: 'STANDARD',
    membershipStartDate: subDays(TODAY, 75),
    membershipEndDate: subDays(TODAY, -15),
    monthlyRate: 200,
    notes: null,
    tags: ['intermediate'],
  },
  // 14 – NEW / NONE
  {
    id: 'player_14',
    firstName: 'Brittany',
    lastName: 'Collins',
    email: 'brittany.collins@email.com',
    phone: '+16155551014',
    whatsappPhone: null,
    source: 'WEBSITE',
    status: 'NEW',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Signed up on website, hasn\'t visited yet.',
    tags: [],
  },
  // 15 – ACTIVE / UNLIMITED
  {
    id: 'player_15',
    firstName: 'Luis',
    lastName: 'Paredes',
    email: 'luis.paredes@email.com',
    phone: '+16155551015',
    whatsappPhone: '+16155551015',
    source: 'REFERRAL',
    status: 'ACTIVE',
    membershipType: 'UNLIMITED',
    membershipStartDate: subDays(TODAY, 100),
    membershipEndDate: subDays(TODAY, -80),
    monthlyRate: 350,
    notes: 'Referred by Carlos Ramirez.',
    tags: ['advanced', 'league'],
  },
  // 16 – COLD_LEAD / NONE
  {
    id: 'player_16',
    firstName: 'Megan',
    lastName: 'Price',
    email: 'megan.price@email.com',
    phone: '+16155551016',
    whatsappPhone: null,
    source: 'WALK_IN',
    status: 'COLD_LEAD',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Visited 3 weeks ago. Follow-up email sent, no response.',
    tags: ['beginner'],
  },
  // 17 – CONVERTED / STANDARD
  {
    id: 'player_17',
    firstName: 'Ricardo',
    lastName: 'Navarro',
    email: 'ricardo.navarro@email.com',
    phone: '+16155551017',
    whatsappPhone: '+16155551017',
    source: 'PLAYBYPOINT',
    status: 'CONVERTED',
    membershipType: 'STANDARD',
    membershipStartDate: subDays(TODAY, 30),
    membershipEndDate: subDays(TODAY, -30),
    monthlyRate: 200,
    notes: 'Converted from PlayByPoint casual to Standard.',
    tags: ['intermediate'],
  },
  // 18 – ACTIVE / STANDARD
  {
    id: 'player_18',
    firstName: 'Hannah',
    lastName: 'Reed',
    email: 'hannah.reed@email.com',
    phone: '+16155551018',
    whatsappPhone: null,
    source: 'REFERRAL',
    status: 'ACTIVE',
    membershipType: 'STANDARD',
    membershipStartDate: subDays(TODAY, 55),
    membershipEndDate: subDays(TODAY, -35),
    monthlyRate: 200,
    notes: null,
    tags: ['intermediate', 'corporate'],
  },
  // 19 – HOT_LEAD / NONE
  {
    id: 'player_19',
    firstName: 'Gabriel',
    lastName: 'Torres',
    email: 'gabriel.torres@email.com',
    phone: '+16155551019',
    whatsappPhone: '+16155551019',
    source: 'SOCIAL_MEDIA',
    status: 'HOT_LEAD',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Instagram DM inquiry. Played twice, wants Standard.',
    tags: ['beginner'],
  },
  // 20 – CHURNED / NONE
  {
    id: 'player_20',
    firstName: 'Amanda',
    lastName: 'Stewart',
    email: 'amanda.stewart@email.com',
    phone: '+16155551020',
    whatsappPhone: null,
    source: 'WEBSITE',
    status: 'CHURNED',
    membershipType: 'NONE',
    membershipStartDate: subDays(TODAY, 200),
    membershipEndDate: subDays(TODAY, 90),
    monthlyRate: null,
    notes: 'Former Unlimited member. Injury prevented continued play.',
    tags: ['advanced'],
  },
  // 21 – NEW / NONE
  {
    id: 'player_21',
    firstName: 'Javier',
    lastName: 'Rios',
    email: 'javier.rios@email.com',
    phone: '+16155551021',
    whatsappPhone: '+16155551021',
    source: 'WALK_IN',
    status: 'NEW',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Walk-in with friend. First time playing padel.',
    tags: ['beginner'],
  },
  // 22 – ACTIVE / UNLIMITED
  {
    id: 'player_22',
    firstName: 'Stephanie',
    lastName: 'Ward',
    email: 'stephanie.ward@email.com',
    phone: '+16155551022',
    whatsappPhone: null,
    source: 'REFERRAL',
    status: 'ACTIVE',
    membershipType: 'UNLIMITED',
    membershipStartDate: subDays(TODAY, 180),
    membershipEndDate: subDays(TODAY, -30),
    monthlyRate: 350,
    notes: 'Plays doubles with husband. Very consistent.',
    tags: ['intermediate', 'league'],
  },
  // 23 – ACTIVE / STANDARD
  {
    id: 'player_23',
    firstName: 'Marco',
    lastName: 'Delgado',
    email: 'marco.delgado@email.com',
    phone: '+16155551023',
    whatsappPhone: '+16155551023',
    source: 'SOCIAL_MEDIA',
    status: 'ACTIVE',
    membershipType: 'STANDARD',
    membershipStartDate: subDays(TODAY, 40),
    membershipEndDate: subDays(TODAY, -20),
    monthlyRate: 200,
    notes: null,
    tags: ['intermediate'],
  },
  // 24 – COLD_LEAD / NONE
  {
    id: 'player_24',
    firstName: 'Tiffany',
    lastName: 'Campbell',
    email: 'tiffany.campbell@email.com',
    phone: '+16155551024',
    whatsappPhone: null,
    source: 'WEBSITE',
    status: 'COLD_LEAD',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Downloaded pricing PDF, never booked.',
    tags: [],
  },
  // 25 – NEW / NONE
  {
    id: 'player_25',
    firstName: 'Sebastian',
    lastName: 'Flores',
    email: 'sebastian.flores@email.com',
    phone: '+16155551025',
    whatsappPhone: '+16155551025',
    source: 'PLAYBYPOINT',
    status: 'NEW',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'PlayByPoint booking for Saturday.',
    tags: ['beginner'],
  },
  // 26 – ACTIVE / STANDARD
  {
    id: 'player_26',
    firstName: 'Kimberly',
    lastName: 'Hughes',
    email: 'kimberly.hughes@email.com',
    phone: '+16155551026',
    whatsappPhone: null,
    source: 'REFERRAL',
    status: 'ACTIVE',
    membershipType: 'STANDARD',
    membershipStartDate: subDays(TODAY, 80),
    membershipEndDate: subDays(TODAY, -10),
    monthlyRate: 200,
    notes: 'Referred by Ashley Brooks.',
    tags: ['intermediate', 'corporate'],
  },
  // 27 – HOT_LEAD / NONE
  {
    id: 'player_27',
    firstName: 'Daniel',
    lastName: 'Ochoa',
    email: 'daniel.ochoa@email.com',
    phone: '+16155551027',
    whatsappPhone: '+16155551027',
    source: 'SOCIAL_MEDIA',
    status: 'HOT_LEAD',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Played 4 casual sessions in 2 weeks. Very enthusiastic.',
    tags: ['beginner'],
  },
  // 28 – CONVERTED / UNLIMITED
  {
    id: 'player_28',
    firstName: 'Natalie',
    lastName: 'Cooper',
    email: 'natalie.cooper@email.com',
    phone: '+16155551028',
    whatsappPhone: null,
    source: 'WALK_IN',
    status: 'CONVERTED',
    membershipType: 'UNLIMITED',
    membershipStartDate: subDays(TODAY, 20),
    membershipEndDate: subDays(TODAY, -40),
    monthlyRate: 350,
    notes: 'Went straight from casual to Unlimited.',
    tags: ['intermediate', 'league'],
  },
  // 29 – ACTIVE / UNLIMITED
  {
    id: 'player_29',
    firstName: 'Hector',
    lastName: 'Mendoza',
    email: 'hector.mendoza@email.com',
    phone: '+16155551029',
    whatsappPhone: '+16155551029',
    source: 'REFERRAL',
    status: 'ACTIVE',
    membershipType: 'UNLIMITED',
    membershipStartDate: subDays(TODAY, 130),
    membershipEndDate: subDays(TODAY, -50),
    monthlyRate: 350,
    notes: 'Competitive league captain. Organizes Tuesday mixers.',
    tags: ['advanced', 'league'],
  },
  // 30 – COLD_LEAD / NONE
  {
    id: 'player_30',
    firstName: 'Christina',
    lastName: 'Bell',
    email: 'christina.bell@email.com',
    phone: '+16155551030',
    whatsappPhone: null,
    source: 'WEBSITE',
    status: 'COLD_LEAD',
    membershipType: 'NONE',
    membershipStartDate: null,
    membershipEndDate: null,
    monthlyRate: null,
    notes: 'Attended one open house event 5 weeks ago.',
    tags: ['beginner'],
  },
]

// ---------------------------------------------------------------------------
// 2. VISITS (90) – spread over last 60 days
// ---------------------------------------------------------------------------

interface VisitSeed {
  id: string
  playerId: string
  courtNumber: number
  date: Date
  startHour: number
  durationHours: number
  type: string
  amountPaid: number
  notes: string | null
}

const visits: VisitSeed[] = [
  // Day -1 (yesterday)
  { id: 'visit_01', playerId: 'player_01', courtNumber: 1, date: subDays(TODAY, 1), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_02', playerId: 'player_05', courtNumber: 2, date: subDays(TODAY, 1), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_03', playerId: 'player_03', courtNumber: 3, date: subDays(TODAY, 1), startHour: 19, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  // Day -2
  { id: 'visit_04', playerId: 'player_11', courtNumber: 1, date: subDays(TODAY, 2), startHour: 7, durationHours: 2, type: 'MEMBER_SESSION', amountPaid: 0, notes: 'Morning training' },
  { id: 'visit_05', playerId: 'player_02', courtNumber: 4, date: subDays(TODAY, 2), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_06', playerId: 'player_08', courtNumber: 5, date: subDays(TODAY, 2), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -3
  { id: 'visit_07', playerId: 'player_15', courtNumber: 2, date: subDays(TODAY, 3), startHour: 8, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_08', playerId: 'player_27', courtNumber: 3, date: subDays(TODAY, 3), startHour: 17, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  { id: 'visit_09', playerId: 'player_22', courtNumber: 6, date: subDays(TODAY, 3), startHour: 19, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -4
  { id: 'visit_10', playerId: 'player_01', courtNumber: 1, date: subDays(TODAY, 4), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_11', playerId: 'player_13', courtNumber: 2, date: subDays(TODAY, 4), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_12', playerId: 'player_29', courtNumber: 3, date: subDays(TODAY, 4), startHour: 19, durationHours: 2, type: 'LESSON', amountPaid: 80, notes: 'Private lesson with Coach Manny' },
  // Day -5 (weekend day)
  { id: 'visit_13', playerId: 'player_05', courtNumber: 1, date: subDays(TODAY, 5), startHour: 9, durationHours: 2, type: 'MEMBER_SESSION', amountPaid: 0, notes: 'Weekend mixer organizer' },
  { id: 'visit_14', playerId: 'player_12', courtNumber: 2, date: subDays(TODAY, 5), startHour: 10, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  { id: 'visit_15', playerId: 'player_19', courtNumber: 3, date: subDays(TODAY, 5), startHour: 10, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  { id: 'visit_16', playerId: 'player_11', courtNumber: 4, date: subDays(TODAY, 5), startHour: 11, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_17', playerId: 'player_22', courtNumber: 5, date: subDays(TODAY, 5), startHour: 14, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -6 (weekend day)
  { id: 'visit_18', playerId: 'player_01', courtNumber: 1, date: subDays(TODAY, 6), startHour: 9, durationHours: 2, type: 'TOURNAMENT', amountPaid: 60, notes: 'Saturday mini-tournament' },
  { id: 'visit_19', playerId: 'player_15', courtNumber: 2, date: subDays(TODAY, 6), startHour: 9, durationHours: 2, type: 'TOURNAMENT', amountPaid: 60, notes: 'Saturday mini-tournament' },
  { id: 'visit_20', playerId: 'player_29', courtNumber: 3, date: subDays(TODAY, 6), startHour: 9, durationHours: 2, type: 'TOURNAMENT', amountPaid: 60, notes: 'Saturday mini-tournament' },
  { id: 'visit_21', playerId: 'player_11', courtNumber: 4, date: subDays(TODAY, 6), startHour: 9, durationHours: 2, type: 'TOURNAMENT', amountPaid: 60, notes: 'Saturday mini-tournament' },
  { id: 'visit_22', playerId: 'player_28', courtNumber: 5, date: subDays(TODAY, 6), startHour: 14, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -7
  { id: 'visit_23', playerId: 'player_02', courtNumber: 1, date: subDays(TODAY, 7), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_24', playerId: 'player_23', courtNumber: 2, date: subDays(TODAY, 7), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_25', playerId: 'player_06', courtNumber: 6, date: subDays(TODAY, 7), startHour: 19, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -8
  { id: 'visit_26', playerId: 'player_26', courtNumber: 3, date: subDays(TODAY, 8), startHour: 12, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: 'Lunch break session' },
  { id: 'visit_27', playerId: 'player_18', courtNumber: 4, date: subDays(TODAY, 8), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_28', playerId: 'player_09', courtNumber: 5, date: subDays(TODAY, 8), startHour: 18, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  // Day -10
  { id: 'visit_29', playerId: 'player_05', courtNumber: 1, date: subDays(TODAY, 10), startHour: 7, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_30', playerId: 'player_01', courtNumber: 2, date: subDays(TODAY, 10), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_31', playerId: 'player_27', courtNumber: 3, date: subDays(TODAY, 10), startHour: 19, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  // Day -12 (weekend)
  { id: 'visit_32', playerId: 'player_22', courtNumber: 1, date: subDays(TODAY, 12), startHour: 10, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_33', playerId: 'player_03', courtNumber: 2, date: subDays(TODAY, 12), startHour: 10, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  { id: 'visit_34', playerId: 'player_17', courtNumber: 4, date: subDays(TODAY, 12), startHour: 14, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_35', playerId: 'player_11', courtNumber: 6, date: subDays(TODAY, 12), startHour: 16, durationHours: 2, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -13 (weekend)
  { id: 'visit_36', playerId: 'player_15', courtNumber: 1, date: subDays(TODAY, 13), startHour: 9, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_37', playerId: 'player_29', courtNumber: 2, date: subDays(TODAY, 13), startHour: 9, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_38', playerId: 'player_04', courtNumber: 3, date: subDays(TODAY, 13), startHour: 11, durationHours: 1, type: 'LESSON', amountPaid: 80, notes: 'Intro lesson' },
  { id: 'visit_39', playerId: 'player_12', courtNumber: 5, date: subDays(TODAY, 13), startHour: 15, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  // Day -15
  { id: 'visit_40', playerId: 'player_13', courtNumber: 1, date: subDays(TODAY, 15), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_41', playerId: 'player_08', courtNumber: 2, date: subDays(TODAY, 15), startHour: 19, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_42', playerId: 'player_26', courtNumber: 4, date: subDays(TODAY, 15), startHour: 12, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: 'Lunch break session' },
  // Day -17
  { id: 'visit_43', playerId: 'player_01', courtNumber: 1, date: subDays(TODAY, 17), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_44', playerId: 'player_05', courtNumber: 3, date: subDays(TODAY, 17), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_45', playerId: 'player_19', courtNumber: 6, date: subDays(TODAY, 17), startHour: 19, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  // Day -19 (weekend)
  { id: 'visit_46', playerId: 'player_11', courtNumber: 1, date: subDays(TODAY, 19), startHour: 8, durationHours: 2, type: 'MEMBER_SESSION', amountPaid: 0, notes: 'Weekend training' },
  { id: 'visit_47', playerId: 'player_22', courtNumber: 2, date: subDays(TODAY, 19), startHour: 10, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_48', playerId: 'player_28', courtNumber: 4, date: subDays(TODAY, 19), startHour: 14, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: 'Before conversion to Unlimited' },
  { id: 'visit_49', playerId: 'player_21', courtNumber: 5, date: subDays(TODAY, 19), startHour: 15, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: 'First visit' },
  // Day -20 (weekend)
  { id: 'visit_50', playerId: 'player_15', courtNumber: 1, date: subDays(TODAY, 20), startHour: 9, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_51', playerId: 'player_29', courtNumber: 3, date: subDays(TODAY, 20), startHour: 10, durationHours: 2, type: 'LESSON', amountPaid: 80, notes: 'Advanced drill session' },
  { id: 'visit_52', playerId: 'player_06', courtNumber: 6, date: subDays(TODAY, 20), startHour: 16, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -22
  { id: 'visit_53', playerId: 'player_02', courtNumber: 2, date: subDays(TODAY, 22), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_54', playerId: 'player_23', courtNumber: 4, date: subDays(TODAY, 22), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -25
  { id: 'visit_55', playerId: 'player_01', courtNumber: 1, date: subDays(TODAY, 25), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_56', playerId: 'player_18', courtNumber: 5, date: subDays(TODAY, 25), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_57', playerId: 'player_27', courtNumber: 6, date: subDays(TODAY, 25), startHour: 19, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  // Day -26 (weekend)
  { id: 'visit_58', playerId: 'player_05', courtNumber: 1, date: subDays(TODAY, 26), startHour: 9, durationHours: 2, type: 'MEMBER_SESSION', amountPaid: 0, notes: 'Weekend mixer' },
  { id: 'visit_59', playerId: 'player_11', courtNumber: 2, date: subDays(TODAY, 26), startHour: 9, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_60', playerId: 'player_03', courtNumber: 3, date: subDays(TODAY, 26), startHour: 11, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: null },
  { id: 'visit_61', playerId: 'player_16', courtNumber: 4, date: subDays(TODAY, 26), startHour: 14, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: 'Only visit so far' },
  // Day -27 (weekend)
  { id: 'visit_62', playerId: 'player_22', courtNumber: 1, date: subDays(TODAY, 27), startHour: 10, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_63', playerId: 'player_29', courtNumber: 3, date: subDays(TODAY, 27), startHour: 11, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -30
  { id: 'visit_64', playerId: 'player_13', courtNumber: 2, date: subDays(TODAY, 30), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_65', playerId: 'player_08', courtNumber: 5, date: subDays(TODAY, 30), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_66', playerId: 'player_26', courtNumber: 6, date: subDays(TODAY, 30), startHour: 19, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -33 (weekend)
  { id: 'visit_67', playerId: 'player_15', courtNumber: 1, date: subDays(TODAY, 33), startHour: 9, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_68', playerId: 'player_01', courtNumber: 2, date: subDays(TODAY, 33), startHour: 10, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_69', playerId: 'player_07', courtNumber: 4, date: subDays(TODAY, 33), startHour: 14, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: 'Only visit – went cold after this' },
  // Day -35
  { id: 'visit_70', playerId: 'player_05', courtNumber: 3, date: subDays(TODAY, 35), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_71', playerId: 'player_17', courtNumber: 6, date: subDays(TODAY, 35), startHour: 18, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: 'Before conversion' },
  // Day -38
  { id: 'visit_72', playerId: 'player_11', courtNumber: 1, date: subDays(TODAY, 38), startHour: 7, durationHours: 2, type: 'MEMBER_SESSION', amountPaid: 0, notes: 'Early morning drill' },
  { id: 'visit_73', playerId: 'player_02', courtNumber: 4, date: subDays(TODAY, 38), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -40 (weekend)
  { id: 'visit_74', playerId: 'player_22', courtNumber: 2, date: subDays(TODAY, 40), startHour: 10, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_75', playerId: 'player_29', courtNumber: 5, date: subDays(TODAY, 40), startHour: 11, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_76', playerId: 'player_25', courtNumber: 6, date: subDays(TODAY, 40), startHour: 15, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: 'First visit via PlayByPoint' },
  // Day -42
  { id: 'visit_77', playerId: 'player_01', courtNumber: 1, date: subDays(TODAY, 42), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_78', playerId: 'player_23', courtNumber: 3, date: subDays(TODAY, 42), startHour: 19, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -45
  { id: 'visit_79', playerId: 'player_06', courtNumber: 2, date: subDays(TODAY, 45), startHour: 17, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: 'Right before converting to Standard' },
  { id: 'visit_80', playerId: 'player_18', courtNumber: 4, date: subDays(TODAY, 45), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -47 (weekend)
  { id: 'visit_81', playerId: 'player_05', courtNumber: 1, date: subDays(TODAY, 47), startHour: 9, durationHours: 2, type: 'PRIVATE_EVENT', amountPaid: 200, notes: 'Corporate team building event' },
  { id: 'visit_82', playerId: 'player_15', courtNumber: 3, date: subDays(TODAY, 47), startHour: 14, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_83', playerId: 'player_11', courtNumber: 5, date: subDays(TODAY, 47), startHour: 16, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -50
  { id: 'visit_84', playerId: 'player_13', courtNumber: 2, date: subDays(TODAY, 50), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_85', playerId: 'player_08', courtNumber: 6, date: subDays(TODAY, 50), startHour: 19, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -52
  { id: 'visit_86', playerId: 'player_26', courtNumber: 4, date: subDays(TODAY, 52), startHour: 12, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: 'Lunch session' },
  { id: 'visit_87', playerId: 'player_29', courtNumber: 1, date: subDays(TODAY, 52), startHour: 17, durationHours: 2, type: 'LESSON', amountPaid: 80, notes: 'Coaching session' },
  // Day -55
  { id: 'visit_88', playerId: 'player_01', courtNumber: 3, date: subDays(TODAY, 55), startHour: 17, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  { id: 'visit_89', playerId: 'player_22', courtNumber: 5, date: subDays(TODAY, 55), startHour: 18, durationHours: 1, type: 'MEMBER_SESSION', amountPaid: 0, notes: null },
  // Day -58
  { id: 'visit_90', playerId: 'player_30', courtNumber: 6, date: subDays(TODAY, 58), startHour: 14, durationHours: 1, type: 'CASUAL', amountPaid: 40, notes: 'Open house event attendance' },
]

// ---------------------------------------------------------------------------
// 3. PAYMENTS (45)
// ---------------------------------------------------------------------------

interface PaymentSeed {
  id: string
  playerId: string | null
  date: Date
  amount: number
  type: string
  method: string
  description: string
  receiptRef: string | null
}

const payments: PaymentSeed[] = [
  // Court rental payments (casual visits)
  { id: 'pay_01', playerId: 'player_03', date: subDays(TODAY, 1), amount: 40, type: 'COURT_RENTAL', method: 'CARD', description: 'Casual court rental', receiptRef: 'RCP-001' },
  { id: 'pay_02', playerId: 'player_12', date: subDays(TODAY, 5), amount: 40, type: 'COURT_RENTAL', method: 'CASH', description: 'Casual court rental', receiptRef: 'RCP-002' },
  { id: 'pay_03', playerId: 'player_19', date: subDays(TODAY, 5), amount: 40, type: 'COURT_RENTAL', method: 'CARD', description: 'Casual court rental', receiptRef: 'RCP-003' },
  { id: 'pay_04', playerId: 'player_27', date: subDays(TODAY, 3), amount: 40, type: 'COURT_RENTAL', method: 'PLAYBYPOINT', description: 'Casual court rental', receiptRef: 'RCP-004' },
  { id: 'pay_05', playerId: 'player_09', date: subDays(TODAY, 8), amount: 40, type: 'COURT_RENTAL', method: 'CARD', description: 'Casual court rental', receiptRef: 'RCP-005' },
  { id: 'pay_06', playerId: 'player_27', date: subDays(TODAY, 10), amount: 40, type: 'COURT_RENTAL', method: 'PLAYBYPOINT', description: 'Casual court rental', receiptRef: 'RCP-006' },
  { id: 'pay_07', playerId: 'player_19', date: subDays(TODAY, 17), amount: 40, type: 'COURT_RENTAL', method: 'CASH', description: 'Casual court rental', receiptRef: 'RCP-007' },
  { id: 'pay_08', playerId: 'player_03', date: subDays(TODAY, 12), amount: 40, type: 'COURT_RENTAL', method: 'CARD', description: 'Casual court rental', receiptRef: 'RCP-008' },
  { id: 'pay_09', playerId: 'player_27', date: subDays(TODAY, 25), amount: 40, type: 'COURT_RENTAL', method: 'CARD', description: 'Casual court rental', receiptRef: 'RCP-009' },
  { id: 'pay_10', playerId: 'player_03', date: subDays(TODAY, 26), amount: 40, type: 'COURT_RENTAL', method: 'CASH', description: 'Casual court rental', receiptRef: 'RCP-010' },
  { id: 'pay_11', playerId: 'player_16', date: subDays(TODAY, 26), amount: 40, type: 'COURT_RENTAL', method: 'CARD', description: 'Casual court rental', receiptRef: 'RCP-011' },
  { id: 'pay_12', playerId: 'player_07', date: subDays(TODAY, 33), amount: 40, type: 'COURT_RENTAL', method: 'TRANSFER', description: 'Casual court rental', receiptRef: 'RCP-012' },
  { id: 'pay_13', playerId: 'player_17', date: subDays(TODAY, 35), amount: 40, type: 'COURT_RENTAL', method: 'PLAYBYPOINT', description: 'Casual court rental', receiptRef: 'RCP-013' },
  { id: 'pay_14', playerId: 'player_25', date: subDays(TODAY, 40), amount: 40, type: 'COURT_RENTAL', method: 'PLAYBYPOINT', description: 'Casual court rental via PlayByPoint', receiptRef: 'RCP-014' },
  { id: 'pay_15', playerId: 'player_06', date: subDays(TODAY, 45), amount: 40, type: 'COURT_RENTAL', method: 'CARD', description: 'Casual court rental', receiptRef: 'RCP-015' },
  { id: 'pay_16', playerId: 'player_28', date: subDays(TODAY, 19), amount: 40, type: 'COURT_RENTAL', method: 'CARD', description: 'Casual court rental', receiptRef: 'RCP-016' },
  { id: 'pay_17', playerId: 'player_21', date: subDays(TODAY, 19), amount: 40, type: 'COURT_RENTAL', method: 'CASH', description: 'Casual court rental – first visit', receiptRef: 'RCP-017' },
  { id: 'pay_18', playerId: 'player_30', date: subDays(TODAY, 58), amount: 40, type: 'COURT_RENTAL', method: 'CARD', description: 'Open house casual play', receiptRef: 'RCP-018' },
  { id: 'pay_19', playerId: 'player_12', date: subDays(TODAY, 13), amount: 40, type: 'COURT_RENTAL', method: 'CASH', description: 'Casual court rental', receiptRef: 'RCP-019' },

  // Lesson payments
  { id: 'pay_20', playerId: 'player_29', date: subDays(TODAY, 4), amount: 80, type: 'LESSON', method: 'CARD', description: 'Private lesson – Coach Manny', receiptRef: 'RCP-020' },
  { id: 'pay_21', playerId: 'player_04', date: subDays(TODAY, 13), amount: 80, type: 'LESSON', method: 'CARD', description: 'Intro lesson', receiptRef: 'RCP-021' },
  { id: 'pay_22', playerId: 'player_29', date: subDays(TODAY, 20), amount: 80, type: 'LESSON', method: 'TRANSFER', description: 'Advanced drill session', receiptRef: 'RCP-022' },
  { id: 'pay_23', playerId: 'player_29', date: subDays(TODAY, 52), amount: 80, type: 'LESSON', method: 'CARD', description: 'Coaching session', receiptRef: 'RCP-023' },

  // Tournament payments
  { id: 'pay_24', playerId: 'player_01', date: subDays(TODAY, 6), amount: 60, type: 'EVENT', method: 'CARD', description: 'Saturday mini-tournament entry', receiptRef: 'RCP-024' },
  { id: 'pay_25', playerId: 'player_15', date: subDays(TODAY, 6), amount: 60, type: 'EVENT', method: 'CARD', description: 'Saturday mini-tournament entry', receiptRef: 'RCP-025' },
  { id: 'pay_26', playerId: 'player_29', date: subDays(TODAY, 6), amount: 60, type: 'EVENT', method: 'TRANSFER', description: 'Saturday mini-tournament entry', receiptRef: 'RCP-026' },
  { id: 'pay_27', playerId: 'player_11', date: subDays(TODAY, 6), amount: 60, type: 'EVENT', method: 'CARD', description: 'Saturday mini-tournament entry', receiptRef: 'RCP-027' },

  // Private event
  { id: 'pay_28', playerId: 'player_05', date: subDays(TODAY, 47), amount: 200, type: 'EVENT', method: 'TRANSFER', description: 'Corporate team building event', receiptRef: 'RCP-028' },

  // Membership payments (monthly)
  { id: 'pay_29', playerId: 'player_01', date: subDays(TODAY, 1), amount: 350, type: 'MEMBERSHIP', method: 'CARD', description: 'Unlimited membership – March 2026', receiptRef: 'MEM-001' },
  { id: 'pay_30', playerId: 'player_05', date: subDays(TODAY, 1), amount: 350, type: 'MEMBERSHIP', method: 'CARD', description: 'Unlimited membership – March 2026', receiptRef: 'MEM-002' },
  { id: 'pay_31', playerId: 'player_11', date: subDays(TODAY, 1), amount: 350, type: 'MEMBERSHIP', method: 'TRANSFER', description: 'Unlimited membership – March 2026', receiptRef: 'MEM-003' },
  { id: 'pay_32', playerId: 'player_22', date: subDays(TODAY, 1), amount: 350, type: 'MEMBERSHIP', method: 'CARD', description: 'Unlimited membership – March 2026', receiptRef: 'MEM-004' },
  { id: 'pay_33', playerId: 'player_15', date: subDays(TODAY, 1), amount: 350, type: 'MEMBERSHIP', method: 'CARD', description: 'Unlimited membership – March 2026', receiptRef: 'MEM-005' },
  { id: 'pay_34', playerId: 'player_29', date: subDays(TODAY, 1), amount: 350, type: 'MEMBERSHIP', method: 'TRANSFER', description: 'Unlimited membership – March 2026', receiptRef: 'MEM-006' },
  { id: 'pay_35', playerId: 'player_28', date: subDays(TODAY, 1), amount: 350, type: 'MEMBERSHIP', method: 'CARD', description: 'Unlimited membership – March 2026', receiptRef: 'MEM-007' },
  { id: 'pay_36', playerId: 'player_02', date: subDays(TODAY, 1), amount: 200, type: 'MEMBERSHIP', method: 'CARD', description: 'Standard membership – March 2026', receiptRef: 'MEM-008' },
  { id: 'pay_37', playerId: 'player_08', date: subDays(TODAY, 1), amount: 200, type: 'MEMBERSHIP', method: 'CARD', description: 'Standard membership – March 2026', receiptRef: 'MEM-009' },
  { id: 'pay_38', playerId: 'player_06', date: subDays(TODAY, 1), amount: 200, type: 'MEMBERSHIP', method: 'TRANSFER', description: 'Standard membership – March 2026', receiptRef: 'MEM-010' },
  { id: 'pay_39', playerId: 'player_13', date: subDays(TODAY, 1), amount: 200, type: 'MEMBERSHIP', method: 'CARD', description: 'Standard membership – March 2026', receiptRef: 'MEM-011' },
  { id: 'pay_40', playerId: 'player_17', date: subDays(TODAY, 1), amount: 200, type: 'MEMBERSHIP', method: 'CARD', description: 'Standard membership – March 2026', receiptRef: 'MEM-012' },
  { id: 'pay_41', playerId: 'player_18', date: subDays(TODAY, 1), amount: 200, type: 'MEMBERSHIP', method: 'CARD', description: 'Standard membership – March 2026', receiptRef: 'MEM-013' },
  { id: 'pay_42', playerId: 'player_23', date: subDays(TODAY, 1), amount: 200, type: 'MEMBERSHIP', method: 'CARD', description: 'Standard membership – March 2026', receiptRef: 'MEM-014' },
  { id: 'pay_43', playerId: 'player_26', date: subDays(TODAY, 1), amount: 200, type: 'MEMBERSHIP', method: 'TRANSFER', description: 'Standard membership – March 2026', receiptRef: 'MEM-015' },

  // Pro shop purchases
  { id: 'pay_44', playerId: 'player_01', date: subDays(TODAY, 10), amount: 65, type: 'PRO_SHOP', method: 'CARD', description: 'Padel racket grip + overgrips', receiptRef: 'SHOP-001' },
  { id: 'pay_45', playerId: 'player_11', date: subDays(TODAY, 15), amount: 120, type: 'PRO_SHOP', method: 'CARD', description: 'Head padel balls (6 cans)', receiptRef: 'SHOP-002' },
]

// ---------------------------------------------------------------------------
// 4. DAILY REVENUE (14 days)
// ---------------------------------------------------------------------------

interface DailyRevenueSeed {
  date: Date
  courtRentals: number
  memberships: number
  lessons: number
  proShop: number
  events: number
  other: number
  notes: string | null
}

const dailyRevenues: DailyRevenueSeed[] = [
  // Day -1 (Mon) – membership billing day + casual play
  { date: subDays(TODAY, 1), courtRentals: 120, memberships: 4550, lessons: 0, proShop: 0, events: 0, other: 0, notes: 'Monthly membership billing day' },
  // Day -2 (Sun)
  { date: subDays(TODAY, 2), courtRentals: 240, memberships: 0, lessons: 0, proShop: 45, events: 0, other: 0, notes: null },
  // Day -3 (Sat)
  { date: subDays(TODAY, 3), courtRentals: 360, memberships: 0, lessons: 80, proShop: 60, events: 0, other: 0, notes: 'Busy Saturday' },
  // Day -4 (Fri)
  { date: subDays(TODAY, 4), courtRentals: 200, memberships: 0, lessons: 80, proShop: 0, events: 0, other: 0, notes: null },
  // Day -5 (Thu)
  { date: subDays(TODAY, 5), courtRentals: 280, memberships: 0, lessons: 0, proShop: 30, events: 0, other: 0, notes: null },
  // Day -6 (Wed) – mini tournament
  { date: subDays(TODAY, 6), courtRentals: 160, memberships: 0, lessons: 0, proShop: 85, events: 240, other: 0, notes: 'Saturday mini-tournament' },
  // Day -7 (Tue)
  { date: subDays(TODAY, 7), courtRentals: 120, memberships: 0, lessons: 0, proShop: 0, events: 0, other: 15, notes: null },
  // Day -8 (Mon)
  { date: subDays(TODAY, 8), courtRentals: 160, memberships: 0, lessons: 0, proShop: 0, events: 0, other: 0, notes: null },
  // Day -9 (Sun)
  { date: subDays(TODAY, 9), courtRentals: 320, memberships: 0, lessons: 0, proShop: 55, events: 0, other: 0, notes: null },
  // Day -10 (Sat)
  { date: subDays(TODAY, 10), courtRentals: 400, memberships: 0, lessons: 0, proShop: 65, events: 0, other: 0, notes: 'Pro shop racket grip sale' },
  // Day -11 (Fri)
  { date: subDays(TODAY, 11), courtRentals: 200, memberships: 0, lessons: 0, proShop: 0, events: 0, other: 0, notes: null },
  // Day -12 (Thu)
  { date: subDays(TODAY, 12), courtRentals: 280, memberships: 0, lessons: 0, proShop: 0, events: 0, other: 25, notes: null },
  // Day -13 (Wed)
  { date: subDays(TODAY, 13), courtRentals: 240, memberships: 0, lessons: 80, proShop: 0, events: 0, other: 0, notes: null },
  // Day -14 (Tue)
  { date: subDays(TODAY, 14), courtRentals: 160, memberships: 0, lessons: 0, proShop: 40, events: 0, other: 0, notes: null },
]

// ---------------------------------------------------------------------------
// 5. MESSAGE TEMPLATES (6)
// ---------------------------------------------------------------------------

interface TemplateSeed {
  id: string
  name: string
  channel: string
  category: string
  subject: string | null
  body: string
  isActive: boolean
}

const messageTemplates: TemplateSeed[] = [
  {
    id: 'tmpl_01',
    name: 'Welcome – First Visit Follow-up',
    channel: 'WHATSAPP',
    category: 'WELCOME',
    subject: null,
    body: `Hi {{firstName}}! 👋

Thanks for visiting Sensa Padel Nashville! We loved having you on the courts.

Here's what you can do next:
• Book your next session at sensapadel.com/book
• Check out our membership options (starting at $200/mo)
• Join our beginner clinics every Saturday at 10am

Questions? Just reply to this message!

See you on the court 🎾`,
    isActive: true,
  },
  {
    id: 'tmpl_02',
    name: 'Win-back – 14 Days Inactive',
    channel: 'WHATSAPP',
    category: 'WIN_BACK',
    subject: null,
    body: `Hey {{firstName}}, we miss you at Sensa! 🏓

It's been a couple of weeks since your last visit. The courts are calling!

Book a session this week and get 20% off your court rental. Use code COMEBACK20 at checkout.

Hope to see you soon!`,
    isActive: true,
  },
  {
    id: 'tmpl_03',
    name: 'Win-back – 30 Days Inactive',
    channel: 'EMAIL',
    category: 'WIN_BACK',
    subject: 'We miss you at Sensa Padel, {{firstName}}!',
    body: `Hi {{firstName}},

It's been a month since we last saw you at Sensa Padel Nashville, and we wanted to check in.

We've made some exciting updates:
- New evening clinics on Wednesdays
- Weekend mixer doubles tournaments
- Improved court lighting

As a special offer, enjoy a FREE court session on us. Just reply to this email to claim your complimentary booking.

We'd love to have you back!

Best,
The Sensa Padel Team`,
    isActive: true,
  },
  {
    id: 'tmpl_04',
    name: 'Upsell – Casual to Standard',
    channel: 'WHATSAPP',
    category: 'UPSELL',
    subject: null,
    body: `Hey {{firstName}}! 🎾

We noticed you've been playing regularly – awesome! Did you know our Standard membership could save you money?

Standard Membership ($200/mo):
✅ 8 court sessions per month
✅ Priority booking
✅ 10% off pro shop
✅ Free guest pass each month

Based on your recent visits, you'd save about \${{estimatedSavings}}/month!

Want to learn more? Reply YES and we'll set you up.`,
    isActive: true,
  },
  {
    id: 'tmpl_05',
    name: 'Upsell – Standard to Unlimited',
    channel: 'EMAIL',
    category: 'UPSELL',
    subject: 'Upgrade to Unlimited and play every day, {{firstName}}!',
    body: `Hi {{firstName}},

You're getting great use out of your Standard membership! We think you might love our Unlimited plan even more.

Unlimited Membership ($350/mo):
- Unlimited court sessions (no caps!)
- Priority booking during peak hours
- 20% off pro shop
- 2 free guest passes per month
- Access to members-only tournaments
- Free racket re-gripping (monthly)

That's only $150 more per month for unlimited play. Based on your usage, it practically pays for itself.

Ready to upgrade? Reply to this email or visit the front desk.

See you on the court!
The Sensa Padel Team`,
    isActive: true,
  },
  {
    id: 'tmpl_06',
    name: 'Monthly Membership Reminder',
    channel: 'WHATSAPP',
    category: 'REMINDER',
    subject: null,
    body: `Hi {{firstName}},

Just a heads-up that your {{membershipType}} membership renewal is coming up on {{renewalDate}}.

Amount: \${{monthlyRate}}
Payment method: {{paymentMethod}} ending in {{lastFour}}

No action needed if everything looks good – we'll process it automatically.

If you need to update your payment info or have questions, just reply here.

Thanks for being a Sensa member! 🙌`,
    isActive: true,
  },
]

// ---------------------------------------------------------------------------
// 6. SETTINGS
// ---------------------------------------------------------------------------

interface SettingSeed {
  key: string
  value: unknown
}

const settings: SettingSeed[] = [
  { key: 'court_count', value: 6 },
  { key: 'casual_rate', value: 40 },
  { key: 'standard_rate', value: 200 },
  { key: 'unlimited_rate', value: 350 },
  { key: 'peak_hours', value: [17, 18, 19, 20, 21] },
  { key: 'currency', value: 'USD' },
]

// ---------------------------------------------------------------------------
// SEED EXECUTION
// ---------------------------------------------------------------------------

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data in order (respecting foreign keys)
  console.log('  Clearing existing data...')
  await prisma.message.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.visit.deleteMany()
  await prisma.player.deleteMany()
  await prisma.dailyRevenue.deleteMany()
  await prisma.messageTemplate.deleteMany()
  await prisma.aIConversation.deleteMany()
  await prisma.setting.deleteMany()

  // 1. Players
  console.log('  Creating 30 players...')
  for (const p of players) {
    await prisma.player.create({
      data: {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        whatsappPhone: p.whatsappPhone,
        source: p.source as any,
        status: p.status as any,
        membershipType: p.membershipType as any,
        membershipStartDate: p.membershipStartDate,
        membershipEndDate: p.membershipEndDate,
        monthlyRate: p.monthlyRate,
        notes: p.notes,
        tags: p.tags,
      },
    })
  }

  // 2. Visits
  console.log('  Creating 90 visits...')
  for (const v of visits) {
    const startTime = addHours(v.date, v.startHour)
    const endTime = addHours(startTime, v.durationHours)
    await prisma.visit.create({
      data: {
        id: v.id,
        playerId: v.playerId,
        courtNumber: v.courtNumber,
        date: dateOnly(v.date),
        startTime,
        endTime,
        type: v.type as any,
        amountPaid: v.amountPaid,
        notes: v.notes,
      },
    })
  }

  // 3. Payments
  console.log('  Creating 45 payments...')
  for (const p of payments) {
    await prisma.payment.create({
      data: {
        id: p.id,
        playerId: p.playerId,
        date: dateOnly(p.date),
        amount: p.amount,
        type: p.type as any,
        method: p.method as any,
        description: p.description,
        receiptRef: p.receiptRef,
      },
    })
  }

  // 4. Daily Revenue
  console.log('  Creating 14 daily revenue entries...')
  for (const dr of dailyRevenues) {
    const total = dr.courtRentals + dr.memberships + dr.lessons + dr.proShop + dr.events + dr.other
    await prisma.dailyRevenue.create({
      data: {
        date: dateOnly(dr.date),
        courtRentals: dr.courtRentals,
        memberships: dr.memberships,
        lessons: dr.lessons,
        proShop: dr.proShop,
        events: dr.events,
        other: dr.other,
        totalRevenue: total,
        notes: dr.notes,
      },
    })
  }

  // 5. Message Templates
  console.log('  Creating 6 message templates...')
  for (const t of messageTemplates) {
    await prisma.messageTemplate.create({
      data: {
        id: t.id,
        name: t.name,
        channel: t.channel as any,
        category: t.category as any,
        subject: t.subject,
        body: t.body,
        isActive: t.isActive,
      },
    })
  }

  // 6. Settings
  console.log('  Creating 6 default settings...')
  for (const s of settings) {
    await prisma.setting.create({
      data: {
        key: s.key,
        value: s.value as any,
      },
    })
  }

  console.log('')
  console.log('✅ Seed complete!')
  console.log('   - 30 players')
  console.log('   - 90 visits')
  console.log('   - 45 payments')
  console.log('   - 14 daily revenue entries')
  console.log('   - 6 message templates')
  console.log('   - 6 settings')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
