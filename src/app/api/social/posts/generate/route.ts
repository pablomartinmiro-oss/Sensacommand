import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { anthropic } from '@/lib/anthropic'
import { z } from 'zod'

const generateSchema = z.object({
  description: z.string().min(3),
  platform: z.string().default('INSTAGRAM'),
  category: z.string().optional().nullable(),
})

const SOCIAL_PROMPT = `You are the social media writer for Sensa Padel, a padel club in Nashville.

Voice: energetic, community-first, Nashville-cool. Not corporate. Not cringe.
Use emojis sparingly (1-2 max). Short punchy sentences.

For Instagram: 150 words max, include a CTA, suggest 5-10 hashtags
For TikTok: 100 words max, hook in first line, trending/fun tone
For LinkedIn: 200 words max, professional but warm, growth story angle
For All: Write platform-specific versions of the same concept

Always include:
- A strong hook in the first line
- Specific details about Sensa (Nashville, padel, community)
- A clear CTA (book, visit, DM, link in bio)

Respond with JSON only (no markdown wrapping):
{
  "instagram": { "content": "...", "hashtags": ["...", "..."] },
  "tiktok": { "content": "...", "hashtags": ["...", "..."] },
  "linkedin": { "content": "...", "hashtags": ["...", "..."] }
}

If only one platform is specified, only return that platform's version.`

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = generateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') }, { status: 400 })
    }

    const platformInstruction = parsed.data.platform === 'ALL'
      ? 'Write for all platforms.'
      : `Write for ${parsed.data.platform} only.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SOCIAL_PROMPT,
      messages: [{ role: 'user', content: `${platformInstruction}\n\nTopic: ${parsed.data.description}${parsed.data.category ? `\nCategory: ${parsed.data.category}` : ''}` }],
    })

    let text = ''
    for (const block of response.content) {
      if (block.type === 'text') text += block.text
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI did not return valid JSON' }, { status: 500 })
    }

    const generated = JSON.parse(jsonMatch[0])
    return NextResponse.json({ data: generated })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error', message: (e as Error).message }, { status: 500 })
  }
}
