/*
 * Pure validators for the Gemini proxy.
 *
 * Plain ESM with no Deno or npm imports, so node:test can import it directly.
 * Everything here treats model output as untrusted: unknown keys are dropped,
 * enums are enforced, numbers are clamped and strings are stripped and capped.
 */

/* Arg names the action builder may receive. No id keys of any kind. */
export const ACTION_ARG_KEYS = new Set([
  'target',
  'title',
  'body',
  'tag',
  'merchant',
  'amount',
  'type',
  'category',
  'account',
  'operation',
  'counterparty',
  'direction',
  'note',
  'date',
  'time',
  'limit',
  'name',
  'description',
  'weekly_target',
  'course',
  'module',
  'lesson',
  'brief',
  'criteria',
  'due',
  'scope',
  'priority',
  'from',
  'to',
  'fee',
  'occurred_on',
])

const NUMERIC_KEYS = new Set(['amount', 'limit', 'weekly_target', 'fee'])
const MAX_NUMBER = 1e9
const STRING_CAP = 200
const BODY_CAP = 2000
const TOOL_STRING_CAP = 80
const CLARIFY_CAP = 160
const MAX_TOOLS = 4

const ENUMS = {
  type: ['expense', 'income'],
  operation: ['add', 'subtract', 'set'],
  direction: ['owed_to_me', 'i_owe'],
  scope: ['general', 'study'],
}

const CONTROL_CHARS = /[\p{Cc}\p{Cf}]/gu

function cleanString(value, cap) {
  if (typeof value !== 'string') return null
  return value.replace(CONTROL_CHARS, '').trim().slice(0, cap)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Return a new object containing only known action args.
 * Never mutates the input and never throws.
 */
export function sanitizeActionArgs(args) {
  if (!isPlainObject(args)) return {}

  const out = {}
  for (const [key, value] of Object.entries(args)) {
    if (!ACTION_ARG_KEYS.has(key)) continue

    if (key === 'priority') {
      if (typeof value === 'boolean') out[key] = value
      continue
    }

    if (NUMERIC_KEYS.has(key)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      out[key] = Math.min(Math.max(value, 0), MAX_NUMBER)
      continue
    }

    if (ENUMS[key]) {
      const text = cleanString(value, STRING_CAP)
      if (text !== null && ENUMS[key].includes(text)) out[key] = text
      continue
    }

    const text = cleanString(value, key === 'body' ? BODY_CAP : STRING_CAP)
    if (text !== null) out[key] = text
  }

  return out
}

/** The only read-only tools the model may select in this stage. */
export const TOOL_NAMES = new Set([
  'spending_summary',
  'budget_status',
  'finance_score',
  'debts_summary',
  'account_summary',
  'plan_for',
  'open_tasks',
  'study_hours',
  'course_progress',
  'project_status',
  'credits',
  'search_notes',
])

const TOOL_ARG_KEYS = new Set(['period', 'group_by', 'range', 'query'])

/**
 * Validate a model-proposed tool plan.
 * Garbage in, empty plan out. Never throws.
 */
export function sanitizeToolPlan(raw, allowedNames) {
  const empty = { tools: [], clarify: '' }
  if (!isPlainObject(raw)) return empty

  const allowed =
    allowedNames instanceof Set
      ? allowedNames
      : new Set(Array.isArray(allowedNames) ? allowedNames : [])

  const tools = []
  const seen = new Set()
  const list = Array.isArray(raw.tools) ? raw.tools : []

  for (const entry of list) {
    if (tools.length >= MAX_TOOLS) break
    if (!isPlainObject(entry)) continue

    const name = cleanString(entry.name, TOOL_STRING_CAP)
    if (!name || !allowed.has(name) || seen.has(name)) continue

    const args = {}
    if (isPlainObject(entry.args)) {
      for (const [key, value] of Object.entries(entry.args)) {
        if (!TOOL_ARG_KEYS.has(key)) continue
        const text = cleanString(value, TOOL_STRING_CAP)
        if (text !== null) args[key] = text
      }
    }

    seen.add(name)
    tools.push({ name, args })
  }

  const clarify = cleanString(raw.clarify, CLARIFY_CAP) || ''
  return { tools, clarify }
}

/** Every task name the app can send to the proxy. */
export const KNOWN_TASKS = new Set([
  'explain',
  'advise',
  'summarize-note',
  'tutor',
  'extract-action',
  'generate-plan',
  'assess-submission',
  'assess-sleep',
  'sleep-recap',
  'explain-finance',
  'generate-note',
  'generate-course',
  'generate-lesson',
  'generate-quiz',
  'plan-tools',
])
