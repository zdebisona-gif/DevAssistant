/*
 * Pure weekly finance score. No React, no network.
 *
 * The score is a rolling four-week check-in, computed live from the same rows the
 * Money screen already reads. Nothing is stored: adding or editing a transaction,
 * budget, account or debt changes the next render.
 */

import { startOfWeek, toISODate, weekRangeLabel } from './analytics.js'
import { accountRows, debtTotals } from './accounts.js'

export const FINANCE_SCORE_WEIGHTS = [
  { key: 'savings_rate', label: 'Savings rate', max: 30 },
  { key: 'budget_adherence', label: 'Budget adherence', max: 30 },
  { key: 'debt_pressure', label: 'Debt pressure', max: 20 },
  { key: 'cash_buffer', label: 'Cash buffer', max: 20 },
]

const SAVINGS_TARGET = 0.2
const DEBT_INCOME_CAP = 6
const DEBT_ACCOUNT_CAP = 2
const BUFFER_TARGET_WEEKS = 8
const WINDOW_DAYS = 28

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function parseISO(value) {
  return new Date(`${value}T00:00:00`)
}

function isoDay(date) {
  return toISODate(date)
}

function eachDay(startISO, endISO) {
  const days = []
  const cursor = parseISO(startISO)
  const end = parseISO(endISO)
  while (cursor <= end) {
    days.push(isoDay(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function daysInMonth(iso) {
  const date = parseISO(iso)
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function inRange(iso, start, end) {
  return Boolean(iso) && iso >= start && iso <= end
}

function totalsInRange(transactions, start, end) {
  let income = 0
  let spend = 0
  for (const tx of transactions || []) {
    if (!inRange(String(tx.occurred_on || ''), start, end)) continue
    const amount = Number(tx.amount) || 0
    if (amount >= 0) income += amount
    else spend += Math.abs(amount)
  }
  return { income, spend }
}

function ratioLabel(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0'
  if (number > 0 && number < 0.1) return '<0.1'
  return number.toFixed(1).replace(/\.0$/, '')
}

/** Monday-Sunday week containing `ref`. */
export function weekBounds(ref = new Date()) {
  const start = startOfWeek(ref)
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
  return { start: isoDay(start), end: isoDay(end) }
}

/** The rolling window ending on `ref`, with both ends included. */
export function rollingWindow(ref = new Date(), days = WINDOW_DAYS) {
  const end = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  const start = new Date(end)
  start.setDate(start.getDate() - (days - 1))
  return { start: isoDay(start), end: isoDay(end), days }
}

export function financeWeekLabel(ref = new Date()) {
  return weekRangeLabel(ref)
}

export function financeScoreLabel(score) {
  const value = Number(score)
  if (!Number.isFinite(value)) return null
  if (value >= 80) return 'Strong'
  if (value >= 65) return 'Steady'
  if (value >= 50) return 'Tight'
  return 'At risk'
}

function savingsComponent(transactions, ref) {
  const window = rollingWindow(ref)
  const { income, spend } = totalsInRange(transactions, window.start, window.end)
  const base = {
    key: 'savings_rate',
    label: 'Savings rate',
    max: 30,
    rate: null,
    signal: 'No income logged in the last four weeks.',
  }
  if (income <= 0) return { ...base, points: null }

  const rate = (income - spend) / income
  const points = Math.round(clamp(rate / SAVINGS_TARGET, 0, 1) * base.max)
  const kept = Math.round(rate * 100)

  let signal = 'Spending outpaced income over the last four weeks.'
  if (rate > 0) signal = `Kept ${kept}% of income over four weeks.`
  else if (rate === 0) signal = 'Broke even over the last four weeks.'

  return { ...base, points, rate, signal }
}

function budgetComponent(budgets, transactions, ref) {
  const window = rollingWindow(ref)
  const days = eachDay(window.start, window.end)
  if (!days.length) {
    return {
      key: 'budget_adherence',
      label: 'Budget adherence',
      max: 30,
      points: null,
      signal: 'No budget window available.',
    }
  }

  const spendByDayCategory = new Map()
  for (const tx of transactions || []) {
    const date = String(tx.occurred_on || '')
    if (!inRange(date, window.start, window.end)) continue
    const amount = Number(tx.amount) || 0
    if (amount >= 0) continue
    const key = `${date}|${tx.category || ''}`
    spendByDayCategory.set(key, (spendByDayCategory.get(key) || 0) + Math.abs(amount))
  }

  const allowance = new Map()
  const spent = new Map()
  const monthLengths = new Map()

  for (const day of days) {
    const month = day.slice(0, 7)
    if (!monthLengths.has(month)) monthLengths.set(month, daysInMonth(day))
    const length = monthLengths.get(month)
    for (const budget of budgets || []) {
      if (String(budget.period || '').slice(0, 7) !== month) continue
      const limit = Number(budget.limit_amount) || 0
      if (limit <= 0) continue
      const category = budget.category || 'Uncategorised'
      allowance.set(category, (allowance.get(category) || 0) + limit / length)
      spent.set(
        category,
        (spent.get(category) || 0) + (spendByDayCategory.get(`${day}|${category}`) || 0),
      )
    }
  }

  if (!allowance.size) {
    return {
      key: 'budget_adherence',
      label: 'Budget adherence',
      max: 30,
      points: null,
      signal: 'No budgets set for the last four weeks.',
    }
  }

  let quality = 0
  let over = 0
  for (const [category, limit] of allowance) {
    const ratio = limit > 0 ? (spent.get(category) || 0) / limit : 0
    quality += ratio <= 1 ? 1 : clamp((1.5 - ratio) / 0.5, 0, 1)
    if (ratio > 1) over += 1
  }

  const categories = allowance.size
  const points = Math.round((quality / categories) * 30)
  const signal = over
    ? `${over} of ${categories} budgets over their four-week pace.`
    : `All ${categories} budgets within their four-week pace.`

  return {
    key: 'budget_adherence',
    label: 'Budget adherence',
    max: 30,
    points,
    signal,
    over,
    categories,
  }
}

function debtComponent(data, transactions, ref) {
  const { iOwe } = debtTotals(data?.debts)
  const base = {
    key: 'debt_pressure',
    label: 'Debt pressure',
    max: 20,
    ratio: 0,
    basis: null,
  }

  if (iOwe <= 0) return { ...base, points: 20, signal: 'No money owed.' }

  const window = rollingWindow(ref)
  const { income } = totalsInRange(transactions, window.start, window.end)
  let ratio
  let basis

  if (income > 0) {
    ratio = iOwe / income
    basis = 'income'
  } else {
    const accounts = accountRows(data, ref)
    const total = accounts.reduce((sum, account) => sum + account.balance, 0)
    if (total <= 0) {
      return {
        ...base,
        points: 0,
        ratio: null,
        signal: 'Debt is open and no income or account balance is logged.',
      }
    }
    ratio = iOwe / total
    basis = 'accounts'
  }

  const cap = basis === 'income' ? DEBT_INCOME_CAP : DEBT_ACCOUNT_CAP
  const points = Math.round(clamp(1 - ratio / cap, 0, 1) * base.max)
  const signal =
    basis === 'income'
      ? `Debt is ${ratioLabel(ratio)}x four-week income.`
      : `Debt is ${ratioLabel(ratio)}x account balances.`

  return { ...base, points, ratio, basis, signal }
}

function bufferComponent(data, transactions, ref) {
  const accounts = accountRows(data, ref)
  const base = {
    key: 'cash_buffer',
    label: 'Cash buffer',
    max: 20,
    runway: null,
  }

  if (!accounts.length) {
    return { ...base, points: null, signal: 'No accounts tracked.' }
  }

  const window = rollingWindow(ref)
  const { spend } = totalsInRange(transactions, window.start, window.end)
  const weeklySpend = spend / (WINDOW_DAYS / 7)
  if (weeklySpend <= 0) {
    return { ...base, points: null, signal: 'Not enough spending history yet.' }
  }

  const total = accounts.reduce((sum, account) => sum + account.balance, 0)
  const runway = Math.max(0, total) / weeklySpend
  const points = Math.round(clamp(runway / BUFFER_TARGET_WEEKS, 0, 1) * base.max)
  let signal = `About ${ratioLabel(runway)} weeks of spending covered.`
  if (runway >= BUFFER_TARGET_WEEKS) signal = 'At least eight weeks of spending covered.'
  else if (runway < 1) signal = 'Less than one week of spending covered.'

  return { ...base, points, runway, signal }
}

function summarise(components, score) {
  if (score === null) return 'Add income, a budget, or an account to build your score.'

  const available = components.filter((component) => component.points !== null)
  const missing = components.filter((component) => component.points === null)
  const weakest = [...available].sort(
    (a, b) => a.points / a.max - b.points / b.max,
  )[0]
  const missingLabel = missing
    .map((component) => component.label.toLowerCase())
    .join(' and ')
  const missingNote = missing.length
    ? `${missingLabel.charAt(0).toUpperCase()}${missingLabel.slice(1)} not scored. `
    : ''

  if (!weakest || weakest.points / weakest.max >= 0.8) {
    const steady = missing.length
      ? 'Other available areas are steady over the last four weeks.'
      : 'All four areas are steady over the last four weeks.'
    return `${missingNote}${steady}`
  }
  return `${missingNote}Focus on ${weakest.label.toLowerCase()}. ${weakest.signal}`
}

/**
 * The current weekly check-in. A score needs at least two available components;
 * missing components are left out and the remaining weights are renormalised.
 */
export function financeScore(data, ref = new Date()) {
  const transactions = data?.transactions || []
  const components = [
    savingsComponent(transactions, ref),
    budgetComponent(data?.budgets, transactions, ref),
    debtComponent(data, transactions, ref),
    bufferComponent(data, transactions, ref),
  ]

  const available = components.filter((component) => component.points !== null)
  const totalWeight = available.reduce((sum, component) => sum + component.max, 0)
  const earned = available.reduce((sum, component) => sum + component.points, 0)
  const score =
    available.length >= 2 && totalWeight > 0
      ? Math.round((earned / totalWeight) * 100)
      : null

  const week = weekBounds(ref)
  const window = rollingWindow(ref)

  return {
    score,
    label: financeScoreLabel(score),
    breakdown: Object.fromEntries(
      components.map((component) => [component.key, component.points]),
    ),
    components,
    available: available.length,
    provisional: available.length > 0 && available.length < components.length,
    summary: summarise(components, score),
    week,
    window,
    weekLabel: financeWeekLabel(ref),
  }
}

/*
 * Weekly checkpoints, oldest first, ending with the current week-to-date.
 * Flow components (savings, budgets) are recalculated per checkpoint; account and
 * debt balances are current stocks, since the app does not store historical balances.
 */
export function financeScoreHistory(data, weeks = 8, ref = new Date()) {
  const currentStart = startOfWeek(ref)
  const history = []

  for (let offset = weeks - 1; offset >= 0; offset -= 1) {
    const start = new Date(
      currentStart.getFullYear(),
      currentStart.getMonth(),
      currentStart.getDate() - offset * 7,
    )
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    const checkpoint = offset === 0 ? ref : end
    const result = financeScore(data, checkpoint)
    history.push({
      weekStart: isoDay(start),
      weekEnd: isoDay(end),
      label: weekRangeLabel(start),
      score: result.score,
      verdict: result.label,
    })
  }

  return history
}

export function financeScoreDelta(history) {
  if (!Array.isArray(history) || history.length < 2) return null
  const current = history[history.length - 1]?.score
  const previous = history[history.length - 2]?.score
  if (current === null || previous === null) return null
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null
  return current - previous
}

/**
 * Safe aggregate context for an optional Gemini explanation. Currency values,
 * merchant names, account names and individual rows never leave the device.
 */
export function financeScoreContext(result, options = {}) {
  if (!result || result.score === null) return 'Finance score: not enough data yet.'

  const lines = [
    `Weekly finance score: ${result.score}/100 (${result.label}), rolling four weeks.`,
    `Window: ${result.window.start} to ${result.window.end}.`,
  ]

  for (const component of result.components) {
    const points =
      component.points === null ? 'unavailable' : `${component.points}/${component.max}`
    lines.push(`${component.label}: ${points}.`)
  }

  const byKey = Object.fromEntries(result.components.map((component) => [component.key, component]))
  if (byKey.savings_rate?.points !== null) {
    lines.push(`Savings detail: ${byKey.savings_rate.signal}`)
  }
  if (byKey.budget_adherence?.points !== null) {
    lines.push(`Budget detail: ${byKey.budget_adherence.signal}`)
  }
  if (byKey.debt_pressure?.points !== null && !options.hidden) {
    const fallbackHidden =
      options.accountsHidden && byKey.debt_pressure.basis === 'accounts'
    if (!fallbackHidden) lines.push(`Debt detail: ${byKey.debt_pressure.signal}`)
  }
  if (
    byKey.cash_buffer?.points !== null &&
    !options.hidden &&
    !options.accountsHidden
  ) {
    lines.push(`Buffer detail: ${byKey.cash_buffer.signal}`)
  }

  return lines.join('\n').slice(0, 4000)
}

export function totalsAllTime(transactions = []) {
  let income = 0
  let spend = 0
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0
    if (amount >= 0) income += amount
    else spend += Math.abs(amount)
  }
  return { income, spend, net: income - spend }
}

function daysBetween(startISO, endISO) {
  if (!startISO || !endISO) return null
  const start = parseISO(startISO)
  const end = parseISO(endISO)
  const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24))
  return diff
}

export function goalProgress(goal, transactions = [], ref = new Date()) {
  if (!goal) return null
  const target = Number(goal.target_amount) || 0
  const dueISO = goal.due_date
  const { net } = totalsAllTime(transactions)
  const currentSaved = net > 0 ? net : 0
  const progress = target > 0 ? Math.min(1, currentSaved / target) : 0
  const remaining = Math.max(0, target - currentSaved)
  const todayISO = isoDay(ref)
  const daysTotal = daysBetween(todayISO, dueISO)
  const daysRemaining = daysTotal == null ? null : daysTotal

  const cadence = goal?.target_cadence || 'monthly'
  const isShortTerm = daysRemaining != null && daysRemaining >= 0 && daysRemaining <= 30
  let monthsRemaining = null
  if (daysRemaining != null && daysRemaining > 30) {
    monthsRemaining = daysRemaining / 30.44
  } else if (daysRemaining != null && daysRemaining === 0) {
    monthsRemaining = 0
  }
  const requiredMonthly = !isShortTerm && monthsRemaining && monthsRemaining > 0 ? remaining / monthsRemaining : null
  const requiredDaily = daysRemaining != null && daysRemaining > 0 ? remaining / daysRemaining : null
  const requiredWeekly = daysRemaining != null && daysRemaining > 0 ? (remaining / daysRemaining) * 7 : null

  let onTrack = null
  if (target <= 0) {
    onTrack = null
  } else if (currentSaved >= target) {
    onTrack = true
  } else if (daysRemaining != null && daysRemaining <= 0) {
    onTrack = false
  } else {
    const window = rollingWindow(ref)
    const recent = totalsInRange(transactions, window.start, window.end)
    const recentNet = recent.income - recent.spend
    if (cadence === 'daily' && daysRemaining > 0 && requiredDaily && requiredDaily > 0) {
      const recentNetPerDay = recentNet > 0 ? recentNet / WINDOW_DAYS : 0
      onTrack = recentNetPerDay >= requiredDaily * 0.9
    } else if (cadence === 'weekly' && daysRemaining > 0 && requiredWeekly && requiredWeekly > 0) {
      const recentNetPerWeek = recentNet > 0 ? (recentNet / WINDOW_DAYS) * 7 : 0
      onTrack = recentNetPerWeek >= requiredWeekly * 0.9
    } else if (cadence === 'monthly' && requiredMonthly && requiredMonthly > 0) {
      const recentNetPerMonth = recentNet > 0 ? recentNet * (30 / WINDOW_DAYS) : 0
      onTrack = recentNetPerMonth >= requiredMonthly * 0.9
    } else if (daysRemaining > 0 && requiredDaily && requiredDaily > 0 && isShortTerm) {
      const recentNetPerDay = recentNet > 0 ? recentNet / WINDOW_DAYS : 0
      onTrack = recentNetPerDay >= requiredDaily * 0.9
    } else if (requiredMonthly && requiredMonthly > 0) {
      const recentNetPerMonth = recentNet > 0 ? recentNet * (30 / WINDOW_DAYS) : 0
      onTrack = recentNetPerMonth >= requiredMonthly * 0.9
    } else {
      onTrack = null
    }
  }

  const guidance = []
  if (currentSaved >= target) {
    guidance.push('Target reached!')
  } else if (onTrack === false) {
    if (cadence === 'daily' && requiredDaily && requiredDaily > 0) {
      guidance.push(daysRemaining === 1 ? `Need to save ~${Math.ceil(requiredDaily)} today.` : `Need to save ~${Math.ceil(requiredDaily)} per day.`)
    } else if (cadence === 'weekly' && requiredWeekly && requiredWeekly > 0) {
      guidance.push(`Need to save ~${Math.ceil(requiredWeekly)} per week.`)
    } else if (cadence === 'monthly' && requiredMonthly && requiredMonthly > 0) {
      guidance.push(`Need to save ~${Math.ceil(requiredMonthly)} per month to reach your target by ${dueISO}.`)
    } else if (requiredDaily && requiredDaily > 0 && daysRemaining <= 7) {
      guidance.push(`Need to save ~${Math.ceil(requiredDaily)} per day.`)
    } else if (requiredWeekly && requiredWeekly > 0 && daysRemaining <= 60) {
      guidance.push(`Need to save ~${Math.ceil(requiredWeekly)} per week.`)
    } else if (requiredMonthly && requiredMonthly > 0) {
      guidance.push(`Need to save ~${Math.ceil(requiredMonthly)} per month to reach your target by ${dueISO}.`)
    } else if (requiredDaily && requiredDaily > 0) {
      guidance.push(`Need to save ~${Math.ceil(requiredDaily)} per day.`)
    }
  } else if (onTrack === true && currentSaved < target) {
    guidance.push('On track based on your recent savings rate.')
  }

  return {
    goal,
    target,
    currentSaved,
    progress,
    progressPct: Math.round(progress * 100),
    remaining,
    dueISO,
    todayISO,
    daysRemaining,
    monthsRemaining,
    requiredMonthly,
    requiredDaily,
    requiredWeekly,
    onTrack,
    guidance,
  }
}
