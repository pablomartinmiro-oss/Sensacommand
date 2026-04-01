import { prisma } from '@/lib/prisma'

interface PBPUserData {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
}

export async function findOrCreatePlayer(userData: PBPUserData | null) {
  if (!userData) return null

  // Match by email first
  if (userData.email) {
    const byEmail = await prisma.player.findFirst({ where: { email: userData.email } })
    if (byEmail) return byEmail
  }

  // Then by phone
  if (userData.phone) {
    const normalizedPhone = userData.phone.replace(/\D/g, '').slice(-10)
    const byPhone = await prisma.player.findFirst({
      where: {
        OR: [
          { phone: { contains: normalizedPhone } },
          { whatsappPhone: { contains: normalizedPhone } },
        ],
      },
    })
    if (byPhone) return byPhone
  }

  // Create if not found
  const player = await prisma.player.create({
    data: {
      firstName: userData.first_name || 'Unknown',
      lastName: userData.last_name || '',
      email: userData.email || null,
      phone: userData.phone || null,
      source: 'PLAYBYPOINT',
      status: 'NEW',
      membershipType: 'NONE',
    },
  })

  return player
}

export function parseCourtNumber(courtName: string): number {
  const match = courtName?.match(/(\d+)/)
  return match ? parseInt(match[1]) : 1
}

export function mapMembershipTier(planName: string, price: string): 'UNLIMITED' | 'STANDARD' | 'NONE' {
  const amount = parseFloat(price || '0')
  if (amount >= 300) return 'UNLIMITED'
  if (amount >= 150) return 'STANDARD'
  return 'NONE'
}

export function mapPaymentType(pbpType: string): 'COURT_RENTAL' | 'MEMBERSHIP' | 'LESSON' | 'PRO_SHOP' | 'EVENT' | 'OTHER' {
  const t = (pbpType || '').toLowerCase()
  if (t.includes('membership')) return 'MEMBERSHIP'
  if (t.includes('lesson') || t.includes('clinic')) return 'LESSON'
  if (t.includes('event') || t.includes('tournament')) return 'EVENT'
  if (t.includes('shop') || t.includes('merch')) return 'PRO_SHOP'
  if (t.includes('court') || t.includes('reservation') || t.includes('booking')) return 'COURT_RENTAL'
  return 'OTHER'
}
