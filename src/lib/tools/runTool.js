/*
 * Single definition of runTool for the local tool layer.
 *
 * It validates the arguments, runs the read-only tool, and sends the result through
 * the privacy pipeline before anything could leave the device. index.js re-exports
 * this; nothing else should define its own copy.
 */

import { guardResult } from './privacy.js'
import { getTool, validateArgs } from './registry.js'

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
