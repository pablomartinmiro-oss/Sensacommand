'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Brain, X, Send, Loader2, ChevronDown, Sparkles } from 'lucide-react'

// Extract text content from a UIMessage's parts array
function getMessageText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text!)
    .join('')
}

export function SensaBrain() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/ai/brain' }),
    []
  )

  const { messages, sendMessage, setMessages, status } = useChat({
    transport,
    onFinish: () => {
      if (!isOpen) setHasNewMessage(true)
    },
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Send message handler
  const doSend = () => {
    const text = inputValue.trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInputValue('')
  }

  // Handle Enter to submit (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doSend()
    }
  }

  const suggestions = [
    'How many new players this week?',
    "What's today's priority list?",
    'Show me members at churn risk',
    'Revenue last 7 days',
  ]

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50
          rounded-full shadow-lg
          flex items-center justify-center
          transition-all duration-300 ease-out
          ${isOpen
            ? 'bg-[#1A1A2E] text-white hover:bg-[#2a2a4e] scale-90'
            : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white hover:from-amber-500 hover:to-amber-700 hover:scale-110'
          }
        `}
        style={{ width: 52, height: 52 }}
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <Brain className="w-6 h-6" />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </>
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={`
          fixed z-40 transition-all duration-300 ease-out
          bottom-0 right-0 lg:bottom-20 lg:right-6
          ${isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
      >
        <div className="w-screen h-[100dvh] lg:w-[420px] lg:h-[600px] lg:rounded-2xl bg-white lg:shadow-2xl border border-[#E8E4DD] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E4DD] bg-[#1A1A2E]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white leading-tight">Sensa Brain</h3>
                <p className="text-[11px] text-gray-400 leading-tight">
                  {isLoading ? 'Thinking...' : 'Ask me anything about the club'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded transition-colors lg:hidden"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#FAFAF8]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mb-4">
                  <Brain className="w-7 h-7 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-[#1A1A2E] mb-1">Hey Pablo 👋</p>
                <p className="text-xs text-gray-500 mb-5 max-w-[260px]">
                  I have live access to the Sensa database. Ask me anything about players, revenue, members, or the club.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-[300px]">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage({ text: s })}
                      className="text-left text-xs px-3 py-2.5 rounded-xl border border-[#E8E4DD] hover:border-amber-300 hover:bg-amber-50/50 text-gray-600 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const text = getMessageText(message.parts as Array<{ type: string; text?: string }>)
                  if (!text) return null

                  if (message.role === 'user') {
                    return (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-[#1A1A2E] text-white text-sm leading-relaxed">
                          {text}
                        </div>
                      </div>
                    )
                  }
                  return (
                    <div key={message.id} className="flex justify-start">
                      <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-[#E8E4DD] text-sm text-[#1A1A2E] leading-relaxed shadow-sm">
                        <BrainMessage content={text} />
                      </div>
                    </div>
                  )
                })}
                {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-white border border-[#E8E4DD] shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Querying database...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[#E8E4DD] bg-white px-3 py-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Sensa Brain..."
                rows={1}
                className="flex-1 resize-none border border-[#E8E4DD] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 bg-[#FAFAF8] placeholder-gray-400 max-h-24"
                style={{ minHeight: 40 }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={doSend}
                disabled={!inputValue.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-[#1A1A2E] text-white flex items-center justify-center hover:bg-[#2a2a4e] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Simple markdown-ish renderer for the brain's responses
function BrainMessage({ content }: { content: string }) {
  if (!content) return null

  const parts = content.split('\n')

  return (
    <div className="space-y-1.5">
      {parts.map((line, i) => {
        const formatted = line.replace(
          /\*\*(.+?)\*\*/g,
          '<strong class="font-semibold text-[#1A1A2E]">$1</strong>'
        )

        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s*/, '') }} />
            </div>
          )
        }

        if (/^\d+\.\s/.test(line.trim())) {
          return (
            <div key={i} className="pl-1" dangerouslySetInnerHTML={{ __html: formatted }} />
          )
        }

        if (!line.trim()) return <div key={i} className="h-1" />

        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
      })}
    </div>
  )
}

