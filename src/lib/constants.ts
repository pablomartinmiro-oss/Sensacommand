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

export const GOAL_STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  IN_PROGRESS: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  DONE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  FUTURE_IDEA: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ON_HOLD: 'bg-red-500/20 text-red-400 border-red-500/30',
  ONGOING: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export const GOAL_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  FUTURE_IDEA: 'Future Ideas',
  ON_HOLD: 'On Hold',
  ONGOING: 'Ongoing',
}

export const GOAL_PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'border-l-amber-500',
  MEDIUM: 'border-l-blue-400',
  LOW: 'border-l-gray-500',
  NONE: 'border-l-transparent',
}

export const GOAL_CATEGORY_COLORS: Record<string, string> = {
  Marketing: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  Partnerships: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  Operations: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Playing Experience': 'bg-green-500/15 text-green-400 border-green-500/25',
  'Site Improvement': 'bg-teal-500/15 text-teal-400 border-teal-500/25',
  Hiring: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  Finance: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Pro Shop': 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  Buyout: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  'Customer Experience': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  Culture: 'bg-lime-500/15 text-lime-400 border-lime-500/25',
  'Membership Sales': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  Programming: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  'New Sites': 'bg-sky-500/15 text-sky-400 border-sky-500/25',
}

export const GOAL_COLUMN_HEADER_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-slate-500/10 border-slate-500/30',
  IN_PROGRESS: 'bg-amber-500/10 border-amber-500/30',
  DONE: 'bg-emerald-500/10 border-emerald-500/30',
  FUTURE_IDEA: 'bg-purple-500/10 border-purple-500/30',
  ON_HOLD: 'bg-red-500/10 border-red-500/30',
  ONGOING: 'bg-blue-500/10 border-blue-500/30',
}

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Revenue', href: '/revenue', icon: 'DollarSign' },
  { label: 'Players', href: '/players', icon: 'Users' },
  { label: 'Leads', href: '/leads', icon: 'Target' },
  { label: 'Members', href: '/members', icon: 'Crown' },
  { label: 'Courts', href: '/courts', icon: 'Grid3X3' },
  { label: 'Goals', href: '/goals', icon: 'Crosshair' },
  { label: 'Team', href: '/team', icon: 'UsersRound' },
  { label: 'Messages', href: '/messages', icon: 'MessageSquare' },
  { label: 'AI Agent', href: '/ai', icon: 'Bot' },
  { label: 'Automations', href: '/automations', icon: 'Workflow' },
  { label: 'Import', href: '/import', icon: 'Upload' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const
