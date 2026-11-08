import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ACTION_ARG_KEYS,
  DELETE_ACTIONS,
  KNOWN_TASKS,
  TOOL_NAMES,
  sanitizeActionArgs,
  sanitizeToolPlan,
} from '../validate.js'
import { TOOLS } from '../../../../src/lib/tools/registry.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../..')

const GEMINI_SOURCE = readFileSync(resolve(ROOT, 'src/lib/gemini.js'), 'utf8')
const PROXY_SOURCE = readFileSync(resolve(ROOT, 'supabase/functions/gemini/index.ts'), 'utf8')

test('sanitizeActionArgs drops unknown keys and every id key', () => {
  const input = {
    merchant: 'Jollibee',
    amount: 250,
    from_id: 'uuid-a',
    to_id: 'uuid-b',
    account_id: 'uuid-c',
    debt_id: 'uuid-d',
    id: 'uuid-e',
    evil: 'nope',
  }

  assert.deepEqual(sanitizeActionArgs(input), { merchant: 'Jollibee', amount: 250 })
})

test('sanitizeActionArgs drops bad enums and keeps valid ones', () => {
  const out = sanitizeActionArgs({
    type: 'transfer',
    operation: 'multiply',
    direction: 'they_owe',
    scope: 'study',
  })

  assert.deepEqual(out, { scope: 'study' })
})

test('sanitizeActionArgs strips control chars, trims and caps strings', () => {
  const long = 'x'.repeat(3000)
  const out = sanitizeActionArgs({
    merchant: '  Jolli\u0000bee\u200b  ',
    body: long,
    title: long,
  })

  assert.equal(out.merchant, 'Jollibee')
  assert.equal(out.title.length, 200)
  assert.equal(out.body.length, 2000)
})

test('sanitizeActionArgs drops NaN and Infinity and clamps numbers', () => {
  const out = sanitizeActionArgs({
    amount: 5e12,
    limit: Number.NaN,
    weekly_target: Number.POSITIVE_INFINITY,
    fee: -10,
  })

  assert.equal(out.amount, 1e9)
  assert.equal(out.fee, 0)
  assert.equal('limit' in out, false)
  assert.equal('weekly_target' in out, false)
})

test('sanitizeActionArgs keeps transfer fields and boolean priority', () => {
  const out = sanitizeActionArgs({
    from: 'GCash',
    to: 'BDO',
    fee: 15,
    occurred_on: '2026-11-08',
    priority: true,
  })

  assert.deepEqual(out, {
    from: 'GCash',
    to: 'BDO',
    fee: 15,
    occurred_on: '2026-11-08',
    priority: true,
  })

  assert.deepEqual(sanitizeActionArgs({ priority: 'yes' }), {})
})

test('sanitizeActionArgs never mutates its input', () => {
  const input = {
    merchant: '  Jollibee ',
    amount: 250,
    from_id: 'uuid-a',
    body: 'line\u0000one',
  }
  const snapshot = JSON.parse(JSON.stringify(input))

  sanitizeActionArgs(input)

  assert.deepEqual(input, snapshot)
})

test('sanitizeToolPlan caps to four tools and drops unknown or duplicate names', () => {
  const plan = sanitizeToolPlan(
    {
      tools: [
        { name: 'spending_summary', args: { period: 'week', evil: 'x' } },
        { name: 'spending_summary', args: { period: 'month' } },
        { name: 'not_a_tool' },
        { name: 'budget_status' },
        { name: 'finance_score' },
        { name: 'credits' },
        { name: 'open_tasks' },
      ],
      clarify: 'Which week?',
    },
    TOOL_NAMES,
  )

  assert.equal(plan.tools.length, 4)
  assert.deepEqual(plan.tools[0], { name: 'spending_summary', args: { period: 'week' } })
  assert.equal(plan.tools.filter((tool) => tool.name === 'spending_summary').length, 1)
  assert.ok(!plan.tools.some((tool) => tool.name === 'not_a_tool'))
  assert.equal(plan.clarify, 'Which week?')
})

test('sanitizeToolPlan honours an allowedNames subset', () => {
  const plan = sanitizeToolPlan(
    { tools: [{ name: 'spending_summary' }, { name: 'search_notes' }] },
    new Set(['search_notes']),
  )

  assert.deepEqual(plan.tools, [{ name: 'search_notes', args: {} }])
})

test('sanitizeToolPlan strips control chars and caps tool strings', () => {
  const plan = sanitizeToolPlan(
    {
      tools: [{ name: 'search_notes', args: { query: 'a'.repeat(200) + '\u0000' } }],
      clarify: 'b'.repeat(300),
    },
    TOOL_NAMES,
  )

  assert.equal(plan.tools[0].args.query.length, 80)
  assert.equal(plan.clarify.length, 160)
})

test('sanitizeToolPlan returns an empty plan for garbage', () => {
  for (const garbage of [null, undefined, 'nope', 42, [], ['x']]) {
    assert.deepEqual(sanitizeToolPlan(garbage, TOOL_NAMES), { tools: [], clarify: '' })
  }
})

test('KNOWN_TASKS contains every task string sent from gemini.js', () => {
  const found = new Set(
    [...GEMINI_SOURCE.matchAll(/task:\s*'([^']+)'/g)].map((match) => match[1]),
  )
  found.add('explain') // askGemini's default task

  for (const task of found) {
    assert.ok(KNOWN_TASKS.has(task), `KNOWN_TASKS is missing "${task}" from gemini.js`)
  }
})

test('KNOWN_TASKS covers the tasks sent from the screens and the new plan-tools task', () => {
  const expected = [
    'explain',
    'advise',
    'summarize-note',
    'tutor',
    'extract-action',
    'extract-actions',
    'generate-plan',
    'assess-submission',
    'assess-sleep',
    'sleep-recap',
    'explain-finance',
    'generate-note',
    'generate-course',
    'generate-lesson',
    'generate-quiz',
    'plan-tools',
  ]

  for (const task of expected) {
    assert.ok(KNOWN_TASKS.has(task), `KNOWN_TASKS is missing "${task}"`)
  }
})

test('every batch delete rule is a real client action', () => {
  const source = readFileSync(resolve(ROOT, 'src/lib/actions.js'), 'utf8')

  for (const action of DELETE_ACTIONS) {
    assert.ok(source.includes(`'${action}'`), `actions.js is missing "${action}"`)
  }
})

test('TOOL_NAMES matches the tool registry', () => {
  const registryNames = TOOLS.map((tool) => tool.name).sort()
  const declared = [...TOOL_NAMES].sort()

  assert.deepEqual(declared, registryNames)
})

test('ACTION_ARG_KEYS covers every non-id arg in ACTION_SCHEMA', () => {
  const schemaStart = PROXY_SOURCE.indexOf('const ACTION_SCHEMA')
  const argsStart = PROXY_SOURCE.indexOf('args: {', schemaStart)
  const argsEnd = PROXY_SOURCE.indexOf('propertyOrdering', argsStart)
  const block = PROXY_SOURCE.slice(argsStart, argsEnd)

  const schemaKeys = [...block.matchAll(/^\s*([a-z_]+):\s*\{/gm)]
    .map((match) => match[1])
    .filter((key) => key !== 'properties' && key !== 'args')

  assert.ok(schemaKeys.length > 20, 'could not read ACTION_SCHEMA.args.properties')

  const nonId = schemaKeys.filter((key) => key !== 'id' && !key.endsWith('_id'))
  const missing = nonId.filter((key) => !ACTION_ARG_KEYS.has(key))

  assert.deepEqual(missing, [], `ACTION_ARG_KEYS is missing: ${missing.join(', ')}`)
})

test('ACTION_ARG_KEYS has no extras beyond ACTION_SCHEMA', () => {
  const schemaStart = PROXY_SOURCE.indexOf('const ACTION_SCHEMA')
  const argsStart = PROXY_SOURCE.indexOf('args: {', schemaStart)
  const argsEnd = PROXY_SOURCE.indexOf('propertyOrdering', argsStart)
  const block = PROXY_SOURCE.slice(argsStart, argsEnd)

  const schemaKeys = [...block.matchAll(/^\s*([a-z_]+):\s*\{/gm)]
    .map((match) => match[1])
    .filter((key) => key !== 'properties')

  const extras = [...ACTION_ARG_KEYS].filter((key) => !schemaKeys.includes(key))
  assert.deepEqual(extras, [])
})
