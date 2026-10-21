/*
 * Detects explicit requests to *draft* a note with AI. Deliberately narrower than the
 * local create-note commands in actions.js, which stay instant and on-device.
 */

const NOTE_DRAFT_RE =
  /^(?:draft|generate|write|make)\s+(?:me\s+)?(?:a\s+)?(?:quick\s+)?note\s+(?:about|on|covering|for)\s+(.+)$/i
const NOTE_DRAFT_COLON_RE = /^(?:draft|generate)\s+(?:me\s+)?(?:a\s+)?note\s*[:\-]\s*(.+)$/i

export const NOTE_DRAFT_NOTICE = 'AI draft · verify facts before saving.'

/** @returns {string|null} the topic to generate, or null when this is not a draft request. */
export function extractNotePrompt(text) {
  const value = String(text || '').trim().replace(/\s+/g, ' ')
  if (!value || value.endsWith('?')) return null

  const match = value.match(NOTE_DRAFT_RE) || value.match(NOTE_DRAFT_COLON_RE)
  if (!match) return null

  const prompt = match[1].replace(/^["']|["']$/g, '').trim()
  return prompt || null
}
