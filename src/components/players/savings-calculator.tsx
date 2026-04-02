'use client'

import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, Flame } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { SavingsCalculation } from '@/types'

interface SavingsCalculatorProps {
  playerId: string
  playerName: string
  membershipType: string
}

export function SavingsCalculator({ playerId, playerName, membershipType }: SavingsCalculatorProps) {
  const [savings, setSavings] = useState<SavingsCalculation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (membershipType !== 'NONE') {
      setLoading(false)
      return
    }
    fetch(`/api/funnel/savings/${playerId}`)
      .then((r) => r.json())
      .then((json) => setSavings(json.data?.savings ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [playerId, membershipType])

  if (loading || membershipType !== 'NONE' || !savings) return null
  if (savings.recommendation === 'NOT_YET') return null

  const isOverpaying = savings.savingsAllAccess > 0 && savings.visitsPerMonth >= 6

  return (
    <div
      className={cn(
        'rounded-xl border p-5 space-y-3',
        isOverpaying
          ? 'border-amber-300 bg-amber-50/50'
          : 'border-emerald-200 bg-emerald-50/30'
      )}
    >
      <div className="flex items-center gap-2">
        {isOverpaying ? (
          <Flame className="h-5 w-5 text-amber-500" />
        ) : (
          <DollarSign className="h-5 w-5 text-emerald-500" />
        )}
        <h3 className="text-sm font-semibold text-[#1A1A2E]">
          {isOverpaying ? "You're Overpaying" : 'Savings Calculator'}
        </h3>
      </div>

      <p className="text-sm text-[#6B7280]">
        {playerName.split(' ')[0]} plays ~{savings.visitsPerMonth}x/month, spending ~{formatCurrency(savings.estimatedMonthlySpend)}/mo casual
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[#E8E4DD] bg-white p-3">
          <p className="text-xs text-[#9CA3AF] mb-1">All Access ($200/mo)</p>
          {savings.savingsAllAccess > 0 ? (
            <p className="text-sm font-semibold text-emerald-600">
              Saves {formatCurrency(savings.savingsAllAccess)}/mo
            </p>
          ) : savings.savingsAllAccess === 0 ? (
            <p className="text-sm font-medium text-[#6B7280]">Break even</p>
          ) : (
            <p className="text-sm font-medium text-[#9CA3AF]">
              Needs {savings.breakevenAllAccess} visits
            </p>
          )}
        </div>
        <div className="rounded-lg border border-[#E8E4DD] bg-white p-3">
          <p className="text-xs text-[#9CA3AF] mb-1">Play More ($79/mo)</p>
          {savings.savingsPlayMore > 0 ? (
            <p className="text-sm font-semibold text-emerald-600">
              Saves {formatCurrency(savings.savingsPlayMore)}/mo
            </p>
          ) : (
            <p className="text-sm font-medium text-[#9CA3AF]">
              Needs {savings.breakevenPlayMore} visits
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <TrendingUp className="h-4 w-4 text-amber-500" />
        <p className="text-xs text-[#6B7280]">
          Recommended: <span className="font-semibold text-[#1A1A2E]">
            {savings.recommendation === 'ALL_ACCESS' ? 'All Access' : 'Play More'}
          </span>
          {' '}&mdash; saves {formatCurrency(
            (savings.recommendation === 'ALL_ACCESS' ? savings.savingsAllAccess : savings.savingsPlayMore) * 12
          )}/year
        </p>
      </div>
    </div>
  )
}
