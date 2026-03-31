import type {
  Player,
  Visit,
  Payment,
  DailyRevenue,
  Message,
  MessageTemplate,
  AIConversation,
  Setting,
} from '@/generated/prisma/client'

export type {
  Player,
  Visit,
  Payment,
  DailyRevenue,
  Message,
  MessageTemplate,
  AIConversation,
  Setting,
}

export type PlayerWithRelations = Player & {
  visits: Visit[]
  payments: Payment[]
  messages: Message[]
  _count?: {
    visits: number
    payments: number
    messages: number
  }
}

export type PlayerListItem = Player & {
  _count: {
    visits: number
  }
  visits: { date: Date }[]
  payments: { amount: string | number }[]
}

export interface DashboardStats {
  todayRevenue: number
  yesterdayRevenue: number
  activeMembers: { unlimited: number; standard: number; total: number }
  mrr: number
  hotLeads: number
}

export interface ActionItem {
  type: 'upsell' | 'churn_risk' | 'follow_up' | 'revenue'
  title: string
  description: string
  playerId?: string
  playerName?: string
  priority: 'high' | 'medium' | 'low'
}

export interface ActivityFeedItem {
  id: string
  type: 'visit' | 'payment' | 'new_player' | 'message'
  title: string
  description: string
  timestamp: Date
  playerId?: string
}

export interface LeadWithScore {
  player: Player & { _count: { visits: number }; visits: Visit[] }
  score: number
  factors: string[]
}

export interface CourtUtilization {
  courtNumber: number
  hour: number
  dayOfWeek: number
  count: number
}

export interface RevenueByCategory {
  courtRentals: number
  memberships: number
  lessons: number
  proShop: number
  events: number
  other: number
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
