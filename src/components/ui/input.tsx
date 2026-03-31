'use client'

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Input                                                              */
/* ------------------------------------------------------------------ */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[#6B7280]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-[#1A1A2E]',
            'placeholder:text-[#9CA3AF]',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white',
            error
              ? 'border-red-500/60 focus:ring-red-500/50'
              : 'border-[#D1D5DB] focus:ring-amber-500/50 focus:border-amber-500/60',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'

/* ------------------------------------------------------------------ */
/*  TextArea                                                           */
/* ------------------------------------------------------------------ */

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-[#6B7280]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm text-[#1A1A2E]',
            'placeholder:text-[#9CA3AF] resize-y',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white',
            error
              ? 'border-red-500/60 focus:ring-red-500/50'
              : 'border-[#D1D5DB] focus:ring-amber-500/50 focus:border-amber-500/60',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  },
)

TextArea.displayName = 'TextArea'

export { Input, TextArea }
