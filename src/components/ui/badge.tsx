import { cn } from '@/lib/utils'

const variantColors: Record<string, string> = {
  /* Status */
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',

  /* Sentiment / priority */
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',

  /* Pipeline / deal */
  new: 'bg-sky-50 text-sky-700 border-sky-200',
  won: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  lost: 'bg-red-50 text-red-700 border-red-200',
  open: 'bg-amber-50 text-amber-700 border-amber-200',

  /* Generic */
  default: 'bg-slate-100 text-slate-600 border-slate-200',
  primary: 'bg-amber-50 text-amber-700 border-amber-200',
}

export interface BadgeProps {
  variant?: string
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const colors = variantColors[variant] ?? variantColors.default

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colors,
        className,
      )}
    >
      {children}
    </span>
  )
}
