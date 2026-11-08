/*
 * Public entry point for the local tool layer.
 *
 * runTool lives in runTool.js so the orchestrator can import it without a cycle.
 * This barrel re-exports the tool registry, the privacy helpers and the orchestrator.
 */

export { TOOLS, getTool, manifest, validateArgs } from './registry.js'
export { runTool } from './runTool.js'
export { askWithTools } from './orchestrator.js'
export {
  TIER0_KEYS,
  applyHidden,
  createPseudonymizer,
  guardResult,
  stripTier0,
} from './privacy.js'
