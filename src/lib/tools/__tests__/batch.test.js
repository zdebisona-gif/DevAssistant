import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  NOTE_ROUTE_PATTERN,
  buildBatch,
  dropEchoNote,
  orderBatch,
} from '../batch.js'
import {
  DELETE_ACTIONS,
  sanitizeActionBatch,
} from '../../../../supabase/functions/gemini/validate.js'
import { ALLOWED_ACTIONS } from '../../actions.js'

function action(name, args = {}, confidence = 'high') {
  return { action: name, confidence, args }
}

test('a batch is capped at five actions', () => {
  const raw = {
    actions: Array.from({ length: 7 }, () => action('create_transaction', { amount: 5 })),
  }

  const result = sanitizeActionBatch(raw, ALLOWED_ACTIONS)

  assert.equal(result.actions.length, 5)
  assert.equal(result.blocked, '')
})

test('unknown actions and every delete_all variant are dropped', () => {
  const raw = {
    actions: [
      action('delete_all_data'),
      action('delete_all_notes'),
      action('not_real'),
      action('create_note', { title: 'T', body: 'B' }),
    ],
  }

  const result = sanitizeActionBatch(raw, ALLOWED_ACTIONS)

  assert.deepEqual(result.actions.map((entry) => entry.action), ['create_note'])
  assert.equal(result.blocked, '')
})

test('one delete alone passes', () => {
  const raw = { actions: [action('delete_note', { target: 'Old note' })] }

  const result = sanitizeActionBatch(raw, ALLOWED_ACTIONS)

  assert.equal(result.blocked, '')
  assert.deepEqual(result.actions.map((entry) => entry.action), ['delete_note'])
})

test('a delete mixed with another action is blocked', () => {
  const raw = {
    actions: [action('delete_note', { target: 'Old' }), action('create_transaction', { amount: 5 })],
  }

  assert.deepEqual(sanitizeActionBatch(raw, ALLOWED_ACTIONS), {
    actions: [],
    blocked: 'delete-must-be-alone',
  })
})

test('two deletes are blocked', () => {
  const raw = {
    actions: [action('delete_note', { target: 'A' }), action('delete_debt', { counterparty: 'B' })],
  }

  assert.deepEqual(sanitizeActionBatch(raw, ALLOWED_ACTIONS), {
    actions: [],
    blocked: 'delete-must-be-alone',
  })
})

test('args are sanitized: id keys dropped, long strings capped', () => {
  const raw = {
    actions: [
      action('create_transaction', {
        amount: 12,
        id: 'should-not-survive',
        note: 'a'.repeat(400),
        unknown: 'x',
      }),
    ],
  }

  const [entry] = sanitizeActionBatch(raw, ALLOWED_ACTIONS).actions

  assert.equal(entry.confidence, 'high')
  assert.equal(entry.args.amount, 12)
  assert.ok(!('id' in entry.args))
  assert.ok(!('unknown' in entry.args))
  assert.ok(entry.args.note.length <= 200)
})

test('dropEchoNote flags a body that just echoes the message', () => {
  const proposal = {
    action: 'create_note',
    payload: { title: 'Budgeting', body: 'Budgeting basics', tag: 'Personal' },
  }

  const [marked] = dropEchoNote([proposal], 'make me a note about budgeting basics')

  assert.equal(marked.needsDraft, true)
  assert.equal(marked.action, 'create_note')
})

test('dropEchoNote keeps a real drafted body and leaves other proposals alone', () => {
  const body =
    'Track every expense for a month, group it by category, then set a limit for the two biggest groups and review the totals each Sunday.'
  const note = { action: 'create_note', payload: { title: 'Budgeting', body } }
  const transaction = { action: 'create_transaction', payload: { amount: 5 } }

  const [keptNote, keptTransaction] = dropEchoNote(
    [note, transaction],
    'make me a note about budgeting',
  )

  assert.ok(!keptNote.needsDraft)
  assert.equal(keptTransaction.needsDraft, undefined)
})

test('orderBatch puts deletes last and keeps the rest stable', () => {
  const list = [
    { action: 'delete_note', id: 'd1' },
    { action: 'create_note', id: 'c1' },
    { action: 'update_note', id: 'u1' },
    { action: 'delete_debt', id: 'd2' },
  ]

  assert.deepEqual(
    orderBatch(list).map((proposal) => proposal.id),
    ['c1', 'u1', 'd1', 'd2'],
  )
})

test('buildBatch preserves order and collects errors', () => {
  const calls = []

  const { proposals, errors } = buildBatch(
    [{ action: 'create_note' }, { action: 'delete_note' }, { action: 'bad' }],
    {
      message: 'hello',
      buildExtractedProposal: (entry) => {
        calls.push(entry.action)
        if (entry.action === 'bad') return { ok: false, error: 'No match.' }
        return { ok: true, proposal: { action: entry.action } }
      },
    },
  )

  assert.deepEqual(calls, ['create_note', 'delete_note', 'bad'])
  assert.deepEqual(proposals.map((proposal) => proposal.action), ['create_note', 'delete_note'])
  assert.deepEqual(errors, [{ action: 'bad', error: 'No match.' }])
})

test('the note-routing pattern matches drafting requests only', () => {
  for (const question of [
    'make me a note about budgeting',
    'write a note on china trip',
    'draft note for savings',
  ]) {
    assert.ok(NOTE_ROUTE_PATTERN.test(question), `should match "${question}"`)
  }

  for (const question of ['add note: buy milk', 'I made a note about it yesterday']) {
    assert.ok(!NOTE_ROUTE_PATTERN.test(question), `should not match "${question}"`)
  }
})

test('every batch delete rule is a real client action', () => {
  for (const name of DELETE_ACTIONS) {
    assert.ok(ALLOWED_ACTIONS.includes(name), `actions.js is missing "${name}"`)
  }
})
