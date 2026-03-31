export const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  HOT_LEAD: 'bg-amber-50 text-amber-700 border-amber-200',
  COLD_LEAD: 'bg-slate-100 text-slate-600 border-slate-200',
  CONVERTED: 'bg-green-50 text-green-700 border-green-200',
  CHURNED: 'bg-red-50 text-red-700 border-red-200',
}

export const MEMBERSHIP_COLORS: Record<string, string> = {
  NONE: 'bg-slate-100 text-slate-600 border-slate-200',
  STANDARD: 'bg-blue-50 text-blue-700 border-blue-200',
  UNLIMITED: 'bg-amber-50 text-amber-700 border-amber-200',
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
  DRAFT: 'bg-slate-100 text-slate-600',
  SENT: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  READ: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700',
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
  NOT_STARTED: 'bg-slate-100 text-slate-600 border-slate-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FUTURE_IDEA: 'bg-purple-50 text-purple-700 border-purple-200',
  ON_HOLD: 'bg-red-50 text-red-700 border-red-200',
  ONGOING: 'bg-blue-50 text-blue-700 border-blue-200',
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
  Marketing: 'bg-pink-50 text-pink-700 border-pink-200',
  Partnerships: 'bg-purple-50 text-purple-700 border-purple-200',
  Operations: 'bg-blue-50 text-blue-700 border-blue-200',
  'Playing Experience': 'bg-green-50 text-green-700 border-green-200',
  'Site Improvement': 'bg-teal-50 text-teal-700 border-teal-200',
  Hiring: 'bg-orange-50 text-orange-700 border-orange-200',
  Finance: 'bg-amber-50 text-amber-700 border-amber-200',
  'Pro Shop': 'bg-rose-50 text-rose-700 border-rose-200',
  Buyout: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Customer Experience': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Culture: 'bg-lime-50 text-lime-700 border-lime-200',
  'Membership Sales': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Programming: 'bg-violet-50 text-violet-700 border-violet-200',
  'New Sites': 'bg-sky-50 text-sky-700 border-sky-200',
}

export const GOAL_COLUMN_HEADER_COLORS: Record<string, string> = {
  NOT_STARTED: 'bg-slate-50 border-slate-200',
  IN_PROGRESS: 'bg-amber-50 border-amber-200',
  DONE: 'bg-emerald-50 border-emerald-200',
  FUTURE_IDEA: 'bg-purple-50 border-purple-200',
  ON_HOLD: 'bg-red-50 border-red-200',
  ONGOING: 'bg-blue-50 border-blue-200',
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
  { label: 'Social', href: '/social', icon: 'Share2' },
  { label: 'Messages', href: '/messages', icon: 'MessageSquare' },
  { label: 'AI Agent', href: '/ai', icon: 'Bot' },
  { label: 'Automations', href: '/automations', icon: 'Workflow' },
  { label: 'Review', href: '/review', icon: 'ClipboardCheck' },
  { label: 'Import', href: '/import', icon: 'Upload' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const
