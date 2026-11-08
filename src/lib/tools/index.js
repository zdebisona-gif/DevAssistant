/*
 * Public entry point for the local tool layer.
 *
 * runTool is the only function Gemini will eventually call. It validates the
 * arguments, runs the read-only tool, and sends the result through the privacy
 * pipeline before anything could leave the device.
 */

import { guardResult } from './privacy.js'
import { getTool, manifest, TOOLS, validateArgs } from './registry.js'

export { TOOLS, getTool, manifest, validateArgs } from './registry.js'
export { askWithTools } from './orchestrator.js'
export {
  TIER0_KEYS,
  applyHidden,
  createPseudonymizer,
  guardResult,
  stripTier0,
} from './privacy.js'

export function runTool(name, args, ctx) {
  const tool = getTool(name)
  if (!tool) return { error: 'unknown_tool' }

  try {
    const clean = validateArgs(tool, args)
    return guardResult(tool, tool.run(clean, ctx), ctx)
  } catch {
    return { error: 'tool_failed' }
  }
}
