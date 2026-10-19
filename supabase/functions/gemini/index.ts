/*
 * Gemini proxy (Stage 1).
 *
 * The private GEMINI_API_KEY lives here as a Supabase secret and never reaches the
 * app. This function also enforces the free-tier guardrails:
 *   - a free-model allowlist (paid-only models/features are rejected)
 *   - a server-side daily request cap (default 50), tracked in public.ai_usage
 *   - bounded input/output so a single call can never grow unbounded
 *
 * Deploy:  npx supabase functions deploy gemini --use-api --no-verify-jwt
 * Secret:  npx supabase secrets set GEMINI_API_KEY=<free-tier-key>
 * Optional: GEMINI_MODEL (must be on the allowlist), GEMINI_DAILY_CAP
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

const BASE_RULES = [
  'You are Zen-I, a calm personal assistant inside a private records app.',
  'Answer in plain conversational text, 1-4 short sentences. No markdown headings.',
  'Use ONLY the facts in the provided context. Never invent numbers, names or events.',
  'Never perform arithmetic yourself: any totals or percentages are already computed for you.',
  'If the context does not contain what is needed, say so briefly and suggest what the user could log.',
].join(' ')

function systemFor(task: string) {
  if (task === 'summarize-note') {
    return `${BASE_RULES} The user has explicitly asked you to summarize one note. Keep it to two sentences.`
  }
  if (task === 'advise') {
    return `${BASE_RULES} The user wants interpretation or a suggestion. Ground every point in the context and be concrete.`
  }
  return `${BASE_RULES} Explain or interpret the context to answer the question.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405)

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

  const userText = context
    ? `Question: ${question}\n\nContext (the user's own records, already computed):\n${context}`
    : `Question: ${question}\n\n(No records context was attached.)`

  let upstream: Response
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemFor(task) }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: MAX_OUTPUT_TOKENS },
        }),
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

  return json({ text, model: MODEL, remaining: Math.max(0, DAILY_CAP - used), cap: DAILY_CAP })
})
