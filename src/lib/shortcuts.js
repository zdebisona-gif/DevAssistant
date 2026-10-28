/*
 * Shortcut mode for Ask Zen-I.
 *
 * Each shortcut is a small, ordered set of fields. The user answers one field at a
 * time and the answers are handed to the *existing* buildProposal()/runAction()
 * pipeline, exactly like a parsed or AI-extracted action. There is no second
 * finance path here: this file only decides which fields to ask for and validates
 * each answer before it becomes part of the proposal.
 */

import { accountsFor, openDebts } from './accounts.js'
import { formatDateShort, toISODate, todayISO } from './analytics.js'
import { buildProposal } from './actions.js'
import { isISODate, parseNonNegative, parsePositive } from './validation.js'
import { MONEY_CATEGORIES, NOTE_TAGS, PLAN_TAGS } from '../data/constants.js'
import { money } from './format.js'

const addDays = (days) => {
  const date = new Date(`${todayISO()}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

function accountOptionField(key, question) {
  return {
    key,
    kind: 'choice',
    question,
    empty: 'No saved accounts yet. Add one in Finances, then come back.',
    options: (data) =>
      accountsFor(data).map((account) => ({ value: account.id, label: account.name })),
  }
}

function accountField(question) {
  return accountOptionField('account', question)
}

function transactionArgs(answers, type) {
  return {
    type,
    amount: answers.amount,
    merchant: answers.merchant,
    category: answers.category,
    account_id: answers.account,
    date: todayISO(),
  }
}

export const SHORTCUTS = [
  {
    id: 'expense',
    label: 'Expense',
    hint: 'Log money you spent',
    action: 'create_transaction',
    keywords: ['expense', 'expenses', 'spend', 'spending', 'purchase', 'bought'],
    fields: [
      {
        key: 'amount',
        kind: 'money',
        question: 'How much did you spend?',
        placeholder: 'e.g. 250',
        error: 'Please enter a valid amount.',
      },
      {
        key: 'merchant',
        kind: 'text',
        question: 'Who did you pay, and what for?',
        placeholder: 'e.g. Jollibee',
        error: 'Please enter a merchant or description.',
      },
      {
        key: 'category',
        kind: 'choice',
        question: 'Which category?',
        options: () => MONEY_CATEGORIES.map((category) => ({ value: category, label: category })),
      },
      accountField('Which account paid for it?'),
    ],
    buildArgs: (answers) => transactionArgs(answers, 'expense'),
  },
  {
    id: 'income',
    label: 'Income',
    hint: 'Log money you received',
    action: 'create_transaction',
    keywords: ['income', 'salary', 'sweldo', 'earn', 'earnings', 'received'],
    fields: [
      {
        key: 'amount',
        kind: 'money',
        question: 'How much was the income?',
        placeholder: 'e.g. 5000',
        error: 'Please enter a valid amount.',
      },
      {
        key: 'merchant',
        kind: 'text',
        question: 'Who or where did it come from?',
        placeholder: 'e.g. Salary',
        error: 'Please enter a source or payor.',
      },
      {
        key: 'category',
        kind: 'choice',
        question: 'Which category?',
        options: () => MONEY_CATEGORIES.map((category) => ({ value: category, label: category })),
      },
      accountField('Which account received it?'),
    ],
    buildArgs: (answers) => transactionArgs(answers, 'income'),
  },
  {
    id: 'transfer',
    label: 'Transfer',
    hint: 'Move money between accounts',
    action: 'create_transfer',
    keywords: [
      'transfer',
      'transfer balance',
      'move money',
      'move balance',
      'send money',
      'deposit to',
    ],
    fields: [
      accountOptionField('from', 'Which account is the money leaving?'),
      {
        key: 'to',
        kind: 'choice',
        question: 'Which account is it going into?',
        empty: 'Add a second account in Finances to transfer between them.',
        options: (data, answers) =>
          accountsFor(data)
            .filter((account) => account.id !== answers?.from)
            .map((account) => ({ value: account.id, label: account.name })),
      },
      {
        key: 'amount',
        kind: 'money',
        question: 'How much do you want to move?',
        placeholder: 'e.g. 1000',
        error: 'Please enter a valid amount.',
      },
      {
        key: 'fee',
        kind: 'money',
        optional: true,
        question: 'Is there a transfer fee?',
        placeholder: 'Leave empty for no fee',
        error: 'Please enter a valid fee.',
      },
    ],
    buildArgs: (answers) => ({
      from_id: answers.from,
      to_id: answers.to,
      amount: answers.amount,
      fee: answers.fee || 0,
      occurred_on: todayISO(),
    }),
  },
  {
    id: 'debt',
    label: 'Debt',
    hint: 'Track who owes whom',
    action: 'add_debt',
    keywords: ['debt', 'owes', 'owe', 'i owe', 'borrow', 'lend', 'utang'],
    fields: [
      {
        key: 'direction',
        kind: 'choice',
        question: 'Which way does this go?',
        options: () => [
          { value: 'owed_to_me', label: 'They owe me' },
          { value: 'i_owe', label: 'I owe them' },
        ],
      },
      {
        key: 'counterparty',
        kind: 'text',
        question: 'Who is it with?',
        placeholder: 'e.g. Ken',
        error: 'Please enter a name.',
        suggestions: (data) => [
          ...new Set((data?.debts || []).map((debt) => String(debt.counterparty || '').trim()).filter(Boolean)),
        ],
      },
      {
        key: 'amount',
        kind: 'money',
        question: 'How much?',
        placeholder: 'e.g. 500',
        error: 'Please enter a valid amount.',
      },
      {
        key: 'due',
        kind: 'date',
        optional: true,
        question: 'When is it due?',
        placeholder: 'today, tomorrow or 2026-11-01',
        options: () => [
          { value: 'none', label: 'No due date' },
          { value: todayISO(), label: 'Today' },
          { value: addDays(1), label: 'Tomorrow' },
        ],
      },
    ],
    buildArgs: (answers) => ({
      direction: answers.direction,
      counterparty: answers.counterparty,
      amount: answers.amount,
      due: answers.due || null,
    }),
  },
  {
    id: 'settle',
    label: 'Settle debt',
    hint: 'Record a payment on a debt',
    action: 'settle_debt',
    keywords: ['settle', 'settle debt', 'settlement', 'pay debt', 'repay', 'paid debt'],
    fields: [
      {
        key: 'debt',
        kind: 'choice',
        question: 'Which debt was paid?',
        empty: 'No open debts to settle.',
        options: (data) =>
          openDebts(data?.debts).map((debt) => ({
            value: debt.id,
            label: `${debt.counterparty} · ${money(debt.amount)} · ${
              debt.direction === 'i_owe' ? 'I owe' : 'owes me'
            }`,
          })),
      },
      {
        key: 'amount',
        kind: 'money',
        question: 'How much was paid?',
        placeholder: 'e.g. 500',
        error: 'Please enter a valid amount.',
      },
      accountField('Which account was used?'),
    ],
    buildArgs: (answers, data) => {
      const debt = (data?.debts || []).find((row) => row.id === answers.debt)
      return {
        debt_id: answers.debt,
        counterparty: debt?.counterparty,
        direction: debt?.direction,
        amount: answers.amount,
        account_id: answers.account,
      }
    },
  },
  {
    id: 'budget',
    label: 'Budget',
    hint: 'Set a monthly limit',
    action: 'create_budget',
    keywords: ['budget', 'limit'],
    fields: [
      {
        key: 'amount',
        kind: 'money',
        question: 'What monthly limit?',
        placeholder: 'e.g. 3000',
        error: 'Please enter a valid limit.',
      },
      {
        key: 'category',
        kind: 'choice',
        question: 'Which category?',
        options: () => MONEY_CATEGORIES.map((category) => ({ value: category, label: category })),
      },
    ],
    buildArgs: (answers) => ({ limit: answers.amount, category: answers.category }),
  },
  {
    id: 'reminder',
    label: 'Reminder',
    hint: 'Add a plan entry',
    action: 'create_planner_event',
    keywords: ['reminder', 'remind', 'remind me', 'plan', 'planner', 'task', 'schedule'],
    fields: [
      {
        key: 'title',
        kind: 'text',
        question: 'What should I remind you about?',
        placeholder: 'e.g. Pay Meralco bill',
        error: 'Please enter a title.',
      },
      {
        key: 'date',
        kind: 'date',
        question: 'When?',
        placeholder: 'today, tomorrow or 2026-11-01',
        options: () => [
          { value: todayISO(), label: 'Today' },
          { value: addDays(1), label: 'Tomorrow' },
        ],
      },
      {
        key: 'tag',
        kind: 'choice',
        question: 'Which tag?',
        options: () => PLAN_TAGS.map((tag) => ({ value: tag, label: tag })),
      },
    ],
    buildArgs: (answers) => ({ title: answers.title, date: answers.date, tag: answers.tag }),
  },
  {
    id: 'note',
    label: 'Note',
    hint: 'Save a note',
    action: 'create_note',
    keywords: ['note', 'notes', 'memo'],
    fields: [
      {
        key: 'title',
        kind: 'text',
        question: 'What should the note be called?',
        placeholder: 'e.g. SSS requirements',
        error: 'Please enter a title.',
      },
      {
        key: 'body',
        kind: 'text',
        optional: true,
        question: 'Anything to add inside it?',
        placeholder: 'A short body, or skip',
      },
      {
        key: 'tag',
        kind: 'choice',
        question: 'Which tag?',
        options: () => NOTE_TAGS.map((tag) => ({ value: tag, label: tag })),
      },
    ],
    buildArgs: (answers) => ({ title: answers.title, body: answers.body, tag: answers.tag }),
  },
  {
    id: 'balance',
    label: 'Account balance',
    hint: 'Adjust a saved account',
    action: 'adjust_account',
    keywords: ['balance', 'account balance', 'adjust balance', 'top up', 'withdraw'],
    fields: [
      accountField('Which account?'),
      {
        key: 'operation',
        kind: 'choice',
        question: 'What changed?',
        options: () => [
          { value: 'add', label: 'Add money' },
          { value: 'subtract', label: 'Take money out' },
          { value: 'set', label: 'Set exact balance' },
        ],
      },
      {
        key: 'amount',
        kind: 'money',
        question: 'How much?',
        placeholder: 'e.g. 1000',
        error: 'Please enter a valid amount.',
      },
    ],
    buildArgs: (answers, data) => ({
      account: accountsFor(data).find((row) => row.id === answers.account)?.name,
      amount: answers.amount,
      operation: answers.operation,
    }),
  },
]

const LEADING_WORDS = /^(?:please\s+)?(?:add|log|record|create|new|make|set|start|a|an|the)\s+/i

/** "Income", "add income", "LOG EXPENSE!" → the matching shortcut, or null. */
export function matchShortcut(text) {
  let value = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!value) return null
  for (let index = 0; index < 3; index += 1) value = value.replace(LEADING_WORDS, '')
  return SHORTCUTS.find((shortcut) => shortcut.keywords.includes(value)) || null
}

/** Resolve a param or shortcut id ("income", "expense") to a definition. */
export function findShortcut(value) {
  if (!value) return null
  return SHORTCUTS.find((shortcut) => shortcut.id === value) || matchShortcut(value)
}

function loose(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9&\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function shortcutOptions(field, data, answers) {
  if (!field?.options) return []
  return field.options(data, answers) || []
}

function resolveDate(raw, optional) {
  const value = String(raw ?? '').trim().toLowerCase()
  if (!value || value === 'none' || value === 'no due date' || value === 'no date') {
    return optional
      ? { ok: true, value: null }
      : { ok: false, error: 'Please choose a date.' }
  }
  let iso = null
  if (value === 'today' || value === 'tonight') iso = todayISO()
  else if (value === 'tomorrow') iso = addDays(1)
  else if (isISODate(value)) iso = value
  if (!iso) {
    return { ok: false, error: 'Use today, tomorrow, or a date like 2026-11-01.' }
  }
  if (iso < todayISO()) return { ok: false, error: 'Pick today or a later date.' }
  return { ok: true, value: iso }
}

/** Validate one answer in the shape the builders expect. */
export function validateShortcutAnswer(field, raw, data, answers) {
  if (field.kind === 'money') {
    const rawText = String(raw ?? '').trim()
    if (!rawText && field.optional) return { ok: true, value: 0 }
    /* Shortcut mode is deliberately strict: "5k" must not silently become 5. */
    if (!/^(?:php|p|₱|\$|€|£)?\s*\d[\d,]*(?:\.\d+)?$/i.test(rawText)) {
      return { ok: false, error: field.error || 'Please enter a valid amount.' }
    }
    const amount = field.optional ? parseNonNegative(rawText) : parsePositive(rawText)
    if (amount === null) return { ok: false, error: field.error || 'Please enter a valid amount.' }
    return { ok: true, value: amount }
  }

  if (field.kind === 'date') {
    const result = resolveDate(raw, Boolean(field.optional))
    if (!result.ok) return { ok: false, error: field.error || result.error }
    return result
  }

  if (field.kind === 'choice') {
    const options = shortcutOptions(field, data, answers)
    if (!options.length) {
      return { ok: false, error: field.empty || 'There is nothing to choose from yet.' }
    }
    const query = loose(raw)
    const match = options.find(
      (option) => loose(option.value) === query || loose(option.label) === query,
    )
    if (!match) {
      return {
        ok: false,
        error: `Please choose one of: ${options
          .slice(0, 4)
          .map((option) => option.label)
          .join(', ')}${options.length > 4 ? '…' : '.'}`,
      }
    }
    return { ok: true, value: match.value }
  }

  const value = String(raw ?? '').trim()
  if (!value && !field.optional) {
    return { ok: false, error: field.error || 'Please enter a value.' }
  }
  return { ok: true, value }
}

/** How an answered field reads back in the transcript. */
export function shortcutAnswerLabel(field, value, data) {
  if (value === undefined || value === null || value === '') {
    return field.kind === 'date' ? 'No due date' : 'Skipped'
  }
  if (field.kind === 'money') return money(value)
  if (field.kind === 'date') return formatDateShort(value)
  if (field.kind === 'choice') {
    const option = shortcutOptions(field, data).find((entry) => entry.value === value)
    return option?.label ?? String(value)
  }
  return String(value)
}

/** Re-check every answer against the current data before a proposal is built. */
export function validateShortcutAnswers(shortcut, answers, data) {
  if (!shortcut) return { ok: false, error: 'Pick a shortcut first.' }
  for (const field of shortcut.fields) {
    if (answers[field.key] === undefined) {
      return { ok: false, error: `Answer “${field.question}” first.`, fieldKey: field.key }
    }
    const result = validateShortcutAnswer(field, answers[field.key], data, answers)
    if (!result.ok) return { ...result, fieldKey: field.key }
  }
  return { ok: true }
}

/** Hand structured answers to the existing proposal builder. */
export function buildShortcutProposal(shortcut, answers, data) {
  if (!shortcut) return { ok: false, error: 'Pick a shortcut first.' }
  const checked = validateShortcutAnswers(shortcut, answers, data)
  if (!checked.ok) return checked
  return buildProposal(shortcut.action, shortcut.buildArgs(answers, data), data)
}
