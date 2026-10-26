/*
 * Shared, pure validation for the six record forms and for assistant actions.
 * A validator returns { ok, payload } on success or { ok: false, error } on failure,
 * so forms and the action layer normalize records the same way.
 */

import { todayISO } from './analytics.js'
import { sessionMinutes } from './sleep.js'
import { ACCOUNT_COLORS, ACCOUNT_KINDS, DEBT_DIRECTIONS } from '../data/constants.js'

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
export const CLOCK = /^\d{1,2}:\d{2}$/

export function isISODate(value) {
  return typeof value === 'string' && ISO_DATE.test(value)
}

/** A finite number from loose input ("₱1,000", "PHP 200"), or null. */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const cleaned = String(value ?? '')
    .replace(/[₱$€£]/g, ' ')
    .replace(/\b(?:php|pesos?)\b/gi, ' ')
    .replace(/,/g, '')
    .trim()
  const match = cleaned.match(/-?\d+(?:\.\d+)?/)
  return match ? Number.parseFloat(match[0]) : null
}

/** A finite number greater than zero, or null. */
export function parsePositive(value) {
  const n = toNumber(value)
  return n !== null && n > 0 ? n : null
}

/** A non-negative number (zero allowed), or null. */
export function parseNonNegative(value) {
  const n = toNumber(value)
  return n !== null && n >= 0 ? n : null
}

export function parseCount(value) {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

/** '9:5' / '09:05' → '09:05:00'; anything invalid → null. */
export function normalizeTime(value) {
  if (!value) return null
  const raw = String(value).trim()
  if (!CLOCK.test(raw)) return null
  const [hours, minutes] = raw.split(':').map(Number)
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
}

export function validateNote(input) {
  const title = String(input?.title ?? '').trim()
  if (!title) return { ok: false, error: 'Add a title.' }
  return {
    ok: true,
    payload: {
      title,
      body: String(input?.body ?? '').trim(),
      tag: input?.tag || 'Personal',
      important: Boolean(input?.important),
      course_id: input?.course_id || null,
      lesson_id: input?.lesson_id || null,
    },
  }
}

export function validateTransaction(input) {
  const merchant = String(input?.merchant ?? '').trim()
  if (!merchant) return { ok: false, error: 'Add a merchant.' }
  const amount = parsePositive(input?.amount)
  if (!amount) return { ok: false, error: 'Enter an amount greater than zero.' }
  const date = input?.occurred_on || todayISO()
  if (!isISODate(date)) return { ok: false, error: 'Use a valid date.' }
  const income = input?.type === 'income'
  return {
    ok: true,
    payload: {
      merchant,
      amount: income ? Math.abs(amount) : -Math.abs(amount),
      category: input?.category || 'Other',
      account: input?.account ? String(input.account).trim() : null,
      account_id: input?.account_id || null,
      occurred_on: date,
    },
  }
}

export function validateBudget(input) {
  const limit = parsePositive(input?.limit ?? input?.limit_amount)
  if (!limit) return { ok: false, error: 'Enter a monthly limit greater than zero.' }
  const payload = { category: input?.category || 'Other', limit_amount: limit }
  if (input?.period) payload.period = input.period
  return { ok: true, payload }
}

export function validateAccount(input) {
  const name = String(input?.name ?? '').trim()
  if (!name) return { ok: false, error: 'Name the account.' }
  const kind = ACCOUNT_KINDS.includes(input?.kind) ? input.kind : 'other'
  const opening = parseNonNegative(input?.opening_balance ?? 0)
  if (opening === null) return { ok: false, error: 'Opening balance cannot be negative.' }
  const color = ACCOUNT_COLORS.includes(input?.color) && input.color !== 'default' ? input.color : null
  return { ok: true, payload: { name, kind, opening_balance: opening, color } }
}

export function validateDebt(input) {
  const counterparty = String(input?.counterparty ?? '').trim()
  if (!counterparty) return { ok: false, error: 'Name who this is with.' }
  const amount = parsePositive(input?.amount)
  if (!amount) return { ok: false, error: 'Enter an amount greater than zero.' }
  const direction = DEBT_DIRECTIONS.includes(input?.direction) ? input.direction : 'owed_to_me'
  const due = input?.due_date
  if (due && !isISODate(due)) return { ok: false, error: 'Use a valid due date.' }
  return {
    ok: true,
    payload: {
      counterparty,
      amount,
      direction,
      note: String(input?.note ?? '').trim(),
      due_date: due || null,
    },
  }
}

export function validatePlanEntry(input, { allowPast = false } = {}) {
  const title = String(input?.title ?? '').trim()
  if (!title) return { ok: false, error: 'Add a title.' }
  const date = input?.entry_date || todayISO()
  if (!isISODate(date)) return { ok: false, error: 'Use a valid date.' }
  if (!allowPast && date < todayISO()) return { ok: false, error: 'Pick today or a later date.' }
  return {
    ok: true,
    payload: {
      title,
      entry_date: date,
      start_time: normalizeTime(input?.time ?? input?.start_time),
      tag: input?.tag || 'Daily',
      priority: Boolean(input?.priority),
    },
  }
}

export function validateTask(input, { allowPast = false } = {}) {
  const title = String(input?.title ?? '').trim()
  if (!title) return { ok: false, error: 'Add a task.' }
  const due = input?.due_date
  if (due && !isISODate(due)) return { ok: false, error: 'Use a valid due date.' }
  if (due && !allowPast && due < todayISO()) {
    return { ok: false, error: 'Pick today or a later due date.' }
  }
  return {
    ok: true,
    payload: {
      title,
      tag: input?.tag || 'Daily',
      due_date: due || null,
      due_time: due ? normalizeTime(input?.due_time ?? input?.time) : null,
      priority: Boolean(input?.priority),
    },
  }
}

export function validateSleepNote(input) {
  const text = String(input ?? '').trim()
  if (!text) return { ok: false, error: 'Add a note first.' }
  if (text.length > 1000) return { ok: false, error: 'Keep each sleep note under 1000 characters.' }
  return { ok: true, payload: { text } }
}

export function validateSleepLog(input) {
  const date = input?.log_date || todayISO()
  if (!isISODate(date)) return { ok: false, error: 'Use a valid sleep date.' }
  if (date > todayISO()) return { ok: false, error: 'Sleep date cannot be in the future.' }

  const rawSessions = Array.isArray(input?.sessions) ? input.sessions : []
  if (!rawSessions.length) return { ok: false, error: 'Add at least one sleep session.' }
  if (rawSessions.length > 6) return { ok: false, error: 'Keep it to six sleep sessions per day.' }

  const sessions = []
  let totalMinutes = 0
  for (const session of rawSessions) {
    const from = normalizeTime(session?.from)
    const to = normalizeTime(session?.to)
    if (!from || !to) return { ok: false, error: 'Set both sleep times for each session.' }
    if (from === to) return { ok: false, error: 'A sleep session needs different start and end times.' }

    const minutes = sessionMinutes({ from, to })
    if (!minutes) return { ok: false, error: 'That sleep session has no duration.' }
    totalMinutes += minutes
    sessions.push({ from, to })
  }

  if (totalMinutes > 24 * 60) {
    return { ok: false, error: 'Total sleep for one day cannot exceed 24 hours.' }
  }

  return {
    ok: true,
    payload: {
      log_date: date,
      sessions,
    },
  }
}

export function validateCourse(input) {
  const name = String(input?.name ?? '').trim()
  if (!name) return { ok: false, error: 'Add a course name.' }
  const weekly = parseNonNegative(input?.weekly_target_hours ?? 0)
  if (weekly === null) return { ok: false, error: 'Weekly target cannot be negative.' }
  return {
    ok: true,
    payload: {
      name,
      description: String(input?.description ?? '').trim(),
      weekly_target_hours: weekly,
    },
  }
}

export function validateModule(input) {
  const title = String(input?.title ?? '').trim()
  if (!title) return { ok: false, error: 'Add a module title.' }
  return {
    ok: true,
    payload: { title, description: String(input?.description ?? '').trim() },
  }
}

export function validateLesson(input) {
  const title = String(input?.title ?? '').trim()
  if (!title) return { ok: false, error: 'Add a lesson title.' }
  return {
    ok: true,
    payload: { title, content: String(input?.content ?? '').trim() },
  }
}

export function validateSession(input) {
  const hours = parsePositive(input?.hours)
  if (!hours) return { ok: false, error: 'Enter hours greater than zero.' }
  const date = input?.studied_on || todayISO()
  if (!isISODate(date)) return { ok: false, error: 'Use a valid date.' }
  return {
    ok: true,
    payload: {
      studied_on: date,
      hours,
      course_id: input?.course_id || null,
      takeaway: input?.takeaway ? String(input.takeaway).trim() : null,
    },
  }
}

export function validateProject(input) {
  const title = String(input?.title ?? '').trim()
  if (!title) return { ok: false, error: 'Name the project.' }
  const brief = String(input?.brief ?? '').trim()
  if (!brief) return { ok: false, error: 'Describe what you will deliver.' }
  const due = input?.due_date || todayISO()
  if (!isISODate(due)) return { ok: false, error: 'Use a valid deadline.' }
  return {
    ok: true,
    payload: {
      title,
      brief,
      criteria: input?.criteria ? String(input.criteria).trim() : null,
      due_date: due,
      due_time: normalizeTime(input?.due_time ?? input?.time),
    },
  }
}

const LINK = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+([/?#][^\s]*)?$/i

export function validateSubmission(input) {
  const text = String(input?.text ?? input?.write_up ?? '').trim()
  if (!text) return { ok: false, error: 'Write what you delivered.' }
  const raw = String(input?.link ?? '').trim()
  let link = null
  if (raw) {
    if (!LINK.test(raw)) return { ok: false, error: 'That link does not look like a URL.' }
    link = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  }
  return { ok: true, payload: { submission_text: text, submission_link: link } }
}

export const MIN_PASSWORD_LENGTH = 8

export function validatePasswordChange(input) {
  const current = String(input?.current ?? '')
  const next = String(input?.next ?? '')
  const confirm = String(input?.confirm ?? '')

  if (!current) return { ok: false, error: 'Enter your current password.' }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Use at least ${MIN_PASSWORD_LENGTH} characters.` }
  }
  if (next !== confirm) return { ok: false, error: 'The new passwords do not match.' }
  if (next === current) {
    return { ok: false, error: 'Choose a password different from your current one.' }
  }
  return { ok: true, payload: { current, next } }
}
