/*
 * Minimum-necessary context builders (Stage 1).
 *
 * Each builder produces a small, human-readable block of the user's own records for
 * ONE domain. They are called only when a question genuinely needs that domain, so we
 * never ship a universal digest. No individual transactions and no note bodies are
 * included except in buildNoteContext, which is only used for an explicit per-note request.
 */

import {
  budgetProgress,
  courseRow,
  courseWeekHours,
  currentStreak,
  entriesOn,
  formatDateShort,
  todayISO,
  totalsForMonth,
  upcomingEntries,
  weekHours,
} from './analytics.js'
import { money } from './format.js'
import { creditBalance, dueMeta, openPenalties, sortProjects } from './projects.js'

/** Aggregate spend per category for the current month (no individual transactions). */
function monthCategoryTotals(transactions) {
  const now = new Date()
  const byCategory = new Map()
  for (const tx of transactions) {
    const d = new Date(`${tx.occurred_on}T00:00:00`)
    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) continue
    const amount = Number(tx.amount) || 0
    if (amount >= 0) continue
    byCategory.set(tx.category, (byCategory.get(tx.category) || 0) + Math.abs(amount))
  }
  return [...byCategory.entries()]
    .map(([category, value]) => ({ category, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
}

export function buildFinanceContext(data) {
  const { transactions = [], budgets = [] } = data || {}
  const { spend, income } = totalsForMonth(transactions)
  const lines = [`This month: spent ${money(spend, 0)}, income ${money(income, 0)}.`]

  const rows = budgetProgress(budgets, transactions)
  if (rows.length) {
    const totalLimit = rows.reduce((sum, row) => sum + row.limit, 0)
    const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0)
    lines.push(`Budgets: ${money(totalLimit, 0)} total, ${money(totalSpent, 0)} used, ${money(totalLimit - totalSpent, 0)} remaining.`)
  } else {
    lines.push('No monthly budgets are set.')
  }

  const categories = monthCategoryTotals(transactions)
  if (categories.length) {
    lines.push('Spending by category this month:')
    for (const row of categories.slice(0, 8)) {
      const share = spend > 0 ? Math.round((row.value / spend) * 100) : 0
      lines.push(`- ${row.category}: ${money(row.value, 0)} (${share}%)`)
    }
  } else {
    lines.push('No spending logged this month.')
  }

  return { context: lines.join('\n'), sources: ['Finances'] }
}

export function buildLearningContext(data) {
  const { courses = [], sessions = [] } = data || {}
  const lines = [
    `Study this week: ${weekHours(sessions)}h. Current streak: ${currentStreak(sessions)} days.`,
  ]

  const active = courses.filter((course) => course.active !== false)
  if (active.length) {
    lines.push('Courses:')
    for (const raw of active.slice(0, 8)) {
      const row = courseRow(raw)
      const logged = courseWeekHours(sessions, raw.id)
      const target = Number(raw.weekly_target_hours) || 0
      const parts = [`${row.name}: ${row.detail} (${row.progress}%)`]
      if (row.next) parts.push(`next: ${row.next}`)
      if (target > 0) parts.push(`weekly target ${target}h, ${logged}h logged`)
      lines.push(`- ${parts.join(', ')}`)
    }
  } else {
    lines.push('No courses are tracked yet.')
  }

  return { context: lines.join('\n'), sources: ['Learning'] }
}

export function buildPlannerContext(data) {
  const { planner = [] } = data || {}
  const today = todayISO()
  const lines = []

  const todays = entriesOn(planner, today)
  lines.push(
    `Today (${formatDateShort(today)}): ${
      todays.length
        ? todays
            .map(
              (entry) =>
                `${entry.title}${entry.start_time ? ` at ${String(entry.start_time).slice(0, 5)}` : ''}${
                  entry.done ? ' (done)' : ''
                }`,
            )
            .join('; ')
        : 'nothing scheduled'
    }.`,
  )

  const upcoming = upcomingEntries(planner, new Date(), 10)
  if (upcoming.length) {
    lines.push(
      `Coming up: ${upcoming
        .map((entry) => `${formatDateShort(entry.entry_date)} ${entry.title}`)
        .join('; ')}.`,
    )
  }

  return { context: lines.join('\n'), sources: ['Planner'] }
}

export function buildProjectsContext(data) {
  const { projects = [], penalties = [] } = data || {}
  const ordered = sortProjects(projects)
  const active = ordered.filter((project) => project.status === 'active')
  const balance = creditBalance(penalties)
  const open = openPenalties(penalties)

  const lines = [
    `Credits: ${balance}. ${open.length} open penalt${open.length === 1 ? 'y' : 'ies'}${
      open.length ? ' — new projects are locked until atoned' : ''
    }.`,
  ]

  if (active.length) {
    lines.push('Projects in progress:')
    for (const project of active.slice(0, 8)) {
      const meta = dueMeta(project)
      lines.push(`- ${project.title} — due ${formatDateShort(project.due_date)}${meta.overdue ? ' (overdue)' : ''}`)
    }
  } else {
    lines.push('No projects are in progress.')
  }

  const settled = projects.length - active.length
  if (settled > 0) lines.push(`Settled projects: ${settled}.`)

  return { context: lines.join('\n'), sources: ['Projects'] }
}

/** Only used when the user explicitly asks about one note. */
export function buildNoteContext(note) {
  if (!note) return { context: '', sources: [] }
  const lines = [`Note title: ${note.title}`]
  if (note.tag) lines.push(`Tag: ${note.tag}`)
  lines.push(`Body:\n${String(note.body || '').slice(0, 2000)}`)
  return { context: lines.join('\n'), sources: ['Notes'] }
}

const BUILDERS = {
  finance: buildFinanceContext,
  learning: buildLearningContext,
  planner: buildPlannerContext,
  projects: buildProjectsContext,
}

export function buildContextFor(domain, data) {
  const builder = BUILDERS[domain]
  if (!builder) return { context: '', sources: [] }
  return builder(data)
}
