import { test } from 'node:test'
import assert from 'node:assert/strict'

import { runTool, TOOLS, getTool, manifest, validateArgs } from '../index.js'
import { applyHidden, createPseudonymizer } from '../privacy.js'
import {
  budgetProgress,
  toISODate,
  totalsForMonth,
  totalsForPrevMonth,
  weekHours,
} from '../../analytics.js'
import {
  accountRows,
  debtTotals,
  openDebts,
  totalInAccounts,
} from '../../accounts.js'
import { buildFinanceContext } from '../../context.js'
import { financeScore, weekBounds } from '../../finance.js'
import { creditBalance } from '../../projects.js'

const NOW = new Date('2026-11-08T12:00:00')

const IDS = {
  gcash: 'aaaaaaaa-1111-4111-8111-111111111111',
  bdo: 'bbbbbbbb-2222-4222-8222-222222222222',
  tx: 'cccccccc-3333-4333-8333-333333333333',
  note: 'dddddddd-4444-4444-8444-444444444444',
  course: 'eeeeeeee-5555-4555-8555-555555555555',
  module: 'ffffffff-6666-4666-8666-666666666666',
  lesson: '99999999-7777-4777-8777-777777777777',
  project: '12121212-8888-4888-8888-888888888888',
  debt: '34343434-9999-4999-8999-999999999999',
  planner: '56565656-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  task: '78787878-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  session: '90909090-cccc-4ccc-8ccc-cccccccccccc',
}

const NOTE_BODY = 'My password is hunter2 and my account number is 1234567890. Last4 4242.'

function fixture() {
  return {
    accounts: [
      { id: IDS.gcash, name: 'GCash', kind: 'gcash', opening_balance: 1000, position: 0 },
      { id: IDS.bdo, name: 'BDO', kind: 'bdo', opening_balance: 5000, position: 1 },
    ],
    transactions: [
      {
        id: IDS.tx,
        occurred_on: '2026-11-08',
        merchant: 'Jollibee',
        category: 'Food & Dining',
        account: 'GCash',
        account_id: IDS.gcash,
        amount: -250,
      },
      {
        id: `${IDS.tx}-2`,
        occurred_on: '2026-11-07',
        merchant: 'SM',
        category: 'Groceries',
        account: 'GCash',
        account_id: IDS.gcash,
        amount: -750,
      },
      {
        id: `${IDS.tx}-3`,
        occurred_on: '2026-11-03',
        merchant: 'Jollibee',
        category: 'Food & Dining',
        account: 'GCash',
        account_id: IDS.gcash,
        amount: -300,
      },
      {
        id: `${IDS.tx}-4`,
        occurred_on: '2026-11-01',
        merchant: 'Salary',
        category: 'Salary',
        account: 'BDO',
        account_id: IDS.bdo,
        amount: 8000,
      },
      {
        id: `${IDS.tx}-5`,
        occurred_on: '2026-10-15',
        merchant: 'Jollibee',
        category: 'Food & Dining',
        account: 'GCash',
        account_id: IDS.gcash,
        amount: -300,
      },
    ],
    budgets: [
      { id: `${IDS.tx}-b1`, category: 'Food & Dining', limit_amount: 2000, period: '2026-11-01' },
      { id: `${IDS.tx}-b2`, category: 'Groceries', limit_amount: 3000, period: '2026-11-01' },
    ],
    debts: [
      {
        id: IDS.debt,
        counterparty: 'Juan',
        direction: 'owed_to_me',
        amount: 500,
        due_date: '2026-11-15',
        settled: false,
      },
      {
        id: `${IDS.debt}-2`,
        counterparty: 'Maria',
        direction: 'i_owe',
        amount: 200,
        settled: true,
        settled_at: '2026-11-01T10:00:00Z',
      },
    ],
    planner: [
      {
        id: IDS.planner,
        entry_date: '2026-11-08',
        start_time: '09:00',
        title: 'Study math',
        tag: 'Study',
        done: false,
      },
      {
        id: `${IDS.planner}-2`,
        entry_date: '2026-11-09',
        start_time: '10:00',
        title: 'Dentist',
        tag: 'Personal',
        done: false,
      },
      {
        id: `${IDS.planner}-3`,
        entry_date: '2026-11-10',
        start_time: '18:00',
        title: 'Gym',
        tag: 'Daily',
        done: false,
      },
    ],
    tasks: [
      {
        id: IDS.task,
        title: 'Buy milk',
        tag: 'Daily',
        due_date: '2026-11-08',
        due_time: '17:00',
        done: false,
        priority: true,
      },
      {
        id: `${IDS.task}-2`,
        title: 'Old task',
        tag: 'Daily',
        done: true,
        completed_at: '2026-11-01T10:00:00Z',
      },
    ],
    courses: [
      {
        id: IDS.course,
        name: 'Spanish',
        active: true,
        position: 0,
        weekly_target_hours: 5,
      },
    ],
    modules: [{ id: IDS.module, course_id: IDS.course, title: 'Basics', position: 0 }],
    lessons: [
      {
        id: IDS.lesson,
        module_id: IDS.module,
        title: 'Greetings',
        done: false,
        position: 0,
        content: 'Hola means hello.',
      },
      {
        id: `${IDS.lesson}-2`,
        module_id: IDS.module,
        title: 'Numbers',
        done: true,
        position: 1,
        content: 'Uno, dos, tres.',
      },
    ],
    sessions: [
      { id: IDS.session, studied_on: '2026-11-03', hours: 1.5, course_id: IDS.course },
      { id: `${IDS.session}-2`, studied_on: '2026-11-04', hours: 2.5, course_id: IDS.course },
      { id: `${IDS.session}-3`, studied_on: '2026-10-20', hours: 4, course_id: IDS.course },
    ],
    projects: [
      {
        id: IDS.project,
        title: 'Ship app',
        brief: 'Ship the app',
        criteria: 'It works',
        status: 'active',
        due_date: '2026-11-20',
      },
      {
        id: `${IDS.project}-2`,
        title: 'Old project',
        brief: 'Old brief',
        status: 'passed',
        due_date: '2026-10-01',
      },
    ],
    penalties: [
      {
        id: `${IDS.project}-p1`,
        project_id: `${IDS.project}-2`,
        project_title: 'Old project',
        reason: 'missed',
        credits: 10,
        atoned: false,
      },
    ],
    notes: [
      {
        id: IDS.note,
        title: 'Doctor visit',
        body: NOTE_BODY,
        tag: 'Personal',
        important: true,
        updated_at: '2026-11-05T10:00:00Z',
      },
      {
        id: `${IDS.note}-2`,
        title: 'Grocery list',
        body: 'milk and eggs',
        tag: 'Personal',
        important: false,
        updated_at: '2026-11-04T10:00:00Z',
      },
    ],
  }
}

function ctx(overrides = {}) {
  return {
    data: fixture(),
    now: NOW,
    prefs: {
      domains: {
        finance: 'labels',
        planner: 'labels',
        learning: 'labels',
        projects: 'labels',
        notes: 'labels',
      },
    },
    pseudo: createPseudonymizer(),
    privacy: { hidden: false, accountsHidden: false },
    maxChars: 5000,
    ...overrides,
  }
}

const SECRETS = [
  'Juan',
  'GCash',
  'BDO',
  'Jollibee',
  'hunter2',
  '1234567890',
  '4242',
  'Doctor visit',
  'Grocery list',
  'Spanish',
  'Ship app',
  'Old project',
  'Study math',
  'Buy milk',
  'Dentist',
  'Gym',
  'Greetings',
  'Numbers',
  ...Object.values(IDS),
]

test('every tool output is free of fixture labels, bodies and identifiers', () => {
  for (const tool of TOOLS) {
    const output = runTool(tool.name, {}, ctx())
    assert.equal(output.error, undefined, `${tool.name} returned ${output.error}`)

    const text = JSON.stringify(output)
    for (const secret of SECRETS) {
      assert.ok(!text.includes(secret), `${tool.name} leaked "${secret}"`)
    }
  }
})

test('Hide balances removes fixture balances from account and debt summaries', () => {
  const hidden = ctx({ privacy: { hidden: true, accountsHidden: true } })
  const accounts = runTool('account_summary', {}, hidden)
  const debts = runTool('debts_summary', {}, hidden)

  for (const output of [accounts, debts]) {
    const text = JSON.stringify(output)
    assert.ok(!text.includes('1000'))
    assert.ok(!text.includes('5000'))
    assert.ok(!text.includes('12400'))
    assert.ok(!text.includes('1300'))
    assert.ok(!text.includes('"balance"'))
    assert.ok(!text.includes('"income"'))
    assert.ok(!text.includes('"spend"'))
  }

  assert.deepEqual(debts.debts, { count: 1 })
  assert.ok(!JSON.stringify(debts).includes('500'))
})

test('manifest exposes no run functions and omits off domains', () => {
  const entries = manifest({ domains: { notes: 'off' } })

  assert.ok(!entries.some((entry) => entry.name === 'search_notes'))
  for (const entry of entries) {
    assert.deepEqual(Object.keys(entry).sort(), ['description', 'name', 'parameters'])
    assert.equal(entry.run, undefined)
  }
})

test('validateArgs drops unknown keys, rejects bad enums, clamps and caps', () => {
  const spending = getTool('spending_summary')
  const clean = validateArgs(spending, {
    period: 'year',
    group_by: 'category',
    evil: 'x',
    extra: 1,
  })
  assert.deepEqual(clean, { period: 'month', group_by: 'category' })

  const notes = getTool('search_notes')
  assert.equal(validateArgs(notes, { query: 'a'.repeat(200) }).query.length, 80)

  const synthetic = {
    parameters: {
      properties: {
        n: { type: 'number', minimum: 1, maximum: 5, default: 3 },
        s: { type: 'string', default: 'x' },
      },
    },
  }
  assert.deepEqual(validateArgs(synthetic, { n: 99 }), { n: 5, s: 'x' })
  assert.deepEqual(validateArgs(synthetic, { n: 'not-a-number' }), { n: 3, s: 'x' })
})

test('search_notes never returns a body, even when the query matches it', () => {
  const output = runTool('search_notes', { query: 'hunter2' }, ctx())

  assert.equal(output.count, 1)
  assert.equal(output.notes[0].body, undefined)
  assert.ok(!JSON.stringify(output).includes('hunter2'))
  assert.ok(!JSON.stringify(output).includes('1234567890'))
  assert.ok(output.notes[0].title.startsWith('N'))
})

test('runTool reports unknown tools and catches thrown errors', () => {
  assert.deepEqual(runTool('does_not_exist', {}, ctx()), { error: 'unknown_tool' })

  const broken = ctx({ data: { transactions: {} } })
  assert.deepEqual(runTool('finance_score', {}, broken), { error: 'tool_failed' })
})

test('no tool name implies a write', () => {
  for (const tool of TOOLS) {
    assert.ok(
      !/create|update|delete|adjust|settle|set|write/i.test(tool.name),
      `${tool.name} looks like a write tool`,
    )
  }
})

test('numeric results match the existing selectors on the same fixture', () => {
  const data = fixture()
  const context = ctx()

  const spending = runTool('spending_summary', { period: 'month' }, context)
  const month = totalsForMonth(data.transactions, NOW)
  assert.equal(spending.income, month.income)
  assert.equal(spending.spend, month.spend)

  const budget = runTool('budget_status', {}, context)
  const rows = budgetProgress(data.budgets, data.transactions, NOW)
  assert.equal(budget.totalLimit, rows.reduce((sum, row) => sum + row.limit, 0))
  assert.equal(budget.totalSpent, rows.reduce((sum, row) => sum + row.spent, 0))

  assert.equal(runTool('finance_score', {}, context).score, financeScore(data, NOW).score)
  assert.equal(runTool('study_hours', {}, context).hours, weekHours(data.sessions, NOW))
  assert.equal(runTool('credits', {}, context).balance, creditBalance(data.penalties))

  const accounts = runTool('account_summary', {}, context)
  assert.equal(accounts.totalInAccounts, totalInAccounts(data, NOW))
  assert.equal(accounts.accounts.length, accountRows(data, NOW).length)

  assert.equal(runTool('debts_summary', {}, context).owedToMe, debtTotals(data.debts).owedToMe)
})

function expectedRangeTotals(transactions, start, end) {
  let income = 0
  let spend = 0
  for (const tx of transactions) {
    if (tx.occurred_on < start || tx.occurred_on > end) continue
    if (tx.amount >= 0) income += tx.amount
    else spend += Math.abs(tx.amount)
  }
  return { income, spend }
}

test('NEW SELECTOR: today and week sums match independent reductions', () => {
  const data = fixture()
  const context = ctx()

  const today = runTool('spending_summary', { period: 'today' }, context)
  assert.deepEqual({ start: today.start, end: today.end }, {
    start: '2026-11-08',
    end: '2026-11-08',
  })
  assert.deepEqual(
    { income: today.income, spend: today.spend },
    expectedRangeTotals(data.transactions, '2026-11-08', '2026-11-08'),
  )

  const week = runTool('spending_summary', { period: 'week' }, context)
  const bounds = weekBounds(NOW)
  assert.deepEqual({ start: week.start, end: week.end }, bounds)
  assert.deepEqual(
    { income: week.income, spend: week.spend },
    expectedRangeTotals(data.transactions, bounds.start, bounds.end),
  )
})

test('NEW SELECTOR: category split matches an independent reduction', () => {
  const data = fixture()
  const month = runTool('spending_summary', { period: 'month', group_by: 'category' }, ctx())

  const expected = new Map()
  for (const tx of data.transactions) {
    if (tx.occurred_on < '2026-11-01' || tx.occurred_on > '2026-11-30') continue
    if (tx.amount >= 0) continue
    expected.set(tx.category, (expected.get(tx.category) || 0) + Math.abs(tx.amount))
  }
  const expectedRows = [...expected.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  assert.deepEqual(month.byCategory, expectedRows)
  assert.equal(
    month.byCategory.reduce((sum, row) => sum + row.amount, 0),
    month.spend,
  )
})

test('NEW SELECTOR: month study hours match an independent sum', () => {
  const data = fixture()
  const output = runTool('study_hours', { range: 'month' }, ctx())
  const expected = data.sessions
    .filter((session) => session.studied_on.startsWith('2026-11'))
    .reduce((sum, session) => sum + session.hours, 0)

  assert.equal(output.hours, expected)
  assert.equal(output.hours, 4)
})

test('NEW SELECTOR: period ranges and existing month totals agree', () => {
  const data = fixture()
  const context = ctx()
  const cases = {
    today: { start: '2026-11-08', end: '2026-11-08' },
    week: weekBounds(NOW),
    month: { start: '2026-11-01', end: '2026-11-30' },
    last_month: { start: '2026-10-01', end: '2026-10-31' },
  }

  for (const [period, range] of Object.entries(cases)) {
    const output = runTool('spending_summary', { period }, context)
    assert.deepEqual({ start: output.start, end: output.end }, range, period)
  }

  const month = runTool('spending_summary', { period: 'month' }, context)
  const monthExpected = totalsForMonth(data.transactions, NOW)
  assert.deepEqual(
    { income: month.income, spend: month.spend },
    { income: monthExpected.income, spend: monthExpected.spend },
  )

  const last = runTool('spending_summary', { period: 'last_month' }, context)
  const lastExpected = totalsForPrevMonth(data.transactions, NOW)
  assert.deepEqual(
    { income: last.income, spend: last.spend },
    { income: lastExpected.income, spend: lastExpected.spend },
  )
})

test('NEW SELECTOR: tomorrow date matches the injected clock', () => {
  const output = runTool('plan_for', { range: 'tomorrow' }, ctx())
  const expected = toISODate(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + 1))

  assert.equal(output.date, expected)
  assert.equal(output.date, '2026-11-09')
})

test('applyHidden and the finance context builder withhold the same fields', () => {
  const data = fixture()
  const rows = accountRows(data, NOW)
  const rawAccounts = {
    accounts: rows.map((account) => ({
      name: account.name,
      kind: account.kind,
      balance: account.balance,
      income: account.income,
      spend: account.spend,
    })),
    totalInAccounts: totalInAccounts(data, NOW),
  }

  const maskedAccounts = applyHidden(rawAccounts, { accountsHidden: true })
  const accountsText = buildFinanceContext(data, { accountsHidden: true }).context

  assert.ok(accountsText.includes('balances are hidden right now'))
  assert.ok(!accountsText.includes('GCash'))
  assert.ok(!accountsText.includes('BDO'))
  assert.ok(!accountsText.includes('12,400'))
  assert.equal(maskedAccounts.totalInAccounts, undefined)
  for (const account of maskedAccounts.accounts) {
    assert.equal(account.balance, undefined)
    assert.equal(account.income, undefined)
    assert.equal(account.spend, undefined)
  }

  const maskedDebts = applyHidden(
    { debts: openDebts(data.debts), owedToMe: debtTotals(data.debts).owedToMe },
    { hidden: true },
  )
  const hiddenText = buildFinanceContext(data, { hidden: true }).context

  assert.ok(hiddenText.includes('amounts are hidden right now'))
  assert.ok(!hiddenText.includes('Juan'))
  assert.ok(!hiddenText.includes('₱500'))
  assert.deepEqual(maskedDebts.debts, { count: 1 })
  assert.equal(maskedDebts.owedToMe, undefined)
})

test('finance_score returns score, label and component names with points only', () => {
  const output = runTool('finance_score', {}, ctx())

  assert.deepEqual(Object.keys(output).sort(), ['components', 'label', 'score'])
  for (const component of output.components) {
    assert.deepEqual(Object.keys(component).sort(), ['label', 'points'])
  }
})
