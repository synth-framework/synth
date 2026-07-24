// ============================================================
// SYNTH v2 — CAPABILITY TYPES
// ============================================================
// Capabilities are validated transformation functions over the project graph.
// They are the ONLY allowed mutation mechanism.
// ============================================================

import type { SynthEvent } from "./event.js"
import type { CanonicalState } from "./state.js"
import type { CapabilityInvocation } from "./transaction.js"
import type { DomainContext } from "./context.js"

/** Capability definition — deterministic typed transformation function */
export type Capability = {
  name: string
  description: string
  inputSchema: CapabilityInputSchema
  outputSchema: CapabilityOutputSchema
  preconditions: Precondition[]
  postconditions: Postcondition[]
  invariantsChecked: string[]
  sideEffects: boolean
  executionClass: "sync" | "async" | "long-running"
  handler: CapabilityHandler
}

/** Input schema for a capability */
export type CapabilityInputSchema = {
  required: string[]
  optional?: string[]
  types: Record<string, string>
}

/** Output schema for a capability */
export type CapabilityOutputSchema = {
  events: string[]
  resultType: string
}

/** Precondition — predicate that must hold before execution */
export type Precondition = {
  name: string
  evaluate: (intent: CapabilityInvocation, state: CanonicalState) => boolean
}

/** Postcondition — predicate that must hold after execution */
export type Postcondition = {
  name: string
  evaluate: (events: SynthEvent[], state: CanonicalState) => boolean
}

/** Capability handler — pure function that computes events from intent + state + derived state + context */
export type CapabilityHandler = (ctx: {
  intent: CapabilityInvocation
  state: CanonicalState
  derivedState: import("./derived-state.js").DerivedState
  executionCtx: DomainContext
}) => CapabilityResult

/** Result of capability execution */
export type CapabilityResult = {
  events: Array<{
    type: string
    payload: Record<string, unknown>
  }>
  result?: unknown
  mutations?: import("./transaction.js").MutationRequest[]
}

/** Capability registry — stores all registered capabilities */
export type CapabilityRegistry = {
  register: (cap: Capability) => void
  resolve: (name: string) => Capability | undefined
  list: () => string[]
}

/** Failure modes for capability execution */
export type FailureMode =
  | "INVALID_INTENT"
  | "PRECONDITION_FAILED"
  | "POLICY_DENIED"
  | "EXECUTION_ERROR"
  | "POSTCONDITION_VIOLATION"
  | "TRANSACTION_ABORTED"
  | "UNKNOWN_CAPABILITY"

/** Failure record */
export type ExecutionFailure = {
  mode: FailureMode
  message: string
  context: Record<string, unknown>
}
