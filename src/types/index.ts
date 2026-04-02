import type {
  Player,
  Visit,
  Payment,
  DailyRevenue,
  Message,
  MessageTemplate,
  AIConversation,
  Setting,
  Goal,
  TeamMember,
  GoalComment,
  Referral,
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
  Goal,
  TeamMember,
  GoalComment,
  Referral,
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
  payments?: { amount: string | number }[]
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

export type GoalWithRelations = Goal & {
  assignees: TeamMember[]
  comments: (GoalComment & { author: TeamMember })[]
  linkedPlayers: Player[]
  _count?: { comments: number }
}

export type GoalListItem = Goal & {
  assignees: { id: string; firstName: string; lastName: string }[]
  _count: { comments: number }
}

export type TeamMemberWithGoals = TeamMember & {
  _count: { assignedGoals: number }
  assignedGoals: { status: string }[]
}

export interface GoalsSummary {
  total: number
  inProgress: number
  overdue: number
  notStarted: number
  done: number
}

export interface SavingsCalculation {
  visitsPerMonth: number
  estimatedMonthlySpend: number
  savingsAllAccess: number
  savingsPlayMore: number
  breakevenAllAccess: number
  breakevenPlayMore: number
  recommendation: 'ALL_ACCESS' | 'PLAY_MORE' | 'NOT_YET'
}

export interface ReferralWithPlayers extends Referral {
  referrer: Player
  referred: Player
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
