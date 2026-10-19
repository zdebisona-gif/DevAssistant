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
  'add_lesson',
  'complete_lesson',
  'delete_lesson',
  'create_project',
  'adjust_account',
  'add_debt',
  'settle_debt',
  'delete_debt',
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
        operation: { type: 'string', enum: ['add', 'subtract', 'set'] },
        counterparty: { type: 'string' },
        direction: { type: 'string', enum: ['owed_to_me', 'i_owe'] },
        note: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        limit: { type: 'number' },
        name: { type: 'string' },
        description: { type: 'string' },
        weekly_target: { type: 'number' },
        course: { type: 'string' },
        module: { type: 'string' },
        lesson: { type: 'string' },
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
        'operation',
        'counterparty',
        'direction',
        'note',
        'tag',
        'limit',
        'name',
        'description',
        'weekly_target',
        'course',
        'module',
        'lesson',
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
  'For create_course set name and, when the user gives one, description and weekly_target (hours). For add_lesson/complete_lesson/delete_lesson put the course name in args.course and the lesson title in args.lesson.',
  'For create_transaction put the merchant in args.merchant, the account name in args.account (exactly as listed in the context when one matches), the category in args.category and the signed day in args.date. Never put the account name inside args.merchant.',
  'For adjust_account put the account name in args.account, the amount in args.amount, and args.operation "add" (money in), "subtract" (money out) or "set" (make the balance exactly this).',
  'For add_debt put the other person in args.counterparty, the amount in args.amount, args.direction "owed_to_me" when they owe the user or "i_owe" when the user owes them, and any deadline in args.due. For settle_debt and delete_debt put the person in args.counterparty.',
].join(' ')

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['entry'] },
          title: { type: 'string' },
          date: { type: 'string' },
          time: { type: 'string' },
          tag: { type: 'string' },
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
  'Every item is kind "entry": a calendar block with date as YYYY-MM-DD within the horizon, time as 24-hour "HH:MM" (empty string if none), and tag from the allowed plan tags.',
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

const COURSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          lessons: {
            type: 'array',
            items: {
              type: 'object',
              properties: { title: { type: 'string' } },
              required: ['title'],
            },
          },
        },
        required: ['title', 'lessons'],
      },
    },
  },
  required: ['title', 'modules'],
}

const COURSE_RULES = [
  'You outline a self-study course for the user, who will review and edit it before saving.',
  'Return JSON only, no prose. Base the plan on the stated goal and level only.',
  'Give 2-4 modules, each a theme with 2-5 concrete lessons, ordered easiest first.',
  'Lesson titles are short actions ("Describe a REST endpoint"), never chapters or page numbers.',
  'title is the course name (under 60 characters); description is one sentence on what it covers.',
].join(' ')

const QUIZ_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          choices: { type: 'array', items: { type: 'string' } },
          answerIndex: { type: 'number' },
          explanation: { type: 'string' },
        },
        required: ['prompt', 'choices', 'answerIndex'],
      },
    },
  },
  required: ['questions'],
}

const QUIZ_RULES = [
  'You write a short self-check quiz from the lesson the user is reading.',
  'Return JSON only. Use ONLY facts in the context; never invent facts about the topic.',
  'Write exactly 4 questions. Each has 3-4 choices with exactly one correct answerIndex (0-based).',
  'explanation is one sentence on why the answer is right. If the context is too thin for 4 questions, write as many as it supports.',
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
  if (task === 'tutor') {
    return `${BASE_RULES} You are a patient tutor. The user is studying one lesson right now; answer only about that lesson's topic, in plain text, and be concrete and encouraging.`
  }
  if (task === 'generate-lesson') {
    return [
      'You draft study notes for a single lesson in a private self-study course.',
      'Write plain conversational text with no markdown symbols or headings.',
      'Structure: one line saying what this lesson is about, then 3-6 short lines (or a plain hyphen list) covering the essentials, then one practice suggestion.',
      'Aim for 120-250 words. Use only the lesson title, module and any context given; never invent facts about the user.',
    ].join(' ')
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

  if (task === 'generate-course') {
    return {
      systemInstruction: { parts: [{ text: COURSE_RULES }] },
      contents: [{ role: 'user', parts: [{ text: `${question}\n\n${context}` }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1600,
        responseMimeType: 'application/json',
        responseSchema: COURSE_SCHEMA,
      },
    }
  }

  if (task === 'generate-quiz') {
    return {
      systemInstruction: { parts: [{ text: QUIZ_RULES }] },
      contents: [{ role: 'user', parts: [{ text: `${question}\n\n${context}` }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
        responseSchema: QUIZ_SCHEMA,
      },
    }
  }

  if (task === 'generate-lesson') {
    return {
      systemInstruction: { parts: [{ text: systemFor(task) }] },
      contents: [{ role: 'user', parts: [{ text: `${question}\n\n${context}` }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 900 },
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

  if (task === 'generate-course') {
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      return json({ error: 'bad-course' }, 502)
    }
    const name = String(parsed?.title || '').slice(0, 80).trim()
    const description = String(parsed?.description || '').slice(0, 400).trim()
    const modules = (Array.isArray(parsed?.modules) ? parsed.modules : [])
      .slice(0, 6)
      .map((mod: any) => ({
        title: String(mod?.title || '').slice(0, 80).trim(),
        description: String(mod?.description || '').slice(0, 240).trim(),
        lessons: (Array.isArray(mod?.lessons) ? mod.lessons : [])
          .slice(0, 8)
          .map((lesson: any) => ({ title: String(lesson?.title || '').slice(0, 80).trim() }))
          .filter((lesson: { title: string }) => lesson.title),
      }))
      .filter((mod: { title: string; lessons: unknown[] }) => mod.title && mod.lessons.length)
    if (!name || !modules.length) return json({ error: 'bad-course' }, 502)
    return json({
      json: { name, description, modules },
      model: MODEL,
      remaining: Math.max(0, DAILY_CAP - used),
      cap: DAILY_CAP,
    })
  }

  if (task === 'generate-quiz') {
    let parsed: any
    try {
      parsed = JSON.parse(text)
    } catch {
      return json({ error: 'bad-quiz' }, 502)
    }
    const questions = (Array.isArray(parsed?.questions) ? parsed.questions : [])
      .slice(0, 5)
      .map((item: any) => {
        const choices = (Array.isArray(item?.choices) ? item.choices : [])
          .slice(0, 4)
          .map((choice: unknown) => String(choice || '').slice(0, 200).trim())
          .filter(Boolean)
        const rawIndex = Number(item?.answerIndex)
        const answerIndex = choices.length
          ? Math.max(0, Math.min(choices.length - 1, Number.isFinite(rawIndex) ? Math.round(rawIndex) : 0))
          : 0
        return {
          prompt: String(item?.prompt || '').slice(0, 300).trim(),
          choices,
          answerIndex,
          explanation: String(item?.explanation || '').slice(0, 300).trim(),
        }
      })
      .filter((item: { prompt: string; choices: string[] }) => item.prompt && item.choices.length >= 2)
    if (!questions.length) return json({ error: 'bad-quiz' }, 502)
    return json({
      json: { questions },
      model: MODEL,
      remaining: Math.max(0, DAILY_CAP - used),
      cap: DAILY_CAP,
    })
  }

  return json({ text, model: MODEL, remaining: Math.max(0, DAILY_CAP - used), cap: DAILY_CAP })
})
