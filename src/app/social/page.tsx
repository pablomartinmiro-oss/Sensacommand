'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Modal } from '@/components/ui/modal'
import { cn, formatDate } from '@/lib/utils'
import { Plus, Calendar, List, BarChart3, Copy, Sparkles } from 'lucide-react'

interface SocialPost {
  id: string
  title: string
  content: string
  platform: string
  hashtags: string[]
  scheduledFor: string | null
  status: string
  category: string | null
  postedAt: string | null
  metrics: { likes?: number; comments?: number; shares?: number; views?: number; saves?: number } | null
}

const PLATFORMS = ['INSTAGRAM', 'TIKTOK', 'FACEBOOK', 'LINKEDIN', 'ALL']
const STATUSES = ['DRAFT', 'SCHEDULED', 'POSTED', 'CANCELLED']
const CATEGORIES = ['PROMO', 'EVENT', 'COMMUNITY', 'BEHIND_SCENES', 'TIPS', 'TESTIMONIAL', 'PARTNERSHIP', 'ANNOUNCEMENT']

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white',
  TIKTOK: 'bg-gray-900 text-white',
  FACEBOOK: 'bg-blue-600 text-white',
  LINKEDIN: 'bg-sky-700 text-white',
  ALL: 'bg-amber-500 text-white',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  POSTED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-500',
}

const CATEGORY_COLORS: Record<string, string> = {
  PROMO: 'bg-amber-50 text-amber-700 border-amber-200',
  EVENT: 'bg-purple-50 text-purple-700 border-purple-200',
  COMMUNITY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BEHIND_SCENES: 'bg-orange-50 text-orange-700 border-orange-200',
  TIPS: 'bg-blue-50 text-blue-700 border-blue-200',
  TESTIMONIAL: 'bg-pink-50 text-pink-700 border-pink-200',
  PARTNERSHIP: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ANNOUNCEMENT: 'bg-cyan-50 text-cyan-700 border-cyan-200',
}

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'calendar' | 'posts' | 'analytics'>('calendar')
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  // Filters
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/social/posts')
      const json = await res.json()
      setPosts(json.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const filtered = useMemo(() => {
    return posts.filter(p => {
      if (filterPlatform && p.platform !== filterPlatform) return false
      if (filterStatus && p.status !== filterStatus) return false
      return true
    })
  }, [posts, filterPlatform, filterStatus])

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay()
  const monthName = new Date(calYear, calMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const today = new Date()

  const getPostsForDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return posts.filter(p => p.scheduledFor?.startsWith(dateStr))
  }

  const PLATFORM_DOTS: Record<string, string> = {
    INSTAGRAM: 'bg-pink-500', TIKTOK: 'bg-gray-800', FACEBOOK: 'bg-blue-500', LINKEDIN: 'bg-sky-600', ALL: 'bg-amber-500',
  }

  return (
    <>
      <Header
        title="Social Media"
        action={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-600 transition-colors">
            <Plus className="w-4 h-4" /> New Post
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[#E8E4DD]">
          {([['calendar', Calendar, 'Calendar'], ['posts', List, 'All Posts'], ['analytics', BarChart3, 'Analytics']] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)} className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors', tab === key ? 'border-amber-500 text-amber-600' : 'border-transparent text-[#6B7280] hover:text-[#1A1A2E]')}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Calendar View */}
        {tab === 'calendar' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }} className="px-3 py-1 text-sm text-[#6B7280] hover:text-[#1A1A2E]">&larr; Prev</button>
              <h3 className="text-lg font-semibold text-[#1A1A2E]">{monthName}</h3>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }} className="px-3 py-1 text-sm text-[#6B7280] hover:text-[#1A1A2E]">Next &rarr;</button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#E8E4DD] rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-[#F8F7F4] px-2 py-2 text-xs font-medium text-[#6B7280] text-center">{d}</div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white min-h-[80px]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayPosts = getPostsForDay(day)
                const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
                return (
                  <div key={day} className={cn('bg-white min-h-[80px] p-1.5 text-xs cursor-pointer hover:bg-[#F8F7F4] transition-colors', isToday && 'bg-amber-50')}>
                    <span className={cn('inline-block w-6 h-6 rounded-full text-center leading-6 font-medium', isToday ? 'bg-amber-500 text-white' : 'text-[#374151]')}>{day}</span>
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {dayPosts.slice(0, 3).map(p => (
                        <button key={p.id} onClick={() => setSelectedPost(p)} className={cn('w-2 h-2 rounded-full', PLATFORM_DOTS[p.platform] || 'bg-gray-400')} title={p.title} />
                      ))}
                      {dayPosts.length > 3 && <span className="text-[8px] text-[#9CA3AF]">+{dayPosts.length - 3}</span>}
                    </div>
                    {dayPosts.length > 0 && (
                      <p className="text-[9px] text-[#6B7280] truncate mt-0.5">{dayPosts[0].title}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Posts List View */}
        {tab === 'posts' && (
          <div>
            <div className="flex gap-3 mb-4">
              <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E]">
                <option value="">All Platforms</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E]">
                <option value="">All Statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto border border-[#E8E4DD] rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E4DD] bg-[#F8F7F4]">
                    <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Title</th>
                    <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Platform</th>
                    <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Status</th>
                    <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Category</th>
                    <th className="text-left px-4 py-2 text-[#6B7280] font-medium text-xs">Scheduled</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#9CA3AF]">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#9CA3AF]">No posts found</td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id} className="border-b border-[#E8E4DD] hover:bg-[#F8F7F4] cursor-pointer" onClick={() => setSelectedPost(p)}>
                      <td className="px-4 py-2 text-[#1A1A2E] max-w-xs truncate">{p.title}</td>
                      <td className="px-4 py-2"><span className={cn('text-[10px] rounded px-1.5 py-0.5 font-medium', PLATFORM_COLORS[p.platform])}>{p.platform}</span></td>
                      <td className="px-4 py-2"><span className={cn('text-xs rounded-full px-2 py-0.5 font-medium', STATUS_COLORS[p.status])}>{p.status}</span></td>
                      <td className="px-4 py-2">{p.category && <span className={cn('text-[10px] rounded-full border px-1.5 py-0.5', CATEGORY_COLORS[p.category])}>{p.category}</span>}</td>
                      <td className="px-4 py-2 text-xs text-[#6B7280]">{p.scheduledFor ? formatDate(new Date(p.scheduledFor)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics View */}
        {tab === 'analytics' && <AnalyticsView />}
      </main>

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          open={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          onUpdated={() => { setSelectedPost(null); fetchPosts() }}
        />
      )}

      {/* Create Post Modal */}
      {showCreate && (
        <CreatePostModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchPosts() }}
        />
      )}
    </>
  )
}

function AnalyticsView() {
  const [data, setData] = useState<{ totalThisMonth: number; avgEngagement: number } | null>(null)
  useEffect(() => {
    fetch('/api/social/analytics').then(r => r.json()).then(j => setData(j.data))
  }, [])

  if (!data) return <div className="text-[#9CA3AF] text-sm">Loading analytics...</div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white border border-[#E8E4DD] rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-[#1A1A2E]">{data.totalThisMonth}</p>
        <p className="text-xs text-[#9CA3AF]">Posts This Month</p>
      </div>
      <div className="bg-white border border-[#E8E4DD] rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-[#1A1A2E]">{data.avgEngagement}</p>
        <p className="text-xs text-[#9CA3AF]">Avg Engagement</p>
      </div>
      <div className="bg-white border border-[#E8E4DD] rounded-xl p-4 text-center">
        <p className="text-2xl font-bold text-amber-500">—</p>
        <p className="text-xs text-[#9CA3AF]">Top Post</p>
      </div>
    </div>
  )
}

function PostDetailModal({ post, open, onClose, onUpdated }: { post: SocialPost; open: boolean; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus] = useState(post.status)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    const text = post.content + '\n\n' + post.hashtags.map(h => `#${h}`).join(' ')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const updateStatus = async (newStatus: string) => {
    setStatus(newStatus)
    await fetch(`/api/social/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    onUpdated()
  }

  return (
    <Modal open={open} onClose={onClose} title={post.title} maxWidth="max-w-2xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs rounded px-2 py-0.5 font-medium', PLATFORM_COLORS[post.platform])}>{post.platform}</span>
          {post.category && <span className={cn('text-xs rounded-full border px-2 py-0.5', CATEGORY_COLORS[post.category])}>{post.category}</span>}
        </div>

        <div className="bg-[#F8F7F4] rounded-lg p-4 text-sm text-[#374151] whitespace-pre-wrap">{post.content}</div>

        {post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.map(h => <span key={h} className="text-xs text-blue-600">#{h}</span>)}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={copyToClipboard} className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#D1D5DB] text-xs text-[#374151] hover:bg-[#F0EFE9] transition-colors">
            <Copy className="w-3.5 h-3.5" /> {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <select value={status} onChange={e => updateStatus(e.target.value)} className={cn('h-8 rounded-lg border px-2 text-xs font-medium', STATUS_COLORS[status])}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {post.scheduledFor && (
          <p className="text-xs text-[#9CA3AF]">Scheduled: {formatDate(new Date(post.scheduledFor))}</p>
        )}
      </div>
    </Modal>
  )
}

function CreatePostModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<'ai' | 'manual'>('ai')
  const [aiPrompt, setAiPrompt] = useState('')
  const [platform, setPlatform] = useState('INSTAGRAM')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const generate = async () => {
    if (!aiPrompt.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/social/posts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiPrompt, platform, category: category || null }),
      })
      const json = await res.json()
      const data = json.data
      const key = platform.toLowerCase() as string
      const postData = data[key] || data.instagram || Object.values(data)[0] as { content: string; hashtags: string[] }
      if (postData) {
        setContent(postData.content || '')
        setHashtags((postData.hashtags || []).join(', '))
        setTitle(aiPrompt.slice(0, 60))
        setMode('manual') // switch to manual to show preview
      }
    } catch { /* ignore */ }
    setGenerating(false)
  }

  const save = async (status: string) => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    try {
      await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          platform,
          hashtags: hashtags.split(',').map(h => h.trim().replace(/^#/, '')).filter(Boolean),
          scheduledFor: scheduledFor || null,
          status,
          category: category || null,
        }),
      })
      onCreated()
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Post" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button onClick={() => setMode('ai')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', mode === 'ai' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-[#6B7280] border border-[#D1D5DB]')}>
            <Sparkles className="w-3.5 h-3.5" /> Write with AI
          </button>
          <button onClick={() => setMode('manual')} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', mode === 'manual' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-[#6B7280] border border-[#D1D5DB]')}>
            Write manually
          </button>
        </div>

        {/* Platform + Category */}
        <div className="flex gap-3">
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="flex-1 h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E]">
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)} className="flex-1 h-9 rounded-lg border border-[#D1D5DB] bg-white px-2 text-sm text-[#1A1A2E]">
            <option value="">Category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {mode === 'ai' ? (
          <>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Tell me what you want to post about..."
              rows={4}
              className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
            />
            <div className="text-[10px] text-[#9CA3AF] space-y-1">
              <p>Examples:</p>
              <p>&bull; Friday night padel social event this week</p>
              <p>&bull; Behind the scenes of our new Fish Monger space</p>
              <p>&bull; Pro tip about padel volleys from Coach Fonsi</p>
            </div>
            <button onClick={generate} disabled={generating || !aiPrompt.trim()} className="w-full h-9 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-50 hover:bg-amber-600 transition-colors">
              {generating ? 'Generating...' : 'Generate Post'}
            </button>
          </>
        ) : (
          <>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title (internal)" className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Post content..." rows={5} className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
            <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="Hashtags (comma separated)" className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} className="w-full h-9 rounded-lg border border-[#D1D5DB] bg-white px-3 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
            <div className="flex justify-end gap-2">
              <button onClick={() => save('DRAFT')} disabled={saving} className="h-9 px-4 rounded-lg border border-[#D1D5DB] text-sm text-[#374151] hover:bg-[#F0EFE9] disabled:opacity-50 transition-colors">Save Draft</button>
              <button onClick={() => save('SCHEDULED')} disabled={saving || !scheduledFor} className="h-9 px-4 rounded-lg bg-amber-500 text-black text-sm font-semibold disabled:opacity-50 hover:bg-amber-600 transition-colors">Schedule</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
