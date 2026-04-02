import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

// Primary: Claude Sonnet 4.6 — best tool-calling reliability
export const anthropicProvider = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Secondary: GPT-4.1 Mini — 9x cheaper, great for simple queries
export const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// Tertiary: Gemini 2.5 Flash — 10x cheaper input, very fast
export const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY || '',
})

// Model definitions with metadata
export const MODELS = {
  // Primary — complex multi-tool chains, analysis, message drafting
  primary: {
    id: 'claude-sonnet-4-6-20250514',
    provider: anthropicProvider,
    name: 'Claude Sonnet 4.6',
    costPer1MInput: 3.0,
    costPer1MOutput: 15.0,
  },
  // Fast — simple lookups, single-tool queries (85-90% cheaper)
  fast: {
    id: 'gpt-4.1-mini',
    provider: openaiProvider,
    name: 'GPT-4.1 Mini',
    costPer1MInput: 0.4,
    costPer1MOutput: 1.6,
  },
  // Flash — ultra-fast, cheapest option
  flash: {
    id: 'gemini-2.5-flash-preview-05-20',
    provider: googleProvider,
    name: 'Gemini 2.5 Flash',
    costPer1MInput: 0.15,
    costPer1MOutput: 0.6,
  },
} as const

export type ModelTier = keyof typeof MODELS

/**
 * Pick the right model based on query complexity.
 * Simple lookups go to the cheap/fast model, complex queries go to Claude.
 */
export function selectModel(message: string): ModelTier {
  // If no OpenAI key, always use primary
  if (!process.env.OPENAI_API_KEY) return 'primary'

  const lower = message.toLowerCase()

  // Complex queries that need Claude's reliability
  const complexPatterns = [
    // Multi-step analysis
    /analyz|analysis|insight|summary|report|review|compare/,
    // Message drafting (needs good language)
    /draft|write|compose|send.*message|email/,
    // Multi-entity queries
    /and also|then also|after that|additionally/,
    // Automation creation
    /create.*automation|set up.*automation|automate/,
    // SQL queries
    /sql|query.*database|raw.*query/,
    // Strategy/recommendation
    /recommend|suggest|should i|what should|strategy/,
    // Bulk operations
    /snooze.*goals|bulk|all.*overdue/,
    // Weekly/daily summaries
    /weekly|daily.*priorities|brief/,
  ]

  for (const pattern of complexPatterns) {
    if (pattern.test(lower)) return 'primary'
  }

  // Simple lookups go to fast model
  return 'fast'
}
