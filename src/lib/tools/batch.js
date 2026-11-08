/*
 * Pure helpers for multi-action extraction.
 *
 * The proxy can return several proposed actions for one message. These helpers turn
 * them into proposals, stop a note draft that only echoes the user's message, and put
 * deletes last. No React, no network.
 */

/* "make me a note about budgeting" must take the note-draft path. */
export const NOTE_ROUTE_PATTERN =
  /^(make|create|write|draft|generate)( me)?( a| an)? note (about|on|for|regarding)\b/i

const ECHO_THRESHOLD = 0.8

function noteBodyOf(proposal) {
  const body =
    proposal?.payload?.body ?? proposal?.args?.body ?? proposal?.body ?? ''
  return String(body)
}

/* Longest common subsequence ratio: an echoed body lines up almost perfectly. */
function echoRatio(body, message) {
  if (!body.length) return 1
  const width = message.length
  let prev = new Uint32Array(width + 1)
  let curr = new Uint32Array(width + 1)

  for (let i = 1; i <= body.length; i += 1) {
    for (let j = 1; j <= width; j += 1) {
      curr[j] =
        body[i - 1] === message[j - 1]
          ? prev[j - 1] + 1
          : Math.max(prev[j], curr[j - 1])
    }
    const swap = prev
    prev = curr
    curr = swap
    curr.fill(0)
  }

  return prev[width] / body.length
}

/**
 * Mark a create_note proposal whose body is just the user's message echoed back.
 * It is flagged instead of dropped, so the caller can switch it to a draft.
 */
export function dropEchoNote(proposals, message) {
  const text = String(message || '').trim().toLowerCase()
  const list = Array.isArray(proposals) ? proposals : []

  return list.map((proposal) => {
    if (!proposal || proposal.action !== 'create_note') return proposal

    const body = noteBodyOf(proposal).trim().toLowerCase()
    if (!body) return proposal

    const echo = text.includes(body) || echoRatio(body, text) >= ECHO_THRESHOLD
    return echo ? { ...proposal, needsDraft: true } : proposal
  })
}

/** Build proposals in the model's order, keeping failures addressable. */
export function buildBatch(actions, options = {}) {
  const { buildExtractedProposal } = options
  const proposals = []
  const errors = []
  const list = Array.isArray(actions) ? actions : []

  if (typeof buildExtractedProposal !== 'function') {
    return {
      proposals,
      errors: list.map((entry) => ({ action: entry?.action, error: 'no_builder' })),
    }
  }

  for (const entry of list) {
    let built = null
    try {
      built = buildExtractedProposal(entry)
    } catch {
      built = null
    }

    if (!built) continue
    if (built.ok) proposals.push(built.proposal)
    else errors.push({ action: entry?.action, error: built.error })
  }

  return { proposals, errors }
}

/** Creates and edits first, deletes last; otherwise the original order. */
export function orderBatch(proposals) {
  const list = Array.isArray(proposals) ? proposals : []
  const rest = []
  const deletes = []

  for (const proposal of list) {
    if (String(proposal?.action || '').startsWith('delete_')) deletes.push(proposal)
    else rest.push(proposal)
  }

  return [...rest, ...deletes]
}
