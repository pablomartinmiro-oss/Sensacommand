'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Modal } from '@/components/ui/modal'
import { cn, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { LayoutDashboard, Calendar, List, Plus, Check, X } from 'lucide-react'

interface TeamMemberRef { id: string; firstName: string; lastName: string; role: string }
interface LeaveReq { id: string; teamMemberId: string; teamMember: TeamMemberRef; startDate: string; endDate: string; days: number; type: string; reason: string | null; status: string; approvedBy: string | null }
interface Allowance { id: string; teamMemberId: string; teamMember: TeamMemberRef; totalDays: number; usedDays: number }

const TYPE_COLORS: Record<string, string> = { PTO: 'bg-amber-50 text-amber-700 border-amber-200', SICK: 'bg-red-50 text-red-600 border-red-200', PERSONAL: 'bg-blue-50 text-blue-700 border-blue-200', REMOTE: 'bg-purple-50 text-purple-700 border-purple-200' }
const STATUS_COLORS: Record<string, string> = { PENDING: 'bg-amber-50 text-amber-700', APPROVED: 'bg-emerald-50 text-emerald-700', DENIED: 'bg-red-50 text-red-600', CANCELLED: 'bg-slate-100 text-slate-500' }
const MEMBER_COLORS: Record<string, string> = { Pablo: 'bg-amber-400', Aditya: 'bg-blue-400', Maria: 'bg-emerald-400', Arianna: 'bg-pink-400', Tripp: 'bg-purple-400' }

export default function LeavePage() {
  const { toast } = useToast()
  const [tab, setTab] = useState<'dashboard' | 'calendar' | 'requests'>('dashboard')
  const [requests, setRequests] = useState<LeaveReq[]>([])
  const [allowances, setAllowances] = useState<Allowance[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calEvents, setCalEvents] = useState<LeaveReq[]>([])
  const [filterStatus, setFilterStatus] = useState('')

  const fetchData = useCallback(async () => {
    const [rRes, aRes] = await Promise.all([fetch('/api/leave'), fetch('/api/leave/allowances')])
    const [rJson, aJson] = await Promise.all([rRes.json(), aRes.json()])
    setRequests(rJson.data || [])
    setAllowances(aJson.data || [])
    setLoading(false)
  }, [])

  const fetchCalendar = useCallback(async () => {
    const res = await fetch(`/api/leave/calendar?month=${calMonth}&year=${calYear}`)
    const json = await res.json()
    setCalEvents(json.data || [])
  }, [calMonth, calYear])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (tab === 'calendar') fetchCalendar() }, [tab, fetchCalendar])

  const approve = async (id: string) => {
    await fetch(`/api/leave/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'APPROVED' }) })
    toast('success', 'Request approved')
    fetchData()
  }

  const deny = async (id: string) => {
    await fetch(`/api/leave/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DENIED' }) })
    toast('info', 'Request denied')
    fetchData()
  }

  const totalAllowance = allowances.reduce((s, a) => s + a.totalDays, 0)
  const totalUsed = allowances.reduce((s, a) => s + a.usedDays, 0)
  const pendingCount = requests.filter(r => r.status === 'PENDING').length

  const upcoming = useMemo(() => {
    const cutoff = new Date(Date.now() + 90 * 86400000)
    return requests.filter(r => (r.status === 'APPROVED' || r.status === 'PENDING') && new Date(r.startDate) >= new Date() && new Date(r.startDate) <= cutoff).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }, [requests])

  const filteredRequests = useMemo(() => {
    return requests.filter(r => !filterStatus || r.status === filterStatus)
  }, [requests, filterStatus])

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay()
  const monthName = new Date(calYear, calMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const getEventsForDay = (day: number) => {
    const d = new Date(calYear, calMonth, day)
    return calEvents.filter(e => d >= new Date(new Date(e.startDate).toDateString()) && d <= new Date(new Date(e.endDate).toDateString()))
  }

  const initials = (m: TeamMemberRef) => m.firstName[0] + m.lastName[0]

  if (loading) return <><Header title="Leave" /><main className="flex-1 p-6"><div className="animate-pulse space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#F0EFE9] rounded-xl" />)}</div></main></>

  return (
    <>
      <Header title="Leave" action={<button onClick={() => setShowNew(true)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-600 transition-colors"><Plus className="w-4 h-4" />Request Leave</button>} />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#E8E4DD]">
          {([['dashboard', LayoutDashboard, 'Dashboard'], ['calendar', Calendar, 'Calendar'], ['requests', List, 'Requests']] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)} className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', tab === key ? 'border-amber-500 text-amber-600' : 'border-transparent text-[#6B7280] hover:text-[#1A1A2E]')}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-[#E8E4DD] rounded-lg p-4 text-center"><p className="text-xl font-bold text-[#1A1A2E]">{totalAllowance}</p><p className="text-[10px] text-[#9CA3AF]">Total Allowance</p></div>
              <div className="bg-white border border-[#E8E4DD] rounded-lg p-4 text-center"><p className="text-xl font-bold text-amber-600">{totalUsed}</p><p className="text-[10px] text-[#9CA3AF]">Days Taken</p></div>
              <div className="bg-white border border-[#E8E4DD] rounded-lg p-4 text-center"><p className="text-xl font-bold text-blue-600">{pendingCount}</p><p className="text-[10px] text-[#9CA3AF]">Pending Approval</p></div>
              <div className="bg-white border border-[#E8E4DD] rounded-lg p-4 text-center"><p className="text-xl font-bold text-emerald-600">{totalAllowance - totalUsed}</p><p className="text-[10px] text-[#9CA3AF]">Days Remaining</p></div>
            </div>

            {/* Team Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allowances.map(a => {
                const pending = requests.filter(r => r.teamMemberId === a.teamMemberId && r.status === 'PENDING').reduce((s, r) => s + r.days, 0)
                const left = a.totalDays - a.usedDays
                const pct = a.totalDays > 0 ? (a.usedDays / a.totalDays) * 100 : 0
                return (
                  <div key={a.id} className="bg-white border border-[#E8E4DD] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold', MEMBER_COLORS[a.teamMember.firstName] || 'bg-slate-400')}>{initials(a.teamMember)}</span>
                      <div><p className="text-sm font-semibold text-[#1A1A2E]">{a.teamMember.firstName} {a.teamMember.lastName}</p><p className="text-[10px] text-[#9CA3AF]">{a.teamMember.role}</p></div>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full mb-2"><div className="h-2 bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                    <p className="text-xs text-[#6B7280]">{a.usedDays} Used · {pending > 0 ? `${pending} Pending · ` : ''}{left} Left</p>
                  </div>
                )
              })}
            </div>

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A2E] mb-3">Upcoming Time Off (90 days)</h3>
                <div className="space-y-2">
                  {upcoming.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-white border border-[#E8E4DD] rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold', MEMBER_COLORS[r.teamMember.firstName] || 'bg-slate-400')}>{initials(r.teamMember)}</span>
                        <div>
                          <p className="text-sm font-medium text-[#1A1A2E]">{r.teamMember.firstName} {r.teamMember.lastName}</p>
                          <p className="text-xs text-[#6B7280]">{formatDate(new Date(r.startDate))} – {formatDate(new Date(r.endDate))} · {r.reason || r.type} · {r.days}d</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px] rounded-full px-2 py-0.5 font-medium', STATUS_COLORS[r.status])}>{r.status.toLowerCase()}</span>
                        {r.status === 'PENDING' && (
                          <>
                            <button onClick={() => approve(r.id)} className="h-6 w-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100"><Check className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deny(r.id)} className="h-6 w-6 rounded bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><X className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {tab === 'calendar' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }} className="px-3 py-1 text-sm text-[#6B7280]">&larr; Prev</button>
              <h3 className="text-lg font-semibold text-[#1A1A2E]">{monthName}</h3>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }} className="px-3 py-1 text-sm text-[#6B7280]">Next &rarr;</button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#E8E4DD] rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-[#F8F7F4] px-2 py-2 text-xs font-medium text-[#6B7280] text-center">{d}</div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} className="bg-white min-h-[70px]" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const events = getEventsForDay(day)
                const isToday = day === new Date().getDate() && calMonth === new Date().getMonth() && calYear === new Date().getFullYear()
                return (
                  <div key={day} className={cn('bg-white min-h-[70px] p-1.5 text-xs', isToday && 'bg-amber-50')}>
                    <span className={cn('inline-block w-5 h-5 rounded-full text-center leading-5 text-[10px] font-medium', isToday ? 'bg-amber-500 text-white' : 'text-[#374151]')}>{day}</span>
                    <div className="space-y-0.5 mt-1">
                      {events.map(e => (
                        <div key={e.id} className={cn('h-1 rounded-full', MEMBER_COLORS[e.teamMember.firstName] || 'bg-slate-300', e.status === 'PENDING' && 'opacity-50')} title={`${e.teamMember.firstName}: ${e.reason || e.type}`} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {Object.entries(MEMBER_COLORS).map(([name, color]) => (
                <span key={name} className="flex items-center gap-1 text-[10px] text-[#6B7280]"><span className={cn('w-2 h-2 rounded-full', color)} />{name}</span>
              ))}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {tab === 'requests' && (
          <div>
            <div className="flex gap-2 mb-4">
              {['', 'PENDING', 'APPROVED', 'DENIED', 'CANCELLED'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={cn('px-3 py-1 rounded-lg text-xs font-medium transition-colors', filterStatus === s ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-[#6B7280] border border-[#D1D5DB]')}>
                  {s || 'All'}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto border border-[#E8E4DD] rounded-lg">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[#E8E4DD] bg-[#F8F7F4]">
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Team Member</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Dates</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Days</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Type</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Reason</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Status</th>
                  <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredRequests.map(r => (
                    <tr key={r.id} className="border-b border-[#E8E4DD]">
                      <td className="px-4 py-2 text-[#1A1A2E]">{r.teamMember.firstName} {r.teamMember.lastName}</td>
                      <td className="px-4 py-2 text-xs text-[#6B7280]">{formatDate(new Date(r.startDate))} – {formatDate(new Date(r.endDate))}</td>
                      <td className="px-4 py-2 text-[#1A1A2E]">{r.days}</td>
                      <td className="px-4 py-2"><span className={cn('text-[10px] rounded-full border px-2 py-0.5 font-medium', TYPE_COLORS[r.type])}>{r.type}</span></td>
                      <td className="px-4 py-2 text-xs text-[#6B7280] max-w-[200px] truncate">{r.reason || '—'}</td>
                      <td className="px-4 py-2"><span className={cn('text-[10px] rounded-full px-2 py-0.5 font-medium', STATUS_COLORS[r.status])}>{r.status}</span></td>
                      <td className="px-4 py-2">
                        {r.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button onClick={() => approve(r.id)} className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Approve</button>
                            <button onClick={() => deny(r.id)} className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100">Deny</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {showNew && <NewRequestModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); fetchData() }} allowances={allowances} />}
    </>
  )
}

function NewRequestModal({ open, onClose, onCreated, allowances }: { open: boolean; onClose: () => void; onCreated: () => void; allowances: Allowance[] }) {
  const [memberId, setMemberId] = useState(allowances.find(a => a.teamMember.role === 'GM')?.teamMemberId || allowances[0]?.teamMemberId || '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [type, setType] = useState('PTO')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0
    const s = new Date(startDate)
    const e = new Date(endDate)
    if (e < s) return 0
    let count = 0
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) count++
    }
    return count
  }, [startDate, endDate])

  const selectedAllowance = allowances.find(a => a.teamMemberId === memberId)
  const remaining = selectedAllowance ? selectedAllowance.totalDays - selectedAllowance.usedDays : 0
  const exceeds = days > remaining

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberId || !startDate || !endDate || days === 0) return
    setSaving(true)
    await fetch('/api/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamMemberId: memberId, startDate, endDate, days, type, reason: reason || null }) })
    setSaving(false)
    onCreated()
  }

  return (
    <Modal open={open} onClose={onClose} title="Request Leave" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <select value={memberId} onChange={e => setMemberId(e.target.value)} className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E]">
          {allowances.map(a => <option key={a.teamMemberId} value={a.teamMemberId}>{a.teamMember.firstName} {a.teamMember.lastName}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-[#6B7280] mb-1 block">Start Date</label><input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }} className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E]" required /></div>
          <div><label className="text-xs text-[#6B7280] mb-1 block">End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E]" required /></div>
        </div>
        {days > 0 && <p className="text-xs text-[#6B7280]">{days} business day{days !== 1 ? 's' : ''} · {remaining} days remaining {exceeds && <span className="text-red-500 font-medium">— exceeds balance by {days - remaining}</span>}</p>}
        <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E]">
          <option value="PTO">PTO</option><option value="SICK">Sick</option><option value="PERSONAL">Personal</option><option value="REMOTE">Remote</option>
        </select>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF]" />
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-sm text-[#6B7280]">Cancel</button><button type="submit" disabled={saving || days === 0} className="h-9 px-4 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-50 hover:bg-amber-600">{saving ? 'Submitting...' : 'Submit Request'}</button></div>
      </form>
    </Modal>
  )
}
