import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildHistory, isFollowUp } from '../history.js'

function user(text) {
  return { role: 'user', text }
}

function answer(text) {
  return { role: 'assistant', answer: text, label: 'Local answer' }
}

test('keeps only the last three exchanges, oldest first', () => {
  const { text, turns } = buildHistory([
    user('q1'),
    answer('a1'),
    user('q2'),
    answer('a2'),
    user('q3'),
    answer('a3'),
    user('q4'),
    answer('a4'),
  ])

  assert.equal(turns, 3)
  assert.ok(!text.includes('q1'))
  assert.ok(text.startsWith('You: q2'))
  assert.ok(text.endsWith('Zen-I: a4'))
  assert.ok(text.indexOf('q2') < text.indexOf('q4'))
})

test('skips action, note-draft and error cards', () => {
  const { text } = buildHistory([
    user('buy a gadget'),
    { role: 'assistant', kind: 'action', proposal: { action: 'create_transaction' }, actionState: 'idle' },
    user('draft a note'),
    { role: 'assistant', kind: 'note-draft', draft: { title: 'Secret draft' }, prompt: 'draft a note' },
    user('again'),
    { role: 'assistant', kind: 'note-error', prompt: 'again', error: 'Gemini is unavailable' },
    user('and now?'),
    answer('Here is a plain answer.'),
  ])

  assert.ok(text.includes('You: draft a note'))
  assert.ok(text.includes('You: and now?'))
  assert.ok(!text.includes('create_transaction'))
  assert.ok(!text.includes('Secret draft'))
  assert.ok(!text.includes('Gemini is unavailable'))
})

test('assistant turns use the answer text only', () => {
  const { text } = buildHistory([
    user('how am I doing?'),
    {
      role: 'assistant',
      answer: 'You are fine.',
      breakdown: [{ label: 'Food', value: '100' }],
      insight: 'An insight that must not leak',
      followUps: ['A chip that must not leak'],
      label: 'AI · Gemini',
    },
  ])

  assert.ok(text.includes('Zen-I: You are fine.'))
  assert.ok(!text.includes('Food'))
  assert.ok(!text.includes('An insight'))
  assert.ok(!text.includes('A chip'))
})

test('each turn is trimmed to 160 characters', () => {
  const long = 'x'.repeat(400)
  const { text } = buildHistory([user(long), answer(long)])

  const userPart = text.slice('You: '.length, text.indexOf('\n'))
  const assistantPart = text.slice(text.indexOf('Zen-I: ') + 'Zen-I: '.length)

  assert.ok(userPart.length <= 160, `user part was ${userPart.length}`)
  assert.ok(assistantPart.length <= 160, `assistant part was ${assistantPart.length}`)
  assert.ok(userPart.endsWith('…'))
})

test('the total cap drops the oldest turns first', () => {
  const a = `A${'a'.repeat(180)}`
  const b = `B${'b'.repeat(180)}`
  const c = `C${'c'.repeat(180)}`

  const { text, turns } = buildHistory([user(a), answer(a), user(b), answer(b), user(c), answer(c)])

  assert.ok(text.length <= 700, `text was ${text.length}`)
  assert.ok(!text.includes('Aaaa'), 'oldest turn should be dropped')
  assert.ok(text.includes('Cccc'))
  assert.equal(turns, 2)
})

test('empty input returns an empty history', () => {
  assert.deepEqual(buildHistory([]), { text: '', turns: 0 })
  assert.deepEqual(buildHistory(undefined), { text: '', turns: 0 })
  assert.deepEqual(buildHistory([{ role: 'assistant' }]), { text: '', turns: 0 })
})

test('short questions that lean on the previous turn are follow-ups', () => {
  const history = { turns: 2 }

  assert.equal(isFollowUp('I would need 50k', history), true)
  assert.equal(isFollowUp('what about next month?', history), true)
  assert.equal(isFollowUp('and if I skip the trip?', history), true)
  assert.equal(isFollowUp('and my budget?', history), true)
})

test('lookups, long questions and questions without history are not follow-ups', () => {
  const history = { turns: 2 }

  assert.equal(isFollowUp('how much did I spend on food this month?', history), false)
  assert.equal(isFollowUp('how is my budget', history), false)
  assert.equal(isFollowUp('I would need 50k', { turns: 0 }), false)
  assert.equal(isFollowUp('I would need 50k'), false)
  assert.equal(
    isFollowUp(
      'I am planning a long trip to china this december and I want to know how I will look financially afterwards',
      history,
    ),
    false,
  )
})
