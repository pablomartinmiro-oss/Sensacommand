import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { anthropic } from '@/lib/anthropic'
import { z } from 'zod'

const createSchema = z.object({
  description: z.string().min(5, 'Description too short'),
})

const AI_AUTOMATION_PROMPT = `You are an automation builder for Sensa Padel. The user will describe an automation they want in plain English. Your job is to translate it into a structured automation configuration.

You MUST respond with ONLY a JSON object (no markdown, no explanation) in this exact format:

{
  "name": "Short name for the automation",
  "description": "What this automation does",
  "triggerType": "PLAYER_INACTIVE | PLAYER_VISITS_NO_MEMBERSHIP | NEW_PLAYER_NO_FOLLOWUP | MEMBERSHIP_EXPIRING | MEMBER_VISIT_DROP | GOAL_OVERDUE | SCHEDULED | CUSTOM_QUERY",
  "actionType": "DRAFT_MESSAGE | SEND_EMAIL | SEND_TELEGRAM | UPDATE_STATUS | CREATE_GOAL | LOG_ONLY",
  "triggerConfig": { },
  "actionConfig": { },
  "schedule": "cron expression or null"
}

Available trigger types and their config:
- PLAYER_INACTIVE: { "days": number, "statuses": ["ACTIVE", "HOT_LEAD", etc.] }
- PLAYER_VISITS_NO_MEMBERSHIP: { "minVisits": number, "withinDays": number }
- NEW_PLAYER_NO_FOLLOWUP: { "daysAfterFirst": number }
- MEMBERSHIP_EXPIRING: { "daysBefore": number }
- MEMBER_VISIT_DROP: { "dropPercent": number, "weeks": number }
- GOAL_OVERDUE: { "assignee": "name or null for all", "minDaysOverdue": number }
- SCHEDULED: { "description": "what to report on" }
- CUSTOM_QUERY: { "sql": "SELECT query to find matching players/data", "description": "what this query finds" }

Available action types and their config:
- DRAFT_MESSAGE: { "channel": "WHATSAPP" | "EMAIL", "customMessage": "message text" }
- SEND_EMAIL: { "subject": "email subject" }
- SEND_TELEGRAM: { "message": "what to include in the alert" }
- UPDATE_STATUS: { "newStatus": "COLD_LEAD" | "CHURNED" | "HOT_LEAD" etc. }
- CREATE_GOAL: { "title": "goal title", "assignee": "name", "priority": "HIGH" | "MEDIUM" | "LOW" }
- LOG_ONLY: {}

Club context:
- Memberships: Unlimited ($350/mo), Standard 8 sessions ($200/mo), Casual ($40/session)
- 6 courts, peak hours 5-9pm
- Team: Pablo (GM), Aditya (Ops), Marcus (Pro Shop), Arianna (Marketing), Maria (Ops), Scott (Finance), Sebastián (Coach), Tripp (Finance)`

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', message: parsed.error.issues.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: AI_AUTOMATION_PROMPT,
      messages: [{ role: 'user', content: parsed.data.description }],
    })

    let jsonText = ''
    for (const block of response.content) {
      if (block.type === 'text') jsonText += block.text
    }

    // Extract JSON from possible markdown wrapping
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI did not return valid JSON' }, { status: 500 })
    }

    const config = JSON.parse(jsonMatch[0])

    // Validate CUSTOM_QUERY safety
    if (config.triggerType === 'CUSTOM_QUERY' && config.triggerConfig?.sql) {
      const sql = config.triggerConfig.sql.trim().toUpperCase()
      if (!sql.startsWith('SELECT')) {
        return NextResponse.json({ error: 'Custom queries must be SELECT statements' }, { status: 400 })
      }
      const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE']
      for (const word of forbidden) {
        if (sql.includes(word)) {
          return NextResponse.json({ error: `Forbidden SQL keyword: ${word}` }, { status: 400 })
        }
      }
    }

    // Create a unique type slug
    const typeSlug = 'ai-' + config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Date.now().toString(36)

    const automation = await prisma.automationConfig.create({
      data: {
        type: typeSlug,
        name: config.name,
        description: config.description,
        enabled: true,
        schedule: config.schedule || '0 9 * * *',
        createdBy: 'ai',
        aiPrompt: parsed.data.description,
        triggerType: config.triggerType,
        actionType: config.actionType,
        triggerConfig: config.triggerConfig || {},
        actionConfig: config.actionConfig || {},
      },
    })

    return NextResponse.json({
      data: {
        automation,
        preview: config,
      },
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Internal server error', message: (e as Error).message },
      { status: 500 }
    )
  }
}
