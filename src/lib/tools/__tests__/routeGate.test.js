import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ADVICE_PHRASES,
  DOMAIN_WORDS,
  FUTURE_PHRASES,
  GENERIC_FALLBACK_PREFIX,
  shouldTryTools,
} from '../routeGate.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../..')

/*
 * Add new real-world misses here before tuning phrases.
 * Each case is a real question and the route the user expects.
 */
const CASES = [
  // Open-ended -> tools
  { q: 'I am going to china this december. How will I look financially', route: 'tools' },
  { q: 'Can I afford a 3000 gadget this month?', route: 'tools' },
  { q: 'how am I doing?', route: 'tools' },
  { q: 'should I save more or pay off debt', route: 'tools' },
  { q: 'am I on track this month', route: 'tools' },
  { q: 'is it worth it to buy a laptop next month', route: 'tools' },
  { q: 'what if I spend 500 less on food', route: 'tools' },
  { q: 'do I have enough money for a trip in march', route: 'tools' },
  { q: 'how are my money and my study plan this week', route: 'tools' },
  { q: 'will I have enough runway next year', route: 'tools' },
  { q: "I'm planning to travel in july", route: 'tools' },
  { q: 'upcoming expenses for my project deadline', route: 'tools' },
  { q: 'can i buy a new laptop', route: 'tools' },
  { q: 'how do i look financially next quarter', route: 'tools' },
  { q: 'is it okay to skip my budget this week', route: 'tools' },

  // Crisp lookups and safe defaults -> local
  { q: 'how much did I spend on food this month?', route: 'local' },
  { q: "what's my balance", route: 'local' },
  { q: "what's on my plan today", route: 'local' },
  { q: 'who owes me money', route: 'local' },
  { q: 'show my budgets', route: 'local' },
  { q: "what's my finance score", route: 'local' },
  { q: 'how many study hours this week', route: 'local' },
  { q: 'hello', route: 'local' },
  { q: 'thanks', route: 'local' },
  { q: '', route: 'local' },
  { q: 'list my projects', route: 'local' },
  { q: 'how much have I saved', route: 'local' },
  { q: 'what is my budget', route: 'local' },
  { q: 'tell me about my notes', route: 'local' },
]

test('routes real-world questions to the expected path', () => {
  for (const { q, route } of CASES) {
    const result = shouldTryTools(q, { answer: 'A local answer.' })
    assert.equal(result.route, route, `${JSON.stringify(q)} -> ${result.reason}`)
    assert.equal(typeof result.reason, 'string')
  }
})

test('the generic local fallback always goes to tools', () => {
  const generic = { answer: `${GENERIC_FALLBACK_PREFIX}3 transactions · 2 notes.` }

  assert.equal(shouldTryTools('hello', generic).route, 'tools')
  assert.equal(shouldTryTools('tell me something', generic).route, 'tools')
  assert.equal(shouldTryTools('hello', generic).reason, 'generic_fallback')
})

test('an empty question stays local even with the generic fallback', () => {
  const generic = { answer: `${GENERIC_FALLBACK_PREFIX}3 transactions.` }

  assert.equal(shouldTryTools('', generic).route, 'local')
  assert.equal(shouldTryTools('', generic).reason, 'empty')
})

test('the generic fallback prefix matches the string actually returned by ask.js', () => {
  const source = readFileSync(resolve(ROOT, 'src/lib/ask.js'), 'utf8')

  assert.ok(
    source.includes(GENERIC_FALLBACK_PREFIX),
    `ask.js no longer contains "${GENERIC_FALLBACK_PREFIX}"`,
  )
})

test('phrase lists are exported and non-empty', () => {
  assert.ok(Array.isArray(FUTURE_PHRASES) && FUTURE_PHRASES.length > 0)
  assert.ok(Array.isArray(ADVICE_PHRASES) && ADVICE_PHRASES.length > 0)
  assert.ok(Object.keys(DOMAIN_WORDS).length >= 4)

  for (const [domain, words] of Object.entries(DOMAIN_WORDS)) {
    assert.ok(Array.isArray(words) && words.length > 0, `${domain} has no words`)
  }
})
