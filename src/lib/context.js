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
import { accountRows, debtTotals, openDebts } from './accounts.js'
import { coursesTree } from './learning.js'
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

export function buildFinanceContext(data, options = {}) {
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

  const accounts = accountRows(data)
  if (accounts.length) {
    if (options.hidden) {
      lines.push(`The user has ${accounts.length} tracked accounts, but their balances are hidden right now.`)
    } else {
      lines.push('Accounts (opening balance plus spending tagged to each):')
      for (const account of accounts.slice(0, 8)) {
        lines.push(`- ${account.name}: ${money(account.balance, 0)}, ${money(account.income, 0)} in this month`)
      }
    }
  } else {
    lines.push('No accounts are tracked.')
  }

  const open = openDebts(data?.debts)
  if (open.length) {
    const totals = debtTotals(data?.debts)
    if (options.hidden) {
      lines.push(`The user has ${open.length} open debts, but the amounts are hidden right now.`)
    } else {
      lines.push(
        `Open debts: ${money(totals.owedToMe, 0)} owed to the user, ${money(totals.iOwe, 0)} owed by the user.`,
      )
      for (const debt of open.slice(0, 8)) {
        lines.push(
          `- ${debt.counterparty}: ${debt.direction === 'i_owe' ? 'user owes' : 'owes user'} ${money(debt.amount, 0)}${debt.due_date ? `, due ${debt.due_date}` : ''}`,
        )
      }
    }
  } else {
    lines.push('No open debts.')
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
  const { sessions = [] } = data || {}
  const lines = [
    `Study this week: ${weekHours(sessions)}h. Current streak: ${currentStreak(sessions)} days.`,
  ]

  const trees = coursesTree(data)
  if (trees.length) {
    lines.push('Courses:')
    for (const tree of trees.slice(0, 8)) {
      const logged = courseWeekHours(sessions, tree.id)
      const target = Number(tree.course.weekly_target_hours) || 0
      const parts = [`${tree.name}: ${tree.detail} (${tree.pct}%)`]
      if (tree.next) parts.push(`next: ${tree.next.title}`)
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

export function buildContextFor(domain, data, options = {}) {
  const builder = BUILDERS[domain]
  if (!builder) return { context: '', sources: [] }
  return builder(data, options)
}
