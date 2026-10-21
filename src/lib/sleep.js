/*
 * Pure sleep derivations. Sessions are stored as { from, to } clock times, so a session
 * that ends at or before its start is treated as crossing midnight.
 */

import { startOfWeek, toISODate, todayISO } from './analytics.js'
import { formatClock12, formatClock12Range } from './format.js'

export const RATING_LABELS = {
  1: 'Bad',
  2: 'Poor',
  3: 'Okay',
  4: 'Good',
  5: 'Excellent',
}

export const DAILY_SCORE_MAX = 100
export const MAX_DAILY_POINTS = 5

export const SCORE_BREAKDOWN = [
  { key: 'duration_fit', label: 'Duration fit', max: 30 },
  { key: 'daytime_energy', label: 'Daytime energy', max: 30 },
  { key: 'nap_quality', label: 'Nap quality', max: 20 },
  { key: 'continuity', label: 'Continuity', max: 20 },
]

const MINUTES_PER_DAY = 24 * 60

function parseClock(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''))
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function shortDate(iso) {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function monthTitle(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function sessionMinutes(session) {
  const from = parseClock(session?.from ?? session?.sleep_from)
  const to = parseClock(session?.to ?? session?.sleep_to)
  if (from === null || to === null || from === to) return 0
  return to > from ? to - from : MINUTES_PER_DAY - from + to
}

export function totalSleepMinutes(log) {
  return (log?.sessions ?? []).reduce((sum, session) => sum + sessionMinutes(session), 0)
}

export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function creditPointsForScore(score) {
  const value = Number(score)
  if (!Number.isFinite(value)) return 0
  return Math.max(-MAX_DAILY_POINTS, Math.min(MAX_DAILY_POINTS, Math.round((value - 50) / 10)))
}

export function dailyScoreOf(log) {
  const value = log?.daily_score
  if (value === null || value === undefined || value === '') return null
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

export function creditPointsForLog(log) {
  const stored = Number(log?.credit_points)
  if (Number.isFinite(stored)) return stored
  const rating = Math.round(Number(log?.rating))
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return 0
  return rating - 3
}

export function sleepCreditScore(events) {
  return (events ?? []).reduce((sum, event) => sum + (Number(event?.delta) || 0), 0)
}

export function isAssessmentStale(log) {
  return Boolean(log?.assessment_stale)
}

export function ratingLabel(rating) {
  return RATING_LABELS[Math.round(Number(rating))] ?? null
}

export function latestSleepLog(logs) {
  return [...(logs ?? [])].sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)))[0] ?? null
}

export function sleepNotes(log) {
  const notes = Array.isArray(log?.notes)
    ? log.notes
        .map((note) => ({
          at: note?.at ?? null,
          text: String(note?.text ?? '').trim(),
        }))
        .filter((note) => note.text)
    : []

  if (notes.length) return notes

  const legacy = String(log?.note ?? '').trim()
  return legacy
    ? [{ at: log?.assessed_at ?? log?.updated_at ?? null, text: legacy }]
    : []
}

export function latestSleepNote(log) {
  const notes = sleepNotes(log)
  return notes.length ? notes[notes.length - 1] : null
}

export function noteStamp(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}, ${formatClock12(
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  )}`
}

export function sessionWindow(session, wakeDate) {
  const from = parseClock(session?.from)
  const to = parseClock(session?.to)
  if (from === null || to === null || !wakeDate) return null

  const crosses = to <= from
  const fromDate = crosses
    ? toISODate(new Date(new Date(`${wakeDate}T00:00:00`).getTime() - 24 * 60 * 60 * 1000))
    : wakeDate
  const toDate = wakeDate

  return {
    fromDate,
    toDate,
    crosses,
    start: formatClock12(session.from),
    end: formatClock12(session.to),
  }
}

export function sleepWindowLabel(session, wakeDate) {
  const window = sessionWindow(session, wakeDate)
  if (!window) return ''

  if (window.crosses) {
    return `${shortDate(window.fromDate)} · ${window.start} → ${shortDate(window.toDate)} · ${window.end}`
  }
  return `${shortDate(window.fromDate)} · ${formatClock12Range(session.from, session.to)}`
}

export function wakeDayLabel(iso) {
  return iso ? `Woke ${shortDate(iso)}` : ''
}

export function periodBounds(period = 'week', offset = 0, ref = new Date()) {
  if (period === 'month') {
    const start = new Date(ref.getFullYear(), ref.getMonth() + offset, 1)
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
    return {
      start: toISODate(start),
      end: toISODate(end),
      label: monthTitle(start),
    }
  }

  const start = startOfWeek(ref)
  start.setDate(start.getDate() + offset * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    start: toISODate(start),
    end: toISODate(end),
    label: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
  }
}

export function periodDays(period, offset = 0, ref = new Date()) {
  const bounds = periodBounds(period, offset, ref)
  const start = new Date(`${bounds.start}T00:00:00`)
  const end = new Date(`${bounds.end}T00:00:00`)
  const days = []
  const cursor = new Date(start)
  while (cursor <= end) {
    days.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function sleepSummary(logs, period = 'week', offset = 0, ref = new Date()) {
  const bounds = periodBounds(period, offset, ref)
  const logsInPeriod = (logs ?? [])
    .filter((log) => String(log.log_date) >= bounds.start && String(log.log_date) <= bounds.end)
    .sort((a, b) => String(a.log_date).localeCompare(String(b.log_date)))
  const byDate = new Map(logsInPeriod.map((log) => [log.log_date, log]))
  const days = periodDays(period, offset, ref).map((date) => {
    const log = byDate.get(date) ?? null
    return {
      date,
      log,
      minutes: log ? totalSleepMinutes(log) : 0,
      score: dailyScoreOf(log),
      rating: Number(log?.rating) || null,
      points: log ? creditPointsForLog(log) : null,
      stale: isAssessmentStale(log),
    }
  })

  const assessed = logsInPeriod.filter((log) => dailyScoreOf(log) !== null)
  const rated = logsInPeriod.filter((log) => Number(log.rating))
  const totalMinutes = logsInPeriod.reduce((sum, log) => sum + totalSleepMinutes(log), 0)
  const scoreTotal = assessed.reduce((sum, log) => sum + Number(log.daily_score), 0)
  const ratingTotal = rated.reduce((sum, log) => sum + Number(log.rating), 0)

  return {
    ...bounds,
    logs: logsInPeriod,
    days,
    nights: logsInPeriod.length,
    assessed: assessed.length,
    stale: logsInPeriod.filter((log) => isAssessmentStale(log)).length,
    points: logsInPeriod.reduce((sum, log) => sum + creditPointsForLog(log), 0),
    averageMinutes: logsInPeriod.length ? Math.round(totalMinutes / logsInPeriod.length) : null,
    averageScore: assessed.length ? Math.round(scoreTotal / assessed.length) : null,
    averageRating: rated.length ? Math.round((ratingTotal / rated.length) * 10) / 10 : null,
  }
}

export function sleepHistoryContext(logs, currentId, days = 14) {
  return [...(logs ?? [])]
    .filter((log) => log.id !== currentId)
    .sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)))
    .slice(0, days)
    .map((log) => {
      const notes = sleepNotes(log)
        .map((note) => `${noteStamp(note.at)} ${note.text}`.trim())
        .join(' | ')
      return [
        log.log_date,
        `sleep ${formatDuration(totalSleepMinutes(log))}`,
        `daily ${dailyScoreOf(log) === null ? 'not scored' : `${dailyScoreOf(log)}/100`}`,
        `quality ${log.rating ? `${log.rating}/5` : 'not rated'}`,
        `notes: ${notes || 'none'}`,
      ].join('; ')
    })
    .join('\n')
    .slice(0, 2600)
}

/** Average rating across the last seven calendar days. */
export function recentAverageRating(logs, days = 7) {
  const end = new Date(`${todayISO()}T00:00:00`)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  const startISO = toISODate(start)

  const rated = (logs ?? []).filter(
    (log) => log?.rating && String(log.log_date) >= startISO,
  )
  if (!rated.length) return null
  const sum = rated.reduce((total, log) => total + Number(log.rating), 0)
  return Math.round((sum / rated.length) * 10) / 10
}

/** Average daily score across the last seven calendar days. */
export function recentAverageScore(logs, days = 7) {
  const end = new Date(`${todayISO()}T00:00:00`)
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  const startISO = toISODate(start)

  const scored = (logs ?? []).filter(
    (log) => dailyScoreOf(log) !== null && String(log.log_date) >= startISO,
  )
  if (!scored.length) return null
  const sum = scored.reduce((total, log) => total + dailyScoreOf(log), 0)
  return Math.round(sum / scored.length)
}
