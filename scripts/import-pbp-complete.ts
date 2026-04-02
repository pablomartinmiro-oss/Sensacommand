/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx'
import { PrismaClient } from '../src/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── Excel serial → JS Date ─────────────────────────────────────────
function excelDate(v: any): Date | null {
  if (!v) return null
  if (typeof v === 'number') {
    // Excel serial number → JS Date
    const d = new Date((v - 25569) * 86400000)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function daysDiff(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86400000)
}

function cleanPhone(phone: any): string | null {
  if (!phone) return null
  const s = String(phone).replace(/\D/g, '')
  return s.length >= 10 ? s : null
}

// ─── Mapping helpers ────────────────────────────────────────────────
function getEntryChannel(firstVisitType: string | null): string {
  if (!firstVisitType) return 'UNKNOWN'
  switch (firstVisitType) {
    case 'Reservation': return 'DIRECT_BOOKING'
    case 'Practice':
    case 'Practice - Clinic': return 'CLINIC'
    case 'Party': return 'EVENT'
    case 'Lesson': return 'LESSON'
    case 'Play':
    case 'Play - Open Play': return 'OPEN_PLAY'
    case 'Play - Community Play': return 'COMMUNITY_PLAY'
    case 'Play - Tournament': return 'TOURNAMENT'
    case 'Private Events': return 'PRIVATE_EVENT'
    default: return 'OTHER'
  }
}

function parseVisitDetails(details: any): { court: string | null; program: string | null } {
  if (!details) return { court: null, program: null }
  const s = String(details)
  const courtMatch = s.match(/Padel Court (\d+)/)
  const court = courtMatch ? `Padel Court ${courtMatch[1]}` : null

  if (s.startsWith('Program:')) {
    return { court, program: s.replace('Program:', '').trim() }
  }
  if (s.includes('Teacher:')) {
    const teacherMatch = s.match(/Teacher:\s*([^,]+)/)
    return { court, program: teacherMatch ? `Lesson with ${teacherMatch[1].trim()}` : null }
  }
  return { court, program: null }
}

function parseCourtNumber(court: string | null): number {
  if (!court) return 1
  const match = court.match(/(\d+)/)
  return match ? parseInt(match[1]) : 1
}

function mapMembership(plan: any): { type: string; rate: number } {
  if (!plan) return { type: 'NONE', rate: 0 }
  const p = String(plan).toLowerCase()
  if (p.includes('sensa staff') || p.includes('team sensa')) return { type: 'UNLIMITED', rate: 0 }
  if (p.includes('all access')) return { type: 'UNLIMITED', rate: 200 }
  if (p.includes('play more') || p.includes('germantown') || p.includes('off-peak') ||
    p.includes('off peak') || p.includes('industrious') || p.includes('neuhoff'))
    return { type: 'STANDARD', rate: 79 }
  return { type: 'NONE', rate: 0 }
}

function calculateStatus(totalVisits: number, lastVisitDate: Date | null, isMember: boolean): string {
  if (isMember) return 'CONVERTED'
  const daysSince = lastVisitDate ? daysDiff(new Date(), lastVisitDate) : 9999
  if (totalVisits >= 3 && daysSince <= 60) return 'HOT_LEAD'
  if (totalVisits >= 1 && daysSince <= 90) return 'ACTIVE'
  if (totalVisits >= 1) return 'COLD_LEAD'
  return 'NEW'
}

function calculateConversionScore(
  totalVisits: number, lastVisitDate: Date | null, dateJoined: Date | null,
  entryChannel: string, hasPhone: boolean, hasEmail: boolean
): number {
  let score = 0

  // VISIT FREQUENCY (max 35)
  if (totalVisits >= 6) score += 35
  else if (totalVisits >= 4) score += 28
  else if (totalVisits >= 3) score += 22
  else if (totalVisits >= 2) score += 15
  else if (totalVisits >= 1) score += 8

  // RECENCY (max 25)
  const days = lastVisitDate ? daysDiff(new Date(), lastVisitDate) : 9999
  if (days <= 7) score += 25
  else if (days <= 14) score += 20
  else if (days <= 30) score += 15
  else if (days <= 60) score += 8
  else if (days <= 90) score += 3

  // ENTRY CHANNEL (max 15)
  if (entryChannel === 'OPEN_PLAY') score += 15
  else if (entryChannel === 'LESSON') score += 13
  else if (entryChannel === 'CLINIC') score += 11
  else if (entryChannel === 'DIRECT_BOOKING') score += 9
  else if (entryChannel === 'COMMUNITY_PLAY') score += 9
  else if (entryChannel === 'EVENT') score += 5
  else if (entryChannel === 'PRIVATE_EVENT') score += 3

  // VISIT VELOCITY (max 15)
  if (dateJoined && lastVisitDate && totalVisits >= 2) {
    const monthsActive = Math.max(1, daysDiff(lastVisitDate, dateJoined) / 30)
    const visitsPerMonth = totalVisits / monthsActive
    if (visitsPerMonth >= 4) score += 15
    else if (visitsPerMonth >= 2) score += 12
    else if (visitsPerMonth >= 1) score += 8
    else if (visitsPerMonth >= 0.5) score += 4
  }

  // CONTACT INFO (max 10)
  if (hasEmail) score += 5
  if (hasPhone) score += 5

  return Math.min(score, 100)
}

function getFunnelStage(totalVisits: number, lastVisitDate: Date | null, isMember: boolean, score: number): string {
  if (isMember) return 'MEMBER'
  const days = lastVisitDate ? daysDiff(new Date(), lastVisitDate) : 9999
  if (score >= 70 && totalVisits >= 3 && days <= 60) return 'HOT_PROSPECT'
  if (totalVisits >= 3 && days <= 90) return 'REGULAR'
  if (totalVisits === 2 && days <= 90) return 'RETURNING'
  if (totalVisits === 1 && days <= 60) return 'FIRST_TIMER'
  if (totalVisits >= 1 && days > 90) return 'LAPSED'
  return 'UNKNOWN'
}

function mapVisitType(pbpType: string | null): string {
  if (!pbpType) return 'CASUAL'
  switch (pbpType) {
    case 'Reservation': return 'CASUAL'
    case 'Lesson': return 'LESSON'
    case 'Play - Tournament':
    case 'Tournament': return 'TOURNAMENT'
    case 'Party':
    case 'Private Events': return 'PRIVATE_EVENT'
    default: return 'CASUAL' // Practice, Play, etc.
  }
}

// ─── Main import ────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log(' SENSA PADEL — COMPLETE PBP INTELLIGENCE IMPORT')
  console.log('═══════════════════════════════════════════════')
  console.log()

  // ── Read File 1: pbp-players-full.xlsx ────────────────────
  console.log('[1/6] Reading pbp-players-full.xlsx...')
  const wb1 = XLSX.readFile('data/pbp-players-full.xlsx')
  const ws1 = wb1.Sheets[wb1.SheetNames[0]]
  const rows1 = XLSX.utils.sheet_to_json(ws1, { header: 1 }) as any[][]
  console.log(`  ${rows1.length - 2} data rows`)

  const file1Map = new Map<string, any>()
  for (let i = 2; i < rows1.length; i++) {
    const r = rows1[i]
    const email = r[4] ? String(r[4]).toLowerCase().trim() : null
    if (!email) continue
    file1Map.set(email, {
      uuid: r[0], playerName: r[1] ? String(r[1]).trim() : '', memberTag: r[3],
      birthdate: r[5], nprp: r[6] ? parseFloat(String(r[6])) : null,
      gender: r[8], phone: r[9], zipCode: r[10],
      association: r[14], tags: r[15] ? String(r[15]) : '',
      firstVisit: r[16], firstVisitType: r[17] ? String(r[17]) : null,
      firstVisitDetails: r[18] ? String(r[18]) : null,
      totalVisits: typeof r[19] === 'number' ? r[19] : parseInt(String(r[19] || '0')),
      lastVisit: r[20], lastVisitType: r[21] ? String(r[21]) : null,
      lastVisitDetails: r[22] ? String(r[22]) : null,
      dateJoined: r[23], address: r[25], city: r[26], state: r[27], zip: r[28],
    })
  }
  console.log(`  ${file1Map.size} unique emails from File 1`)

  // ── Read File 2: pbp-bookings.xlsx ────────────────────────
  console.log('[2/6] Reading pbp-bookings.xlsx...')
  const wb2 = XLSX.readFile('data/pbp-bookings.xlsx')
  const ws2 = wb2.Sheets[wb2.SheetNames[0]]
  const rows2 = XLSX.utils.sheet_to_json(ws2, { header: 1 }) as any[][]
  console.log(`  ${rows2.length - 2} data rows`)

  const file2Map = new Map<string, any>()
  for (let i = 2; i < rows2.length; i++) {
    const r = rows2[i]
    const email = r[2] ? String(r[2]).toLowerCase().trim() : null
    if (!email) continue
    file2Map.set(email, {
      uuid: r[0], playerName: r[1] ? String(r[1]).trim() : '',
      ntrp: r[5] ? parseFloat(String(r[5])) : null,
      association: r[9], membership: r[10] ? String(r[10]) : null,
      membershipEnd: r[11], dateJoined: r[12],
      reservations: typeof r[13] === 'number' ? r[13] : parseInt(String(r[13] || '0')),
      rainouts: typeof r[14] === 'number' ? r[14] : parseInt(String(r[14] || '0')),
      noShows: typeof r[15] === 'number' ? r[15] : parseInt(String(r[15] || '0')),
      cancellations: typeof r[16] === 'number' ? r[16] : parseInt(String(r[16] || '0')),
    })
  }
  console.log(`  ${file2Map.size} unique emails from File 2`)

  // ── Merge into all emails ─────────────────────────────────
  const allEmails = new Set([...file1Map.keys(), ...file2Map.keys()])
  console.log(`  ${allEmails.size} total unique emails`)
  console.log()

  // ── Clean existing data ───────────────────────────────────
  console.log('[3/6] Cleaning existing data (keeping goals, team, automations, settings, leave, social)...')
  const delVisits = await prisma.visit.deleteMany({})
  const delPayments = await prisma.payment.deleteMany({})
  const delRevenue = await prisma.dailyRevenue.deleteMany({})
  const delMessages = await prisma.message.deleteMany({})
  const delConvos = await prisma.aIConversation.deleteMany({})
  const delReferrals = await prisma.referral.deleteMany({})
  // Must delete automationLogs referencing players
  const delAutoLogs = await prisma.automationLog.deleteMany({ where: { targetPlayerId: { not: null } } })
  const delPlayers = await prisma.player.deleteMany({})
  console.log(`  Deleted: ${delPlayers.count} players, ${delVisits.count} visits, ${delPayments.count} payments,`)
  console.log(`           ${delRevenue.count} revenue, ${delMessages.count} messages, ${delConvos.count} conversations`)
  console.log(`           ${delReferrals.count} referrals, ${delAutoLogs.count} automation logs`)
  console.log()

  // ── Import players ────────────────────────────────────────
  console.log('[4/6] Importing players...')
  let created = 0
  let skipped = 0
  const stats = {
    withPhone: 0, withEmail: 0,
    memberUnlimited: 0, memberStandard: 0, memberStaff: 0, totalMRR: 0,
    channels: {} as Record<string, number>,
    channelMembers: {} as Record<string, number>,
    visitDist: { one: 0, two: 0, threeFive: 0, sixPlus: 0 },
    programs: {} as Record<string, number>,
    funnelStages: {} as Record<string, number>,
    courts: {} as Record<string, number>,
  }
  const topProspects: { name: string; score: number; visits: number; last: string; entry: string; phone: string }[] = []
  // Track seen emails to handle duplicates
  const seenEmails = new Set<string>()

  for (const email of allEmails) {
    const d1 = file1Map.get(email) || null
    const d2 = file2Map.get(email) || null

    const name = (d1?.playerName || d2?.playerName || '').trim()
    const parts = name.split(/\s+/)
    const firstName = parts[0] || 'Unknown'
    const lastName = parts.slice(1).join(' ') || ''

    const totalVisits = d1?.totalVisits || 0
    const firstVisitDate = excelDate(d1?.firstVisit)
    const lastVisitDate = excelDate(d1?.lastVisit)
    const firstDetails = parseVisitDetails(d1?.firstVisitDetails)
    const lastDetails = parseVisitDetails(d1?.lastVisitDetails)
    const entryChannel = getEntryChannel(d1?.firstVisitType)
    const membership = mapMembership(d2?.membership)
    const isMember = d2?.association === 'Member' || membership.type !== 'NONE'
    const dateJoined = excelDate(d1?.dateJoined) || excelDate(d2?.dateJoined)

    // SKIP if: no visits AND not member AND joined > 6 months ago
    if (totalVisits === 0 && !isMember) {
      if (!dateJoined || daysDiff(new Date(), dateJoined) > 180) {
        skipped++
        continue
      }
    }

    // Skip duplicate emails
    if (seenEmails.has(email)) { skipped++; continue }
    seenEmails.add(email)

    const phone = cleanPhone(d1?.phone)
    const score = isMember ? 0 : calculateConversionScore(
      totalVisits, lastVisitDate, dateJoined, entryChannel, !!phone, true
    )
    const status = calculateStatus(totalVisits, lastVisitDate, isMember)
    const funnelStage = getFunnelStage(totalVisits, lastVisitDate, isMember, score)

    const ratingRaw = d1?.nprp || d2?.ntrp
    const rating = typeof ratingRaw === 'number' && ratingRaw > 0 ? ratingRaw : null

    try {
      const player = await prisma.player.create({
        data: {
          firstName, lastName,
          email: email || null,
          phone,
          source: 'PLAYBYPOINT',
          pbpUuid: d1?.uuid || d2?.uuid || null,
          totalVisits,
          firstVisitDate,
          firstVisitType: d1?.firstVisitType || null,
          firstVisitCourt: firstDetails.court,
          firstVisitProgram: firstDetails.program,
          lastVisitDate,
          lastVisitType: d1?.lastVisitType || null,
          lastVisitCourt: lastDetails.court,
          lastVisitProgram: lastDetails.program,
          reservationCount: d2?.reservations || 0,
          entryChannel,
          noShowCount: d2?.noShows || 0,
          rainoutCount: d2?.rainouts || 0,
          cancellationCount: d2?.cancellations || 0,
          rating,
          gender: d1?.gender && d1.gender !== 'Not specified' ? String(d1.gender) : null,
          birthday: excelDate(d1?.birthdate),
          playerAddress: d1?.address ? String(d1.address) : null,
          playerCity: d1?.city ? String(d1.city) : null,
          playerState: d1?.state ? String(d1.state) : null,
          zipCode: d1?.zip ? String(d1.zip) : d1?.zipCode ? String(d1.zipCode) : null,
          pbpTags: d1?.tags || null,
          dateJoined,
          membershipType: membership.type as any,
          monthlyRate: membership.rate,
          membershipStartDate: isMember ? dateJoined : null,
          membershipEndDate: excelDate(d2?.membershipEnd),
          status: status as any,
          conversionScore: score,
          funnelStage,
        },
      })

      // ── Create Visit records (max 2 per player) ─────
      if (firstVisitDate) {
        await prisma.visit.create({
          data: {
            playerId: player.id,
            date: firstVisitDate,
            courtNumber: parseCourtNumber(firstDetails.court),
            startTime: firstVisitDate,
            endTime: new Date(firstVisitDate.getTime() + 90 * 60000),
            type: mapVisitType(d1?.firstVisitType) as any,
            amountPaid: 0,
            notes: [firstDetails.court, firstDetails.program].filter(Boolean).join(' · ') || 'First visit (PBP import)',
          },
        })

        if (lastVisitDate && lastVisitDate.getTime() !== firstVisitDate.getTime()) {
          await prisma.visit.create({
            data: {
              playerId: player.id,
              date: lastVisitDate,
              courtNumber: parseCourtNumber(lastDetails.court),
              startTime: lastVisitDate,
              endTime: new Date(lastVisitDate.getTime() + 90 * 60000),
              type: mapVisitType(d1?.lastVisitType) as any,
              amountPaid: 0,
              notes: [lastDetails.court, lastDetails.program].filter(Boolean).join(' · ') || 'Last visit (PBP import)',
            },
          })
        }
      }

      created++

      // ── Collect stats ──────────────────────────────
      if (phone) stats.withPhone++
      stats.withEmail++

      if (isMember) {
        if (membership.rate === 0) stats.memberStaff++
        else if (membership.type === 'UNLIMITED') stats.memberUnlimited++
        else stats.memberStandard++
        stats.totalMRR += membership.rate
      }

      stats.channels[entryChannel] = (stats.channels[entryChannel] || 0) + 1
      if (isMember) stats.channelMembers[entryChannel] = (stats.channelMembers[entryChannel] || 0) + 1

      if (totalVisits === 1) stats.visitDist.one++
      else if (totalVisits === 2) stats.visitDist.two++
      else if (totalVisits >= 3 && totalVisits <= 5) stats.visitDist.threeFive++
      else if (totalVisits >= 6) stats.visitDist.sixPlus++

      if (firstDetails.program) stats.programs[firstDetails.program] = (stats.programs[firstDetails.program] || 0) + 1
      stats.funnelStages[funnelStage] = (stats.funnelStages[funnelStage] || 0) + 1

      if (firstDetails.court) stats.courts[firstDetails.court] = (stats.courts[firstDetails.court] || 0) + 1
      if (lastDetails.court) stats.courts[lastDetails.court] = (stats.courts[lastDetails.court] || 0) + 1

      // Track top prospects
      if (!isMember && score >= 50) {
        topProspects.push({
          name: `${firstName} ${lastName}`,
          score,
          visits: totalVisits,
          last: lastVisitDate ? lastVisitDate.toISOString().split('T')[0] : 'N/A',
          entry: entryChannel,
          phone: phone || 'No phone',
        })
      }

      if (created % 500 === 0) console.log(`  ...${created} players imported`)
    } catch (e: any) {
      // Handle duplicate email/pbpUuid gracefully
      if (e.code === 'P2002') {
        skipped++
      } else {
        console.error(`  Error importing ${email}:`, e.message)
        skipped++
      }
    }
  }

  console.log(`  Done: ${created} imported, ${skipped} skipped`)
  console.log()

  // ── Print Summary ─────────────────────────────────────────
  console.log('[5/6] Summary')
  console.log()
  console.log('═══════════════════════════════════════════════════')
  console.log(' SENSA PADEL — COMPLETE DATA IMPORT')
  console.log('═══════════════════════════════════════════════════')
  console.log()

  console.log('PLAYERS')
  console.log(`  Total imported:           ${created.toLocaleString()}`)
  console.log(`  Skipped (no visits, old): ${skipped.toLocaleString()}`)
  console.log(`  With phone:               ${stats.withPhone.toLocaleString()} (${Math.round(stats.withPhone / created * 100)}%)`)
  console.log(`  With email:               ${stats.withEmail.toLocaleString()} (${Math.round(stats.withEmail / created * 100)}%)`)
  console.log()

  const totalMembers = stats.memberUnlimited + stats.memberStandard + stats.memberStaff
  console.log('MEMBERS')
  console.log(`  Total:                    ${totalMembers}`)
  console.log(`  UNLIMITED ($200/mo):      ${stats.memberUnlimited}`)
  console.log(`  STANDARD ($79/mo):        ${stats.memberStandard}`)
  console.log(`  Staff ($0):               ${stats.memberStaff}`)
  console.log(`  MRR:                      $${stats.totalMRR.toLocaleString()}`)
  console.log()

  console.log('ENTRY CHANNELS')
  const channelOrder = ['DIRECT_BOOKING', 'CLINIC', 'EVENT', 'OPEN_PLAY', 'LESSON', 'COMMUNITY_PLAY', 'TOURNAMENT', 'PRIVATE_EVENT', 'OTHER', 'UNKNOWN']
  for (const ch of channelOrder) {
    const count = stats.channels[ch] || 0
    const members = stats.channelMembers[ch] || 0
    const pct = count > 0 ? ((members / count) * 100).toFixed(1) : '0.0'
    if (count > 0) {
      const best = ch === 'OPEN_PLAY' ? ' <-- BEST' : ''
      console.log(`  ${ch.padEnd(20)} ${String(count).padStart(5)} -> ${members} members (${pct}%)${best}`)
    }
  }
  console.log()

  console.log('VISIT DISTRIBUTION')
  console.log(`  1 visit (one-timers):     ${stats.visitDist.one.toLocaleString()} <-- #1 OPPORTUNITY`)
  console.log(`  2 visits:                 ${stats.visitDist.two.toLocaleString()}`)
  console.log(`  3-5 visits:               ${stats.visitDist.threeFive.toLocaleString()} <-- UPSELL TARGETS`)
  console.log(`  6+ visits:                ${stats.visitDist.sixPlus.toLocaleString()}`)
  console.log()

  console.log('TOP PROGRAMS')
  const programsSorted = Object.entries(stats.programs).sort((a, b) => b[1] - a[1]).slice(0, 10)
  for (const [prog, count] of programsSorted) {
    console.log(`  ${prog.padEnd(35)} ${count}`)
  }
  console.log()

  console.log('FUNNEL STAGES')
  for (const [stage, count] of Object.entries(stats.funnelStages).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${stage.padEnd(20)} ${count}`)
  }
  console.log()

  console.log('COURT POPULARITY')
  const courtsSorted = Object.entries(stats.courts).sort((a, b) => b[1] - a[1])
  console.log(`  ${courtsSorted.map(([c, n]) => `${c}: ${n}`).join(' | ')}`)
  console.log()

  console.log('TOP 10 PROSPECTS (non-members by score)')
  topProspects.sort((a, b) => b.score - a.score)
  for (let i = 0; i < Math.min(10, topProspects.length); i++) {
    const p = topProspects[i]
    console.log(`  ${i + 1}. ${p.name} — score ${p.score}, ${p.visits} visits, last: ${p.last}, entry: ${p.entry}, phone: ${p.phone}`)
  }
  console.log()
  console.log('═══════════════════════════════════════════════════')

  // ── Verify counts ─────────────────────────────────────────
  console.log()
  console.log('[6/6] Verification...')
  const playerCount = await prisma.player.count()
  const visitCount = await prisma.visit.count()
  const memberCount = await prisma.player.count({ where: { membershipType: { not: 'NONE' } } })
  console.log(`  Players in DB: ${playerCount}`)
  console.log(`  Visit records: ${visitCount} (max 2 per player — first + last)`)
  console.log(`  Members: ${memberCount}`)
  console.log(`  Goals preserved: ${await prisma.goal.count()}`)
  console.log(`  Team preserved: ${await prisma.teamMember.count()}`)
  console.log(`  Automations preserved: ${await prisma.automationConfig.count()}`)
  console.log()
  console.log('Done!')
}

main()
  .catch((e) => {
    console.error('FATAL:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
