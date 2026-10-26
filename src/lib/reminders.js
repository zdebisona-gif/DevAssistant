import { budgetProgress } from './analytics.js'

export const REMINDER_CHANNELS = {
  sleep: 'zeni-sleep',
  planner: 'zeni-planner',
  learning: 'zeni-learning',
  deadlines: 'zeni-deadlines',
  money: 'zeni-money',
}

export const REMINDER_HORIZON_DAYS = 30
export const MAX_ONE_OFF_REMINDERS = 48

export const DEFAULT_REMINDERS = {
  enabled: false,
  sleep: { enabled: true, time: '08:00' },
  planner: {
    agenda: { enabled: false, time: '07:30' },
    events: { enabled: true, leadMinutes: 10 },
    tasks: { enabled: true, time: '09:00' },
  },
  learning: { enabled: true, time: '19:00' },
  projects: { enabled: true },
  money: {
    debts: { enabled: true, time: '09:00' },
    budgets: { enabled: true },
  },
}

const DAY_MS = 24 * 60 * 60 * 1000

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
  }
  return value
}

function mergeDefaults(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return cloneValue(base)
  const next = cloneValue(base)
  for (const key of Object.keys(base)) {
    if (!(key in patch)) continue
    const baseValue = base[key]
    const patchValue = patch[key]
    next[key] =
      baseValue && typeof baseValue === 'object' && !Array.isArray(baseValue)
        ? mergeDefaults(baseValue, patchValue)
        : patchValue
  }
  return next
}

export function mergeReminderPrefs(raw) {
  const merged = mergeDefaults(DEFAULT_REMINDERS, raw ?? {})
  merged.enabled = Boolean(merged.enabled)
  merged.sleep.enabled = Boolean(merged.sleep.enabled)
  merged.planner.agenda.enabled = Boolean(merged.planner.agenda.enabled)
  merged.planner.events.enabled = Boolean(merged.planner.events.enabled)
  merged.planner.tasks.enabled = Boolean(merged.planner.tasks.enabled)
  merged.learning.enabled = Boolean(merged.learning.enabled)
  merged.projects.enabled = Boolean(merged.projects.enabled)
  merged.money.debts.enabled = Boolean(merged.money.debts.enabled)
  merged.money.budgets.enabled = Boolean(merged.money.budgets.enabled)
  if (![5, 10, 30].includes(Number(merged.planner.events.leadMinutes))) {
    merged.planner.events.leadMinutes = 10
  }
  return merged
}

export function parseClock(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''))
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

function parseDateParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''))
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function localDate(dateISO, time) {
  const date = parseDateParts(dateISO)
  const clock = parseClock(time)
  if (!date || !clock) return null
  const value = new Date(date.year, date.month - 1, date.day, clock.hour, clock.minute, 0, 0)
  if (
    value.getFullYear() !== date.year ||
    value.getMonth() !== date.month - 1 ||
    value.getDate() !== date.day
  ) {
    return null
  }
  return value
}

function shiftDate(date, days) {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + days)
  return next
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthKeyOf(date = new Date()) {
  return monthKey(date)
}

export function spendByCategory(transactions, ref = new Date()) {
  const key = monthKey(ref)
  const spent = new Map()
  for (const tx of transactions ?? []) {
    if (String(tx?.occurred_on ?? '').slice(0, 7) !== key) continue
    const amount = Number(tx?.amount) || 0
    if (amount >= 0) continue
    const category = tx?.category || 'Other'
    spent.set(category, (spent.get(category) || 0) + Math.abs(amount))
  }
  return spent
}

export function pruneBudgetAlerts(keys, now = new Date()) {
  const prefix = `budget:${monthKey(now)}:`
  return [...new Set((keys ?? []).filter((key) => typeof key === 'string' && key.startsWith(prefix)))]
}

export function buildBudgetAlertCandidates({
  budgets,
  transactions,
  previousSpend,
  now = new Date(),
}) {
  if (!previousSpend) return []
  const candidates = []
  for (const row of budgetProgress(budgets ?? [], transactions ?? [], now)) {
    if (!(row.limit > 0)) continue
    const before = previousSpend.get(row.category) ?? 0
    if (row.spent <= before) continue

    let threshold = null
    if (before < row.limit && row.spent >= row.limit) threshold = 100
    else if (before < row.limit * 0.8 && row.spent >= row.limit * 0.8) threshold = 80
    if (!threshold) continue

    candidates.push({
      key: `budget:${monthKey(now)}:${row.category}:${threshold}`,
      title: threshold === 100 ? 'Budget exceeded' : 'Budget check',
      body:
        threshold === 100
          ? 'A budget has gone over its limit.'
          : 'A budget is nearing its limit.',
      url: '/finances',
      channelId: REMINDER_CHANNELS.money,
    })
  }
  return candidates
}

export function buildReminderPlan({ data, prefs, now = new Date() }) {
  if (!prefs?.enabled) return { daily: [], oneOff: [] }

  const daily = []
  const oneOff = []
  const horizon = now.getTime() + REMINDER_HORIZON_DAYS * DAY_MS

  const routine = (key, config, channelId, title, body, url) => {
    const clock = parseClock(config?.time)
    if (!config?.enabled || !clock) return
    daily.push({ key: `daily:${key}`, title, body, url, channelId, ...clock })
  }

  routine(
    'sleep',
    prefs.sleep,
    REMINDER_CHANNELS.sleep,
    'Sleep check-in',
    "Log last night's rest while it's fresh.",
    '/sleep',
  )
  routine(
    'agenda',
    prefs.planner?.agenda,
    REMINDER_CHANNELS.planner,
    "Today's plan",
    'Take a look at what is ahead today.',
    '/planner',
  )
  routine(
    'learning',
    prefs.learning,
    REMINDER_CHANNELS.learning,
    'Study check-in',
    'A short focused session keeps your streak moving.',
    '/learning',
  )

  const push = (spec) => {
    if (!spec?.date) return
    const time = spec.date.getTime()
    if (Number.isNaN(time) || time <= now.getTime() || time > horizon) return
    oneOff.push(spec)
  }

  if (prefs.planner?.events?.enabled) {
    const lead = Math.max(0, Number(prefs.planner.events.leadMinutes) || 10)
    for (const entry of data?.planner ?? []) {
      if (entry?.done || !entry?.start_time) continue
      const start = localDate(entry.entry_date, entry.start_time)
      if (!start) continue
      push({
        key: `plan:${entry.id}`,
        title: 'Coming up',
        body: `A plan item starts in ${lead} ${lead === 1 ? 'minute' : 'minutes'}.`,
        url: '/planner',
        channelId: REMINDER_CHANNELS.planner,
        date: new Date(start.getTime() - lead * 60 * 1000),
      })
    }
  }

  if (prefs.planner?.tasks?.enabled) {
    for (const task of data?.tasks ?? []) {
      if (task?.done || !task?.due_date) continue
      const date = localDate(task.due_date, task.due_time || prefs.planner.tasks.time)
      if (!date) continue
      push({
        key: `task:${task.id}`,
        title: 'Task due',
        body: 'A task is due today.',
        url: '/planner',
        channelId: REMINDER_CHANNELS.planner,
        date,
      })
    }
  }

  if (prefs.projects?.enabled) {
    for (const project of data?.projects ?? []) {
      if (project?.status !== 'active' || !project?.due_date) continue
      const due = localDate(project.due_date, project.due_time || '09:00')
      if (!due) continue

      const before = localDate(project.due_date, '09:00')
      if (before) {
        push({
          key: `project:${project.id}:before`,
          title: 'Deadline tomorrow',
          body: 'A project is due tomorrow.',
          url: '/projects',
          channelId: REMINDER_CHANNELS.deadlines,
          date: shiftDate(before, -1),
        })
      }

      push({
        key: `project:${project.id}:due`,
        title: 'Project due',
        body: 'A project is due today.',
        url: '/projects',
        channelId: REMINDER_CHANNELS.deadlines,
        date: project.due_time ? new Date(due.getTime() - 60 * 60 * 1000) : due,
      })
    }
  }

  if (prefs.money?.debts?.enabled) {
    for (const debt of data?.debts ?? []) {
      if (debt?.settled || debt?.settled_at || !debt?.due_date) continue
      const date = localDate(debt.due_date, prefs.money.debts.time)
      if (!date) continue
      push({
        key: `debt:${debt.id}`,
        title: 'Debt due',
        body: 'A debt is due today.',
        url: '/finances',
        channelId: REMINDER_CHANNELS.money,
        date,
      })
    }
  }

  oneOff.sort((a, b) => a.date.getTime() - b.date.getTime())
  return { daily, oneOff: oneOff.slice(0, MAX_ONE_OFF_REMINDERS) }
}
