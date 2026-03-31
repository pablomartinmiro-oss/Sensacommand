'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const variantStyles = {
  primary:
    'bg-amber-500 text-black hover:bg-amber-400 active:bg-amber-600 focus-visible:ring-amber-500/50',
  secondary:
    'bg-[#E8E4DD] text-[#1A1A2E] hover:bg-[#E8E4DD] active:bg-[#E8E4DD] focus-visible:ring-[#D1D5DB]/50',
  danger:
    'bg-red-600 text-[#1A1A2E] hover:bg-red-500 active:bg-red-700 focus-visible:ring-red-500/50',
  ghost:
    'bg-transparent text-[#374151] hover:bg-[#F0EFE9] hover:text-[#1A1A2E] active:bg-[#E8E4DD] focus-visible:ring-zinc-500/50',
} as const

const sizeStyles = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg',
} as const

export type ButtonVariant = keyof typeof variantStyles
export type ButtonSize = keyof typeof sizeStyles

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          'disabled:opacity-50 disabled:pointer-events-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

export { Button }
