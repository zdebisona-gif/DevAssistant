/*
 * Local tool orchestrator for the Zen-I Assistant.
 *
 * Gemini picks read-only tools; this module runs them against the user's own data,
 * pseudonymizes every label before anything leaves the device, and asks Gemini to
 * answer from the computed results. No React, no network, no writes.
 *
 * The two Gemini calls are injected so this file stays pure and testable.
 */

import { createPseudonymizer, guardResult } from './privacy.js'
import { getTool, manifest, validateArgs } from './registry.js'

/*
 * Local mirror of index.js runTool. Importing index.js here would create a cycle,
 * because index.js re-exports this module. Keep the two in sync.
 */
function runTool(name, args, ctx) {
  const tool = getTool(name)
  if (!tool) return { error: 'unknown_tool' }

  try {
    const clean = validateArgs(tool, args)
    return guardResult(tool, tool.run(clean, ctx), ctx)
  } catch {
    return { error: 'tool_failed' }
  }
}

const MAX_TOOL_CONTEXT_CHARS = 3500
const MAX_TOTAL_CONTEXT_CHARS = 3900
const MAX_PLAN_QUESTION_CHARS = 500
const TRUNCATION_NOTE = '\n… (truncated to fit)'
const CONTEXT_HEADER =
  'Tool results (already computed, tokens like P1/A1 stand for private names):'
const HISTORY_HEADER = 'Conversation so far:'
const FOLLOW_UP_NOTE =
  "The user's latest message may be a follow-up; answer it in light of the conversation so far."

function isGeminiUnavailable(error) {
  return error?.name === 'GeminiUnavailable'
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/*
 * History text was decoded for display, so it can contain real names that already
 * have tokens. Replace those whole values with their tokens before sending. When no
 * tool has issued a token yet (the plan step), there is nothing to replace.
 */
function encodeKnownValues(text, pseudo) {
  if (!text) return ''
  const pairs = Object.entries(pseudo.table())
    .filter(([, value]) => typeof value === 'string' && value.trim())
    .sort((a, b) => b[1].length - a[1].length)

  let out = String(text)
  for (const [token, value] of pairs) {
    const pattern = new RegExp(
      `(?<![A-Za-z0-9])${escapeRegExp(value)}(?![A-Za-z0-9])`,
      'gi',
    )
    out = out.replace(pattern, token)
  }
  return out
}

function buildToolBlock(entries, budget) {
  const lines = entries.map(
    (entry) =>
      `${entry.tool}: ${JSON.stringify(
        entry.error !== undefined ? { error: entry.error } : entry.result,
      )}`,
  )

  const cap = Math.min(MAX_TOOL_CONTEXT_CHARS, budget)
  let block = [CONTEXT_HEADER, ...lines].join('\n')
  if (block.length > cap) {
    if (cap <= TRUNCATION_NOTE.length) return ''
    block = block.slice(0, cap - TRUNCATION_NOTE.length).trimEnd() + TRUNCATION_NOTE
  }
  return block
}

export async function askWithTools({ question, ctx, deps, history }) {
  const pseudo = createPseudonymizer()
  const prefs = ctx?.prefs || {}
  const enabled = manifest(prefs).map((tool) => tool.name)
  if (!enabled.length) return { kind: 'off' }

  const historyText = String(history || '').trim()

  let plan
  try {
    /*
     * The planner only sees the user's own question. Conversation history is
     * pseudonymized and sent later, with the computed tool results.
     */
    plan = await deps.planTools({
      question: String(question || '').slice(0, MAX_PLAN_QUESTION_CHARS),
      enabled,
    })
  } catch (error) {
    if (isGeminiUnavailable(error)) throw error
    return { kind: 'none' }
  }

  const tools = Array.isArray(plan?.tools) ? plan.tools : []
  const clarify = String(plan?.clarify || '').trim()
  if (clarify && !tools.length) return { kind: 'clarify', text: clarify }
  if (!tools.length) return { kind: 'none' }

  const entries = tools.map((entry) => {
    const result = runTool(entry.name, entry.args, { ...ctx, pseudo })
    if (result && typeof result === 'object' && result.error) {
      return { tool: entry.name, error: result.error }
    }
    return { tool: entry.name, result }
  })

  /* Prior answers were decoded for display, so re-encode names tools just tokenized. */
  const encodedHistory = encodeKnownValues(historyText, pseudo)
  const historyBlock = encodedHistory
    ? `${HISTORY_HEADER}\n${encodedHistory}\n\n${FOLLOW_UP_NOTE}\n\n`
    : ''

  /* Trim the tool results first; the history header is never the thing that goes. */
  const toolBlock = buildToolBlock(entries, MAX_TOTAL_CONTEXT_CHARS - historyBlock.length)
  let context = historyBlock + toolBlock
  if (context.length > MAX_TOTAL_CONTEXT_CHARS) {
    context = context.slice(0, MAX_TOTAL_CONTEXT_CHARS)
  }

  let answer
  try {
    /* The user's typed question goes out as written, matching existing behavior. */
    answer = await deps.askGemini({ task: 'advise', question, context })
  } catch (error) {
    if (isGeminiUnavailable(error)) throw error
    return { kind: 'none' }
  }

  return {
    kind: 'answer',
    text: pseudo.decode(String(answer?.text || '')),
    sources: entries.map((entry) => entry.tool),
    sent: {
      question,
      tools: plan.tools,
      context,
      /* Token names only. Real names in pseudo.table() must never leave the device. */
      history: encodedHistory,
      tokens: Object.keys(pseudo.table()),
    },
    remaining: answer?.remaining,
    cap: answer?.cap,
    model: answer?.model,
  }
}
