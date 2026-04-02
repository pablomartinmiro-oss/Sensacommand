export interface Benchmark {
  metric: string
  yourClub: number
  industryTarget: string
  gap: number
  status: 'meeting' | 'close' | 'below'
}

interface BenchmarkInput {
  returnRate14Days: number
  memberConversionRate: number
  activePlayerPercent: number
  memberMixPercent: number
  referralDrivenPercent: number
}

const TARGETS = {
  returnRate: { min: 30, label: '30%' },
  memberConversion: { min: 15, max: 25, label: '15-25%' },
  activePlayer: { min: 50, max: 60, label: '50-60%' },
  memberMix: { min: 25, max: 35, label: '25-35%' },
  referralDriven: { min: 15, max: 20, label: '15-20%' },
}

function getStatus(value: number, min: number, max?: number): 'meeting' | 'close' | 'below' {
  const target = max ?? min
  if (value >= min) return 'meeting'
  if (value >= target * 0.8) return 'close'
  return 'below'
}

export function calculateBenchmarks(input: BenchmarkInput): Benchmark[] {
  return [
    {
      metric: 'Return rate (14 days)',
      yourClub: Math.round(input.returnRate14Days * 10) / 10,
      industryTarget: TARGETS.returnRate.label,
      gap: Math.round((input.returnRate14Days - TARGETS.returnRate.min) * 10) / 10,
      status: getStatus(input.returnRate14Days, TARGETS.returnRate.min),
    },
    {
      metric: 'Member conversion',
      yourClub: Math.round(input.memberConversionRate * 10) / 10,
      industryTarget: TARGETS.memberConversion.label,
      gap: Math.round((input.memberConversionRate - TARGETS.memberConversion.min) * 10) / 10,
      status: getStatus(input.memberConversionRate, TARGETS.memberConversion.min),
    },
    {
      metric: 'Active player %',
      yourClub: Math.round(input.activePlayerPercent * 10) / 10,
      industryTarget: TARGETS.activePlayer.label,
      gap: Math.round((input.activePlayerPercent - TARGETS.activePlayer.min) * 10) / 10,
      status: getStatus(input.activePlayerPercent, TARGETS.activePlayer.min),
    },
    {
      metric: 'Member mix',
      yourClub: Math.round(input.memberMixPercent * 10) / 10,
      industryTarget: TARGETS.memberMix.label,
      gap: Math.round((input.memberMixPercent - TARGETS.memberMix.min) * 10) / 10,
      status: getStatus(input.memberMixPercent, TARGETS.memberMix.min),
    },
    {
      metric: 'Referral-driven members',
      yourClub: Math.round(input.referralDrivenPercent * 10) / 10,
      industryTarget: TARGETS.referralDriven.label,
      gap: Math.round((input.referralDrivenPercent - TARGETS.referralDriven.min) * 10) / 10,
      status: getStatus(input.referralDrivenPercent, TARGETS.referralDriven.min),
    },
  ]
}
