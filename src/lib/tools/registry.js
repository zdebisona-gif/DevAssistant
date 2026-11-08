/*
 * Read-only tool registry for the Zen-I Assistant.
 *
 * Every tool derives its numbers from the existing pure selectors in src/lib,
 * so Gemini never has to do arithmetic. Nothing here writes, edits or deletes.
 */

import {
  budgetProgress,
  entriesOn,
  plannerWeek,
  toISODate,
  totalsForMonth,
  totalsForPrevMonth,
  weekHours,
} from '../analytics.js'
import {
  accountRows,
  debtTotals,
  openDebts,
  roundMoney,
  settledDebts,
  totalInAccounts,
} from '../accounts.js'
import { financeScore, weekBounds } from '../finance.js'
import { coursesTree } from '../learning.js'
import { creditBalance, isLocked, isOverdue, openPenalties, sortProjects } from '../projects.js'
import { splitTasks, taskDueMeta } from '../tasks.js'

const PERIODS = ['today', 'week', 'month', 'last_month']
const RANGES = ['today', 'tomorrow', 'week']
const STUDY_RANGES = ['week', 'month']

function nowOf(ctx) {
  const value = ctx?.now
  if (value instanceof Date) return value
  if (value) return new Date(value)
  return new Date()
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10
}

/* NEW SELECTOR - not shared with UI. No exported range totals exist in analytics.js. */
function sumRange(transactions, start, end) {
  let income = 0
  let spend = 0
  for (const tx of transactions || []) {
    const date = String(tx.occurred_on || '')
    if (!date || date < start || date > end) continue
    const amount = Number(tx.amount) || 0
    if (amount >= 0) income += amount
    else spend += Math.abs(amount)
  }
  return { income: roundMoney(income), spend: roundMoney(spend) }
}

/* NEW SELECTOR - not shared with UI. context.js keeps its category split private. */
function spendByCategory(transactions, start, end) {
  const byCategory = new Map()
  for (const tx of transactions || []) {
    const date = String(tx.occurred_on || '')
    if (!date || date < start || date > end) continue
    const amount = Number(tx.amount) || 0
    if (amount >= 0) continue
    const category = tx.category || 'Uncategorised'
    byCategory.set(category, (byCategory.get(category) || 0) + Math.abs(amount))
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount: roundMoney(amount) }))
    .sort((a, b) => b.amount - a.amount)
}

function periodRange(period, now) {
  if (period === 'today') {
    const day = toISODate(now)
    return { start: day, end: day }
  }
  if (period === 'week') return weekBounds(now)
  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: toISODate(start), end: toISODate(end) }
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start: toISODate(start), end: toISODate(end) }
}

const tool = (definition) => definition

export const TOOLS = [
  tool({
    name: 'spending_summary',
    domain: 'finance',
    tier: 1,
    description: 'Income, spending and net for a period, optionally split by category.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        period: { type: 'string', enum: PERIODS, default: 'month' },
        group_by: { type: 'string', enum: ['category', 'none'], default: 'none' },
      },
    },
    run(args, ctx) {
      const now = nowOf(ctx)
      const data = ctx?.data || {}
      const { start, end } = periodRange(args.period, now)
      const totals =
        args.period === 'month'
          ? totalsForMonth(data.transactions || [], now)
          : args.period === 'last_month'
            ? totalsForPrevMonth(data.transactions || [], now)
            : sumRange(data.transactions, start, end)

      const result = {
        period: args.period,
        start,
        end,
        income: roundMoney(totals.income),
        spend: roundMoney(totals.spend),
        net: roundMoney(totals.income - totals.spend),
      }
      if (args.group_by === 'category') {
        result.byCategory = spendByCategory(data.transactions, start, end)
      }
      return result
    },
  }),

  tool({
    name: 'budget_status',
    domain: 'finance',
    tier: 1,
    description: 'This month’s budgets with limit, spend, remaining and percent used.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    run(args, ctx) {
      const now = nowOf(ctx)
      const data = ctx?.data || {}
      const rows = budgetProgress(data.budgets || [], data.transactions || [], now)
      const budgets = rows.map((row) => ({
        category: row.category,
        limit: roundMoney(row.limit),
        spent: roundMoney(row.spent),
        remaining: roundMoney(row.limit - row.spent),
        pct: row.limit > 0 ? Math.round((row.spent / row.limit) * 100) : 0,
        daysLeft: row.daysLeft,
      }))
      const totalLimit = budgets.reduce((sum, row) => sum + row.limit, 0)
      const totalSpent = budgets.reduce((sum, row) => sum + row.spent, 0)
      return {
        budgets,
        totalLimit: roundMoney(totalLimit),
        totalSpent: roundMoney(totalSpent),
        remaining: roundMoney(totalLimit - totalSpent),
      }
    },
  }),

  tool({
    name: 'finance_score',
    domain: 'finance',
    tier: 1,
    description: 'The rolling four-week finance score with its components.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    run(args, ctx) {
      const now = nowOf(ctx)
      const data = ctx?.data || {}
      const score = financeScore(data, now)
      return {
        score: score.score,
        label: score.label,
        components: score.components.map((component) => ({
          label: component.label,
          points: component.points,
        })),
      }
    },
  }),

  tool({
    name: 'debts_summary',
    domain: 'finance',
    tier: 2,
    description: 'Open and settled debt counts, totals, and open debts with pseudonymized people.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    run(args, ctx) {
      const data = ctx?.data || {}
      const open = openDebts(data.debts)
      const totals = debtTotals(data.debts)
      return {
        openCount: open.length,
        settledCount: settledDebts(data.debts).length,
        owedToMe: roundMoney(totals.owedToMe),
        iOwe: roundMoney(totals.iOwe),
        debts: open.map((debt) => ({
          counterparty: debt.counterparty,
          direction: debt.direction,
          amount: roundMoney(debt.amount),
          due_date: debt.due_date || null,
        })),
      }
    },
  }),

  tool({
    name: 'account_summary',
    domain: 'finance',
    tier: 2,
    description: 'Account names with live balances and this month’s tagged income and spend.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    run(args, ctx) {
      const now = nowOf(ctx)
      const data = ctx?.data || {}
      const rows = accountRows(data, now)
      return {
        accounts: rows.map((account) => ({
          name: account.name,
          kind: account.kind,
          balance: roundMoney(account.balance),
          income: roundMoney(account.income),
          spend: roundMoney(account.spend),
        })),
        totalInAccounts: roundMoney(totalInAccounts(data, now)),
      }
    },
  }),

  tool({
    name: 'plan_for',
    domain: 'planner',
    tier: 2,
    description: 'Planner entries for today, tomorrow or the current week.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        range: { type: 'string', enum: RANGES, default: 'today' },
      },
    },
    run(args, ctx) {
      const now = nowOf(ctx)
      const data = ctx?.data || {}
      const planner = data.planner || []

      if (args.range === 'week') {
        return {
          range: 'week',
          days: plannerWeek(planner, now).map((day) => ({
            date: day.date,
            day: day.day,
            entries: day.events.map((entry) => ({
              time: entry.time,
              title: entry.title,
              done: Boolean(entry.done),
            })),
          })),
        }
      }

      const date =
        args.range === 'tomorrow'
          ? toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))
          : toISODate(now)

      return {
        range: args.range,
        date,
        entries: entriesOn(planner, date).map((entry) => ({
          time: entry.start_time ? String(entry.start_time).slice(0, 5) : null,
          title: entry.title,
          tag: entry.tag || null,
          done: Boolean(entry.done),
        })),
      }
    },
  }),

  tool({
    name: 'open_tasks',
    domain: 'planner',
    tier: 2,
    description: 'Open tasks in due-date order with overdue flags.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    run(args, ctx) {
      const now = nowOf(ctx)
      const data = ctx?.data || {}
      const { open } = splitTasks(data.tasks || [], now)
      return {
        tasks: open.map((task) => ({
          title: task.title,
          tag: task.tag || null,
          due_date: task.due_date || null,
          due_time: task.due_time || null,
          priority: Boolean(task.priority),
          overdue: taskDueMeta(task, now).overdue,
        })),
      }
    },
  }),

  tool({
    name: 'study_hours',
    domain: 'learning',
    tier: 1,
    description: 'Study hours logged this week or this month.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        range: { type: 'string', enum: STUDY_RANGES, default: 'week' },
      },
    },
    run(args, ctx) {
      const now = nowOf(ctx)
      const data = ctx?.data || {}
      const sessions = data.sessions || []

      if (args.range === 'month') {
        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        let hours = 0
        for (const session of sessions) {
          if (String(session.studied_on || '').slice(0, 7) === key) {
            hours += Number(session.hours) || 0
          }
        }
        return { range: 'month', hours: round1(hours) }
      }

      return { range: 'week', hours: round1(weekHours(sessions, now)) }
    },
  }),

  tool({
    name: 'course_progress',
    domain: 'learning',
    tier: 2,
    description: 'Active courses with completed lesson counts, percent and next lesson.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    run(args, ctx) {
      const data = ctx?.data || {}
      return {
        courses: coursesTree(data).map((tree) => ({
          name: tree.name,
          done: tree.done,
          total: tree.total,
          pct: tree.pct,
          next_title: tree.next ? tree.next.title : null,
        })),
      }
    },
  }),

  tool({
    name: 'project_status',
    domain: 'projects',
    tier: 2,
    description: 'Projects with status, due date and overdue flag.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    run(args, ctx) {
      const now = nowOf(ctx)
      const data = ctx?.data || {}
      const projects = sortProjects(data.projects || [])
      const active = projects.filter((project) => project.status === 'active').length
      return {
        active,
        settled: projects.length - active,
        projects: projects.map((project) => ({
          title: project.title,
          status: project.status,
          due_date: project.due_date || null,
          overdue: isOverdue(project, now),
        })),
      }
    },
  }),

  tool({
    name: 'credits',
    domain: 'projects',
    tier: 1,
    description: 'Credit balance, open penalty count and whether new projects are locked.',
    parameters: { type: 'object', additionalProperties: false, properties: {} },
    run(args, ctx) {
      const data = ctx?.data || {}
      return {
        balance: creditBalance(data.penalties),
        openPenalties: openPenalties(data.penalties).length,
        locked: isLocked(data.penalties),
      }
    },
  }),

  tool({
    name: 'search_notes',
    domain: 'notes',
    tier: 2,
    description: 'Search notes by title or body text; returns title token, tag, important flag and date only.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        query: { type: 'string', default: '' },
      },
    },
    run(args, ctx) {
      const data = ctx?.data || {}
      const query = String(args.query || '').trim().toLowerCase()
      const notes = (data.notes || [])
        .filter((note) => {
          if (!query) return true
          const title = String(note.title || '').toLowerCase()
          const body = String(note.body || '').toLowerCase()
          return title.includes(query) || body.includes(query)
        })
        .slice(0, 20)
        .map((note) => ({
          title: note.title,
          tag: note.tag || null,
          important: Boolean(note.important),
          updated_at: note.updated_at || null,
        }))
      return { count: notes.length, notes }
    },
  }),
]

export function getTool(name) {
  return TOOLS.find((entry) => entry.name === name) || null
}

/* Public surface for Gemini: no run functions, no tier/domain internals. */
export function manifest(prefs = {}) {
  const domains = prefs.domains || {}
  return TOOLS.filter((entry) => (domains[entry.domain] || 'aggregates') !== 'off').map(
    (entry) => ({
      name: entry.name,
      description: entry.description,
      parameters: entry.parameters,
    }),
  )
}

/* Gemini will supply these args later, so treat every value as untrusted. */
export function validateArgs(toolDefinition, args) {
  const source = args && typeof args === 'object' && !Array.isArray(args) ? args : {}
  const properties = toolDefinition?.parameters?.properties || {}
  const out = {}

  for (const [key, spec] of Object.entries(properties)) {
    const value = source[key]
    if (value === undefined || value === null || value === '') {
      if (spec.default !== undefined) out[key] = spec.default
      continue
    }

    if (spec.type === 'string') {
      const text = String(value)
      if (Array.isArray(spec.enum) && !spec.enum.includes(text)) {
        if (spec.default !== undefined) out[key] = spec.default
        continue
      }
      out[key] = text.slice(0, 80)
      continue
    }

    if (spec.type === 'number' || spec.type === 'integer') {
      let number = Number(value)
      if (!Number.isFinite(number)) {
        if (spec.default !== undefined) out[key] = spec.default
        continue
      }
      if (spec.type === 'integer') number = Math.round(number)
      if (Number.isFinite(spec.minimum)) number = Math.max(spec.minimum, number)
      if (Number.isFinite(spec.maximum)) number = Math.min(spec.maximum, number)
      out[key] = number
      continue
    }

    if (spec.type === 'boolean') {
      out[key] = Boolean(value)
    }
  }

  return out
}
