/*
 * Local-only privacy pipeline for the Zen-I tool layer.
 *
 * Nothing here imports React, React Native, Expo, AsyncStorage or Supabase.
 * Every tool result passes through guardResult before it can be shown to Gemini:
 * tier-0 keys are stripped, the user's Hide balances settings are applied, labels
 * are replaced with stable tokens, and the payload is capped in size.
 */

/* Key names that must never leave the device. Matching is case-insensitive. */
export const TIER0_KEYS = Object.freeze([
  'id',
  'user_id',
  'password',
  'passcode',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'key',
  'api_key',
  'account_number',
  'accountnumber',
  'last4',
  'last_4',
  'reference',
  'ref',
  'body',
  'content',
  'email',
  'note',
])

const TIER0_SET = new Set(TIER0_KEYS)

function isTier0Key(key) {
  const k = String(key).toLowerCase()
  if (TIER0_SET.has(k)) return true
  if (k.endsWith('_id')) return true
  if (k.endsWith('_token') || k.endsWith('_secret') || k.endsWith('_key')) return true
  if (k.endsWith('_password')) return true
  if (k.includes('account') && k.endsWith('_number')) return true
  return false
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone)
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, item] of Object.entries(value)) out[key] = clone(item)
    return out
  }
  return value
}

/** Deep-clone and remove every tier-0 key at any depth. Never mutates the input. */
export function stripTier0(value) {
  if (Array.isArray(value)) return value.map(stripTier0)
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, item] of Object.entries(value)) {
      if (isTier0Key(key)) continue
      out[key] = stripTier0(item)
    }
    return out
  }
  return value
}

const isAccountLike = (node) =>
  Boolean(node) &&
  typeof node === 'object' &&
  (typeof node.kind === 'string' || 'opening_balance' in node)

const isDebtLike = (node) =>
  Boolean(node) &&
  typeof node === 'object' &&
  'direction' in node &&
  ('counterparty' in node || 'amount' in node)

/*
 * Mirrors src/lib/context.js:
 *   - hidden || accountsHidden: no account balances, no total, no per-account income
 *   - hidden: debts collapse to counts only
 */
export function applyHidden(result, { hidden = false, accountsHidden = false } = {}) {
  const hideAccounts = Boolean(hidden || accountsHidden)

  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk)
    if (!node || typeof node !== 'object') return node

    const out = {}
    for (const [key, value] of Object.entries(node)) {
      if (hideAccounts) {
        if (key === 'totalInAccounts' || key === 'accountsTotal' || key === 'totalBalance') continue
        if (key === 'balance' && isAccountLike(node)) continue
        if (key === 'opening_balance' && isAccountLike(node)) continue
        if (key === 'income' && isAccountLike(node)) continue
        if (key === 'spend' && isAccountLike(node)) continue
        if (key === 'byAccount') continue
      }
      if (hidden) {
        if (key === 'owedToMe' || key === 'iOwe' || key === 'outstanding') continue
        if (key === 'debts' && Array.isArray(value)) {
          out.debts = { count: value.length }
          continue
        }
        if (key === 'amount' && isDebtLike(node)) continue
      }
      out[key] = walk(value)
    }
    return out
  }

  return walk(clone(result))
}

const KIND_PREFIX = {
  person: 'P',
  account: 'A',
  merchant: 'M',
  note: 'N',
  course: 'C',
  project: 'J',
  planner: 'E',
}

const FIELD_KIND = {
  counterparty: 'person',
  person: 'person',
  account: 'account',
  account_name: 'account',
  merchant: 'merchant',
  note_title: 'note',
  course: 'course',
  course_name: 'course',
  module: 'course',
  module_title: 'course',
  lesson: 'course',
  lesson_title: 'course',
  next_title: 'course',
  project: 'project',
  project_title: 'project',
  planner: 'planner',
  entry_title: 'planner',
  task_title: 'planner',
}

const COLLECTION_KIND = {
  accounts: 'account',
  debts: 'person',
  notes: 'note',
  courses: 'course',
  modules: 'course',
  lessons: 'course',
  projects: 'project',
  planner: 'planner',
  entries: 'planner',
  tasks: 'planner',
  plan: 'planner',
}

/*
 * In-memory label pseudonymizer. Tokens are stable per instance and per entity
 * kind, and are only issued for values that actually occur in encoded results.
 * table() is for a future "what was sent" viewer; it must never be sent to Gemini.
 */
export function createPseudonymizer() {
  const counters = Object.create(null)
  const byKind = Object.create(null)
  const reverse = new Map()
  const all = Object.create(null)

  function tokenFor(kind, raw) {
    const value = String(raw)
    const normalized = value.trim().toLowerCase()
    if (!normalized) return value

    if (!byKind[kind]) byKind[kind] = new Map()
    const map = byKind[kind]
    if (map.has(normalized)) return map.get(normalized)

    counters[kind] = (counters[kind] || 0) + 1
    const token = `${KIND_PREFIX[kind]}${counters[kind]}`
    map.set(normalized, token)
    reverse.set(token, value)
    all[token] = value
    return token
  }

  function encodeNode(node, hint) {
    if (Array.isArray(node)) return node.map((item) => encodeNode(item, hint))
    if (!node || typeof node !== 'object') return node

    const out = {}
    for (const [key, value] of Object.entries(node)) {
      const lower = key.toLowerCase()
      const collectionKind = COLLECTION_KIND[lower]
      const childHint = Array.isArray(value) && collectionKind ? collectionKind : hint

      if (typeof value === 'string') {
        const kind = FIELD_KIND[lower] || (lower === 'title' || lower === 'name' ? hint : null)
        if (kind) {
          out[key] = tokenFor(kind, value)
          continue
        }
      }

      out[key] = encodeNode(value, childHint)
    }
    return out
  }

  function encode(value) {
    return encodeNode(value, null)
  }

  /* Whole-token replacement: P1 never matches inside P10. */
  function decode(text) {
    if (typeof text !== 'string') return text
    return text.replace(/(?<![A-Za-z0-9])[A-Z]\d+(?![A-Za-z0-9])/g, (token) => reverse.get(token) ?? token)
  }

  function table() {
    return { ...all }
  }

  return { encode, decode, table }
}

function longestArrayPath(node, path = [], best = { length: 0, path: null }) {
  if (Array.isArray(node)) {
    if (node.length > best.length) {
      best.length = node.length
      best.path = path
    }
    node.forEach((item, index) => longestArrayPath(item, [...path, index], best))
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      longestArrayPath(value, [...path, key], best)
    }
  }
  return best.path
}

function getAt(node, path) {
  return path.reduce((acc, key) => (acc == null ? acc : acc[key]), node)
}

function capSize(value, maxChars) {
  let working = clone(value)
  let omitted = 0

  if (JSON.stringify(working).length <= maxChars) return working

  const decorate = () => {
    if (Array.isArray(working)) return { items: working, truncated: true, omittedCount: omitted }
    return { ...working, truncated: true, omittedCount: omitted }
  }

  for (let guard = 0; guard < 5000; guard += 1) {
    if (JSON.stringify(decorate()).length <= maxChars) break
    const path = longestArrayPath(working)
    if (!path) break
    const array = getAt(working, path)
    if (!Array.isArray(array) || array.length === 0) break
    array.pop()
    omitted += 1
  }

  return decorate()
}

/*
 * The single gate every tool result passes through.
 *   1. tier > 2 is refused outright
 *   2. the per-domain preference gates tier-2 labels
 *   3. tier-0 keys are removed
 *   4. Hide balances is applied
 *   5. labels are pseudonymized for tier 2
 *   6. the serialized payload is capped
 */
export function guardResult(tool, rawResult, ctx = {}) {
  if (!tool || tool.tier > 2) return { error: 'tier_not_allowed' }

  const prefs = ctx.prefs || {}
  const domains = prefs.domains || {}
  const level = domains[tool.domain] || 'aggregates'
  if (level === 'off') return { error: 'domain_off' }
  if (level === 'aggregates' && tool.tier >= 2) return { error: 'labels_not_allowed' }

  let result = stripTier0(rawResult)
  result = applyHidden(result, ctx.privacy || {})

  if (tool.tier === 2) {
    if (!ctx.pseudo) return { error: 'pseudo_required' }
    result = ctx.pseudo.encode(result)
  }

  const maxChars = Number.isFinite(ctx.maxChars) ? ctx.maxChars : 1500
  return JSON.parse(JSON.stringify(capSize(result, maxChars)))
}
