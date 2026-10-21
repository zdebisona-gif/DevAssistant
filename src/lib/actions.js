/*
 * Natural-language actions (Stage 2).
 *
 * Flow: parse locally first → (optionally) ask the Gemini proxy to extract one
 * whitelisted action → build a *proposal* → the UI confirms it → runAction() calls the
 * existing useData() services. Nothing is written without confirmation, and the model
 * can only ever request an action from the allowlist.
 *
 * Targets for update/delete are resolved on-device against rows already in memory, so
 * record titles and ids never go to Gemini.
 */

import { budgetsForMonth, formatDateShort, toISODate, todayISO } from './analytics.js'
import { accountsFor, accountBalance, openDebts } from './accounts.js'
import { MONEY_CATEGORIES, NOTE_TAGS, PLAN_TAGS } from '../data/constants.js'
import { money, moneyAbs, formatClock12 } from './format.js'
import { courseLessons } from './learning.js'
import {
  isISODate,
  normalizeTime,
  parsePositive,
  validateBudget,
  validateCourse,
  validateDebt,
  validateNote,
  validatePlanEntry,
  validateProject,
  validateTransaction,
} from './validation.js'

export const ALLOWED_ACTIONS = [
  'create_transaction',
  'update_transaction',
  'delete_transaction',
  'create_budget',
  'update_budget',
  'create_planner_event',
  'update_planner_event',
  'delete_planner_event',
  'create_note',
  'update_note',
  'delete_note',
  'create_course',
  'add_lesson',
  'complete_lesson',
  'delete_lesson',
  'create_project',
  'adjust_account',
  'add_debt',
  'settle_debt',
  'delete_debt',
]

const ALLOWED = new Set(ALLOWED_ACTIONS)

export function isAllowedAction(action) {
  return ALLOWED.has(action)
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */

const pad = (n) => String(n).padStart(2, '0')

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanMerchant(value) {
  return String(value || '')
    .replace(/\s+(this|last)\s+(morning|afternoon|evening|night)$/i, '')
    .replace(/\s+(today|yesterday|tonight)$/i, '')
    .trim()
}

function amountFrom(raw) {
  const n = Number.parseFloat(String(raw || '').replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function dateFrom(word) {
  if (!word) return null
  const w = word.toLowerCase()
  if (isISODate(w)) return w
  const d = new Date()
  if (w === 'today' || w === 'tonight') return toISODate(d)
  if (w === 'tomorrow') {
    d.setDate(d.getDate() + 1)
    return toISODate(d)
  }
  if (w === 'yesterday') {
    d.setDate(d.getDate() - 1)
    return toISODate(d)
  }
  return null
}

function timeFrom(raw) {
  if (!raw) return null
  const t = String(raw).trim().toLowerCase().replace(/\s+/g, '')
  let match = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/)
  if (match) {
    let hours = Number(match[1])
    if (match[3] === 'pm' && hours < 12) hours += 12
    if (match[3] === 'am' && hours === 12) hours = 0
    if (hours > 23) return null
    return `${pad(hours)}:${match[2] || '00'}`
  }
  match = t.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (hours > 23 || minutes > 59) return null
    return `${pad(hours)}:${pad(minutes)}`
  }
  match = t.match(/^(\d{1,2})$/)
  if (match && Number(match[1]) <= 23) return `${pad(Number(match[1]))}:00`
  return null
}

const CATEGORY_HINTS = [
  ['Groceries', /grocer|supermarket|market|palengke|milk|egg|bread|rice|puregold|sm hyper|robinsons|landers|s&r|wet market/],
  [
    'Food & Dining',
    /coffee|restaurant|lunch|dinner|breakfast|merienda|food|eat|meal|cafe|pizza|snack|burger|jollibee|jolibee|mcdo|mcdonald|chowking|greenwich|jabee|shakey|kfc|wendy|mang inasal|inasal|foodpanda|grabfood|tokyo|samgyup|samgyeop|boba|milk tea|donut|dunkin|cinnabon|kanto|bulalo|silog|carenderia|carinderia/,
  ],
  ['Transport', /uber|grab|angkas|joyride|taxi|bus|train|lrt|mrt|jeep|jeepney|tricycle|trike|fare|fuel|gas|petrol|diesel|parking|toll|move it|moveit/],
  ['Bills & Utilities', /bill|electric|water|internet|phone|load|rent|utilit|wifi|meralco|maynilad|pldt|globe|smart|converge|pldc|postpaid|prepaid|subscription|insurance/],
  ['Shopping', /shop|shirt|clothes|shoes|amazon|store|lazada|shopee|zalora|electronics|gadget|phone case|uniqlo|decathlon|daiso|mr diy/],
  ['Entertainment', /movie|cinema|netflix|game|gaming|concert|spotify|steam|youtube|disney|ticket|bar|coffee date|videoke|karaoke/],
  ['Salary', /salary|paycheck|payroll|wage|income|sweldo|allowance|remittance/],
]

function categoryHint(text) {
  const value = String(text || '').toLowerCase()
  for (const [category, re] of CATEGORY_HINTS) {
    if (re.test(value)) return category
  }
  return null
}

export function normalizeCategory(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const exact = MONEY_CATEGORIES.find((category) => category.toLowerCase() === raw.toLowerCase())
  return exact || categoryHint(raw) || null
}

function normalizeTag(value, options, fallback) {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  return options.find((tag) => tag.toLowerCase() === raw.toLowerCase()) || fallback
}

export function looksLikeCommand(text) {
  const value = String(text || '').trim().toLowerCase()
  if (!value || value.endsWith('?')) return false
  if (/^(what|when|where|why|how|who|which|did|do|does|is|are|can|could|should|would|will|show|tell|list|give|find)\b/.test(value)) {
    return false
  }
  return true
}

/* ------------------------------------------------------------------ */
/* Target resolution (local only)                                      */
/* ------------------------------------------------------------------ */

function scoreMatch(query, text) {
  const q = normalize(query)
  const t = normalize(text)
  if (!q || !t) return 0
  if (q === t) return 100
  if (t.includes(q)) return 80
  if (q.includes(t)) return 60
  const tokens = new Set(t.split(' '))
  const hits = q.split(' ').filter((token) => tokens.has(token)).length
  return hits ? Math.round((hits / q.split(' ').length) * 50) : 0
}

function resolveTarget(rows, query, labelOf) {
  const scored = rows
    .map((row) => ({ row, score: scoreMatch(query, labelOf(row)) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  if (!scored.length) return { ok: false, error: `No match for “${query}”.` }
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    return { ok: false, error: `“${query}” matches more than one record. Be more specific.` }
  }
  return { ok: true, row: scored[0].row }
}

/* An account name is optional metadata on a transaction, so an ambiguous or unknown name
   falls back to free text instead of failing the whole action. Matching is word-bounded so
   "cash" never resolves to an account named "GCash". */
function bestAccount(data, query) {
  const raw = String(query || '').trim().replace(/^(?:my|the)\s+/i, '')
  const q = normalize(raw)
  if (!q) return null
  const rows = accountsFor(data)
  const exact = rows.find((row) => normalize(row.name) === q)
  if (exact) return exact
  if (q.length < 4) return null
  const word = new RegExp(`\\b${escapeRegExp(q)}\\b`)
  const hits = rows.filter((row) => word.test(normalize(row.name)))
  return hits.length === 1 ? hits[0] : null
}

/** "jollibee using gcash" → { merchant: 'Jollibee', account: <row|null> }. */
const ACCOUNT_SUFFIX = /\s+(?:using|from|via|through|paid with|with|in)\s+(?:my\s+)?(.+)$/i

function splitAccount(text, data) {
  const raw = String(text || '').trim()
  const match = raw.match(ACCOUNT_SUFFIX)
  if (!match) return { text: raw, account: null }
  const account = bestAccount(data, match[1])
  if (!account) return { text: raw, account: null }
  return { text: raw.slice(0, match.index).trim(), account }
}

/* ------------------------------------------------------------------ */
/* Money sentence parsing                                              */
/*                                                                     */
/* A single flexible pass for everyday logging phrases:               */
/*   "I paid 100 in jollibee using my cash"                           */
/*   "bought groceries 250 using bdo"                                 */
/*   "grab 220" / "coffee 50" / "salary 20000"                        */
/* The amount may sit anywhere; the account phrase is always removed  */
/* from the merchant, even when no saved account matches.             */
/* ------------------------------------------------------------------ */

const TIME_RE = /\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\bat\s+\d{1,2}:\d{2}\b/gi

const EXPENSE_VERB_RE = /\b(?:spent|spend|paid|pay|bought|buy|purchased|purchase|ordered|grabbed|used|got)\b/i
const INCOME_VERB_RE = /\b(?:earned|earn|received|receive|credited|salary|income|got\s+paid|was\s+paid|paid\s+me)\b/i

/* Words stripped from the merchant remainder: verbs, pronouns and connectors.
   "grab" is deliberately kept — it is usually the merchant (Grab). */
const MERCHANT_NOISE_RE =
  /\b(?:i|my|the|a|an|spent|spend|paid|pay|bought|buy|purchased|purchase|ordered|order|grabbed|used|use|got|was|were|earned|earn|received|receive|credited|salary|income|for|on|at|to|from|in|of|using|with|via|through|today|tonight|yesterday|last|night|morning|afternoon|evening|this)\b/gi

const RESERVED_LEAD_RE =
  /^(?:budget|note|plan|project|add|set|delete|remove|trash|remind|schedule|settle|clear|deposit|withdraw|subtract|deduct|top\s?up|log|record)\b/i

const CURRENCY_MARK_RE = /(?:₱|\$|€|£)|\b(?:php|pesos?)\b|\d\s*p\b/i

const ACCOUNT_KEYWORDS_RE =
  /\b(?:cash|gcash|g-?cash|maya|paymaya|grabpay|card|credit\s+card|debit\s+card|wallet|bdo|bpi|unionbank|metrobank|landbank|security\s+bank|rcbc|chinabank|coins?|bank|paypal|gotyme|seabank)/i

const ACCOUNT_PHRASE_RE =
  /\b(?:using|with|via|through|from|paid\s+with|in)\s+(?:my\s+|the\s+)?([a-z0-9-]+(?:\s+(?!(?:using|with|via|through|from|in|paid|my|the)\b)[a-z0-9-]+){0,2})/gi

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function removeRange(text, index, length) {
  return `${text.slice(0, index)} ${text.slice(index + length)}`.replace(/\s+/g, ' ').trim()
}

/* The first number that reads as money: currency-marked wins, else a standalone number.
   Times are removed by the caller first, and ISO/clock digits never match the bare form. */
function takeAmount(text) {
  const marked = text.match(
    /(?:₱|\$|€|£)\s*\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s*(?:pesos?|php|p(?![a-z0-9]))|\b(?:php|pesos?)\s*\d[\d,]*(?:\.\d{1,2})?/i,
  )
  if (marked) {
    const value = amountFrom(marked[0].replace(/[^\d.,]/g, ''))
    if (value) return { value, text: marked[0], index: marked.index }
  }
  const bare = text.match(/(?:^|\s)(\d[\d,]*(?:\.\d{1,2})?)(?=\s|$)/)
  if (bare) {
    const value = amountFrom(bare[1])
    if (value) return { value, text: bare[1], index: bare.index + bare[0].length - bare[1].length }
  }
  return null
}

/* A saved account name beats a keyword; either way the phrase leaves the merchant. */
function takeAccount(text, data) {
  let best = null
  for (const row of accountsFor(data)) {
    const name = String(row.name || '').trim()
    if (name.length < 2) continue
    const match = text.match(new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i'))
    if (match && (!best || match[0].length > best.length)) {
      best = { row, index: match.index, length: match[0].length }
    }
  }
  if (best) return { account: best.row, text: removeRange(text, best.index, best.length) }

  for (const match of text.matchAll(ACCOUNT_PHRASE_RE)) {
    const words = match[1].trim()
    if (ACCOUNT_KEYWORDS_RE.test(words)) {
      return { accountName: words, text: removeRange(text, match.index, match[0].length) }
    }
  }
  return { account: null, text }
}

function takeDate(text) {
  if (/\byesterday\b/i.test(text)) return dateFrom('yesterday')
  if (/\b\d{4}-\d{2}-\d{2}\b/.test(text)) return text.match(/\b\d{4}-\d{2}-\d{2}\b/)[0]
  if (/\b(?:today|tonight)\b|\blast\s+night\b|\bthis\s+(?:morning|afternoon|evening)\b/i.test(text)) {
    return dateFrom('today')
  }
  return null
}

function cleanMerchantText(text) {
  return String(text || '')
    .replace(MERCHANT_NOISE_RE, ' ')
    .replace(/[^\w\s&.'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseMoney(raw, data) {
  const text = String(raw || '').trim()
  if (!text || /\?$/.test(text)) return null

  const working = text.replace(TIME_RE, ' ')
  const amount = takeAmount(working)
  if (!amount) return null

  let rest = removeRange(working, amount.index, amount.text.length)
  const accountResult = takeAccount(rest, data)
  rest = accountResult.text
  const date = takeDate(rest)

  const income = INCOME_VERB_RE.test(text)
  const expense = EXPENSE_VERB_RE.test(text)
  const merchant = cleanMerchantText(rest)
  const hinted = categoryHint(`${merchant} ${text}`)

  if (!income && !expense) {
    /* No verb: only log when the sentence clearly reads as spending. */
    if (RESERVED_LEAD_RE.test(text)) return null
    if (!CURRENCY_MARK_RE.test(text) && !hinted) return null
  }
  if (!merchant && !income) return null

  return buildProposal(
    'create_transaction',
    {
      amount: amount.value,
      merchant: merchant || (income ? 'Income' : 'Expense'),
      type: income ? 'income' : 'expense',
      category: hinted || undefined,
      account: accountResult.account?.name ?? accountResult.accountName ?? undefined,
      account_id: accountResult.account?.id ?? null,
      date,
    },
    data,
  )
}

/* ------------------------------------------------------------------ */
/* Proposal builders                                                   */
/* ------------------------------------------------------------------ */

function ok(action, source, fields) {
  return { ok: true, proposal: { action, source, confidence: 'high', ...fields } }
}

function fail(error) {
  return { ok: false, error }
}

const FIELD_LABELS = {
  occurred_on: 'Date',
  entry_date: 'Date',
  start_time: 'Time',
  limit_amount: 'Monthly limit',
  counterparty: 'With',
}

function fieldLabel(key) {
  return FIELD_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

function buildCreateTransaction(args, data) {
  const income = args.type === 'income'
  const category =
    normalizeCategory(args.category) ||
    (income ? 'Salary' : categoryHint(args.merchant) || 'Other')
  const account = args.account_id
    ? accountsFor(data).find((row) => row.id === args.account_id) || null
    : bestAccount(data, args.account)
  const checked = validateTransaction({
    merchant: args.merchant,
    amount: args.amount,
    type: income ? 'income' : 'expense',
    category,
    account: account ? account.name : args.account,
    account_id: account ? account.id : null,
    occurred_on: args.date,
  })
  if (!checked.ok) return fail(checked.error)
  const payload = checked.payload
  return ok('create_transaction', 'local', {
    payload,
    summary: `Log ${payload.amount < 0 ? 'an expense' : 'income'} of ${money(Math.abs(payload.amount))} — ${payload.merchant}`,
    details: [
      { label: 'Type', value: payload.amount < 0 ? 'Expense' : 'Income' },
      { label: 'Amount', value: money(Math.abs(payload.amount)) },
      { label: 'Merchant', value: payload.merchant },
      { label: 'Category', value: payload.category },
      { label: 'Account', value: payload.account || 'None' },
      { label: 'Date', value: formatDateShort(payload.occurred_on) },
    ],
  })
}

function buildUpdateTransaction(args, data) {
  const found = resolveTarget(data.transactions, args.target, (row) => row.merchant)
  if (!found.ok) return found
  const row = found.row
  const patch = {}
  if (args.merchant) patch.merchant = String(args.merchant).trim()
  if (args.amount != null) {
    const amount = parsePositive(args.amount)
    if (!amount) return fail('Enter an amount greater than zero.')
    const income = args.type ? args.type === 'income' : Number(row.amount) > 0
    patch.amount = income ? amount : -amount
  }
  if (args.category) patch.category = normalizeCategory(args.category) || row.category
  if (args.date) {
    if (!isISODate(args.date)) return fail('Use a valid date.')
    patch.occurred_on = args.date
  }
  if (!Object.keys(patch).length) return fail('No new value was given.')
  return ok('update_transaction', 'local', {
    target: { id: row.id, label: row.merchant },
    payload: patch,
    summary: `Update the ${row.merchant} transaction`,
    details: Object.entries(patch).map(([key, value]) => ({
      label: fieldLabel(key),
      value: key === 'amount' ? money(Math.abs(value)) : String(value),
    })),
  })
}

function buildDeleteTransaction(args, data) {
  const found = resolveTarget(data.transactions, args.target, (row) => row.merchant)
  if (!found.ok) return found
  const row = found.row
  return ok('delete_transaction', 'local', {
    target: { id: row.id, label: row.merchant },
    summary: `Delete the ${row.merchant} transaction (${moneyAbs(row.amount)})`,
    details: [{ label: 'Transaction', value: `${row.merchant} · ${moneyAbs(row.amount)}` }],
    destructive: true,
  })
}

function buildCreateBudget(args) {
  const category = normalizeCategory(args.category) || 'Other'
  const checked = validateBudget({
    category,
    limit: args.limit,
    period: `${todayISO().slice(0, 7)}-01`,
  })
  if (!checked.ok) return fail(checked.error)
  return ok('create_budget', 'local', {
    payload: checked.payload,
    summary: `Set a ${money(checked.payload.limit_amount)} budget for ${category}`,
    details: [
      { label: 'Category', value: category },
      { label: 'Monthly limit', value: money(checked.payload.limit_amount) },
    ],
  })
}

function buildUpdateBudget(args, data) {
  const current = budgetsForMonth(data.budgets)
  const found = resolveTarget(current, args.target, (row) => row.category)
  if (!found.ok) return found
  const patch = {}
  if (args.limit != null) {
    const limit = parsePositive(args.limit)
    if (!limit) return fail('Enter a limit greater than zero.')
    patch.limit_amount = limit
  }
  if (args.category) patch.category = normalizeCategory(args.category) || found.row.category
  if (!Object.keys(patch).length) return fail('No new value was given.')
  return ok('update_budget', 'local', {
    target: { id: found.row.id, label: found.row.category },
    payload: patch,
    summary: `Update the ${found.row.category} budget`,
    details: Object.entries(patch).map(([key, value]) => ({
      label: fieldLabel(key),
      value: key === 'limit_amount' ? money(value) : String(value),
    })),
  })
}

function buildCreatePlanEntry(args) {
  const tag = normalizeTag(args.tag, PLAN_TAGS, 'Daily')
  const checked = validatePlanEntry({
    title: args.title,
    entry_date: args.date,
    time: args.time,
    tag,
  })
  if (!checked.ok) return fail(checked.error)
  const payload = checked.payload
  return ok('create_planner_event', 'local', {
    payload,
    summary: `Add “${payload.title}” to ${formatDateShort(payload.entry_date)}${payload.start_time ? ` at ${formatClock12(payload.start_time)}` : ''}`,
    details: [
      { label: 'Title', value: payload.title },
      { label: 'Date', value: formatDateShort(payload.entry_date) },
      { label: 'Time', value: payload.start_time ? formatClock12(payload.start_time) : 'None' },
      { label: 'Tag', value: payload.tag },
    ],
  })
}

function buildUpdatePlanEntry(args, data) {
  const found = resolveTarget(data.planner, args.target, (row) => row.title)
  if (!found.ok) return found
  const row = found.row
  const patch = {}
  if (args.title) patch.title = String(args.title).trim()
  if (args.date) {
    if (!isISODate(args.date)) return fail('Use a valid date.')
    patch.entry_date = args.date
  }
  if (args.time !== undefined) patch.start_time = normalizeTime(args.time)
  if (args.tag) patch.tag = normalizeTag(args.tag, PLAN_TAGS, row.tag)
  if (!Object.keys(patch).length) return fail('No new value was given.')
  return ok('update_planner_event', 'local', {
    target: { id: row.id, label: row.title },
    payload: patch,
    summary: `Update the “${row.title}” plan entry`,
    details: Object.entries(patch).map(([key, value]) => ({
      label: fieldLabel(key),
      value:
        value === null || value === undefined
          ? 'None'
          : key === 'start_time'
            ? formatClock12(value)
            : String(value),
    })),
  })
}

function buildDeletePlanEntry(args, data) {
  const found = resolveTarget(data.planner, args.target, (row) => row.title)
  if (!found.ok) return found
  const row = found.row
  return ok('delete_planner_event', 'local', {
    target: { id: row.id, label: row.title },
    summary: `Delete “${row.title}” on ${formatDateShort(row.entry_date)}`,
    details: [{ label: 'Plan entry', value: `${row.title} · ${formatDateShort(row.entry_date)}` }],
    destructive: true,
  })
}

function buildCreateNote(args) {
  const checked = validateNote({
    title: args.title,
    body: args.body,
    tag: normalizeTag(args.tag, NOTE_TAGS, 'Personal'),
  })
  if (!checked.ok) return fail(checked.error)
  const payload = checked.payload
  return ok('create_note', 'local', {
    payload,
    summary: `Save a note — “${payload.title}”`,
    details: [
      { label: 'Title', value: payload.title },
      { label: 'Tag', value: payload.tag },
      ...(payload.body ? [{ label: 'Body', value: payload.body }] : []),
    ],
  })
}

function buildUpdateNote(args, data) {
  const found = resolveTarget(data.notes, args.target, (row) => row.title)
  if (!found.ok) return found
  const row = found.row
  const patch = {}
  if (args.title) patch.title = String(args.title).trim()
  if (args.body) patch.body = String(args.body).trim()
  if (args.tag) patch.tag = normalizeTag(args.tag, NOTE_TAGS, row.tag)
  if (!Object.keys(patch).length) return fail('No new value was given.')
  return ok('update_note', 'local', {
    target: { id: row.id, label: row.title },
    payload: patch,
    summary: `Update the note “${row.title}”`,
    details: Object.entries(patch).map(([key, value]) => ({ label: fieldLabel(key), value: String(value) })),
  })
}

function buildDeleteNote(args, data) {
  const found = resolveTarget(data.notes, args.target, (row) => row.title)
  if (!found.ok) return found
  const row = found.row
  return ok('delete_note', 'local', {
    target: { id: row.id, label: row.title },
    summary: `Delete the note “${row.title}”`,
    details: [{ label: 'Note', value: row.title }],
    destructive: true,
  })
}

function buildCreateCourse(args) {
  const checked = validateCourse({
    name: args.name || args.title,
    description: args.description,
    weekly_target_hours: args.weekly_target || 0,
  })
  if (!checked.ok) return fail(checked.error)
  const payload = checked.payload
  return ok('create_course', 'local', {
    payload,
    summary: `Add the course “${payload.name}”`,
    details: [
      { label: 'Course', value: payload.name },
      ...(payload.description ? [{ label: 'Description', value: payload.description }] : []),
      ...(payload.weekly_target_hours
        ? [{ label: 'Weekly target', value: `${payload.weekly_target_hours}h` }]
        : []),
    ],
  })
}

function resolveCourseNamed(data, query) {
  const active = (data.courses || []).filter((course) => course.active !== false)
  return resolveTarget(active, query, (course) => course.name)
}

function modulesOf(data, courseId) {
  return (data.modules || [])
    .filter((mod) => mod.course_id === courseId)
    .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0))
}

function resolveLessonNamed(data, courseId, query) {
  const moduleIds = new Set(modulesOf(data, courseId).map((mod) => mod.id))
  const lessons = (data.lessons || []).filter((lesson) => moduleIds.has(lesson.module_id))
  return resolveTarget(lessons, query, (lesson) => lesson.title)
}

function buildAddLesson(args, data) {
  const found = resolveCourseNamed(data, args.course || args.target)
  if (!found.ok) return found
  const title = String(args.lesson || args.title || '').trim()
  if (!title) return fail('Name the lesson to add.')
  const module = modulesOf(data, found.row.id)[0] || null
  return ok('add_lesson', 'local', {
    target: { courseId: found.row.id, moduleId: module?.id ?? null },
    payload: { title, position: courseLessons(found.row.id, data).length },
    summary: `Add the lesson “${title}” to ${found.row.name}`,
    details: [
      { label: 'Course', value: found.row.name },
      { label: 'Lesson', value: title },
      { label: 'Module', value: module ? module.title : 'New “Lessons” module' },
    ],
  })
}

function buildCompleteLesson(args, data) {
  const course = resolveCourseNamed(data, args.course || args.target)
  if (!course.ok) return course
  const lesson = resolveLessonNamed(data, course.row.id, args.lesson || args.target)
  if (!lesson.ok) return lesson
  return ok('complete_lesson', 'local', {
    target: { id: lesson.row.id, label: lesson.row.title },
    summary: `Mark “${lesson.row.title}” complete in ${course.row.name}`,
    details: [
      { label: 'Course', value: course.row.name },
      { label: 'Lesson', value: lesson.row.title },
    ],
  })
}

function buildDeleteLesson(args, data) {
  const course = resolveCourseNamed(data, args.course || args.target)
  if (!course.ok) return course
  const lesson = resolveLessonNamed(data, course.row.id, args.lesson || args.target)
  if (!lesson.ok) return lesson
  return ok('delete_lesson', 'local', {
    target: { id: lesson.row.id, label: lesson.row.title },
    summary: `Delete the lesson “${lesson.row.title}” from ${course.row.name}`,
    details: [
      { label: 'Course', value: course.row.name },
      { label: 'Lesson', value: lesson.row.title },
    ],
    destructive: true,
  })
}

function buildCreateProject(args) {
  const title = String(args.title || args.name || '').trim()
  const checked = validateProject({
    title,
    brief: args.brief || title,
    criteria: args.criteria,
    due_date: args.due || args.date,
    due_time: args.time,
  })
  if (!checked.ok) return fail(checked.error)
  const payload = checked.payload
  return ok('create_project', 'local', {
    payload,
    summary: `Create the project “${payload.title}”`,
    details: [
      { label: 'Project', value: payload.title },
      { label: 'Brief', value: payload.brief },
      {
        label: 'Deadline',
        value: `${formatDateShort(payload.due_date)}${payload.due_time ? ` ${formatClock12(payload.due_time)}` : ''}`,
      },
      ...(payload.criteria ? [{ label: 'Passes when', value: payload.criteria }] : []),
    ],
  })
}

function buildAdjustAccount(args, data) {
  const found = resolveTarget(accountsFor(data), args.account || args.target, (row) => row.name)
  if (!found.ok) return found
  const account = found.row
  const amount = parsePositive(args.amount)
  if (!amount) return fail('Enter an amount greater than zero.')
  const operation = ['add', 'subtract', 'set'].includes(args.operation) ? args.operation : 'add'
  const current = accountBalance(account, data.transactions)
  const next = operation === 'set' ? amount : operation === 'add' ? current + amount : current - amount
  const verb = operation === 'set' ? 'Set' : operation === 'add' ? 'Add' : 'Take out'
  return ok('adjust_account', 'local', {
    target: { id: account.id, label: account.name },
    payload: { mode: operation, amount },
    summary:
      operation === 'set'
        ? `Set ${account.name} to ${money(amount)}`
        : `${verb} ${money(amount)} ${operation === 'add' ? 'to' : 'from'} ${account.name}`,
    details: [
      { label: 'Account', value: account.name },
      {
        label: 'Change',
        value: `${operation === 'add' ? '+' : operation === 'subtract' ? '−' : '='}${money(amount)}`,
      },
      { label: 'New balance', value: money(next) },
    ],
  })
}

function buildAddDebt(args) {
  const direction = args.direction === 'i_owe' ? 'i_owe' : 'owed_to_me'
  const checked = validateDebt({
    counterparty: args.counterparty || args.target,
    amount: args.amount,
    direction,
    due_date: args.due,
    note: args.note,
  })
  if (!checked.ok) return fail(checked.error)
  const payload = checked.payload
  return ok('add_debt', 'local', {
    payload,
    summary:
      payload.direction === 'i_owe'
        ? `You owe ${payload.counterparty} ${money(payload.amount)}`
        : `${payload.counterparty} owes you ${money(payload.amount)}`,
    details: [
      { label: 'With', value: payload.counterparty },
      { label: 'Direction', value: payload.direction === 'i_owe' ? 'I owe' : 'Owes me' },
      { label: 'Amount', value: money(payload.amount) },
      ...(payload.due_date ? [{ label: 'Due', value: formatDateShort(payload.due_date) }] : []),
      ...(payload.note ? [{ label: 'Note', value: payload.note }] : []),
    ],
  })
}

function buildSettleDebt(args, data) {
  const found = resolveTarget(openDebts(data.debts), args.counterparty || args.target, (row) => row.counterparty)
  if (!found.ok) return found
  const debt = found.row
  return ok('settle_debt', 'local', {
    target: { id: debt.id, label: debt.counterparty },
    summary: `Settle ${debt.direction === 'i_owe' ? 'what you owe' : 'what is owed to you by'} ${debt.counterparty} (${money(debt.amount)})`,
    details: [
      { label: 'With', value: debt.counterparty },
      { label: 'Direction', value: debt.direction === 'i_owe' ? 'I owe' : 'Owes me' },
      { label: 'Amount', value: money(debt.amount) },
    ],
  })
}

function buildDeleteDebt(args, data) {
  const found = resolveTarget(data.debts || [], args.counterparty || args.target, (row) => row.counterparty)
  if (!found.ok) return found
  const debt = found.row
  return ok('delete_debt', 'local', {
    target: { id: debt.id, label: debt.counterparty },
    summary: `Delete the ${debt.counterparty} debt (${money(debt.amount)})`,
    details: [{ label: 'Debt', value: `${debt.counterparty} · ${money(debt.amount)}` }],
    destructive: true,
  })
}

const BUILDERS = {
  create_transaction: (args, data) => buildCreateTransaction(args, data),
  update_transaction: buildUpdateTransaction,
  delete_transaction: buildDeleteTransaction,
  create_budget: (args) => buildCreateBudget(args),
  update_budget: buildUpdateBudget,
  create_planner_event: (args) => buildCreatePlanEntry(args),
  update_planner_event: buildUpdatePlanEntry,
  delete_planner_event: buildDeletePlanEntry,
  create_note: (args) => buildCreateNote(args),
  update_note: buildUpdateNote,
  delete_note: buildDeleteNote,
  create_course: (args) => buildCreateCourse(args),
  add_lesson: buildAddLesson,
  complete_lesson: buildCompleteLesson,
  delete_lesson: buildDeleteLesson,
  create_project: (args) => buildCreateProject(args),
  adjust_account: buildAdjustAccount,
  add_debt: (args) => buildAddDebt(args),
  settle_debt: buildSettleDebt,
  delete_debt: buildDeleteDebt,
}

export function buildProposal(action, args, data) {
  if (!isAllowedAction(action)) return fail('That action is not allowed.')
  const builder = BUILDERS[action]
  if (!builder) return fail('That action is not allowed.')
  return builder(args || {}, data || {})
}

/* ------------------------------------------------------------------ */
/* Local parsing                                                       */
/* ------------------------------------------------------------------ */

const ADD_TX_RE = /^(?:add|log|record)\s+(?:an?\s+)?(?:expense|transaction|purchase|income)\s+(?:of\s+)?(?:[$£€₱]\s*)?([\d.,]+)\s*(?:on|for|at|to)?\s*(.*)$/i

const BUDGET_RE = /^(?:set|add|create)\s+(?:a\s+)?budget\s+(?:of\s+)?(?:[$£€₱]\s*)?([\d.,]+)\s+(?:for|on)\s+(.+)$/i
const BUDGET_SHORT_RE = /^budget\s+(?:[$£€₱]\s*)?([\d.,]+)\s+(?:for|on)\s+(.+)$/i

const NOTE_RE = /^(?:add|create|make|write)\s+(?:a\s+)?note(?:\s+(?:called|titled|about))?\s*[:\-]?\s*(.+)$/i
const NOTE_COLON_RE = /^note\s*[:\-]\s*(.+)$/i

const PLAN_AT_RE = /^(?:add|schedule|plan|put)\s+(.+?)\s+(?:on|for|to)\s+(?:my\s+)?(?:plan|calendar|schedule)?\s*(today|tomorrow|tonight|\d{4}-\d{2}-\d{2})(?:\s+at\s+(.+))?$/i
const PLAN_TODAY_RE = /^(?:add|schedule|plan|put)\s+(.+?)\s+(today|tomorrow|tonight)(?:\s+at\s+(.+))?$/i
const REMIND_RE = /^remind me to\s+(.+?)(?:\s+(today|tomorrow|tonight))?(?:\s+at\s+(.+))?$/i

const DEL_NOTE_RE = /^(?:delete|remove|trash)\s+(?:the\s+)?note(?:\s+(?:called|titled|about))?\s+(.+)$/i
const DEL_PLAN_RE = /^(?:delete|remove|trash)\s+(?:the\s+)?(?:plan\s+entry|planner\s+entry|event|plan)\s+(?:called|titled|about)?\s*(.+)$/i
const DEL_TX_RE = /^(?:delete|remove|trash)\s+(?:the\s+)?(?:transaction|expense|payment)\s+(?:for|from|at)\s+(.+)$/i

const RENAME_NOTE_RE = /^(?:rename|change)\s+(?:the\s+)?note\s+(?:called\s+|titled\s+)?"?(.+?)"?\s+to\s+(.+)$/i
const UPDATE_BUDGET_RE = /^(?:change|update|set)\s+(?:the\s+)?budget\s+(?:for|on)\s+(.+?)\s+to\s+(?:[$£€₱]\s*)?([\d.,]+)$/i

const PROJECT_RE = /^(?:add|create|start|new)\s+(?:a\s+)?project\s+(?:called\s+|titled\s+)?(.+)$/i
const PROJECT_DUE_RE = /\s+due\s+(today|tomorrow|tonight|\d{4}-\d{2}-\d{2})\s*$/i

const OWES_ME_RE = /^(.+?)\s+owes\s+me\s+(?:[$£€₱]\s*)?([\d.,]+)(?:\s+(?:by|on|due)\s+(today|tomorrow|\d{4}-\d{2}-\d{2}))?$/i
const I_OWE_RE = /^i\s+owe\s+(.+?)\s+(?:[$£€₱]\s*)?([\d.,]+)(?:\s+(?:by|on|due)\s+(today|tomorrow|\d{4}-\d{2}-\d{2}))?$/i
const SETTLE_DEBT_RE = /^(?:settle|clear)\s+(?:up\s+)?(?:the\s+)?(?:debt\s+(?:with|from|for)\s+)?(.+?)(?:\s+debt)?$/i
const DELETE_DEBT_RE = /^(?:delete|remove|trash)\s+(?:the\s+)?debt\s+(?:with|from|for)\s+(.+)$/i

const ADJUST_ADD_RE = /^(?:add|deposit|put|top up)\s+(?:[$£€₱]\s*)?([\d.,]+)\s+(?:to|into|in)\s+(?:my\s+)?(.+)$/i
const ADJUST_SUB_RE = /^(?:subtract|deduct|withdraw|take out|remove)\s+(?:[$£€₱]\s*)?([\d.,]+)\s+(?:from|out of)\s+(?:my\s+)?(.+)$/i
const ADJUST_SET_RE = /^set\s+(?:my\s+)?(.+?)\s+(?:balance\s+)?to\s+(?:[$£€₱]\s*)?([\d.,]+)$/i

function splitTitleBody(rest) {
  const match = String(rest || '').match(/^(.+?)\s*:\s*(.+)$/)
  if (match) return { title: match[1].trim(), body: match[2].trim() }
  return { title: String(rest || '').trim(), body: '' }
}

/**
 * Deterministic parse for the most common commands. Returns a buildProposal result or
 * null when the text isn't a locally-recognised command.
 */
export function parseLocalAction(text, data) {
  const value = String(text || '').trim()
  if (!looksLikeCommand(value)) return null

  let match = value.match(BUDGET_RE) || value.match(BUDGET_SHORT_RE)
  if (match) {
    return buildProposal(
      'create_budget',
      { limit: amountFrom(match[1]), category: match[2] },
      data,
    )
  }

  match = value.match(NOTE_COLON_RE) || value.match(NOTE_RE)
  if (match) {
    const { title, body } = splitTitleBody(match[1])
    return buildProposal('create_note', { title, body, tag: 'Personal' }, data)
  }

  match = value.match(DEL_NOTE_RE)
  if (match) return buildProposal('delete_note', { target: match[1] }, data)

  match = value.match(DEL_PLAN_RE)
  if (match) return buildProposal('delete_planner_event', { target: match[1] }, data)

  match = value.match(DEL_TX_RE)
  if (match) return buildProposal('delete_transaction', { target: match[1] }, data)

  match = value.match(UPDATE_BUDGET_RE)
  if (match) {
    return buildProposal('update_budget', { target: match[1], limit: amountFrom(match[2]) }, data)
  }

  match = value.match(RENAME_NOTE_RE)
  if (match) {
    return buildProposal('update_note', { target: match[1], title: match[2] }, data)
  }

  match = value.match(OWES_ME_RE)
  if (match) {
    return buildProposal(
      'add_debt',
      { counterparty: match[1], amount: amountFrom(match[2]), direction: 'owed_to_me', due: dateFrom(match[3]) },
      data,
    )
  }

  match = value.match(I_OWE_RE)
  if (match) {
    return buildProposal(
      'add_debt',
      { counterparty: match[1], amount: amountFrom(match[2]), direction: 'i_owe', due: dateFrom(match[3]) },
      data,
    )
  }

  match = value.match(DELETE_DEBT_RE)
  if (match) return buildProposal('delete_debt', { counterparty: match[1] }, data)

  match = value.match(SETTLE_DEBT_RE)
  if (match) return buildProposal('settle_debt', { counterparty: match[1] }, data)

  match = value.match(ADJUST_SET_RE)
  if (match) {
    return buildProposal('adjust_account', { account: match[1], amount: amountFrom(match[2]), operation: 'set' }, data)
  }

  match = value.match(ADJUST_ADD_RE)
  if (match) {
    return buildProposal('adjust_account', { account: match[2], amount: amountFrom(match[1]), operation: 'add' }, data)
  }

  match = value.match(ADJUST_SUB_RE)
  if (match) {
    return buildProposal(
      'adjust_account',
      { account: match[2], amount: amountFrom(match[1]), operation: 'subtract' },
      data,
    )
  }

  match = value.match(PROJECT_RE)
  if (match) {
    let rest = match[1].trim()
    const dueMatch = rest.match(PROJECT_DUE_RE)
    if (dueMatch) rest = rest.slice(0, dueMatch.index).trim()
    const due = dueMatch ? dateFrom(dueMatch[1]) : null
    if (due) {
      const { title, body } = splitTitleBody(rest)
      return buildProposal('create_project', { title, brief: body || title, due }, data)
    }
    /* No deadline given — let the model resolve the date rather than guess today. */
    return null
  }

  match = value.match(PLAN_AT_RE) || value.match(PLAN_TODAY_RE) || value.match(REMIND_RE)
  if (match) {
    const date = dateFrom(match[2]) || todayISO()
    return buildProposal(
      'create_planner_event',
      { title: match[1].trim(), date, time: timeFrom(match[3]), tag: 'Daily' },
      data,
    )
  }

  match = value.match(ADD_TX_RE)
  if (match) {
    const income = /income/i.test(value)
    const { text: merchant, account } = splitAccount(cleanMerchant(match[2]), data)
    return buildProposal(
      'create_transaction',
      {
        amount: amountFrom(match[1]),
        merchant: merchant || (income ? 'Income' : 'Expense'),
        type: income ? 'income' : 'expense',
        account: account?.name,
        account_id: account?.id,
      },
      data,
    )
  }

  const money = parseMoney(value, data)
  if (money) return money

  return null
}

/** Turn a proxy extraction into a proposal; null if it isn't an action. */
export function buildExtractedProposal(extracted, data) {
  if (!extracted || extracted.action === 'none') return null
  const built = buildProposal(extracted.action, extracted.args || {}, data)
  if (!built.ok) return built
  built.proposal.source = 'ai'
  built.proposal.confidence = extracted.confidence === 'low' ? 'low' : 'high'
  return built
}

/** Non-private context for the extract-action prompt. */
export function buildActionContext(data) {
  const lines = [
    `Today: ${todayISO()}`,
    `Allowed categories: ${MONEY_CATEGORIES.join(', ')}`,
    `Note tags: ${NOTE_TAGS.join(', ')}`,
    `Plan tags: ${PLAN_TAGS.join(', ')}`,
    'Debt directions: owed_to_me (they owe the user), i_owe (the user owes them)',
    'Account operations: add, subtract, set',
  ]
  const accounts = accountsFor(data)
  if (accounts.length) lines.push(`Accounts the user has: ${accounts.map((row) => row.name).join(', ')}`)
  return lines.join('\n')
}

/* ------------------------------------------------------------------ */
/* Execution                                                           */
/* ------------------------------------------------------------------ */

/** Execute a confirmed proposal through the existing data services. */
export async function runAction(services, proposal) {
  switch (proposal.action) {
    case 'create_transaction':
      return services.createTransaction(proposal.payload)
    case 'update_transaction':
      return services.updateTransaction(proposal.target.id, proposal.payload)
    case 'delete_transaction':
      return services.deleteTransaction(proposal.target.id)
    case 'create_budget':
      return services.createBudget(proposal.payload)
    case 'update_budget':
      return services.updateBudget(proposal.target.id, proposal.payload)
    case 'create_planner_event':
      return services.createPlanEntry(proposal.payload)
    case 'update_planner_event':
      return services.updatePlanEntry(proposal.target.id, proposal.payload)
    case 'delete_planner_event':
      return services.deletePlanEntry(proposal.target.id)
    case 'create_note':
      return services.createNote(proposal.payload)
    case 'update_note':
      return services.updateNote(proposal.target.id, proposal.payload)
    case 'delete_note':
      return services.deleteNote(proposal.target.id)
    case 'create_course':
      return services.createCourse(proposal.payload)
    case 'add_lesson': {
      let moduleId = proposal.target?.moduleId
      if (!moduleId) {
        const created = await services.createModule({
          course_id: proposal.target.courseId,
          title: 'Lessons',
          description: '',
          position: 0,
        })
        moduleId = created?.id
      }
      return services.createLesson({ module_id: moduleId, ...proposal.payload })
    }
    case 'complete_lesson':
      return services.toggleLesson(proposal.target.id, true)
    case 'delete_lesson':
      return services.deleteLesson(proposal.target.id)
    case 'create_project':
      return services.createProject(proposal.payload)
    case 'adjust_account': {
      const { mode, amount } = proposal.payload
      if (mode === 'set') return services.reconcileAccount(proposal.target.id, amount)
      return services.adjustOpeningBalance(proposal.target.id, mode === 'subtract' ? -amount : amount)
    }
    case 'add_debt':
      return services.createDebt(proposal.payload)
    case 'settle_debt':
      return services.settleDebt(proposal.target.id, true)
    case 'delete_debt':
      return services.deleteDebt(proposal.target.id)
    default:
      throw new Error('That action is not allowed.')
  }
}

export const ACTION_LABELS = {
  create_transaction: 'Log transaction',
  update_transaction: 'Update transaction',
  delete_transaction: 'Delete transaction',
  create_budget: 'Set budget',
  update_budget: 'Update budget',
  create_planner_event: 'Add plan entry',
  update_planner_event: 'Update plan entry',
  delete_planner_event: 'Delete plan entry',
  create_note: 'Save note',
  update_note: 'Update note',
  delete_note: 'Delete note',
  create_course: 'Add course',
  add_lesson: 'Add lesson',
  complete_lesson: 'Complete lesson',
  delete_lesson: 'Delete lesson',
  create_project: 'Add project',
  adjust_account: 'Adjust balance',
  add_debt: 'Log debt',
  settle_debt: 'Settle debt',
  delete_debt: 'Delete debt',
}
