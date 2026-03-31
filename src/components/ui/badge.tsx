import { cn } from '@/lib/utils'

const variantColors: Record<string, string> = {
  /* Status */
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  inactive: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',

  /* Sentiment / priority */
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  error: 'bg-red-500/15 text-red-400 border-red-500/25',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/25',

  /* Pipeline / deal */
  new: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  won: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  lost: 'bg-red-500/15 text-red-400 border-red-500/25',
  open: 'bg-amber-500/15 text-amber-400 border-amber-500/25',

  /* Generic */
  default: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
  primary: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
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
