'use client'

import { cn, formatDate } from '@/lib/utils'
import { MessageSquare, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConversationSummary {
  id: string
  title: string | null
  createdAt: string
}

interface ConversationListProps {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onClose?: () => void
  className?: string
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onClose,
  className,
}: ConversationListProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E4DD]">
        <h3 className="text-sm font-semibold text-[#374151]">Conversations</h3>
        <div className="flex gap-1">
          <Button size="sm" onClick={onNew}>
            <Plus className="w-3.5 h-3.5" />
            New
          </Button>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded hover:bg-[#F0EFE9] text-[#9CA3AF]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {conversations.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-[#9CA3AF]">
            No conversations yet.
          </p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                activeId === conv.id
                  ? 'bg-amber-500/10 border-r-2 border-amber-500'
                  : 'hover:bg-[#F0EFE9]/60',
              )}
            >
              <MessageSquare
                className={cn(
                  'w-4 h-4 mt-0.5 shrink-0',
                  activeId === conv.id ? 'text-amber-400' : 'text-[#9CA3AF]',
                )}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium truncate',
                    activeId === conv.id ? 'text-amber-300' : 'text-[#374151]',
                  )}
                >
                  {conv.title || 'Untitled'}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  {formatDate(conv.createdAt)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
