/*
 * Pure derivations shared by the screens. No React, no network.
 * Every figure the UI shows is computed here from raw Supabase rows.
 */

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function toISODate(value) {
  const d = value instanceof Date ? value : new Date(value)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function todayISO() {
  return toISODate(new Date())
}

function monthKey(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.getFullYear() * 12 + d.getMonth()
}

function refMonthKey(ref) {
  return ref.getFullYear() * 12 + ref.getMonth()
}

/** Last `months` calendar months as { month, spend, income }, oldest first. */
export function buildTrend(transactions, months = 12, ref = new Date()) {
  const buckets = []
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1)
    buckets.push({ key: refMonthKey(d), month: MONTHS[d.getMonth()], spend: 0, income: 0 })
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const tx of transactions) {
    const bucket = byKey.get(monthKey(tx.occurred_on))
    if (!bucket) continue
    const amount = Number(tx.amount) || 0
    if (amount >= 0) bucket.income += amount
    else bucket.spend += Math.abs(amount)
  }
  return buckets
}

export function totalsForMonth(transactions, ref = new Date()) {
  const key = refMonthKey(ref)
  let income = 0
  let spend = 0
  for (const tx of transactions) {
    if (monthKey(tx.occurred_on) !== key) continue
    const amount = Number(tx.amount) || 0
    if (amount >= 0) income += amount
    else spend += Math.abs(amount)
  }
  return { income, spend }
}

export function totalsForPrevMonth(transactions, ref = new Date()) {
  const prev = new Date(ref.getFullYear(), ref.getMonth() - 1, 1)
  return totalsForMonth(transactions, prev)
}

export function netTotal(transactions) {
  return transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
}

export function budgetsForMonth(budgets, ref = new Date()) {
  const key = refMonthKey(ref)
  return budgets.filter((b) => b.period && monthKey(b.period) === key)
}

/** Budget rows joined with the month's actual spend per category. */
export function budgetProgress(budgets, transactions, ref = new Date()) {
  const current = budgetsForMonth(budgets, ref)
  const key = refMonthKey(ref)
  const spentByCategory = new Map()
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0
    if (amount >= 0 || monthKey(tx.occurred_on) !== key) continue
    spentByCategory.set(
      tx.category,
      (spentByCategory.get(tx.category) || 0) + Math.abs(amount),
    )
  }
  return current.map((b) => ({
    id: b.id,
    category: b.category,
    limit: Number(b.limit_amount) || 0,
    spent: spentByCategory.get(b.category) || 0,
  }))
}

export function startOfWeek(ref = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  return d
}

/** Mon–Sun of the week containing `ref`, with study hours summed per day. */
export function weekStack(sessions, ref = new Date()) {
  const start = startOfWeek(ref)
  const out = DAY_LABELS.map((label, i) => ({
    day: label,
    date: toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)),
    hours: 0,
  }))
  const byDate = new Map(out.map((d) => [d.date, d]))
  for (const session of sessions) {
    const day = byDate.get(session.studied_on)
    if (day) day.hours += Number(session.hours) || 0
  }
  return out
}

export function weekHours(sessions, ref = new Date()) {
  return weekStack(sessions, ref).reduce((sum, day) => sum + day.hours, 0)
}

export function currentStreak(sessions, ref = new Date()) {
  const hoursByDate = new Map()
  for (const session of sessions) {
    hoursByDate.set(
      session.studied_on,
      (hoursByDate.get(session.studied_on) || 0) + (Number(session.hours) || 0),
    )
  }
  const cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  if (!(hoursByDate.get(toISODate(cursor)) > 0)) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (hoursByDate.get(toISODate(cursor)) > 0) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

const round1 = (n) => Math.round(n * 10) / 10

/** Hours logged for a course during the week containing `ref`. */
export function courseWeekHours(sessions, courseId, ref = new Date()) {
  const start = startOfWeek(ref)
  const startISO = toISODate(start)
  const endISO = toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7))
  let hours = 0
  for (const session of sessions) {
    if (session.course_id !== courseId) continue
    if (session.studied_on >= startISO && session.studied_on < endISO) hours += Number(session.hours) || 0
  }
  return round1(hours)
}

/** Planner entries tagged Study for the given day (default today). */
export function todayStudyBlocks(planner, ref = new Date()) {
  return entriesOn(planner, toISODate(ref)).filter(
    (entry) => (entry.tag || '').toLowerCase() === 'study',
  )
}

export function recentSessions(sessions, limit = 5) {
  return [...sessions]
    .sort((a, b) => (b.studied_on || '').localeCompare(a.studied_on || ''))
    .slice(0, limit)
}

function timeLabel(value) {
  if (!value) return null
  return String(value).slice(0, 5)
}

/** Mon–Sun of the week containing `ref`, with planner entries grouped per day. */
export function plannerWeek(entries, ref = new Date()) {
  const start = startOfWeek(ref)
  const days = DAY_LABELS.map((label, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    return { day: label, dayNum: String(date.getDate()), date: toISODate(date), events: [] }
  })
  const byDate = new Map(days.map((d) => [d.date, d]))
  for (const entry of entries) {
    const day = byDate.get(entry.entry_date)
    if (day) {
      day.events.push({
        id: entry.id,
        time: timeLabel(entry.start_time) || '—',
        title: entry.title,
        done: entry.done,
      })
    }
  }
  for (const day of days) {
    day.events.sort((a, b) => a.time.localeCompare(b.time))
  }
  return days
}

export function entryTimeLabel(value) {
  return timeLabel(value) || '—'
}

export function entriesOn(entries, dateISO) {
  return entries
    .filter((e) => e.entry_date === dateISO)
    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
}

export function upcomingEntries(entries, ref = new Date(), limit = 4) {
  const today = toISODate(ref)
  return entries
    .filter((e) => e.entry_date > today)
    .sort((a, b) =>
      `${a.entry_date}${a.start_time || ''}`.localeCompare(`${b.entry_date}${b.start_time || ''}`),
    )
    .slice(0, limit)
}

export function weekRangeLabel(ref = new Date()) {
  const start = startOfWeek(ref)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return `${fmt(start)} — ${fmt(end)}`
}

export function isoWeek(ref = new Date()) {
  const d = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

export function formatDateShort(dateStr) {
  if (!dateStr) return ''
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function relativeTime(iso) {
  if (!iso) return ''
  const diffMinutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const hours = Math.round(diffMinutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function percentChange(current, previous) {
  if (!previous) return undefined
  return Math.round(((current - previous) / previous) * 1000) / 10
}
