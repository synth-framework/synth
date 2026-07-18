// ============================================================
// EXECUTION: Public API
// ============================================================

export {
  synthesizeIntents,
  buildIntentGraph,
  deriveExpeditionBranch,
  type SynthesisInput,
  type SynthesisResult,
} from "./intent-synthesizer.js"

export {
  executeGraph,
  ExecutionHaltedError,
  type IntentExecutionResult,
  type CapabilityHandler,
  type ExecutionRuntimeOptions,
} from "./runtime.js"
