import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Base shimmer                                                       */
/* ------------------------------------------------------------------ */

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-zinc-800/60',
        className,
      )}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  SkeletonLine — single text-height placeholder                     */
/* ------------------------------------------------------------------ */

export interface SkeletonLineProps {
  /** Width class, e.g. "w-48", "w-full". Defaults to "w-full" */
  width?: string
  /** Height class. Defaults to "h-4" */
  height?: string
  className?: string
}

export function SkeletonLine({
  width = 'w-full',
  height = 'h-4',
  className,
}: SkeletonLineProps) {
  return <Shimmer className={cn(width, height, className)} />
}

/* ------------------------------------------------------------------ */
/*  SkeletonCard — card-shaped placeholder                            */
/* ------------------------------------------------------------------ */

export interface SkeletonCardProps {
  className?: string
  /** Number of text lines inside the card. Defaults to 3 */
  lines?: number
}

export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 bg-[#0f0f15] p-5 space-y-3',
        className,
      )}
    >
      <Shimmer className="h-4 w-1/3" />
      <Shimmer className="h-7 w-1/2" />
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className={cn(
            'h-3',
            i === lines - 1 ? 'w-2/3' : 'w-full',
          )}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SkeletonTable — table-shaped placeholder                          */
/* ------------------------------------------------------------------ */

export interface SkeletonTableProps {
  className?: string
  /** Number of rows. Defaults to 5 */
  rows?: number
  /** Number of columns. Defaults to 4 */
  columns?: number
}

export function SkeletonTable({
  className,
  rows = 5,
  columns = 4,
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-zinc-800 overflow-hidden',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex gap-4 border-b border-zinc-800 bg-[#0f0f15] px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer key={i} className="h-3 flex-1" />
        ))}
      </div>

      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className={cn(
            'flex gap-4 px-4 py-3 border-b border-zinc-800/60',
            rowIdx % 2 === 1 && 'bg-zinc-900/40',
          )}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Shimmer key={colIdx} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
