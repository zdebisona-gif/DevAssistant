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

const MAX_CONTEXT_CHARS = 3500
const TRUNCATION_NOTE = '\n… (truncated to fit)'
const CONTEXT_HEADER =
  'Tool results (already computed, tokens like P1/A1 stand for private names):'

function isGeminiUnavailable(error) {
  return error?.name === 'GeminiUnavailable'
}

export async function askWithTools({ question, ctx, deps }) {
  const pseudo = createPseudonymizer()
  const prefs = ctx?.prefs || {}
  const enabled = manifest(prefs).map((tool) => tool.name)
  if (!enabled.length) return { kind: 'off' }

  let plan
  try {
    plan = await deps.planTools({ question, enabled })
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

  const lines = entries.map(
    (entry) =>
      `${entry.tool}: ${JSON.stringify(
        entry.error !== undefined ? { error: entry.error } : entry.result,
      )}`,
  )
  let context = [CONTEXT_HEADER, ...lines].join('\n')
  if (context.length > MAX_CONTEXT_CHARS) {
    context =
      context.slice(0, MAX_CONTEXT_CHARS - TRUNCATION_NOTE.length).trimEnd() +
      TRUNCATION_NOTE
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
      tokens: Object.keys(pseudo.table()),
    },
    remaining: answer?.remaining,
    cap: answer?.cap,
    model: answer?.model,
  }
}
