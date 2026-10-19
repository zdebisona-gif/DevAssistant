/*
 * Grounded Ask: every answer is computed from the user's own rows.
 * Pure functions — no network, no model. Same output shape the UI already renders:
 * { answer, breakdown, insight, followUps, sources, queriedAt }.
 */

import {
  MONTHS,
  budgetProgress,
  currentStreak,
  entriesOn,
  formatDateShort,
  isoWeek,
  todayISO,
  toISODate,
  totalsForMonth,
  totalsForPrevMonth,
  weekHours,
} from './analytics.js'
import { money } from './format.js'
import { creditBalance, dueMeta, openPenalties, sortProjects } from './projects.js'

const CATEGORY_KEYWORDS = [
  { key: 'Food & Dining', re: /food|dining|eat|restaurant|takeout|lunch|dinner/i },
  { key: 'Groceries', re: /grocer|supermarket/i },
  { key: 'Transport', re: /transport|gas|fuel|commute|taxi|ride|car\b/i },
  { key: 'Shopping', re: /shopping|shop\b|clothes|apparel/i },
  { key: 'Bills & Utilities', re: /bill|utilit|electric|water|internet|rent/i },
  { key: 'Entertainment', re: /entertain|netflix|movie|subscription|stream/i },
]

const round = (n) => Math.round(n * 100) / 100

function monthOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return { y: d.getFullYear(), m: d.getMonth() }
}

function categoryFromQuestion(question) {
  return CATEGORY_KEYWORDS.find((entry) => entry.re.test(question))?.key ?? null
}

function spendInMonth(transactions, category) {
  const now = new Date()
  let spend = 0
  let income = 0
  for (const tx of transactions) {
    const { y, m } = monthOf(tx.occurred_on)
    if (y !== now.getFullYear() || m !== now.getMonth()) continue
    if (category && tx.category !== category) continue
    const amount = Number(tx.amount) || 0
    if (amount < 0) spend += Math.abs(amount)
    else income += amount
  }
  return { spend: round(spend), income: round(income) }
}

function categoryBreakdown(transactions, limit = 5) {
  const now = new Date()
  const byCategory = new Map()
  for (const tx of transactions) {
    const { y, m } = monthOf(tx.occurred_on)
    if (y !== now.getFullYear() || m !== now.getMonth()) continue
    const amount = Number(tx.amount) || 0
    if (amount >= 0) continue
    byCategory.set(tx.category, (byCategory.get(tx.category) || 0) + Math.abs(amount))
  }
  return Array.from(byCategory.entries())
    .map(([label, value]) => ({ label, value: round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

function monthTokens(question) {
  return MONTHS.map((name, index) => ({ name, index })).filter(({ name }) =>
    new RegExp(`\\b${name}`, 'i').test(question),
  )
}

function spendForMonth(transactions, monthIndex) {
  const year = new Date().getFullYear()
  let spend = 0
  let income = 0
  for (const tx of transactions) {
    const { y, m } = monthOf(tx.occurred_on)
    if (y !== year || m !== monthIndex) continue
    const amount = Number(tx.amount) || 0
    if (amount < 0) spend += Math.abs(amount)
    else income += amount
  }
  return { spend: round(spend), income: round(income) }
}

function countByTag(entries) {
  const counts = new Map()
  for (const entry of entries) {
    const tag = entry.tag || 'Unsorted'
    counts.set(tag, (counts.get(tag) || 0) + 1)
  }
  return counts
}

function when(dateISO) {
  const today = todayISO()
  if (dateISO === today) return 'today'
  const tomorrow = toISODate(new Date(new Date().setDate(new Date().getDate() + 1)))
  if (dateISO === tomorrow) return 'tomorrow'
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long' })
}

function emptyResult(question) {
  return {
    answer:
      'I do not have any records to answer that yet. Add a note, a transaction, a plan entry, a project or a study session and ask again.',
    breakdown: [],
    insight: 'Zen-I answers only from your own records, so an empty app means an empty answer.',
    followUps: ['How much did I spend this month?', "What's on my plan today?", 'Any notes this week?'],
    sources: [],
    queriedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }
}

export function answerQuery(question, data) {
  const q = String(question || '')
  const {
    transactions = [],
    budgets = [],
    notes = [],
    sessions = [],
    planner = [],
    courses = [],
    projects = [],
    penalties = [],
  } = data || {}
  const hasAnything =
    transactions.length +
      budgets.length +
      notes.length +
      sessions.length +
      planner.length +
      courses.length +
      projects.length +
      penalties.length >
    0
  if (!hasAnything) return emptyResult(q)

  const stamp = { queriedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }

  // Projects — deadlines, credits and the lock. Checked before Plan, which also matches "week".
  if (/project|deliverable|deadline|overdue|\bdue\b|penalt|atonement|atone|credits|locked/i.test(q)) {
    if (!projects.length && !penalties.length) {
      return {
        answer: 'You have no projects yet. Add one with a deadline and I can track it against your credits.',
        breakdown: [],
        insight: 'Failing or missing a deadline forfeits credits until you write an atonement.',
        followUps: ['What is on my plan this week?'],
        sources: ['Projects'],
        ...stamp,
      }
    }
    const ordered = sortProjects(projects)
    const active = ordered.filter((project) => project.status === 'active')
    const settled = projects.length - active.length
    const balance = creditBalance(penalties)
    const open = openPenalties(penalties)
    const soonest = active[0]
    const next = soonest
      ? dueMeta(soonest).overdue
        ? ` “${soonest.title}” is overdue.`
        : ` Next up: “${soonest.title}”, due ${formatDateShort(soonest.due_date)}.`
      : ''
    return {
      answer: `${active.length} ${active.length === 1 ? 'project' : 'projects'} in progress, ${settled} settled.${next}`,
      breakdown: [
        { label: 'In progress', value: active.length, limit: Math.max(projects.length, 1) },
        { label: 'Settled', value: settled, limit: Math.max(projects.length, 1) },
      ],
      insight:
        open.length > 0
          ? `${open.length} open penalt${open.length === 1 ? 'y' : 'ies'} — new projects are locked until you atone. Credits: ${balance}.`
          : `Credits: ${balance}. No open penalties.`,
      followUps: ['Am I locked out of new projects?', 'What is on my plan this week?'],
      sources: ['Projects'],
      ...stamp,
    }
  }

  // Plan — today / tomorrow / a named day.
  if (/plan|schedul|calendar|tomorrow|today|agenda|week/i.test(q)) {
    const dateISO = /tomorrow/i.test(q)
      ? toISODate(new Date(new Date().setDate(new Date().getDate() + 1)))
      : todayISO()
    const entries = entriesOn(planner, dateISO)
    const counts = countByTag(entries)
    if (!entries.length) {
      return {
        answer: `Nothing is scheduled for ${when(dateISO)}. Your calendar is clear.`,
        breakdown: [],
        insight: `You have ${planner.length} plan ${planner.length === 1 ? 'entry' : 'entries'} in total.`,
        followUps: ['What is on my plan this week?', 'Add a plan entry'],
        sources: ['Planner'],
        ...stamp,
      }
    }
    const total = entries.length
    return {
      answer: `${when(dateISO)} you have ${total} ${total === 1 ? 'block' : 'blocks'}: ${entries
        .map((e) => `${e.title}${e.start_time ? ` (${String(e.start_time).slice(0, 5)})` : ''}`)
        .join(', ')}.`,
      breakdown: Array.from(counts.entries()).map(([label, value]) => ({ label, value, limit: total })),
      insight: `${entries.filter((e) => !e.done).length} of ${total} still open.`,
      followUps: ['What is on my plan this week?', 'Did I finish today?'],
      sources: ['Planner'],
      ...stamp,
    }
  }

  // Fastest-growing category.
  if (/fastest|grew|growth|rose|increase|trend/i.test(q)) {
    const current = categoryBreakdown(transactions, 50)
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const deltas = current
      .map((row) => {
        let prev = 0
        for (const tx of transactions) {
          const { y, m } = monthOf(tx.occurred_on)
          if (y !== prevMonth.getFullYear() || m !== prevMonth.getMonth()) continue
          if (tx.category !== row.label || Number(tx.amount) >= 0) continue
          prev += Math.abs(Number(tx.amount))
        }
        return { label: row.label, value: row.value, prev: round(prev), delta: round(row.value - prev) }
      })
      .filter((row) => row.delta > 0)
      .sort((a, b) => b.delta - a.delta)
    if (!deltas.length) {
      return {
        answer: 'No category grew this month — your spending is flat or down across the board.',
        breakdown: [],
        insight: 'Nice work. Nothing is trending upward.',
        followUps: ['Where did my money go this month?'],
        sources: ['Finances'],
        ...stamp,
      }
    }
    const top = deltas[0]
    return {
      answer: `${top.label} grew the most, up ${money(top.delta, 0)} versus last month.`,
      breakdown: deltas.slice(0, 4).map((row) => ({ label: row.label, value: row.value, limit: top.value })),
      insight: `It went from ${money(top.prev, 0)} to ${money(top.value, 0)} this month.`,
      followUps: [`How much did I spend on ${top.label}?`, 'Where did my money go this month?'],
      sources: ['Finances'],
      ...stamp,
    }
  }

  // Budget status.
  if (/budget|limit|left|remaining|overspend/i.test(q)) {
    const rows = budgetProgress(budgets, transactions)
    if (!rows.length) {
      return {
        answer: 'You have not set any budgets yet, so there is no limit to measure against.',
        breakdown: [],
        insight: 'Add a monthly limit per category in Money to track this.',
        followUps: ['Where did my money go this month?'],
        sources: ['Finances'],
        ...stamp,
      }
    }
    const totalLimit = rows.reduce((s, r) => s + r.limit, 0)
    const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
    const over = rows.filter((r) => r.spent > r.limit)
    return {
      answer:
        over.length > 0
          ? `You are over budget in ${over.length} ${over.length === 1 ? 'category' : 'categories'}: ${over
              .map((r) => r.category)
              .join(', ')}.`
          : `You are within budget everywhere. ${money(totalLimit - totalSpent, 0)} left of ${money(totalLimit, 0)} this month.`,
      breakdown: rows.slice(0, 5).map((r) => ({ label: r.category, value: round(r.spent), limit: r.limit })),
      insight:
        over.length > 0
          ? `${over[0].category} is ${money(over[0].spent - over[0].limit, 0)} over its limit.`
          : 'No category has crossed its limit.',
      followUps: ['Which category is closest to its limit?', 'Where did my money go this month?'],
      sources: ['Finances'],
      ...stamp,
    }
  }

  // Category-specific spend.
  const category = categoryFromQuestion(q)
  if (category) {
    const { spend } = spendInMonth(transactions, category)
    const total = spendInMonth(transactions, null).spend
    let prevCat = 0
    const prevMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
    for (const tx of transactions) {
      const { y, m } = monthOf(tx.occurred_on)
      if (y !== prevMonth.getFullYear() || m !== prevMonth.getMonth()) continue
      if (tx.category === category && Number(tx.amount) < 0) prevCat += Math.abs(Number(tx.amount))
    }
    const share = total > 0 ? Math.round((spend / total) * 100) : 0
    const delta = round(spend - prevCat)
    return {
      answer: `You spent ${money(spend, 0)} on ${category} this month — ${share}% of your total spend.`,
      breakdown: [{ label: category, value: spend, limit: Math.max(total, spend) }],
      insight:
        prevCat > 0
          ? `That is ${delta >= 0 ? 'up' : 'down'} ${money(Math.abs(delta), 0)} versus last month (${money(prevCat, 0)}).`
          : `Last month you spent ${money(prevCat, 0)} on ${category}.`,
      followUps: ['Where did my money go this month?', 'Which category grew the fastest?'],
      sources: ['Finances'],
      ...stamp,
    }
  }

  // Compare two named months.
  const tokens = monthTokens(q)
  if (/compare|versus|vs\b|difference|between/i.test(q) && tokens.length >= 2) {
    const [a, b] = tokens
    const first = spendForMonth(transactions, a.index)
    const second = spendForMonth(transactions, b.index)
    const diff = round(second.spend - first.spend)
    return {
      answer: `${a.name}: ${money(first.spend, 0)} spent, ${money(first.income, 0)} in. ${b.name}: ${money(second.spend, 0)} spent, ${money(second.income, 0)} in.`,
      breakdown: [
        { label: `${a.name} spend`, value: first.spend, limit: Math.max(first.spend, second.spend) },
        { label: `${b.name} spend`, value: second.spend, limit: Math.max(first.spend, second.spend) },
      ],
      insight: `${b.name} was ${diff >= 0 ? 'up' : 'down'} ${money(Math.abs(diff), 0)} versus ${a.name}.`,
      followUps: ['Where did my money go this month?', 'Which category grew the fastest?'],
      sources: ['Finances'],
      ...stamp,
    }
  }

  // Income / net.
  if (/income|salary|earn|net\b|balance/i.test(q)) {
    const { spend, income } = spendInMonth(transactions, null)
    const net = round(income - spend)
    return {
      answer: `This month you brought in ${money(income, 0)} and spent ${money(spend, 0)}, for a net of ${money(net, 0)}.`,
      breakdown: [
        { label: 'Income', value: income, limit: Math.max(income, spend) },
        { label: 'Spend', value: spend, limit: Math.max(income, spend) },
      ],
      insight: net >= 0 ? 'You are cash-flow positive this month.' : 'You spent more than you earned this month.',
      followUps: ['Where did my money go this month?', 'How is my budget doing?'],
      sources: ['Finances'],
      ...stamp,
    }
  }

  // Notes.
  if (/note|summar|wrote|writing/i.test(q)) {
    const weekStart = toISODate(new Date(new Date().setDate(new Date().getDate() - 7)))
    const recent = notes.filter((n) => (n.updated_at || '').slice(0, 10) >= weekStart)
    if (!notes.length) {
      return {
        answer: 'You have not written any notes yet.',
        breakdown: [],
        insight: 'Notes you capture will show up here and feed these answers.',
        followUps: ['What is on my plan today?'],
        sources: ['Notes'],
        ...stamp,
      }
    }
    const tags = new Map()
    for (const note of notes) tags.set(note.tag || 'Untagged', (tags.get(note.tag || 'Untagged') || 0) + 1)
    return {
      answer: `You have ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}${recent.length ? `, ${recent.length} updated in the last week` : ''}. Recent titles: ${notes
        .slice(0, 3)
        .map((n) => n.title)
        .join(', ')}.`,
      breakdown: Array.from(tags.entries())
        .slice(0, 4)
        .map(([label, value]) => ({ label, value, limit: notes.length })),
      insight: `Tags in use: ${Array.from(tags.keys()).slice(0, 5).join(', ')}.`,
      followUps: ['Any notes this week?', 'What is on my plan today?'],
      sources: ['Notes'],
      ...stamp,
    }
  }

  // Learning.
  if (/learn|study|streak|course|hours?|progress/i.test(q)) {
    const hours = weekHours(sessions)
    const streak = currentStreak(sessions)
    return {
      answer: `You have studied ${hours}h this week and your current streak is ${streak} ${streak === 1 ? 'day' : 'days'}.`,
      breakdown: courses.slice(0, 4).map((course) => ({
        label: course.name,
        value: course.completed_units || 0,
        limit: Math.max(course.total_units || 1, 1),
      })),
      insight: courses.length
        ? `${courses.length} course${courses.length === 1 ? '' : 's'} in progress.`
        : 'No courses tracked yet.',
      followUps: ['How many hours did I study this week?', 'What is on my plan today?'],
      sources: ['Learning'],
      ...stamp,
    }
  }

  // Total spend / where did my money go (default money question).
  if (/spend|spent|money|expense|cost|where|pay/i.test(q)) {
    const { spend } = totalsForMonth(transactions)
    const prev = totalsForPrevMonth(transactions).spend
    const rows = categoryBreakdown(transactions)
    if (!rows.length) {
      return {
        answer: `You have not logged any spending this month yet.`,
        breakdown: [],
        insight: `Total spend last month was ${money(prev, 0)}.`,
        followUps: ['How is my budget doing?', 'Any transactions this month?'],
        sources: ['Finances'],
        ...stamp,
      }
    }
    const top = rows[0]
    const delta = round(spend - prev)
    return {
      answer: `You spent ${money(spend, 0)} this month across ${rows.length} ${rows.length === 1 ? 'category' : 'categories'}. The biggest is ${top.label} at ${money(top.value, 0)}.`,
      breakdown: rows.map((row) => ({ label: row.label, value: row.value, limit: top.value })),
      insight:
        prev > 0
          ? `That is ${delta >= 0 ? 'up' : 'down'} ${money(Math.abs(delta), 0)} versus last month (${money(prev, 0)}).`
          : 'No spending recorded last month to compare against.',
      followUps: ['Which category grew the fastest?', 'How is my budget doing?'],
      sources: ['Finances'],
      ...stamp,
    }
  }

  // Fallback — honest summary of what exists.
  const summary = [
    `${transactions.length} transactions`,
    `${notes.length} notes`,
    `${planner.length} plan entries`,
    `${sessions.length} study sessions`,
    `${courses.length} courses`,
    `${projects.length} projects`,
  ].join(' · ')
  return {
    answer: `I can answer from what you have logged: ${summary}. Try asking about spending, your plan, projects, notes or study hours.`,
    breakdown: [],
    insight: `This is week ${isoWeek()}.`,
    followUps: [
      'How much did I spend this month?',
      "What's on my plan today?",
      'How many hours did I study this week?',
    ],
    sources: ['Finances', 'Notes', 'Planner', 'Learning', 'Projects'],
    ...stamp,
  }
}

/** Suggestion chips derived from what the user actually has. */
export function deriveSuggestions(data, count = 4) {
  const { transactions = [], notes = [], planner = [], sessions = [], projects = [] } = data || {}
  const out = []
  const now = new Date()
  const spentThisMonth = transactions.some((tx) => {
    const d = new Date(`${tx.occurred_on}T00:00:00`)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  if (spentThisMonth) {
    out.push('Where did my money go this month?')
    out.push('Which category grew the fastest?')
  }
  if (planner.length) out.push("What's on my plan today?")
  if (sessions.length) out.push('How many hours did I study this week?')
  if (notes.length) out.push('Summarize my recent notes')
  if (projects.length) out.push("What's due this week?")
  out.push('How is my budget doing?')
  return Array.from(new Set(out)).slice(0, count)
}
