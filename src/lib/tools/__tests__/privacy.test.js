import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  applyHidden,
  createPseudonymizer,
  guardResult,
  stripTier0,
} from '../privacy.js'

test('stripTier0 removes every denylisted key at any depth without mutating input', () => {
  const input = {
    id: 'uuid-1',
    user_id: 'uuid-2',
    account_id: 'uuid-3',
    password: 'hunter2',
    token: 'tok',
    secret: 'sec',
    key: 'key',
    api_key: 'api',
    account_number: '1234567890',
    last4: '4242',
    reference: 'ref-1',
    body: 'private body',
    content: 'lesson content',
    email: 'a@b.com',
    note: 'debt note',
    keep: 'yes',
    nested: { id: 'uuid-4', body: 'nested body', keep: 1 },
    list: [{ id: 'uuid-5', body: 'list body', keep: 2 }],
  }
  const snapshot = JSON.parse(JSON.stringify(input))

  const out = stripTier0(input)

  assert.deepEqual(out, {
    keep: 'yes',
    nested: { keep: 1 },
    list: [{ keep: 2 }],
  })
  assert.deepEqual(input, snapshot)
})

test('applyHidden removes balances and per-account income with accountsHidden', () => {
  const result = {
    accounts: [{ name: 'GCash', kind: 'gcash', balance: 1000, income: 250, spend: 250 }],
    totalInAccounts: 6000,
    debts: [{ counterparty: 'Juan', direction: 'owed_to_me', amount: 500 }],
    owedToMe: 500,
    openCount: 1,
  }

  const masked = applyHidden(result, { accountsHidden: true })
  const text = JSON.stringify(masked)

  assert.equal(masked.accounts[0].name, 'GCash')
  assert.equal(masked.accounts[0].spend, undefined)
  assert.ok(!text.includes('1000'))
  assert.ok(!text.includes('6000'))
  assert.ok(!text.includes('"balance"'))
  assert.ok(!text.includes('"income"'))
  assert.ok(!text.includes('"spend"'))
  assert.ok(text.includes('500'), 'debt amounts stay visible unless hidden is on')

  const grouped = applyHidden({ byAccount: [{ name: 'GCash', spend: 250 }] }, { accountsHidden: true })
  assert.equal(grouped.byAccount, undefined)
})

test('applyHidden reduces debts to counts only when hidden', () => {
  const result = {
    accounts: [{ name: 'GCash', kind: 'gcash', balance: 1000, income: 250 }],
    totalInAccounts: 6000,
    debts: [{ counterparty: 'Juan', direction: 'owed_to_me', amount: 500 }],
    owedToMe: 500,
    openCount: 1,
  }

  const masked = applyHidden(result, { hidden: true })
  const text = JSON.stringify(masked)

  assert.deepEqual(masked.debts, { count: 1 })
  assert.equal(masked.owedToMe, undefined)
  assert.ok(!text.includes('500'))
  assert.ok(!text.includes('1000'))
  assert.ok(!text.includes('6000'))
  assert.ok(!text.includes('"spend"'))
})

test('pseudonymizer issues stable, case-insensitive tokens only for present values', () => {
  const pseudo = createPseudonymizer()

  const first = pseudo.encode({ merchant: 'Jollibee', counterparty: 'Juan', account: 'GCash' })
  const second = pseudo.encode({ merchant: 'jollibee', counterparty: 'JUAN', account: 'gcash' })

  assert.deepEqual(first, second)
  assert.equal(Object.keys(pseudo.table()).length, 3)

  const empty = createPseudonymizer()
  empty.encode({ count: 3, nested: { total: 5 } })
  assert.deepEqual(empty.table(), {})
})

test('pseudonymizer decodes P1 and P10 safely and round-trips', () => {
  const pseudo = createPseudonymizer()
  const encoded = pseudo.encode({
    people: Array.from({ length: 10 }, (_, index) => ({ counterparty: `Person ${index + 1}` })),
  })

  assert.equal(encoded.people[0].counterparty, 'P1')
  assert.equal(encoded.people[9].counterparty, 'P10')
  assert.equal(pseudo.decode('P1 and P10'), 'Person 1 and Person 10')
  assert.equal(pseudo.decode('P1'), 'Person 1')

  const original = { merchant: 'Jollibee', counterparty: 'Juan', account: 'GCash', amount: 5 }
  const roundTrip = createPseudonymizer()
  const masked = roundTrip.encode(original)
  assert.notEqual(masked.merchant, 'Jollibee')
  assert.equal(roundTrip.decode(JSON.stringify(masked)), JSON.stringify(original))
})

test('guardResult rejects tier 3, off domains and tier 2 at aggregates', () => {
  const ctx = {
    prefs: { domains: { finance: 'labels' } },
    pseudo: createPseudonymizer(),
    privacy: {},
  }

  assert.deepEqual(guardResult({ tier: 3, domain: 'finance' }, { x: 1 }, ctx), {
    error: 'tier_not_allowed',
  })
  assert.deepEqual(
    guardResult({ tier: 1, domain: 'finance' }, { x: 1 }, {
      ...ctx,
      prefs: { domains: { finance: 'off' } },
    }),
    { error: 'domain_off' },
  )
  assert.deepEqual(
    guardResult({ tier: 2, domain: 'finance' }, { x: 1 }, {
      ...ctx,
      prefs: { domains: { finance: 'aggregates' } },
    }),
    { error: 'labels_not_allowed' },
  )
})

test('guardResult trims arrays and flags truncation at the size cap', () => {
  const result = {
    items: Array.from({ length: 50 }, (_, index) => ({ index, text: 'x'.repeat(30) })),
  }

  const capped = guardResult(
    { tier: 1, domain: 'finance' },
    result,
    {
      prefs: { domains: { finance: 'labels' } },
      pseudo: createPseudonymizer(),
      privacy: {},
      maxChars: 400,
    },
  )

  assert.equal(capped.truncated, true)
  assert.ok(capped.omittedCount > 0)
  assert.ok(capped.items.length < 50)
  assert.ok(JSON.stringify(capped).length <= 400)
})
