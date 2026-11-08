import { test } from 'node:test'
import assert from 'node:assert/strict'

import { askWithTools } from '../orchestrator.js'

const NOW = new Date('2026-11-08T12:00:00')

const IDS = {
  gcash: 'aaaaaaaa-1111-4111-8111-111111111111',
  bdo: 'bbbbbbbb-2222-4222-8222-222222222222',
  tx: 'cccccccc-3333-4333-8333-333333333333',
  note: 'dddddddd-4444-4444-8444-444444444444',
  debt: '34343434-9999-4999-8999-999999999999',
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
        occurred_on: '2026-11-01',
        merchant: 'Salary',
        category: 'Salary',
        account: 'BDO',
        account_id: IDS.bdo,
        amount: 8000,
      },
    ],
    budgets: [
      { id: `${IDS.tx}-b1`, category: 'Food & Dining', limit_amount: 2000, period: '2026-11-01' },
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
    ],
    planner: [
      {
        id: `${IDS.tx}-p1`,
        entry_date: '2026-11-08',
        start_time: '09:00',
        title: 'Study math',
        tag: 'Study',
        done: false,
      },
    ],
    tasks: [
      {
        id: `${IDS.tx}-t1`,
        title: 'Buy milk',
        tag: 'Daily',
        due_date: '2026-11-08',
        due_time: '17:00',
        done: false,
        priority: true,
      },
    ],
    courses: [
      { id: `${IDS.tx}-c1`, name: 'Spanish', active: true, position: 0, weekly_target_hours: 5 },
    ],
    modules: [{ id: `${IDS.tx}-m1`, course_id: `${IDS.tx}-c1`, title: 'Basics', position: 0 }],
    lessons: [
      {
        id: `${IDS.tx}-l1`,
        module_id: `${IDS.tx}-m1`,
        title: 'Greetings',
        done: true,
        position: 0,
        content: 'Hola means hello.',
      },
    ],
    sessions: [{ id: `${IDS.tx}-s1`, studied_on: '2026-11-03', hours: 1.5, course_id: `${IDS.tx}-c1` }],
    projects: [
      {
        id: `${IDS.tx}-pr1`,
        title: 'Ship app',
        brief: 'Ship the app',
        criteria: 'It works',
        status: 'active',
        due_date: '2026-11-20',
      },
    ],
    penalties: [],
    notes: [
      {
        id: IDS.note,
        title: 'Doctor visit',
        body: NOTE_BODY,
        tag: 'Personal',
        important: true,
        updated_at: '2026-11-05T10:00:00Z',
      },
    ],
  }
}

function makeCtx(overrides = {}) {
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
    privacy: { hidden: false, accountsHidden: false },
    ...overrides,
  }
}

function makeDeps({ plan, answer, planError, answerError } = {}) {
  const calls = { plan: 0, ask: 0 }
  return {
    calls,
    planTools: async () => {
      calls.plan += 1
      if (planError) throw planError
      return plan
    },
    askGemini: async () => {
      calls.ask += 1
      if (answerError) throw answerError
      return answer ?? { text: 'ok', model: 'gemini', remaining: 1, cap: 50 }
    },
  }
}

test('two planned tools run locally and make exactly two Gemini requests', async () => {
  const deps = makeDeps({
    plan: {
      tools: [
        { name: 'spending_summary', args: { period: 'month' } },
        { name: 'debts_summary', args: {} },
      ],
      clarify: '',
    },
    answer: { text: 'You spent little and are owed money.', model: 'gemini', remaining: 4, cap: 50 },
  })

  const result = await askWithTools({ question: 'How am I doing?', ctx: makeCtx(), deps })

  assert.equal(result.kind, 'answer')
  assert.equal(deps.calls.plan, 1)
  assert.equal(deps.calls.ask, 1)
  assert.deepEqual(result.sources, ['spending_summary', 'debts_summary'])
  assert.match(result.sent.context, /spending_summary:/)
  assert.match(result.sent.context, /debts_summary:/)
  assert.match(result.sent.context, /"owedToMe"/)
})

test('no tools returns none and never calls askGemini', async () => {
  const deps = makeDeps({ plan: { tools: [], clarify: '' } })

  const result = await askWithTools({ question: 'Hello', ctx: makeCtx(), deps })

  assert.deepEqual(result, { kind: 'none' })
  assert.equal(deps.calls.plan, 1)
  assert.equal(deps.calls.ask, 0)
})

test('clarify with no tools returns the question', async () => {
  const deps = makeDeps({ plan: { tools: [], clarify: 'Which month do you mean?' } })

  const result = await askWithTools({ question: 'How much?', ctx: makeCtx(), deps })

  assert.deepEqual(result, { kind: 'clarify', text: 'Which month do you mean?' })
  assert.equal(deps.calls.ask, 0)
})

test('all domains off returns off without calling either dependency', async () => {
  const deps = makeDeps({ plan: { tools: [], clarify: '' } })
  const ctx = makeCtx({
    prefs: {
      domains: { finance: 'off', planner: 'off', learning: 'off', projects: 'off', notes: 'off' },
    },
  })

  const result = await askWithTools({ question: 'Anything', ctx, deps })

  assert.deepEqual(result, { kind: 'off' })
  assert.equal(deps.calls.plan, 0)
  assert.equal(deps.calls.ask, 0)
})

test('a tool blocked by its domain appears as an error entry', async () => {
  const deps = makeDeps({
    plan: { tools: [{ name: 'search_notes', args: { query: 'password' } }], clarify: '' },
  })
  const ctx = makeCtx({
    prefs: {
      domains: {
        finance: 'labels',
        planner: 'labels',
        learning: 'labels',
        projects: 'labels',
        notes: 'off',
      },
    },
  })

  const result = await askWithTools({ question: 'Find my note', ctx, deps })

  assert.equal(result.kind, 'answer')
  assert.match(result.sent.context, /search_notes: \{"error":"domain_off"\}/)
})

test('context is pseudonymized and the reply is decoded', async () => {
  const deps = makeDeps({
    plan: {
      tools: [
        { name: 'debts_summary', args: {} },
        { name: 'account_summary', args: {} },
        { name: 'search_notes', args: { query: 'password' } },
      ],
      clarify: '',
    },
    answer: { text: 'P1 owes you. A1 holds cash.', model: 'gemini', remaining: 3, cap: 50 },
  })

  const result = await askWithTools({ question: 'Who owes me?', ctx: makeCtx(), deps })

  assert.equal(result.text, 'Juan owes you. GCash holds cash.')

  const context = result.sent.context
  for (const secret of ['Juan', 'GCash', 'BDO', 'Jollibee', NOTE_BODY, ...Object.values(IDS)]) {
    assert.ok(!context.includes(secret), `context leaked "${secret}"`)
  }
  assert.match(context, /P1/)
  assert.match(context, /A1/)
})

test('sent carries token names only, never real values', async () => {
  const deps = makeDeps({
    plan: {
      tools: [
        { name: 'debts_summary', args: {} },
        { name: 'account_summary', args: {} },
      ],
      clarify: '',
    },
    answer: { text: 'P1 owes you.', model: 'gemini', remaining: 3, cap: 50 },
  })

  const result = await askWithTools({ question: 'Who owes me?', ctx: makeCtx(), deps })
  const sentText = JSON.stringify(result.sent)

  assert.ok(result.sent.tokens.includes('P1'))
  assert.ok(result.sent.tokens.includes('A1'))
  for (const secret of ['Juan', 'GCash', 'BDO', 'Jollibee', NOTE_BODY, ...Object.values(IDS)]) {
    assert.ok(!sentText.includes(secret), `sent leaked "${secret}"`)
  }
})

test('a context over 3500 chars is truncated and says so', async () => {
  const ctx = makeCtx()
  ctx.data.budgets = Array.from({ length: 80 }, (_, index) => ({
    id: `${IDS.tx}-b${index}`,
    category: `Category ${index}`,
    limit_amount: 1000 + index,
    period: '2026-11-01',
  }))

  const deps = makeDeps({
    plan: {
      tools: [
        { name: 'budget_status', args: {} },
        { name: 'budget_status', args: {} },
        { name: 'budget_status', args: {} },
        { name: 'budget_status', args: {} },
      ],
      clarify: '',
    },
  })

  const result = await askWithTools({ question: 'How are my budgets?', ctx, deps })

  assert.equal(result.kind, 'answer')
  assert.ok(result.sent.context.length <= 3500)
  assert.match(result.sent.context, /truncated to fit/)
})

test('GeminiUnavailable from planTools propagates unchanged', async () => {
  const error = new Error('unavailable')
  error.name = 'GeminiUnavailable'
  const deps = makeDeps({ planError: error })

  await assert.rejects(
    askWithTools({ question: 'Anything', ctx: makeCtx(), deps }),
    (thrown) => thrown === error,
  )
})

test('GeminiUnavailable from askGemini propagates unchanged', async () => {
  const error = new Error('unavailable')
  error.name = 'GeminiUnavailable'
  const deps = makeDeps({
    plan: { tools: [{ name: 'debts_summary', args: {} }], clarify: '' },
    answerError: error,
  })

  await assert.rejects(
    askWithTools({ question: 'Anything', ctx: makeCtx(), deps }),
    (thrown) => thrown === error,
  )
})

test('a non-Gemini error becomes none', async () => {
  const deps = makeDeps({ planError: new Error('boom') })

  assert.deepEqual(await askWithTools({ question: 'Anything', ctx: makeCtx(), deps }), {
    kind: 'none',
  })
})

function capturingDeps(plan, answer) {
  const calls = { plan: 0, ask: 0, planArgs: null, askArgs: null }
  return {
    calls,
    planTools: async (args) => {
      calls.plan += 1
      calls.planArgs = args
      return plan
    },
    askGemini: async (args) => {
      calls.ask += 1
      calls.askArgs = args
      return answer ?? { text: 'ok', model: 'gemini', remaining: 1, cap: 50 }
    },
  }
}

test('history is sent under "Conversation so far:" with real names tokenized', async () => {
  const deps = capturingDeps(
    { tools: [{ name: 'debts_summary', args: {} }], clarify: '' },
    { text: 'P1 owes you 500.', model: 'gemini', remaining: 2, cap: 50 },
  )

  const result = await askWithTools({
    question: 'what about next month?',
    ctx: makeCtx(),
    deps,
    history: 'You: who owes me\nZen-I: Juan owes you 500.',
  })

  assert.equal(result.kind, 'answer')
  assert.match(deps.calls.askArgs.context, /^Conversation so far:\n/)
  assert.match(deps.calls.askArgs.context, /Tool results/)
  assert.match(deps.calls.askArgs.context, /follow-up/)
  assert.equal(deps.calls.askArgs.question, 'what about next month?')

  /* The plan question carries the short history. */
  assert.match(deps.calls.planArgs.question, /History:/)
  assert.ok(deps.calls.planArgs.question.length <= 500)

  /* History is re-encoded before it leaves the device. */
  assert.match(result.sent.history, /P1/)
  assert.ok(!result.sent.history.includes('Juan'))
  assert.ok(!JSON.stringify(result.sent).includes('Juan'))
})

test('a long history and large tool results stay under the 3900 char cap', async () => {
  const ctx = makeCtx()
  ctx.data.budgets = Array.from({ length: 120 }, (_, index) => ({
    id: `${IDS.tx}-b${index}`,
    category: `Category ${index}`,
    limit_amount: 1000 + index,
    period: '2026-11-01',
  }))

  const longHistory = Array.from({ length: 6 }, (_, index) =>
    `You: question ${index}\nZen-I: ${'a'.repeat(100)}`,
  ).join('\n')

  const deps = capturingDeps({
    tools: [
      { name: 'budget_status', args: {} },
      { name: 'budget_status', args: {} },
      { name: 'budget_status', args: {} },
      { name: 'budget_status', args: {} },
    ],
    clarify: '',
  })

  const result = await askWithTools({
    question: 'How are my budgets?',
    ctx,
    deps,
    history: longHistory,
  })

  assert.equal(result.kind, 'answer')
  assert.ok(result.sent.context.length <= 3900, `context was ${result.sent.context.length}`)
  assert.match(result.sent.context, /^Conversation so far:/)
  assert.match(result.sent.context, /Tool results/)
  assert.match(result.sent.context, /truncated to fit/)
})

test('an empty history leaves the current behavior unchanged', async () => {
  const deps = capturingDeps({
    tools: [{ name: 'debts_summary', args: {} }],
    clarify: '',
  })

  const result = await askWithTools({ question: 'Who owes me?', ctx: makeCtx(), deps })

  assert.equal(deps.calls.planArgs.question, 'Who owes me?')
  assert.ok(!deps.calls.askArgs.context.includes('Conversation so far:'))
  assert.ok(!deps.calls.askArgs.context.includes('follow-up'))
  assert.equal(result.sent.history, '')
})

test('the plan question never exceeds the proxy 500 char cap', async () => {
  const deps = capturingDeps({
    tools: [{ name: 'debts_summary', args: {} }],
    clarify: '',
  })

  await askWithTools({
    question: 'Who owes me?',
    ctx: makeCtx(),
    deps,
    history: 'x'.repeat(900),
  })

  assert.ok(deps.calls.planArgs.question.length <= 500)
  assert.equal(deps.calls.planArgs.question, 'Who owes me?')
})
