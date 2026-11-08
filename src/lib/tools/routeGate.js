/*
 * Routing gate for the Zen-I Assistant.
 *
 * The local engine is free and instant, but it confidently answers some open-ended
 * questions with the wrong single-domain result. This gate decides when a question
 * should go to the tool path instead. Pure: no React, no network.
 *
 * Rules are evaluated in order:
 *   1. empty question -> local
 *   2. follow-up after an AI answer -> tools
 *   3. crisp lookup   -> local (unless it also looks forward-looking or advisory)
 *   4. open-ended     -> tools
 *   5. generic local fallback -> tools
 *   6. otherwise      -> local
 */

import { CRISP_LOOKUPS, DOMAIN_WORDS, isFollowUp } from './history.js'

export { CRISP_LOOKUPS, DOMAIN_WORDS }

export const GENERIC_FALLBACK_PREFIX = 'I can answer from what you have logged: '

export const FUTURE_PHRASES = [
  'will i',
  'going to',
  'gonna',
  'planning to',
  'this january',
  'this february',
  'this march',
  'this april',
  'this may',
  'this june',
  'this july',
  'this august',
  'this september',
  'this october',
  'this november',
  'this december',
  'next january',
  'next february',
  'next march',
  'next april',
  'next may',
  'next june',
  'next july',
  'next august',
  'next september',
  'next october',
  'next november',
  'next december',
  'next month',
  'next year',
  'next quarter',
  'in january',
  'in february',
  'in march',
  'in april',
  'in may',
  'in june',
  'in july',
  'in august',
  'in september',
  'in october',
  'in november',
  'in december',
  'if i',
  'what if',
  'afford',
  'can i buy',
  'trip',
  'travel',
  'vacation',
  'upcoming',
]

export const ADVICE_PHRASES = [
  'how am i doing',
  'how will i look',
  'how do i look',
  'am i on track',
  'should i',
  'is it ok to',
  'is it okay to',
  'worth it',
  'enough money',
  'runway',
  'on track',
]

function hasWholeWord(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, 'i').test(text)
}

function hasAny(text, phrases) {
  return phrases.some((phrase) => hasWholeWord(text, phrase))
}

function crossDomainCount(text) {
  return Object.values(DOMAIN_WORDS).filter((words) => hasAny(text, words)).length
}

function isCrispLookup(text) {
  return CRISP_LOOKUPS.some((pattern) => pattern.test(text))
}

function localTextOf(localReply) {
  if (typeof localReply === 'string') return localReply
  return String(localReply?.answer || '')
}

export function shouldTryTools(question, localReply, options = {}) {
  const text = String(question || '').trim()
  if (!text) return { route: 'local', reason: 'empty' }

  /*
   * A short question after an AI answer leans on that answer. After a local answer
   * it does not, because the local engine had no conversation to lean on.
   */
  const history = options?.history
  if (history?.lastWasAi && isFollowUp(text, history)) {
    return { route: 'tools', reason: 'follow-up' }
  }

  const forwardLooking = hasAny(text, FUTURE_PHRASES)
  const advisory = hasAny(text, ADVICE_PHRASES)

  if (isCrispLookup(text) && !forwardLooking && !advisory) {
    return { route: 'local', reason: 'crisp_lookup' }
  }

  if (forwardLooking) return { route: 'tools', reason: 'forward_looking' }
  if (advisory) return { route: 'tools', reason: 'advisory' }
  if (crossDomainCount(text) >= 2) return { route: 'tools', reason: 'cross_domain' }

  if (localTextOf(localReply).startsWith(GENERIC_FALLBACK_PREFIX)) {
    return { route: 'tools', reason: 'generic_fallback' }
  }

  return { route: 'local', reason: 'default' }
}
