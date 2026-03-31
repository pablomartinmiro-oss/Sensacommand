export const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  HOT_LEAD: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  COLD_LEAD: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  CONVERTED: 'bg-green-500/20 text-green-400 border-green-500/30',
  CHURNED: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const MEMBERSHIP_COLORS: Record<string, string> = {
  NONE: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  STANDARD: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  UNLIMITED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

export const MEMBERSHIP_LABELS: Record<string, string> = {
  NONE: 'Non-Member',
  STANDARD: 'Standard',
  UNLIMITED: 'Unlimited',
}

export const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  ACTIVE: 'Active',
  HOT_LEAD: 'Hot Lead',
  COLD_LEAD: 'Cold Lead',
  CONVERTED: 'Converted',
  CHURNED: 'Churned',
}

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  COURT_RENTAL: 'Court Rental',
  MEMBERSHIP: 'Membership',
  LESSON: 'Lesson',
  PRO_SHOP: 'Pro Shop',
  EVENT: 'Event',
  OTHER: 'Other',
}

export const VISIT_TYPE_LABELS: Record<string, string> = {
  CASUAL: 'Casual',
  MEMBER_SESSION: 'Member Session',
  LESSON: 'Lesson',
  TOURNAMENT: 'Tournament',
  PRIVATE_EVENT: 'Private Event',
}

export const MESSAGE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-500/20 text-slate-400',
  SENT: 'bg-blue-500/20 text-blue-400',
  DELIVERED: 'bg-emerald-500/20 text-emerald-400',
  READ: 'bg-green-500/20 text-green-400',
  FAILED: 'bg-red-500/20 text-red-400',
}

export const CHART_COLORS = {
  courtRentals: '#f59e0b',
  memberships: '#10b981',
  lessons: '#3b82f6',
  proShop: '#8b5cf6',
  events: '#ec4899',
  other: '#6b7280',
}

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Revenue', href: '/revenue', icon: 'DollarSign' },
  { label: 'Players', href: '/players', icon: 'Users' },
  { label: 'Leads', href: '/leads', icon: 'Target' },
  { label: 'Members', href: '/members', icon: 'Crown' },
  { label: 'Courts', href: '/courts', icon: 'Grid3X3' },
  { label: 'Messages', href: '/messages', icon: 'MessageSquare' },
  { label: 'AI Agent', href: '/ai', icon: 'Bot' },
  { label: 'Import', href: '/import', icon: 'Upload' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const
