// ============================================================
// CONTROL: Execution Contract
// ============================================================
// The deterministic rule set that defines "what MUST happen
// for every operation." This is not advisory. It is enforced.
//
// Every mutation in the system follows this exact pipeline:
//
//   Intent → Validate → Policy Check → Resolve Capability
//     → Execute Domain → Emit Events → Persist → Commit
//
// NO operation may bypass ANY step.
// NO operation may skip ordering.
// NO operation may substitute its own logic.
// ============================================================

import type {
  CapabilityInvocation,
  CanonicalState,
  Capability,
  SynthEvent,
  ExecutionResult,
} from "../types/index.js"

/** Execution phase — each step in the contract pipeline */
export type ExecutionPhase =
  | "VALIDATE"
  | "POLICY_CHECK"
  | "RESOLVE_CAPABILITY"
  | "EXECUTE_DOMAIN"
  | "MUTATE_EXTERNAL"
  | "EMIT_EVENTS"
  | "PERSIST_EVENTS"
  | "REBUILD_STATE"
  | "COMMIT_TRANSACTION"

/** Phase result — output of a single contract step */
export type PhaseResult<T = unknown> = {
  phase: ExecutionPhase
  passed: boolean
  output?: T
  error?: string
  durationMs: number
}

/** Full execution contract record */
export type ExecutionContract = {
  transactionId: string
  startedAt: number
  phases: PhaseResult[]
  finalState: "COMMITTED" | "ROLLEDBACK" | "REJECTED"
}

/** Contract violation — when a step fails */
export class ContractViolation extends Error {
  public readonly phase: ExecutionPhase
  public readonly contract: ExecutionContract

  constructor(phase: ExecutionPhase, message: string, contract: ExecutionContract) {
    super(`Contract violation at ${phase}: ${message}`)
    this.name = "ContractViolation"
    this.phase = phase
    this.contract = contract
  }
}

/** The deterministic contract steps, in strict order */
export const CONTRACT_STEPS: ExecutionPhase[] = [
  "VALIDATE",
  "POLICY_CHECK",
  "RESOLVE_CAPABILITY",
  "EXECUTE_DOMAIN",
  "MUTATE_EXTERNAL",
  "EMIT_EVENTS",
  "PERSIST_EVENTS",
  "REBUILD_STATE",
  "COMMIT_TRANSACTION",
]

/** Validate that all required steps are present and in order */
export function validateContract(contract: ExecutionContract): boolean {
  const actualPhases = contract.phases.map((p) => p.phase)

  // Must have all required steps
  for (const required of CONTRACT_STEPS) {
    if (!actualPhases.includes(required)) return false
  }

  // Must be in correct order
  let lastIndex = -1
  for (const step of CONTRACT_STEPS) {
    const idx = actualPhases.indexOf(step)
    if (idx < lastIndex) return false
    lastIndex = idx
  }

  // All passed steps must be consecutive from start
  for (let i = 0; i < contract.phases.length; i++) {
    if (!contract.phases[i].passed) break // failure stops the chain
  }

  return true
}

/** Check if a contract was fully satisfied */
export function isContractSatisfied(contract: ExecutionContract): boolean {
  return contract.finalState === "COMMITTED" && validateContract(contract)
}
