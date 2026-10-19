/*
 * "Plan with AI" (Stage 2.5): turn a goal (or the current week) into proposed plan
 * entries and, in study scope, course units. Proposals are always previewed and
 * confirmed before anything is written; execution goes through useData() services.
 *
 * Context sent to the proxy is minimum-necessary: the goal text, the date range,
 * existing planner titles/times in range, and (study scope) course names and progress.
 * Never notes, transactions or account data.
 */

import {
  courseRow,
  courseWeekHours,
  startOfWeek,
  toISODate,
  todayISO,
} from './analytics.js'
import { PLAN_TAGS } from '../data/constants.js'
import { validatePlanEntry } from './validation.js'

export const HORIZONS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'next7', label: 'Next 7 days' },
]

export const MAX_ITEMS = 12

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Inclusive date range for a horizon key. */
export function horizonRange(horizon) {
  if (horizon === 'today') {
    const today = todayISO()
    return { start: today, end: today }
  }
  if (horizon === 'next7') {
    return { start: todayISO(), end: toISODate(addDays(new Date(), 6)) }
  }
  const start = startOfWeek(new Date())
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  return { start: toISODate(start), end: toISODate(end) }
}

export function buildPlanContext({ scope, horizon, goal, data }) {
  const { start, end } = horizonRange(horizon)
  const lines = [
    `Today: ${todayISO()}`,
    `Horizon: ${start} to ${end}`,
    `Scope: ${scope}`,
    `Plan tags: ${PLAN_TAGS.join(', ')}`,
  ]
  if (goal) lines.push(`Goal: ${goal}`)

  const inRange = (data.planner || []).filter(
    (entry) => entry.entry_date >= start && entry.entry_date <= end,
  )
  if (inRange.length) {
    lines.push('Existing plan in range:')
    for (const entry of inRange.slice(0, 20)) {
      const time = entry.start_time ? `${String(entry.start_time).slice(0, 5)} ` : ''
      lines.push(`- ${entry.entry_date} ${time}${entry.title}${entry.tag ? ` [${entry.tag}]` : ''}`)
    }
  } else {
    lines.push('Existing plan in range: none')
  }

  if (scope === 'study') {
    const active = (data.courses || []).filter((course) => course.active !== false)
    if (active.length) {
      lines.push('Courses:')
      for (const course of active.slice(0, 8)) {
        const row = courseRow(course)
        const logged = courseWeekHours(data.sessions || [], course.id)
        const target = Number(course.weekly_target_hours) || 0
        const bits = [`${row.name}: ${row.detail} (${row.progress}%)`]
        if (row.next) bits.push(`next: ${row.next}`)
        if (target > 0) bits.push(`weekly target ${target}h (${logged}h logged)`)
        lines.push(`- ${bits.join(', ')}`)
      }
    } else {
      lines.push('Courses: none')
    }
  }

  return lines.join('\n')
}

function resolveCourse(courses, query) {
  const q = normalize(query)
  if (!q) return null
  const exact = courses.find((course) => normalize(course.name) === q)
  if (exact) return exact
  return courses.find((course) => normalize(course.name).includes(q) || q.includes(normalize(course.name))) || null
}

function normalizeTag(value, fallback) {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  return PLAN_TAGS.find((tag) => tag.toLowerCase() === raw.toLowerCase()) || fallback
}

/** Validate raw model items into safe, deduped proposals. */
export function normalizeItems(items, data, scope) {
  const existingEntries = new Set(
    (data.planner || []).map((entry) => `${entry.entry_date}|${normalize(entry.title)}`),
  )
  const existingUnits = new Set((data.units || []).map((unit) => `${unit.course_id}|${normalize(unit.title)}`))
  const proposedEntries = new Set()
  const proposedUnits = new Set()
  const out = []

  ;(items || []).slice(0, MAX_ITEMS).forEach((raw, index) => {
    const kind = raw?.kind === 'unit' ? 'unit' : 'entry'

    if (kind === 'unit') {
      if (scope !== 'study') return
      const course = resolveCourse(data.courses || [], raw?.course)
      const title = String(raw?.title || '').trim().slice(0, 80)
      if (!course || !title) return
      const key = `${course.id}|${normalize(title)}`
      if (existingUnits.has(key) || proposedUnits.has(key)) return
      proposedUnits.add(key)
      out.push({
        key: `u${index}`,
        kind: 'unit',
        title,
        course: course.name,
        courseId: course.id,
        payload: { course_id: course.id, title, position: 0 },
      })
      return
    }

    const checked = validatePlanEntry({
      title: raw?.title,
      entry_date: raw?.date,
      time: raw?.time,
      tag: normalizeTag(raw?.tag, scope === 'study' ? 'Study' : 'Daily'),
    })
    if (!checked.ok) return
    const payload = checked.payload
    const key = `${payload.entry_date}|${normalize(payload.title)}`
    if (existingEntries.has(key) || proposedEntries.has(key)) return
    proposedEntries.add(key)
    out.push({
      key: `e${index}`,
      kind: 'entry',
      title: payload.title,
      date: payload.entry_date,
      time: payload.start_time,
      tag: payload.tag,
      payload,
    })
  })

  return out
}

/** Deterministic study fallback used when AI is off or unavailable. */
export function localStudyPlan(data) {
  const out = []
  const active = (data.courses || []).filter((course) => course.active !== false)
  active.slice(0, 3).forEach((course, index) => {
    const target = Number(course.weekly_target_hours) || 0
    const logged = courseWeekHours(data.sessions || [], course.id)
    if (target > 0 && logged >= target) return
    const checked = validatePlanEntry({
      title: `Study: ${course.name}`,
      entry_date: todayISO(),
      time: null,
      tag: 'Study',
    })
    if (checked.ok) {
      out.push({
        key: `l${index}`,
        kind: 'entry',
        title: checked.payload.title,
        date: checked.payload.entry_date,
        time: null,
        tag: 'Study',
        payload: checked.payload,
      })
    }
  })
  return out
}

/** Write the selected proposals through the data services. */
export async function runPlan(services, items) {
  let entries = 0
  let units = 0
  for (const item of items) {
    if (item.kind === 'unit') {
      await services.createCourseUnit(item.payload)
      units += 1
    } else {
      await services.createPlanEntry(item.payload)
      entries += 1
    }
  }
  return { entries, units }
}

export function summarizeResult({ entries, units }) {
  const parts = []
  if (entries) parts.push(`${entries} ${entries === 1 ? 'entry' : 'entries'}`)
  if (units) parts.push(`${units} ${units === 1 ? 'unit' : 'units'}`)
  if (!parts.length) return 'Nothing was added.'
  return `Added ${parts.join(' and ')}.`
}

const PLAN_REQUEST =
  /\b(plan|schedule|organi[sz]e|map out)\b[\s\S]*\b(week|day|days|study|schedule|time|routine)\b|\bhelp me plan\b|\bmake me a (study )?plan\b|\bplan (my|the|out)\b/

export function looksLikePlanRequest(text) {
  const value = String(text || '').trim().toLowerCase()
  if (!value || value.endsWith('?')) return false
  return PLAN_REQUEST.test(value)
}

export function inferScope(text) {
  return /\b(study|studying|course|courses|revise|revision|exam|learn|learning)\b/i.test(String(text || ''))
    ? 'study'
    : 'general'
}
