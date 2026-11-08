/*
 * Conversation memory for the Zen-I Assistant.
 *
 * The Ask screen keeps its thread in component state. This module turns that thread
 * into a small, bounded text block that can be sent with the next question, and
 * decides whether a short question is a follow-up to the previous turn.
 *
 * Pure: no React, no network.
 */

export const FOLLOW_UP_CUES = [
  'and',
  'what about',
  'how about',
  'so',
  'then',
  'also',
  'ok',
  'okay',
  'but',
  'and if',
  'what if',
  'i would need',
  'i need',
  'i have',
  'it is',
  "it's",
  "that's",
]

/* Shared with routeGate.js so "crisp lookup" means the same thing in both places. */
export const CRISP_LOOKUPS = [
  /\bhow much (?:did|have) i (?:spend|spent|earn|earned|save|saved)\b/i,
  /\bwhat(?:'s| is) my (?:finance )?(?:balance|budget|score)\b/i,
  /\bwhat(?:'s| is) on my plan\b/i,
  /\bwho owes\b/i,
  /^(?:show|list)\b/i,
]

/* Shared with routeGate.js for cross-domain detection. */
export const DOMAIN_WORDS = {
  money: [
    'money',
    'finance',
    'financial',
    'financially',
    'spend',
    'spending',
    'spent',
    'budget',
    'budgets',
    'income',
    'salary',
    'debt',
    'debts',
    'save',
    'saving',
    'savings',
    'afford',
    'balance',
    'cash',
    'cost',
    'expense',
    'expenses',
  ],
  plan: ['plan', 'schedule', 'planner', 'calendar', 'task', 'tasks', 'event', 'events', 'routine'],
  study: [
    'study',
    'studying',
    'learn',
    'learning',
    'course',
    'courses',
    'lesson',
    'lessons',
    'quiz',
    'school',
    'class',
    'classes',
  ],
  projects: ['project', 'projects', 'deadline', 'deadlines', 'deliverable', 'deliverables'],
}

const TURN_CHARS = 160

function hasWholeWord(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text)
}

function startsWithCue(text, cue) {
  const escaped = cue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped}(?![a-z0-9])`, 'i').test(text)
}

function clip(text, max = TURN_CHARS) {
  const value = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

function render(exchanges) {
  const lines = []
  for (const exchange of exchanges) {
    if (exchange.user) lines.push(`You: ${exchange.user}`)
    if (exchange.assistant) lines.push(`Zen-I: ${exchange.assistant}`)
  }
  return lines.join('\n')
}

/*
 * Last few exchanges as plain text. Action cards, note drafts, planner cards and
 * error cards are skipped: only ordinary question/answer turns are remembered.
 */
export function buildHistory(messages, { maxTurns = 3, maxChars = 700 } = {}) {
  const list = Array.isArray(messages) ? messages : []
  const exchanges = []
  let current = null

  for (const message of list) {
    if (!message || typeof message !== 'object') continue

    if (message.role === 'user') {
      const text = clip(message.text)
      if (!text) continue
      current = { user: text, assistant: null }
      exchanges.push(current)
      continue
    }

    if (message.role !== 'assistant') continue
    /* Any special card is not a plain answer. */
    if (message.kind) continue

    const text = clip(message.answer)
    if (!text) continue

    if (current && !current.assistant) {
      current.assistant = text
    } else {
      current = { user: null, assistant: text }
      exchanges.push(current)
    }
  }

  if (!exchanges.length) return { text: '', turns: 0 }

  let usable = exchanges.slice(-Math.max(1, maxTurns))
  let text = ''
  let turns = 0

  while (usable.length) {
    text = render(usable)
    if (text.length <= maxChars) {
      turns = usable.length
      break
    }
    if (usable.length === 1) {
      /* One turn left and still too long: hard trim it. */
      text = text.slice(0, Math.max(0, maxChars)).trimEnd()
      turns = text ? 1 : 0
      break
    }
    usable = usable.slice(1)
  }

  return { text, turns }
}

/*
 * A short, non-lookup question with no domain words of its own is assumed to lean
 * on the previous turn ("I would need 50k"). Questions that carry their own domain
 * only count as follow-ups when they start with a cue ("what about next month?").
 */
export function isFollowUp(question, history) {
  const text = String(question || '').trim()
  if (!text) return false
  if ((Number(history?.turns) || 0) <= 0) return false
  if (text.length > 60) return false
  if (CRISP_LOOKUPS.some((pattern) => pattern.test(text))) return false

  const hasDomainWord = Object.values(DOMAIN_WORDS).some((words) =>
    words.some((word) => hasWholeWord(text, word)),
  )
  if (!hasDomainWord) return true

  return FOLLOW_UP_CUES.some((cue) => startsWithCue(text, cue))
}
