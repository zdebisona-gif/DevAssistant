/*
 * Client for the Gemini Edge Function proxy. The API key never touches the app.
 * All failures resolve to a typed GeminiUnavailable so callers can silently fall back
 * to the local engine. A 429 puts the proxy in a short cooldown to avoid hammering it.
 */

import { supabase } from './supabase.js'
import { NOTE_TAGS } from '../data/constants.js'
import { formatClock12 } from './format.js'
import { formatDuration, noteStamp } from './sleep.js'

const TIMEOUT_MS = 15000
const COOLDOWN_MS = 10 * 60 * 1000

let cooldownUntil = 0

export class GeminiUnavailable extends Error {
  constructor(kind, detail) {
    super(kind)
    this.name = 'GeminiUnavailable'
    this.kind = kind
    this.detail = detail
  }
}

export function inCooldown() {
  return Date.now() < cooldownUntil
}

export function cooldownRemainingMs() {
  return Math.max(0, cooldownUntil - Date.now())
}

/** Short, human reason for why Gemini was skipped or failed. */
export function describeGeminiError(error) {
  switch (error?.kind) {
    case 'not-configured':
      return 'Gemini is not connected yet.'
    case 'rate-limit':
    case 'daily-cap':
      return 'Gemini has hit its free limit for now.'
    case 'cooldown':
      return 'Gemini is cooling down after its free limit.'
    case 'timeout':
    case 'network':
      return 'Could not reach Gemini just now.'
    case 'unauthorized':
      return 'Sign in to use Gemini.'
    case 'empty':
      return 'Gemini returned nothing.'
    default:
      return 'Gemini was unavailable.'
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new GeminiUnavailable('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function invokeProxy(body) {
  if (inCooldown()) throw new GeminiUnavailable('cooldown')

  let result
  try {
    result = await withTimeout(supabase.functions.invoke('gemini', { body }), TIMEOUT_MS)
  } catch (error) {
    if (error instanceof GeminiUnavailable) throw error
    throw new GeminiUnavailable('network')
  }

  const { data, error } = result || {}
  if (error) {
    const status = Number(error?.context?.status ?? error?.status) || 0
    if (status === 429) {
      cooldownUntil = Date.now() + COOLDOWN_MS
      throw new GeminiUnavailable('rate-limit')
    }
    if (status === 401) throw new GeminiUnavailable('unauthorized')
    if (status === 503) throw new GeminiUnavailable('not-configured')
    throw new GeminiUnavailable('proxy', status || undefined)
  }

  if (data?.error) {
    if (data.error === 'rate-limit' || data.error === 'daily-cap') {
      cooldownUntil = Date.now() + COOLDOWN_MS
      throw new GeminiUnavailable(data.error)
    }
    if (data.error === 'not-configured') throw new GeminiUnavailable('not-configured')
    if (data.error === 'unauthorized') throw new GeminiUnavailable('unauthorized')
    throw new GeminiUnavailable('proxy', data.error)
  }

  return data || {}
}

/**
 * @returns {Promise<{ text: string, model: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function askGemini({ task = 'explain', question, context = '' }) {
  const q = String(question || '').trim()
  if (!q) throw new GeminiUnavailable('bad-request')

  const data = await invokeProxy({
    task,
    question: q.slice(0, 500),
    context: String(context || '').slice(0, 4000),
  })

  const text = String(data.text || '').trim()
  if (!text) throw new GeminiUnavailable('empty')

  return { text, model: data.model || 'gemini', remaining: data.remaining, cap: data.cap }
}

/**
 * Ask the proxy to turn a message into one whitelisted action.
 * Returns action 'none' when the message is not a record change.
 * @returns {Promise<{ action: string, confidence: 'high'|'low', args: object }>}
 * @throws {GeminiUnavailable}
 */
export async function extractAction({ text, context = '' }) {
  const q = String(text || '').trim()
  if (!q) throw new GeminiUnavailable('bad-request')

  const data = await invokeProxy({
    task: 'extract-action',
    question: q.slice(0, 500),
    context: String(context || '').slice(0, 4000),
  })

  const result = data.json
  if (!result?.action) throw new GeminiUnavailable('empty')

  return {
    action: result.action,
    confidence: result.confidence === 'low' ? 'low' : 'high',
    args: result.args && typeof result.args === 'object' ? result.args : {},
    model: data.model,
    remaining: data.remaining,
    cap: data.cap,
  }
}

/**
 * Ask the proxy to propose plan entries for a horizon.
 * @returns {Promise<{ items: Array<object>, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function generatePlan({ scope = 'general', horizon = 'week', goal = '', context = '' }) {
  const question = [
    `Scope: ${scope}`,
    `Horizon: ${horizon}`,
    `Goal: ${String(goal || '').trim() || '(none given — propose from the week)'}`,
  ].join('\n')

  const data = await invokeProxy({
    task: 'generate-plan',
    question: question.slice(0, 500),
    context: String(context || '').slice(0, 4000),
  })

  const items = Array.isArray(data?.json?.items) ? data.json.items : []
  return { items, model: data.model, remaining: data.remaining, cap: data.cap }
}

/**
 * Ask the proxy to judge a project submission against its brief and criteria.
 * @returns {Promise<{ verdict: 'pass'|'fail', score: number|null, feedback: string, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function assessSubmission({ title, brief, criteria, submission, link }) {
  const question = `Assess this submission for the project: ${String(title || '').trim()}`.slice(0, 500)
  const context = [
    `Brief: ${String(brief || '').trim()}`,
    `Success criteria: ${String(criteria || '').trim() || 'not specified'}`,
    `Submission (the user's write-up): ${String(submission || '').trim()}`,
    `Link (if any): ${String(link || '').trim() || 'none'}`,
  ]
    .join('\n')
    .slice(0, 4000)

  const data = await invokeProxy({ task: 'assess-submission', question, context })
  const result = data.json
  if (!result?.verdict) throw new GeminiUnavailable('empty')

  return {
    verdict: result.verdict === 'pass' ? 'pass' : 'fail',
    score: Number.isFinite(result.score) ? result.score : null,
    feedback: String(result.feedback || '').trim(),
    model: data.model,
    remaining: data.remaining,
    cap: data.cap,
  }
}

/**
 * Ask the proxy to assess one day's sleep from its sessions, notes, and recent history.
 * @returns {Promise<{ rating: number, score: number, breakdown: object, feedback: string, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function assessSleep({ logDate, sessions = [], totalMinutes = 0, notes = [], history = '' }) {
  const question = `Assess the sleep for ${String(logDate || '').trim()}`.slice(0, 500)
  const sessionLines = sessions.map((session, index) => {
    const from = formatClock12(session.from) || session.from
    const to = formatClock12(session.to) || session.to
    return `Session ${index + 1}: ${from} to ${to}`
  })
  const noteLines = notes.map((note) =>
    `${noteStamp(note.at)} ${String(note.text || '').trim()}`.trim(),
  )
  const context = [
    `Date: ${String(logDate || '').trim()}`,
    `Sessions: ${sessionLines.length ? sessionLines.join('; ') : 'none'}`,
    `Total sleep: ${formatDuration(totalMinutes)} (${Math.round(totalMinutes)} minutes)`,
    `Today's timestamped notes:\n${noteLines.length ? noteLines.join('\n') : '(no notes)'}`,
    `Recent history (newest first):\n${String(history || '').trim() || '(no recent history)'}`,
  ]
    .join('\n')
    .slice(0, 4000)

  const data = await invokeProxy({ task: 'assess-sleep', question, context })
  const result = data.json
  const rating = Math.round(Number(result?.rating))
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new GeminiUnavailable('empty')
  }

  const score = Math.round(Number(result?.score))
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new GeminiUnavailable('empty')
  }

  const breakdown = {
    duration_fit: Math.round(Number(result?.breakdown?.duration_fit) || 0),
    daytime_energy: Math.round(Number(result?.breakdown?.daytime_energy) || 0),
    nap_quality: Math.round(Number(result?.breakdown?.nap_quality) || 0),
    continuity: Math.round(Number(result?.breakdown?.continuity) || 0),
  }

  const feedback = String(result?.feedback || '').trim()
  if (!feedback) throw new GeminiUnavailable('empty')

  return {
    rating,
    score,
    breakdown,
    feedback,
    model: data.model,
    remaining: data.remaining,
    cap: data.cap,
  }
}

/**
 * Ask the proxy for a plain-text sleep recap.
 * @returns {Promise<{ text: string, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function sleepRecap({ periodLabel, context = '' }) {
  const data = await invokeProxy({
    task: 'sleep-recap',
    question: `Summarize sleep for ${String(periodLabel || 'this period').trim()}`.slice(0, 500),
    context: String(context || '').slice(0, 4000),
  })

  const text = String(data.text || '').trim()
  if (!text) throw new GeminiUnavailable('empty')

  return { text, model: data.model, remaining: data.remaining, cap: data.cap }
}

/**
 * Ask the proxy to explain the deterministic weekly finance score.
 * Only aggregate score data is sent; individual transactions never leave the device.
 * @returns {Promise<{ text: string, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function explainFinanceScore({ context = '' }) {
  const data = await invokeProxy({
    task: 'explain-finance',
    question: 'Explain my weekly finance score',
    context: String(context || '').slice(0, 4000),
  })

  const text = String(data.text || '').trim()
  if (!text) throw new GeminiUnavailable('empty')

  return { text, model: data.model, remaining: data.remaining, cap: data.cap }
}

/**
 * Ask the proxy to draft a note from a topic the user typed.
 * Only the prompt is sent; no personal records or context are attached.
 * @returns {Promise<{ title: string, body: string, tag: string, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function generateNote({ prompt }) {
  const topic = String(prompt || '').trim()
  if (!topic) throw new GeminiUnavailable('bad-request')

  const data = await invokeProxy({
    task: 'generate-note',
    question: topic.slice(0, 500),
    context: '',
  })

  const result = data.json
  const title = String(result?.title || '').trim().slice(0, 120)
  const body = String(result?.body || '').trim().slice(0, 6000)
  if (!title || !body) throw new GeminiUnavailable('empty')

  const rawTag = String(result?.tag || '').trim()
  const tag = NOTE_TAGS.find((value) => value.toLowerCase() === rawTag.toLowerCase()) || 'Personal'

  return { title, body, tag, model: data.model, remaining: data.remaining, cap: data.cap }
}

/**
 * Ask the proxy for a suggested course structure to review before saving.
 * @returns {Promise<{ name: string, description: string, modules: Array<{ title: string, description: string, lessons: Array<{ title: string }> }>, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function generateCourse({ goal, level = '', context = '' }) {
  const question = [
    `Goal: ${String(goal || '').trim() || '(choose a sensible beginner-to-intermediate path)'}`,
    `Level: ${String(level || '').trim() || '(not specified)'}`,
  ].join('\n')

  const data = await invokeProxy({
    task: 'generate-course',
    question: question.slice(0, 500),
    context: String(context || '').slice(0, 4000),
  })

  const result = data.json
  if (!result?.name || !Array.isArray(result.modules) || !result.modules.length) {
    throw new GeminiUnavailable('empty')
  }

  return {
    name: String(result.name),
    description: String(result.description || ''),
    modules: result.modules,
    model: data.model,
    remaining: data.remaining,
    cap: data.cap,
  }
}

/**
 * Ask the proxy to draft the content of one lesson.
 * @returns {Promise<{ text: string, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function generateLesson({ course = '', module = '', lesson = '', context = '' }) {
  const question = [`Course: ${course}`, `Module: ${module}`, `Lesson: ${lesson}`]
    .join('\n')
    .slice(0, 500)

  const data = await invokeProxy({
    task: 'generate-lesson',
    question,
    context: String(context || '').slice(0, 4000),
  })

  const text = String(data.text || '').trim()
  if (!text) throw new GeminiUnavailable('empty')

  return { text, model: data.model, remaining: data.remaining, cap: data.cap }
}

/**
 * Ask the proxy a question about the lesson the user is reading.
 * @returns {Promise<{ text: string, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function askTutor({ question, context = '' }) {
  const q = String(question || '').trim()
  if (!q) throw new GeminiUnavailable('bad-request')

  const data = await invokeProxy({
    task: 'tutor',
    question: q.slice(0, 500),
    context: String(context || '').slice(0, 4000),
  })

  const text = String(data.text || '').trim()
  if (!text) throw new GeminiUnavailable('empty')

  return { text, model: data.model, remaining: data.remaining, cap: data.cap }
}

/**
 * Ask the proxy for a short quiz on the current lesson.
 * @returns {Promise<{ questions: Array<{ prompt: string, choices: string[], answerIndex: number, explanation: string }>, model?: string, remaining?: number, cap?: number }>}
 * @throws {GeminiUnavailable}
 */
export async function generateQuiz({ course = '', module = '', lesson = '', context = '' }) {
  const question = `Quiz for: ${[course, module, lesson].filter(Boolean).join(' — ')}`.slice(0, 500)

  const data = await invokeProxy({
    task: 'generate-quiz',
    question,
    context: String(context || '').slice(0, 4000),
  })

  const questions = Array.isArray(data.json?.questions) ? data.json.questions : []
  if (!questions.length) throw new GeminiUnavailable('empty')

  return { questions, model: data.model, remaining: data.remaining, cap: data.cap }
}
