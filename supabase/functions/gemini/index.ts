/*
 * Gemini proxy (Stage 1).
 *
 * The private GEMINI_API_KEY lives here as a Supabase secret and never reaches the
 * app. This function also enforces the free-tier guardrails:
 *   - a free-model allowlist (paid-only models/features are rejected)
 *   - a server-side daily request cap (default 50), tracked in public.ai_usage
 *   - bounded input/output so a single call can never grow unbounded
 *
 * Deploy:  npx supabase functions deploy gemini --use-api
 * Secret:  npx supabase secrets set GEMINI_API_KEY=<free-tier-key>
 * Optional: GEMINI_MODEL (must be on the allowlist), GEMINI_DAILY_CAP
 *
 * The gateway runs with verify_jwt = true (supabase/config.toml), but it still accepts
 * the publishable `apikey` on its own as an anonymous credential. The handler therefore
 * also requires a signed-in user's JWT (an `authenticated` token with a `sub`).
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite'
const DAILY_CAP = Number(Deno.env.get('GEMINI_DAILY_CAP') ?? '50')

// Free-tier models only. Anything else is refused so we can never bill.
const FREE_MODELS = new Set([
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
])

const MAX_QUESTION_CHARS = 500
const MAX_CONTEXT_CHARS = 4000
const MAX_OUTPUT_TOKENS = 400

// Actions the assistant may *request*. Nothing else is accepted from the model.
const ACTIONS = [
  'create_transaction',
  'update_transaction',
  'delete_transaction',
  'create_budget',
  'update_budget',
  'create_planner_event',
  'update_planner_event',
  'delete_planner_event',
  'create_note',
  'update_note',
  'delete_note',
  'create_course',
  'add_course_unit',
  'complete_course_unit',
  'delete_course_unit',
  'create_project',
] as const

const ACTION_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: [...ACTIONS, 'none'] },
    confidence: { type: 'string', enum: ['high', 'low'] },
    args: {
      type: 'object',
      properties: {
        target: { type: 'string' },
        title: { type: 'string' },
        body: { type: 'string' },
        tag: { type: 'string' },
        merchant: { type: 'string' },
        amount: { type: 'number' },
        type: { type: 'string', enum: ['expense', 'income'] },
        category: { type: 'string' },
        account: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        limit: { type: 'number' },
        name: { type: 'string' },
        units: { type: 'number' },
        weekly_target: { type: 'number' },
        next: { type: 'string' },
        course: { type: 'string' },
        unit: { type: 'string' },
        brief: { type: 'string' },
        criteria: { type: 'string' },
        due: { type: 'string' },
        scope: { type: 'string', enum: ['general', 'study'] },
      },
      propertyOrdering: [
        'target',
        'title',
        'brief',
        'criteria',
        'due',
        'date',
        'time',
        'body',
        'merchant',
        'amount',
        'type',
        'category',
        'account',
        'tag',
        'limit',
        'name',
        'units',
        'weekly_target',
        'next',
        'course',
        'unit',
        'scope',
      ],
    },
  },
  required: ['action', 'confidence'],
}

const ACTION_RULES = [
  'You turn one user message into at most one record action for a private personal app.',
  `Allowed actions: ${ACTIONS.join(', ')}.`,
  'Return action "none" when the message is a question, greeting, or not a request to change records.',
  'For update/delete, put the phrase that identifies the existing item in args.target. Never invent ids.',
  'For create/update, fill only the fields the user gave. Amounts are positive; use type "expense" unless income is implied.',
  'Resolve relative dates to YYYY-MM-DD using the provided Today. Times are 24-hour "HH:MM".',
  'Prefer the allowed categories and tags listed in the context. Return JSON only.',
  'Only for create_project, always set three args: title (a short project name), brief (one sentence describing the deliverable, using the user\'s words or the title if they gave no detail), and due (the deadline as YYYY-MM-DD resolved from the message, e.g. "friday"). Put stated success criteria in criteria.',
].join(' ')

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['entry', 'unit'] },
          title: { type: 'string' },
          date: { type: 'string' },
          time: { type: 'string' },
          tag: { type: 'string' },
          course: { type: 'string' },
        },
        required: ['kind', 'title'],
      },
    },
  },
  required: ['items'],
}

const PLAN_RULES = [
  'You propose at most 12 short, concrete plan items for a private personal app.',
  'Return JSON only. Use only the facts in the context; never invent courses, goals or events.',
  'kind "entry" = a calendar block: fill date as YYYY-MM-DD within the horizon, time as 24-hour "HH:MM" (empty string if none), and tag from the allowed plan tags.',
  'kind "unit" = a study unit for a course: fill course with the exact course name from the context, leave date and time empty, and make the title a single next step.',
  'Only use kind "unit" when the scope is study and the course is listed in the context.',
  'Keep titles under 60 characters. Do not duplicate existing entries.',
].join(' ')

const ASSESS_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['pass', 'fail'] },
    score: { type: 'number' },
    feedback: { type: 'string' },
  },
  required: ['verdict', 'score', 'feedback'],
}

const ASSESS_RULES = [
  'You judge whether a completed deliverable meets the project brief and its success criteria.',
  'Return JSON only. Base the verdict only on the submission and the criteria given; never invent work.',
  'verdict "pass" only if the submission plausibly satisfies the criteria; otherwise "fail".',
  'score is 0-100. feedback is 1-3 concrete sentences: what was met and what is thin.',
  'Be strict but fair, and never reward effort described without any deliverable.',
].join(' ')


const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  })

/*
 * The gateway has already validated the JWT's signature before the function runs, but it
 * also lets a bare publishable key through as an anonymous credential. Only a real user
 * token carries an `authenticated` role and a `sub`; an API key (new or legacy) does not.
 */
function signedInUserId(req: Request): string | null {
  const header = req.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim())
  if (!match) return null

  const parts = match[1].split('.')
  if (parts.length !== 3) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const claims = JSON.parse(atob(padded))
    return claims?.role === 'authenticated' && typeof claims?.sub === 'string' && claims.sub
      ? claims.sub
      : null
  } catch {
    return null
  }
}

const BASE_RULES = [
  'You are Zen-I, a calm personal assistant inside a private records app.',
  'Answer in plain conversational text, 1-4 short sentences. No markdown headings.',
  'Use ONLY the facts in the provided context. Never invent numbers, names or events.',
  'Never perform arithmetic yourself: any totals or percentages are already computed for you.',
  'If the context does not contain what is needed, say so briefly and suggest what the user could log.',
].join(' ')

function systemFor(task: string) {
  if (task === 'extract-action') return ACTION_RULES
  if (task === 'assess-submission') return ASSESS_RULES
  if (task === 'summarize-note') {
    return `${BASE_RULES} The user has explicitly asked you to summarize one note. Keep it to two sentences.`
  }
  if (task === 'advise') {
    return `${BASE_RULES} The user wants interpretation or a suggestion. Ground every point in the context and be concrete.`
  }
  return `${BASE_RULES} Explain or interpret the context to answer the question.`
}

function requestFor(task: string, question: string, context: string) {
  if (task === 'extract-action') {
    return {
      systemInstruction: { parts: [{ text: ACTION_RULES }] },
      contents: [{ role: 'user', parts: [{ text: `Message: ${question}\n\n${context}` }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 300,
        responseMimeType: 'application/json',
        responseSchema: ACTION_SCHEMA,
      },
    }
  }

  if (task === 'generate-plan') {
    return {
      systemInstruction: { parts: [{ text: PLAN_RULES }] },
      contents: [{ role: 'user', parts: [{ text: `${question}\n\n${context}` }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 800,
        responseMimeType: 'application/json',
        responseSchema: PLAN_SCHEMA,
      },
    }
  }

  if (task === 'assess-submission') {
    return {
      systemInstruction: { parts: [{ text: ASSESS_RULES }] },
      contents: [{ role: 'user', parts: [{ text: `${question}\n\n${context}` }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 300,
        responseMimeType: 'application/json',
        responseSchema: ASSESS_SCHEMA,
      },
    }
  }

  const userText = context
    ? `Question: ${question}\n\nContext (the user's own records, already computed):\n${context}`
    : `Question: ${question}\n\n(No records context was attached.)`

  return {
    systemInstruction: { parts: [{ text: systemFor(task) }] },
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: MAX_OUTPUT_TOKENS },
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405)
  if (!signedInUserId(req)) return json({ error: 'unauthorized' }, 401)

  if (!GEMINI_API_KEY) return json({ error: 'not-configured' }, 503)
  if (!FREE_MODELS.has(MODEL)) return json({ error: 'model-not-allowed', model: MODEL }, 500)

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'bad-request' }, 400)
  }

  const task = String(payload?.task ?? 'explain')
  const question = String(payload?.question ?? '').slice(0, MAX_QUESTION_CHARS).trim()
  const context = String(payload?.context ?? '').slice(0, MAX_CONTEXT_CHARS)
  if (!question) return json({ error: 'bad-request' }, 400)
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'usage-unavailable' }, 503)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
  const day = new Date().toISOString().slice(0, 10)

  let used: number
  try {
    const { data, error } = await admin.rpc('bump_ai_usage', { p_day: day })
    if (error) throw error
    used = Number(data)
  } catch {
    return json({ error: 'usage-unavailable' }, 503)
  }

  if (used > DAILY_CAP) {
    return json({ error: 'daily-cap', cap: DAILY_CAP, remaining: 0 }, 429)
  }

  let upstream: Response
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestFor(task, question, context)),
      },
    )
  } catch {
    return json({ error: 'network' }, 502)
  }

  if (upstream.status === 429) return json({ error: 'rate-limit' }, 429)
  if (upstream.status === 400 || upstream.status === 403) {
    return json({ error: 'upstream-rejected', status: upstream.status }, 502)
  }
  if (!upstream.ok) return json({ error: 'upstream', status: upstream.status }, 502)

  let data: any
  try {
    data = await upstream.json()
  } catch {
    return json({ error: 'upstream-parse' }, 502)
  }

  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part?.text)
    .filter(Boolean)
    .join('\n')
    .trim()

  if (!text) return json({ error: 'empty' }, 502)

  if (task === 'extract-action') {
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      return json({ error: 'bad-action' }, 502)
    }
    if (parsed?.action !== 'none' && !ACTIONS.includes(parsed?.action)) {
      return json({ error: 'action-not-allowed' }, 400)
    }
    return json({
      json: {
        action: parsed?.action === 'none' ? 'none' : parsed.action,
        confidence: parsed?.confidence === 'low' ? 'low' : 'high',
        args: parsed?.args && typeof parsed.args === 'object' ? parsed.args : {},
      },
      model: MODEL,
      remaining: Math.max(0, DAILY_CAP - used),
      cap: DAILY_CAP,
    })
  }

  if (task === 'generate-plan') {
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      return json({ error: 'bad-plan' }, 502)
    }
    const items = Array.isArray(parsed?.items) ? parsed.items.slice(0, 12) : []
    return json({
      json: { items },
      model: MODEL,
      remaining: Math.max(0, DAILY_CAP - used),
      cap: DAILY_CAP,
    })
  }

  if (task === 'assess-submission') {
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      return json({ error: 'bad-assessment' }, 502)
    }
    const verdict = parsed?.verdict === 'pass' ? 'pass' : 'fail'
    const score = Number.isFinite(Number(parsed?.score))
      ? Math.max(0, Math.min(100, Math.round(Number(parsed.score))))
      : null
    const feedback = String(parsed?.feedback || '').slice(0, 600).trim()
    if (!feedback) return json({ error: 'bad-assessment' }, 502)
    return json({
      json: { verdict, score, feedback },
      model: MODEL,
      remaining: Math.max(0, DAILY_CAP - used),
      cap: DAILY_CAP,
    })
  }

  return json({ text, model: MODEL, remaining: Math.max(0, DAILY_CAP - used), cap: DAILY_CAP })
})
