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
import { MONEY_CATEGORIES, NOTE_TAGS, PLAN_TAGS } from '../data/constants.js'
import { money } from './format.js'
import {
  isISODate,
  normalizeTime,
  parsePositive,
  validateBudget,
  validateCourse,
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
  'add_course_unit',
  'complete_course_unit',
  'delete_course_unit',
  'create_project',
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
  ['Groceries', /grocer|supermarket|market|milk|egg|bread/],
  ['Food & Dining', /coffee|restaurant|lunch|dinner|breakfast|food|eat|cafe|pizza|snack/],
  ['Transport', /uber|grab|taxi|bus|train|fare|fuel|gas|petrol|parking/],
  ['Bills & Utilities', /bill|electric|water|internet|phone|rent|utilit|wifi/],
  ['Shopping', /shop|clothes|shoes|amazon|store/],
  ['Entertainment', /movie|cinema|netflix|game|concert/],
  ['Salary', /salary|paycheck|wage|income/],
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
}

function fieldLabel(key) {
  return FIELD_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

function buildCreateTransaction(args) {
  const income = args.type === 'income'
  const category =
    normalizeCategory(args.category) ||
    (income ? 'Salary' : categoryHint(args.merchant) || 'Other')
  const checked = validateTransaction({
    merchant: args.merchant,
    amount: args.amount,
    type: income ? 'income' : 'expense',
    category,
    account: args.account,
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
    summary: `Delete the ${row.merchant} transaction (${money(row.amount)})`,
    details: [{ label: 'Transaction', value: `${row.merchant} · ${money(row.amount)}` }],
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
    summary: `Add “${payload.title}” to ${formatDateShort(payload.entry_date)}${payload.start_time ? ` at ${payload.start_time.slice(0, 5)}` : ''}`,
    details: [
      { label: 'Title', value: payload.title },
      { label: 'Date', value: formatDateShort(payload.entry_date) },
      { label: 'Time', value: payload.start_time ? payload.start_time.slice(0, 5) : 'None' },
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
      value: value === null || value === undefined ? 'None' : String(value),
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
    total_units: args.units || args.total_units,
    completed_units: 0,
    weekly_target_hours: args.weekly_target || 0,
    next_label: args.next,
  })
  if (!checked.ok) return fail(checked.error)
  const payload = checked.payload
  return ok('create_course', 'local', {
    payload,
    summary: `Add the course “${payload.name}”`,
    details: [
      { label: 'Course', value: payload.name },
      { label: 'Total units', value: String(payload.total_units) },
      ...(payload.weekly_target_hours ? [{ label: 'Weekly target', value: `${payload.weekly_target_hours}h` }] : []),
    ],
  })
}

function resolveCourseNamed(data, query) {
  const active = (data.courses || []).filter((course) => course.active !== false)
  return resolveTarget(active, query, (course) => course.name)
}

function buildAddCourseUnit(args, data) {
  const found = resolveCourseNamed(data, args.course || args.target)
  if (!found.ok) return found
  const title = String(args.unit || args.title || '').trim()
  if (!title) return fail('Name the unit to add.')
  const position = (data.units || []).filter((unit) => unit.course_id === found.row.id).length
  return ok('add_course_unit', 'local', {
    payload: { course_id: found.row.id, title, position },
    summary: `Add the unit “${title}” to ${found.row.name}`,
    details: [
      { label: 'Course', value: found.row.name },
      { label: 'Unit', value: title },
    ],
  })
}

function resolveUnitNamed(data, courseId, query) {
  const units = (data.units || []).filter((unit) => unit.course_id === courseId)
  return resolveTarget(units, query, (unit) => unit.title)
}

function buildCompleteCourseUnit(args, data) {
  const course = resolveCourseNamed(data, args.course || args.target)
  if (!course.ok) return course
  const unit = resolveUnitNamed(data, course.row.id, args.unit || args.target)
  if (!unit.ok) return unit
  return ok('complete_course_unit', 'local', {
    target: { id: unit.row.id, label: unit.row.title },
    summary: `Mark “${unit.row.title}” complete in ${course.row.name}`,
    details: [
      { label: 'Course', value: course.row.name },
      { label: 'Unit', value: unit.row.title },
    ],
  })
}

function buildDeleteCourseUnit(args, data) {
  const course = resolveCourseNamed(data, args.course || args.target)
  if (!course.ok) return course
  const unit = resolveUnitNamed(data, course.row.id, args.unit || args.target)
  if (!unit.ok) return unit
  return ok('delete_course_unit', 'local', {
    target: { id: unit.row.id, label: unit.row.title },
    summary: `Delete the unit “${unit.row.title}” from ${course.row.name}`,
    details: [
      { label: 'Course', value: course.row.name },
      { label: 'Unit', value: unit.row.title },
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
        value: `${formatDateShort(payload.due_date)}${payload.due_time ? ` ${payload.due_time.slice(0, 5)}` : ''}`,
      },
      ...(payload.criteria ? [{ label: 'Passes when', value: payload.criteria }] : []),
    ],
  })
}

const BUILDERS = {
  create_transaction: (args) => buildCreateTransaction(args),
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
  add_course_unit: buildAddCourseUnit,
  complete_course_unit: buildCompleteCourseUnit,
  delete_course_unit: buildDeleteCourseUnit,
  create_project: (args) => buildCreateProject(args),
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

const SPEND_RE = /^(?:i\s+)?(?:spent|paid|bought)\s+(?:[$£€₱]\s*)?([\d.,]+)\s*(?:on|for|at)\s+(.+)$/i
const INCOME_RE = /^(?:i\s+)?(?:earned|received|got paid|was paid|got)\s+(?:[$£€₱]\s*)?([\d.,]+)\s*(?:from|for|on)?\s*(.*)$/i
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

  match = value.match(SPEND_RE) || value.match(ADD_TX_RE)
  if (match) {
    const income = /income/i.test(value)
    return buildProposal(
      'create_transaction',
      { amount: amountFrom(match[1]), merchant: cleanMerchant(match[2]) || 'Income', type: income ? 'income' : 'expense' },
      data,
    )
  }

  match = value.match(INCOME_RE)
  if (match) {
    return buildProposal(
      'create_transaction',
      { amount: amountFrom(match[1]), merchant: cleanMerchant(match[2]) || 'Income', type: 'income' },
      data,
    )
  }

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
export function buildActionContext() {
  return [
    `Today: ${todayISO()}`,
    `Allowed categories: ${MONEY_CATEGORIES.join(', ')}`,
    `Note tags: ${NOTE_TAGS.join(', ')}`,
    `Plan tags: ${PLAN_TAGS.join(', ')}`,
  ].join('\n')
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
    case 'add_course_unit':
      return services.createCourseUnit(proposal.payload)
    case 'complete_course_unit':
      return services.completeCourseUnit(proposal.target.id, true)
    case 'delete_course_unit':
      return services.deleteCourseUnit(proposal.target.id)
    case 'create_project':
      return services.createProject(proposal.payload)
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
  add_course_unit: 'Add unit',
  complete_course_unit: 'Complete unit',
  delete_course_unit: 'Delete unit',
  create_project: 'Add project',
}
