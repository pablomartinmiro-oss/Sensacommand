'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { cn, formatCurrency } from '@/lib/utils'
import {
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Gift,
  BarChart3,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'
import type { SavingsCalculation } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Prospect {
  id: string
  firstName: string
  lastName: string
  totalVisits: number
  conversionScore: number
  membershipType: string
  savings: SavingsCalculation | null
}

interface Trial {
  id: string
  firstName: string
  lastName: string
  trialStartDate: string
  trialEndDate: string
  trialStatus: string
  trialDay: number
  trialDuration: number
  visitsInTrial: number
}

interface ReferralEntry {
  id: string
  referrer: { id: string; firstName: string; lastName: string }
  referred: { id: string; firstName: string; lastName: string; status: string }
  status: string
  rewardGiven: boolean
}

interface Benchmark {
  metric: string
  yourClub: number
  industryTarget: string
  gap: number
  status: 'meeting' | 'close' | 'below'
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function FunnelPage() {
  const { toast } = useToast()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [trials, setTrials] = useState<Trial[]>([])
  const [trialConversionRate, setTrialConversionRate] = useState(0)
  const [referralData, setReferralData] = useState<{
    referrals: ReferralEntry[]
    topReferrers: { id: string; name: string; totalReferrals: number; converted: number }[]
    monthlyStats: { total: number; converted: number }
  } | null>(null)
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([])
  const [loading, setLoading] = useState(true)
  const [trialModalOpen, setTrialModalOpen] = useState(false)
  const [trialTargetId, setTrialTargetId] = useState<string | null>(null)
  const [startingTrial, setStartingTrial] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [prospectsRes, trialsRes, referralsRes, benchmarksRes] = await Promise.all([
        fetch('/api/players?membershipType=NONE&limit=100&sort=conversionScore&order=desc'),
        fetch('/api/funnel/trials'),
        fetch('/api/referrals'),
        fetch('/api/funnel/benchmarks'),
      ])

      // Prospects — use stored conversionScore, compute savings client-side
      const playersJson = await prospectsRes.json()
      const players = playersJson.data || []

      const mapped: Prospect[] = players
        .map((p: Record<string, unknown>) => {
          const totalVisits = (p.totalVisits as number) || 0
          const convScore = (p.conversionScore as number) || 0
          // Quick client-side savings calculation
          let savings: SavingsCalculation | null = null
          if (totalVisits >= 2 && p.firstVisitDate && p.lastVisitDate) {
            const first = new Date(p.firstVisitDate as string)
            const last = new Date(p.lastVisitDate as string)
            const months = Math.max(1, Math.floor((last.getTime() - first.getTime()) / (30 * 86400000)) || 1)
            const vpm = totalVisits / months
            const monthlySpend = vpm * 40
            savings = {
              visitsPerMonth: Math.round(vpm * 10) / 10,
              estimatedMonthlySpend: Math.round(monthlySpend),
              savingsAllAccess: Math.round(monthlySpend - 200),
              savingsPlayMore: Math.round(monthlySpend - 79),
              breakevenAllAccess: 5,
              breakevenPlayMore: 2,
              recommendation: monthlySpend >= 200 ? 'ALL_ACCESS' as const : monthlySpend >= 79 ? 'PLAY_MORE' as const : 'NOT_YET' as const,
            }
          }
          return {
            id: p.id as string,
            firstName: p.firstName as string,
            lastName: p.lastName as string,
            totalVisits,
            conversionScore: convScore,
            membershipType: p.membershipType as string,
            savings,
          }
        })
        .filter((p: Prospect) => p.conversionScore >= 30)
        .sort((a: Prospect, b: Prospect) => b.conversionScore - a.conversionScore)

      setProspects(mapped)

      // Trials
      const trialsJson = await trialsRes.json()
      setTrials(trialsJson.data?.trials || [])
      setTrialConversionRate(trialsJson.data?.conversionRate || 0)

      // Referrals
      const referralsJson = await referralsRes.json()
      setReferralData(referralsJson.data || null)

      // Benchmarks
      const benchmarksJson = await benchmarksRes.json()
      setBenchmarks(benchmarksJson.data?.benchmarks || [])
    } catch {
      toast('error', 'Failed to load funnel data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleOfferTrial = async () => {
    if (!trialTargetId) return
    setStartingTrial(true)
    try {
      const res = await fetch('/api/funnel/trials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: trialTargetId }),
      })
      if (!res.ok) throw new Error('Failed to start trial')
      toast('success', 'Trial started!')
      setTrialModalOpen(false)
      setTrialTargetId(null)
      fetchAll()
    } catch {
      toast('error', 'Failed to start trial')
    } finally {
      setStartingTrial(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Growth Funnel" />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} lines={1} />)}
          </div>
          <SkeletonCard lines={6} />
        </main>
      </>
    )
  }

  const hotProspects = prospects.filter((p) => p.conversionScore >= 60)
  const activeTrials = trials.filter((t) => t.trialStatus === 'ACTIVE')

  return (
    <>
      <Header title="Growth Funnel" />
      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Hot Prospects"
            value={hotProspects.length}
            icon={<Target className="h-5 w-5" />}
          />
          <StatCard
            title="Active Trials"
            value={activeTrials.length}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Trial Conversion"
            value={`${trialConversionRate}%`}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            title="Referrals This Month"
            value={referralData?.monthlyStats.total ?? 0}
            icon={<Gift className="h-5 w-5" />}
          />
        </div>

        {/* Hot Prospects with Savings */}
        <section>
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            Hot Prospects
          </h2>
          {prospects.length === 0 ? (
            <div className="rounded-xl border border-[#E8E4DD] bg-white p-8 text-center text-[#9CA3AF]">
              No prospects scored yet. Players need 2+ visits to appear here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {prospects.slice(0, 12).map((p) => (
                <ProspectCard
                  key={p.id}
                  prospect={p}
                  onOfferTrial={() => {
                    setTrialTargetId(p.id)
                    setTrialModalOpen(true)
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Trial Pipeline */}
        <section>
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Trial Pipeline
          </h2>
          {activeTrials.length === 0 ? (
            <div className="rounded-xl border border-[#E8E4DD] bg-white p-8 text-center text-[#9CA3AF]">
              No active trials. Offer a trial to a hot prospect above.
            </div>
          ) : (
            <div className="rounded-xl border border-[#E8E4DD] bg-white divide-y divide-[#E8E4DD]">
              <div className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-[#1A1A2E]">
                  ACTIVE TRIALS: {activeTrials.length}
                </span>
                <span className="text-xs text-[#9CA3AF]">
                  Historic conversion: {trialConversionRate}%
                </span>
              </div>
              {activeTrials.map((t) => {
                const engagement =
                  t.visitsInTrial >= 3 ? 'engaged' : t.visitsInTrial >= 1 ? 'warming up' : 'needs nudge'
                return (
                  <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-xs font-medium text-blue-600">
                        {t.firstName[0]}{t.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1A1A2E]">
                          {t.firstName} {t.lastName}
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          Day {t.trialDay} of {t.trialDuration} &middot; {t.visitsInTrial} visits
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        engagement === 'engaged' ? 'success' : engagement === 'warming up' ? 'warning' : 'error'
                      }
                    >
                      {engagement}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Referrals */}
        <section>
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            Referrals
          </h2>
          <div className="rounded-xl border border-[#E8E4DD] bg-white p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#1A1A2E]">{referralData?.monthlyStats.total ?? 0}</p>
                <p className="text-xs text-[#9CA3AF]">This Month</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{referralData?.monthlyStats.converted ?? 0}</p>
                <p className="text-xs text-[#9CA3AF]">Converted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">$50</p>
                <p className="text-xs text-[#9CA3AF]">Credit per Referral</p>
              </div>
            </div>

            {referralData?.topReferrers && referralData.topReferrers.length > 0 && (
              <div className="border-t border-[#E8E4DD] pt-3">
                <p className="text-xs font-medium text-[#9CA3AF] mb-2">TOP REFERRERS</p>
                {referralData.topReferrers.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-[#1A1A2E]">{r.name}</span>
                    <span className="text-xs text-[#6B7280]">
                      {r.totalReferrals} referrals, {r.converted} converted
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Benchmarks */}
        <section>
          <h2 className="text-lg font-semibold text-[#1A1A2E] mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            How You Compare (Padel Industry)
          </h2>
          <div className="rounded-xl border border-[#E8E4DD] bg-white overflow-hidden">
            <div className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-[#E8E4DD] bg-[#F8F7F4]">
              <span className="text-xs font-medium text-[#9CA3AF]">Metric</span>
              <span className="text-xs font-medium text-[#9CA3AF] text-center">Your Club</span>
              <span className="text-xs font-medium text-[#9CA3AF] text-center">Industry Target</span>
              <span className="text-xs font-medium text-[#9CA3AF] text-center">Gap</span>
            </div>
            {benchmarks.map((b) => (
              <div key={b.metric} className="grid grid-cols-4 gap-4 px-5 py-3 border-b border-[#E8E4DD]/60">
                <span className="text-sm text-[#1A1A2E]">{b.metric}</span>
                <span className="text-sm font-medium text-[#1A1A2E] text-center">
                  {b.yourClub}%
                </span>
                <span className="text-sm text-[#6B7280] text-center">{b.industryTarget}</span>
                <span className={cn(
                  'text-sm font-medium text-center flex items-center justify-center gap-1',
                  b.status === 'meeting' ? 'text-emerald-600' : b.status === 'close' ? 'text-amber-600' : 'text-red-600'
                )}>
                  {b.status === 'meeting' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : b.status === 'close' ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {b.gap > 0 ? '+' : ''}{b.gap}%
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Trial Offer Modal */}
      <Modal
        open={trialModalOpen}
        onClose={() => { setTrialModalOpen(false); setTrialTargetId(null) }}
        title="Offer Trial Membership"
      >
        <p className="text-sm text-[#6B7280] mb-4">
          Offer a 2-week All Access trial for $29? The player will get unlimited play, clinics, everything. No commitment.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setTrialModalOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleOfferTrial} loading={startingTrial}>
            <Gift className="h-4 w-4" />
            Start Trial
          </Button>
        </div>
      </Modal>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Prospect Card                                                      */
/* ------------------------------------------------------------------ */

function ProspectCard({
  prospect,
  onOfferTrial,
}: {
  prospect: Prospect
  onOfferTrial: () => void
}) {
  const { savings } = prospect
  const isOverpaying = savings && savings.savingsAllAccess > 0 && savings.visitsPerMonth >= 6

  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-4 space-y-3',
        isOverpaying ? 'border-amber-300' : 'border-[#E8E4DD]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-xs font-medium text-amber-600">
            {prospect.firstName[0]}{prospect.lastName[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-[#1A1A2E]">
              {prospect.firstName} {prospect.lastName}
            </p>
            <p className="text-xs text-[#9CA3AF]">{prospect.totalVisits} visits</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              prospect.conversionScore >= 75 ? 'bg-emerald-400' :
              prospect.conversionScore >= 50 ? 'bg-amber-400' : 'bg-slate-300'
            )}
          />
          <span className="text-xs font-medium text-[#6B7280]">{prospect.conversionScore}/100</span>
        </div>
      </div>

      {/* Savings */}
      {savings && savings.recommendation !== 'NOT_YET' && (
        <div className={cn(
          'rounded-lg p-3 text-sm',
          isOverpaying ? 'bg-amber-50' : 'bg-emerald-50/50'
        )}>
          {isOverpaying && (
            <div className="flex items-center gap-1 mb-1">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700">OVERPAYING</span>
            </div>
          )}
          <p className="text-xs text-[#6B7280]">
            ~{savings.visitsPerMonth}x/mo &middot; ~{formatCurrency(savings.estimatedMonthlySpend)}/mo casual
          </p>
          <p className="text-xs font-medium text-emerald-700 mt-1">
            {savings.recommendation === 'ALL_ACCESS'
              ? `All Access saves ${formatCurrency(savings.savingsAllAccess)}/mo`
              : `Play More saves ${formatCurrency(savings.savingsPlayMore)}/mo`}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={onOfferTrial}>
          <Gift className="h-3.5 w-3.5" />
          Offer Trial
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => window.location.href = `/players/${prospect.id}`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          View
        </Button>
      </div>
    </div>
  )
}
