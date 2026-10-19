/*
 * Shared, pure validation for the six record forms and for assistant actions.
 * A validator returns { ok, payload } on success or { ok: false, error } on failure,
 * so forms and the action layer normalize records the same way.
 */

import { todayISO } from './analytics.js'

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
export const CLOCK = /^\d{1,2}:\d{2}$/

export function isISODate(value) {
  return typeof value === 'string' && ISO_DATE.test(value)
}

/** A finite number greater than zero, or null. */
export function parsePositive(value) {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** A non-negative number (zero allowed), or null. */
export function parseNonNegative(value) {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) && n >= 0 ? n : null
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
    payload: { title, body: String(input?.body ?? '').trim(), tag: input?.tag || 'Personal' },
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

export function validatePlanEntry(input) {
  const title = String(input?.title ?? '').trim()
  if (!title) return { ok: false, error: 'Add a title.' }
  const date = input?.entry_date || todayISO()
  if (!isISODate(date)) return { ok: false, error: 'Use a valid date.' }
  return {
    ok: true,
    payload: {
      title,
      entry_date: date,
      start_time: normalizeTime(input?.time ?? input?.start_time),
      tag: input?.tag || 'Daily',
    },
  }
}

export function validateCourse(input) {
  const name = String(input?.name ?? '').trim()
  if (!name) return { ok: false, error: 'Add a course name.' }
  const total = parseCount(input?.total_units)
  if (!total || total <= 0) return { ok: false, error: 'Total units must be greater than zero.' }
  const completed = parseCount(input?.completed_units ?? 0)
  if (completed === null || completed < 0) return { ok: false, error: 'Completed units cannot be negative.' }
  if (completed > total) return { ok: false, error: 'Completed units cannot exceed the total.' }
  const weekly = parseNonNegative(input?.weekly_target_hours ?? 0)
  if (weekly === null) return { ok: false, error: 'Weekly target cannot be negative.' }
  return {
    ok: true,
    payload: {
      name,
      total_units: total,
      completed_units: completed,
      next_label: input?.next_label ? String(input.next_label).trim() : null,
      weekly_target_hours: weekly,
    },
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
