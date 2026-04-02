import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'
import { findOrCreatePlayer, parseCourtNumber, mapMembershipTier, mapPaymentType } from './helpers'
import { calculateSavings, calculateConversionScore } from '@/lib/funnel/savings'

interface ProcessResult {
  playerId?: string
  visitId?: string
  paymentId?: string
}

interface PBPData {
  user?: { first_name?: string; last_name?: string; email?: string; phone?: string }
  reservation?: {
    court_name?: string
    start_time?: string
    end_time?: string
    date?: string
    price?: string
    status?: string
  }
  payment?: { amount?: string; type?: string; method?: string }
  membership?: {
    plan_name?: string
    price?: string
    start_date?: string
    end_date?: string
    next_renewal_date?: string
    status?: string
  }
  check_in?: { court_name?: string; time?: string }
}

export async function processWebhookEvent(event: string, data: PBPData): Promise<ProcessResult | null> {
  switch (event) {
    case 'user_signup':
      return processUserSignup(data)
    case 'reservation_created':
      return processReservationCreated(data)
    case 'reservation_updated':
      return processReservationUpdated(data)
    case 'reservation_cancelled':
      return processReservationCancelled(data)
    case 'check_in':
      return processCheckIn(data)
    case 'payment_completed':
      return processPayment(data)
    case 'membership_created':
      return processMembershipCreated(data)
    case 'membership_renewed':
      return processMembershipRenewed(data)
    case 'membership_cancelled':
      return processMembershipCancelled(data)
    default:
      console.log(`[PBP] Unknown event: ${event}`)
      return null
  }
}

async function processUserSignup(data: PBPData): Promise<ProcessResult> {
  const player = await findOrCreatePlayer(data.user || null)
  if (!player) return {}
  return { playerId: player.id }
}

async function processReservationCreated(data: PBPData): Promise<ProcessResult> {
  const player = await findOrCreatePlayer(data.user || null)
  if (!player) return {}

  const res = data.reservation || {}
  const courtNumber = parseCourtNumber(res.court_name || '')
  const startTime = new Date(res.start_time || res.date || new Date())
  const endTime = res.end_time ? new Date(res.end_time) : new Date(startTime.getTime() + 90 * 60000)
  const date = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())
  const amount = parseFloat(res.price || '0')

  const visit = await prisma.visit.create({
    data: {
      playerId: player.id,
      courtNumber,
      date,
      startTime,
      endTime,
      type: 'CASUAL',
      amountPaid: amount,
      notes: 'Created via PlayByPoint webhook',
    },
  })

  let paymentId: string | undefined
  if (amount > 0) {
    const payment = await prisma.payment.create({
      data: {
        playerId: player.id,
        date,
        amount,
        type: 'COURT_RENTAL',
        method: 'PLAYBYPOINT',
        description: `Court ${courtNumber} booking via PlayByPoint`,
      },
    })
    paymentId = payment.id
  }

  // Update player status if NEW
  if (player.status === 'NEW') {
    await prisma.player.update({ where: { id: player.id }, data: { status: 'ACTIVE' } })
  }

  return { playerId: player.id, visitId: visit.id, paymentId }
}

async function processReservationUpdated(data: PBPData): Promise<ProcessResult> {
  const player = await findOrCreatePlayer(data.user || null)
  if (!player) return {}

  const res = data.reservation || {}
  const courtNumber = parseCourtNumber(res.court_name || '')
  const startTime = new Date(res.start_time || res.date || new Date())
  const endTime = res.end_time ? new Date(res.end_time) : new Date(startTime.getTime() + 90 * 60000)
  const date = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())

  // Try to find existing visit for this player + date + court
  const existing = await prisma.visit.findFirst({
    where: { playerId: player.id, date, courtNumber },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    await prisma.visit.update({
      where: { id: existing.id },
      data: { startTime, endTime, courtNumber, amountPaid: parseFloat(res.price || '0'), notes: 'Updated via PlayByPoint webhook' },
    })
    return { playerId: player.id, visitId: existing.id }
  }

  return { playerId: player.id }
}

async function processReservationCancelled(data: PBPData): Promise<ProcessResult> {
  const player = await findOrCreatePlayer(data.user || null)
  if (!player) return {}

  const res = data.reservation || {}
  const courtNumber = parseCourtNumber(res.court_name || '')
  const startTime = new Date(res.start_time || res.date || new Date())
  const date = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate())

  const existing = await prisma.visit.findFirst({
    where: { playerId: player.id, date, courtNumber },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    await prisma.visit.update({
      where: { id: existing.id },
      data: { notes: 'Cancelled via PlayByPoint' },
    })
    return { playerId: player.id, visitId: existing.id }
  }

  return { playerId: player.id }
}

async function processCheckIn(data: PBPData): Promise<ProcessResult> {
  const player = await findOrCreatePlayer(data.user || null)
  if (!player) return {}

  const ci = data.check_in || {}
  const courtNumber = parseCourtNumber(ci.court_name || '')
  const today = new Date()
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const checkInTime = ci.time || today.toISOString()

  const visit = await prisma.visit.findFirst({
    where: { playerId: player.id, date, courtNumber },
    orderBy: { startTime: 'asc' },
  })

  if (visit) {
    await prisma.visit.update({
      where: { id: visit.id },
      data: { notes: `Checked in at ${new Date(checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` },
    })
  }

  if (player.status === 'NEW') {
    await prisma.player.update({ where: { id: player.id }, data: { status: 'ACTIVE' } })
  }

  // Hot prospect check-in alert — use stored Player fields
  if (player.membershipType === 'NONE') {
    // Use stored conversionScore or compute from stored fields
    const score = player.conversionScore || calculateConversionScore({
      totalVisits: player.totalVisits,
      lastVisitDate: player.lastVisitDate,
      createdAt: player.createdAt,
      membershipType: player.membershipType,
    })

    if (score >= 60) {
      const savings = calculateSavings({
        totalVisits: player.totalVisits,
        firstVisitDate: player.firstVisitDate,
        lastVisitDate: player.lastVisitDate,
        membershipType: player.membershipType,
      })

      let savingsLine = ''
      if (savings?.recommendation === 'ALL_ACCESS') {
        savingsLine = `\n💰 Spending ~$${savings.estimatedMonthlySpend}/mo casual. All Access saves $${savings.savingsAllAccess}/mo.`
      } else if (savings?.recommendation === 'PLAY_MORE') {
        savingsLine = `\n💰 Play More saves them $${savings.savingsPlayMore}/mo.`
      }

      await sendTelegramMessage(
        `🏠 HOT PROSPECT AT THE CLUB\n\n` +
        `${player.firstName} ${player.lastName} just checked in\n` +
        `Score: ${score}/100 · Visit #${player.totalVisits}` +
        savingsLine +
        `\n📞 ${player.phone || 'No phone'}\n\n` +
        `Go say hi and pitch!`
      )
    }
  }

  return { playerId: player.id, visitId: visit?.id }
}

async function processPayment(data: PBPData): Promise<ProcessResult> {
  const player = await findOrCreatePlayer(data.user || null)
  if (!player) return {}

  const pay = data.payment || {}
  const amount = parseFloat(pay.amount || '0')
  const today = new Date()
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const payment = await prisma.payment.create({
    data: {
      playerId: player.id,
      date,
      amount,
      type: mapPaymentType(pay.type || ''),
      method: 'PLAYBYPOINT',
      description: `Payment via PlayByPoint: ${pay.type || 'general'}`,
    },
  })

  return { playerId: player.id, paymentId: payment.id }
}

async function processMembershipCreated(data: PBPData): Promise<ProcessResult> {
  const player = await findOrCreatePlayer(data.user || null)
  if (!player) return {}

  const mem = data.membership || {}
  const tier = mapMembershipTier(mem.plan_name || '', mem.price || '')
  const amount = parseFloat(mem.price || '0')
  const today = new Date()
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  await prisma.player.update({
    where: { id: player.id },
    data: {
      membershipType: tier,
      membershipStartDate: mem.start_date ? new Date(mem.start_date) : today,
      membershipEndDate: mem.end_date ? new Date(mem.end_date) : null,
      monthlyRate: amount,
      status: 'CONVERTED',
    },
  })

  const payment = await prisma.payment.create({
    data: {
      playerId: player.id,
      date,
      amount,
      type: 'MEMBERSHIP',
      method: 'PLAYBYPOINT',
      description: `New ${tier} membership via PlayByPoint`,
    },
  })

  return { playerId: player.id, paymentId: payment.id }
}

async function processMembershipRenewed(data: PBPData): Promise<ProcessResult> {
  const player = await findOrCreatePlayer(data.user || null)
  if (!player) return {}

  const mem = data.membership || {}
  const amount = parseFloat(mem.price || '0')
  const today = new Date()
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (mem.next_renewal_date) {
    await prisma.player.update({
      where: { id: player.id },
      data: { membershipEndDate: new Date(mem.next_renewal_date) },
    })
  }

  const payment = await prisma.payment.create({
    data: {
      playerId: player.id,
      date,
      amount,
      type: 'MEMBERSHIP',
      method: 'PLAYBYPOINT',
      description: 'Membership renewal via PlayByPoint',
    },
  })

  return { playerId: player.id, paymentId: payment.id }
}

async function processMembershipCancelled(data: PBPData): Promise<ProcessResult> {
  const player = await findOrCreatePlayer(data.user || null)
  if (!player) return {}

  const mem = data.membership || {}

  await prisma.player.update({
    where: { id: player.id },
    data: {
      membershipType: 'NONE',
      status: 'CHURNED',
      membershipEndDate: mem.end_date ? new Date(mem.end_date) : new Date(),
    },
  })

  // Telegram alert
  await sendTelegramMessage(
    `⚠️ *Membership Cancelled*\n${player.firstName} ${player.lastName} (${mem.plan_name || 'Unknown plan'})`
  )

  return { playerId: player.id }
}
