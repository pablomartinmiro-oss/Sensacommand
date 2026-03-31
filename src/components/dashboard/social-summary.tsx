'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Share2 } from 'lucide-react'

interface Post {
  id: string
  status: string
  scheduledFor: string | null
}

export function SocialSummary() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/social/posts')
      .then(r => r.json())
      .then(json => setPosts(json.data || []))
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const weekEnd = new Date(now.getTime() + 7 * 86400000)
  const scheduledThisWeek = posts.filter(p => p.status === 'SCHEDULED' && p.scheduledFor && new Date(p.scheduledFor) <= weekEnd).length
  const draftsNeedAttention = posts.filter(p => p.status === 'DRAFT').length

  if (loading) {
    return (
      <div className="bg-white border border-[#E8E4DD] rounded-xl p-4">
        <div className="h-6 w-24 bg-[#F0EFE9] rounded animate-pulse mb-3" />
        <div className="h-4 bg-[#F0EFE9] rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#E8E4DD] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-pink-500" />
          <h3 className="text-sm font-semibold text-[#1A1A2E]">Social</h3>
        </div>
        <Link href="/social" className="text-xs text-amber-500 hover:text-amber-600">View all</Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold text-blue-600">{scheduledThisWeek}</p>
          <p className="text-[10px] text-[#9CA3AF]">Scheduled This Week</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-500">{draftsNeedAttention}</p>
          <p className="text-[10px] text-[#9CA3AF]">Drafts Need Content</p>
        </div>
      </div>
    </div>
  )
}
