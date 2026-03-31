'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'
import { GOAL_STATUS_LABELS, GOAL_STATUS_COLORS } from '@/lib/constants'
import { useRouter } from 'next/navigation'

interface TeamMemberData {
  id: string
  firstName: string
  lastName: string
  role: string
  _count: { assignedGoals: number }
  assignedGoals: { status: string }[]
}

const ROLE_LABELS: Record<string, string> = {
  GM: 'General Manager',
  COACH: 'Coach',
  FRONT_DESK: 'Front Desk',
  MARKETING: 'Marketing',
  OPERATIONS: 'Operations',
  FINANCE: 'Finance',
  PRO_SHOP: 'Pro Shop',
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMemberData[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/team-members')
      .then(r => r.json())
      .then(json => setMembers(json.data || []))
      .finally(() => setLoading(false))
  }, [])

  const getStatusCounts = (member: TeamMemberData) => {
    const counts: Record<string, number> = {}
    member.assignedGoals.forEach(g => {
      counts[g.status] = (counts[g.status] || 0) + 1
    })
    return counts
  }

  return (
    <>
      <Header title="Team" />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-40 bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {members.map(member => {
              const statusCounts = getStatusCounts(member)
              return (
                <button
                  key={member.id}
                  onClick={() => router.push(`/goals?assigneeId=${member.id}`)}
                  className="bg-brand-card border border-brand-border rounded-xl p-4 hover:border-zinc-600 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-semibold text-sm">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-zinc-500">{ROLE_LABELS[member.role] || member.role}</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 mb-2">
                    {member._count.assignedGoals} goal{member._count.assignedGoals !== 1 ? 's' : ''} assigned
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(statusCounts).map(([s, count]) => (
                      <span
                        key={s}
                        className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          GOAL_STATUS_COLORS[s]
                        )}
                      >
                        {count} {GOAL_STATUS_LABELS[s]}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
