// ============================================================
// CONTROL: Execution Gate — Single Mutation Authority
// ============================================================
// This is the ONLY component in the entire system that may
// initiate a state mutation. All paths lead here.
//
// Enforcement rule:
//   If a mutation did not pass through ExecutionGate,
//   the system state is INVALID by definition.
//
// Architecture:
//   API → ExecutionGate → RuntimeEngine → Domain → EventStore
//   Genesis → ExecutionGate → RuntimeEngine → Domain → EventStore
//   (NO OTHER MUTATION PATHS EXIST)
// ============================================================

import crypto from "crypto"
import type {
  CapabilityInvocation,
  CanonicalState,
  ExecutionResult,
  SynthEvent,
  ExecutionContext,
} from "../types/index.js"
import type { ValidationResult } from "../types/index.js"
import type { Registry } from "../capability/registry.js"
import type { PolicyEngine } from "../policy/policy-engine.js"
import type { RuntimeEngine } from "../runtime/engine.js"
import type { EventStore } from "../infra/event-store.js"
import type { IStateStore } from "../infra/state-store.js"
import {
  CONTRACT_STEPS,
  validateContract,
  isContractSatisfied,
} from "./execution-contract.js"
import type {
  ExecutionContract,
  PhaseResult,
  ExecutionPhase,
} from "./execution-contract.js"

export { ContractViolation } from "./execution-contract.js"

/** Deterministic command identifier from intent + prior state hash. */
function deterministicCommandId(
  invocation: CapabilityInvocation,
  priorStateHash: string,
): string {
  const payload = sortKeys(invocation.payload)
  const data = JSON.stringify({
    actor: invocation.actor,
    capability: invocation.capability,
    payload,
    priorStateHash,
  })
  return crypto.createHash("sha256").update(data).digest("hex")
}

function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key])
  }
  return sorted
}

/** Internal error indicating a specific execution phase failed */
class PhaseFailedError extends Error {
  constructor(
    public readonly phase: ExecutionPhase,
    message: string
  ) {
    super(message)
    this.name = "PhaseFailedError"
  }
}

/** Execution Gate — the single mutation authority */
export class ExecutionGate {
  constructor(
    private registry: Registry,
    private policyEngine: PolicyEngine,
    private runtime: RuntimeEngine,
    private eventStore: EventStore,
    private stateStore: IStateStore,
    private validator: (invocation: CapabilityInvocation) => ValidationResult,
  ) {}

  // ===== PUBLIC API: The only mutation entry points =====

  /**
   * Execute an intent through the full deterministic contract.
   * This is THE ONLY way to mutate system state.
   */
  async execute(invocation: CapabilityInvocation): Promise<{
    result: ExecutionResult
    contract: ExecutionContract
  }> {
    const phases: PhaseResult[] = []

    // Get current state for policy checks and deterministic context
    const currentState = await this.runtime.getState()
    const sequence = await this.eventStore.count()
    const lastEvent = await this.eventStore.getLastEvent()
    const previousHash = lastEvent?.eventHash ?? "genesis"
    const commandId = deterministicCommandId(invocation, currentState.stateHash)
    const startedAt = sequence

    const context: ExecutionContext = {
      timestamp: sequence,
      commandId,
      actor: invocation.actor,
      capability: invocation.capability,
      sequence,
      previousHash,
    }

    try {
      // === PHASE 1: VALIDATE ===
      const validation = this.runPhase("VALIDATE", () => {
        const result = this.validator(invocation)
        if (!result.valid) {
          const errors = result.errors
            .filter((e) => e.severity === "error")
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")
          throw new Error(`VALIDATION_FAILED: ${errors}`)
        }
        return result
      })
      phases.push(validation)

      // === PHASE 2: POLICY CHECK ===
      const policyCheck = this.runPhase("POLICY_CHECK", () => {
        const result = this.policyEngine.isAllowed(invocation, currentState)
        if (!result.allowed) {
          throw new Error(`POLICY_DENIED: ${result.reason || "Execution blocked by policy"}`)
        }
        return result
      })
      phases.push(policyCheck)

      // === PHASE 3: RESOLVE CAPABILITY ===
      const resolveCap = this.runPhase("RESOLVE_CAPABILITY", () => {
        const cap = this.registry.resolve(invocation.capability)
        if (!cap) {
          // Not a hard failure — unknown capabilities produce no events
          return { name: invocation.capability, resolved: false }
        }
        return { name: cap.name, resolved: true }
      })
      phases.push(resolveCap)

      // === PHASE 4: EXECUTE DOMAIN ===
      const executionResult = await this.runtime.execute(invocation, context)
      phases.push({
        phase: "EXECUTE_DOMAIN",
        passed: true,
        output: { capability: invocation.capability, eventCount: executionResult.events.length },
        durationMs: 0,
      })

      // === PHASE 5: EMIT EVENTS ===
      phases.push({
        phase: "EMIT_EVENTS",
        passed: true,
        output: { eventCount: executionResult.events.length },
        durationMs: 0,
      })

      // === PHASE 6: PERSIST EVENTS (single write path) ===
      if (executionResult.events.length > 0) {
        await this.eventStore.appendBatch(executionResult.events)
      }
      phases.push({
        phase: "PERSIST_EVENTS",
        passed: true,
        output: { persisted: executionResult.events.length },
        durationMs: 0,
      })

      // === PHASE 7: REBUILD STATE ===
      const newState = await this.runtime.getState()
      phases.push({
        phase: "REBUILD_STATE",
        passed: true,
        output: { stateHash: newState.stateHash },
        durationMs: 0,
      })

      // === PHASE 8: COMMIT TRANSACTION ===
      const tx = {
        ...executionResult.transaction,
        beforeStateHash: currentState.stateHash,
        afterStateHash: newState.stateHash,
      }
      await this.stateStore.commit(tx, newState)
      phases.push({
        phase: "COMMIT_TRANSACTION",
        passed: true,
        output: { transactionId: tx.id },
        durationMs: 0,
      })

      const contract: ExecutionContract = {
        transactionId: commandId,
        startedAt,
        phases,
        finalState: "COMMITTED",
      }

      return { result: { ...executionResult, transaction: tx }, contract }

    } catch (err) {
      // Determine which phase failed
      const failedPhase = err instanceof PhaseFailedError ? err.phase : this.identifyFailedPhase(phases)
      const message = err instanceof Error ? err.message : String(err)

      // Ensure the failed phase is recorded in the contract
      const existing = phases.find((p) => p.phase === failedPhase)
      if (!existing) {
        phases.push({
          phase: failedPhase,
          passed: false,
          error: message,
          durationMs: 0,
        })
      } else if (existing.passed) {
        existing.passed = false
        existing.error = message
      }

      const contract: ExecutionContract = {
        transactionId: commandId,
        startedAt,
        phases,
        finalState: "REJECTED",
      }

      throw new ExecutionGateError(
        failedPhase,
        message,
        contract,
        invocation,
      )
    }
  }

  /**
   * Return the hash of the last event in the log, or "genesis" if the log
   * is empty. Used by genesis callers to chain seed events correctly.
   */
  async getLastEventHash(): Promise<string> {
    const events = await this.eventStore.loadAll()
    if (events.length === 0) return "genesis"
    return events[events.length - 1].eventHash
  }

  /**
   * Genesis bootstrap execution.
   *
   * This is the ONLY way seed events may be committed. It bypasses
   * operational policy and capability resolution because those systems
   * are not yet active, but it still uses the guarded EventStore so the
   * append path is identical to operational execution.
   */
  async executeGenesis(events: SynthEvent[]): Promise<{
    committed: number
    finalState: CanonicalState
  }> {
    if (events.length === 0) {
      const finalState = await this.runtime.getState()
      return { committed: 0, finalState }
    }

    // Single batch commit through the guarded store
    await this.eventStore.appendBatch(events)

    // Rebuild state from the committed events
    const finalState = await this.runtime.getState()
    return { committed: events.length, finalState }
  }

  /**
   * Verify that a historical contract was satisfied.
   * Used for audit and replay validation.
   */
  verifyContract(contract: ExecutionContract): boolean {
    return isContractSatisfied(contract)
  }

  /**
   * Audit: check that all system mutations went through the gate.
   * Returns list of contract violations.
   */
  auditContracts(contracts: ExecutionContract[]): {
    total: number
    satisfied: number
    violations: Array<{ txId: string; phase: ExecutionPhase; reason: string }>
  } {
    const violations: Array<{ txId: string; phase: ExecutionPhase; reason: string }> = []

    for (const contract of contracts) {
      if (!validateContract(contract)) {
        const failedPhase = contract.phases.find((p) => !p.passed)
        violations.push({
          txId: contract.transactionId,
          phase: failedPhase?.phase || "VALIDATE",
          reason: failedPhase?.error || "Contract validation failed",
        })
      }
    }

    return {
      total: contracts.length,
      satisfied: contracts.length - violations.length,
      violations,
    }
  }

  // ===== INTERNAL =====

  private runPhase<T>(phase: ExecutionPhase, fn: () => T): PhaseResult<T> {
    try {
      const output = fn()
      return { phase, passed: true, output, durationMs: 0 }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      // Record the failed phase, then rethrow so the outer contract handler catches it
      throw new PhaseFailedError(phase, error)
    }
  }

  private identifyFailedPhase(phases: PhaseResult[]): ExecutionPhase {
    // Find the first phase that either failed or is missing
    for (const step of CONTRACT_STEPS) {
      const found = phases.find((p) => p.phase === step)
      if (!found || !found.passed) return step
    }
    return "VALIDATE"
  }
}

/** Error thrown when the execution gate rejects an operation */
export class ExecutionGateError extends Error {
  public readonly phase: ExecutionPhase
  public readonly contract: ExecutionContract
  public readonly invocation: CapabilityInvocation

  constructor(
    phase: ExecutionPhase,
    message: string,
    contract: ExecutionContract,
    invocation: CapabilityInvocation,
  ) {
    super(`ExecutionGate rejected at ${phase}: ${message}`)
    this.name = "ExecutionGateError"
    this.phase = phase
    this.contract = contract
    this.invocation = invocation
  }
}
