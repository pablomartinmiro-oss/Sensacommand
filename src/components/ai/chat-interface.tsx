'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { ConversationList } from './conversation-list'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Send, Bot, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { AIMessage } from '@/types'

interface ConversationSummary {
  id: string
  title: string | null
  createdAt: string
}

interface ConversationFull {
  id: string
  title: string | null
  createdAt: string
  messages: AIMessage[]
}

// Basic markdown rendering for AI responses
function renderMarkdown(text: string): string {
  const html = text
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-white rounded-lg p-3 my-2 overflow-x-auto text-xs"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-[#F0EFE9] px-1.5 py-0.5 rounded text-amber-300 text-xs">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-[#1A1A2E] font-semibold">$1</strong>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc text-[#374151]">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-[#374151]">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>')
    // Line breaks
    .replace(/\n/g, '<br>')
  return html
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-[#9CA3AF] rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

export function ChatInterface() {
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, sending, scrollToBottom])

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/chat')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setConversations(json.data || [])
    } catch {
      toast('error', 'Failed to load conversations')
    } finally {
      setLoadingConversations(false)
    }
  }, [toast])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Load conversation messages
  async function loadConversation(id: string) {
    setActiveConversationId(id)
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/ai/chat?conversationId=${id}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      const conv = json.data as ConversationFull
      setMessages(conv.messages || [])
    } catch {
      toast('error', 'Failed to load conversation')
    } finally {
      setLoadingMessages(false)
    }
  }

  function handleNewConversation() {
    setActiveConversationId(null)
    setMessages([])
    setInput('')
  }

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed || sending) return

    const userMsg: AIMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    // Auto-resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          conversationId: activeConversationId,
        }),
      })

      if (!res.ok) throw new Error('Failed to get response')
      const json = await res.json()
      const data = json.data

      // Set conversation ID if new
      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId)
      }

      // Add assistant message
      setMessages((prev) => [...prev, {
        role: 'assistant' as const,
        content: data.response,
        timestamp: new Date().toISOString(),
      }])
      await fetchConversations()
    } catch {
      toast('error', 'Failed to get AI response')
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          'border-r border-[#E8E4DD] bg-white transition-all duration-300 overflow-hidden',
          sidebarOpen ? 'w-72' : 'w-0',
        )}
      >
        {loadingConversations ? (
          <div className="p-4 space-y-3">
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
            <SkeletonCard lines={1} />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={loadConversation}
            onNew={handleNewConversation}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#E8E4DD] bg-white">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-[#F0EFE9] text-[#9CA3AF] hover:text-[#1A1A2E] transition-colors"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-[#374151]">
              Sensa AI Assistant
            </span>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {loadingMessages ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={3} />
            </div>
          ) : messages.length === 0 ? (
            <div className="max-w-3xl mx-auto flex flex-col items-center justify-center h-full text-center">
              <Bot className="w-16 h-16 text-[#D1D5DB] mb-4" />
              <h3 className="text-lg font-heading font-semibold text-[#6B7280] mb-2">
                Sensa AI Assistant
              </h3>
              <p className="text-sm text-[#9CA3AF] max-w-md">
                Ask me anything about your club. I can query players, revenue, visits,
                members, leads, draft messages, and more.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 max-w-lg justify-center">
                {[
                  'How many active members do we have?',
                  'Who are our top 5 players by visits?',
                  'Show me revenue for this month',
                  'Which players haven\'t visited in 30 days?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt)
                      textareaRef.current?.focus()
                    }}
                    className="px-3 py-2 text-xs rounded-lg border border-[#E8E4DD] bg-white text-[#6B7280] hover:text-amber-400 hover:border-amber-500/30 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-[#F0EFE9] flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-4 py-3 text-sm',
                      msg.role === 'user'
                        ? 'bg-amber-50 text-[#1A1A2E] border border-amber-200'
                        : 'bg-[#F0EFE9] text-[#374151] border border-[#D1D5DB]/50',
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <div
                        className="prose-sm [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ol]:list-decimal"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-[#F0EFE9] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="bg-[#F0EFE9] rounded-xl px-4 py-3 border border-[#D1D5DB]/50">
                    <LoadingDots />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-[#E8E4DD] bg-white px-4 py-3">
          <div className="max-w-3xl mx-auto flex gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI assistant..."
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-xl border bg-white px-4 py-3 text-sm text-[#1A1A2E]',
                'placeholder:text-[#9CA3AF]',
                'border-[#D1D5DB] focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60',
                'focus:outline-none transition-colors',
              )}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              loading={sending}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-center text-xs text-[#9CA3AF] mt-2 max-w-3xl mx-auto">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}
