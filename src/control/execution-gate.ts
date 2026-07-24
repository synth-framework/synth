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
  MutationRequest,
  MutationProvider,
} from "../types/index.js"
import type { ValidationResult } from "../types/index.js"
import { computeEventHash } from "../core/hash.js"
import type { Registry } from "../capability/registry.js"
import type { PolicyEngine } from "../policy/policy-engine.js"
import type { RuntimeEngine } from "../runtime/engine.js"
import type { EventStore } from "../infra/event-store.js"
import { EVENT_STORE_WRITE_TOKEN } from "../infra/event-store.js"
import type { IStateStore } from "../infra/state-store.js"
import { getLifecycleContinuation, MAX_LIFECYCLE_DEPTH } from "../runtime/governance-lifecycle.js"
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

/** Result of a mutation authority check */
export type MutationAuthorization =
  | { allowed: true; authority: string; reason: string }
  | { allowed: false; reason: string }

/** Execution Gate — the single mutation authority */
export class ExecutionGate {
  constructor(
    private registry: Registry,
    private policyEngine: PolicyEngine,
    private runtime: RuntimeEngine,
    private eventStore: EventStore,
    private stateStore: IStateStore,
    private validator: (invocation: CapabilityInvocation) => ValidationResult,
    private mutationProviders: Map<string, MutationProvider> = new Map(),
  ) {}

  // ===== PUBLIC API: The only mutation entry points =====

  /**
   * Execute an intent through the full deterministic contract.
   * This is THE ONLY way to mutate system state.
   */
  async execute(
    invocation: CapabilityInvocation,
    lifecycleDepth = 0,
  ): Promise<{
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
        for (const precondition of cap.preconditions) {
          if (!precondition.evaluate(invocation, currentState)) {
            throw new Error(`PRECONDITION_FAILED: ${precondition.name}`)
          }
        }
        return { name: cap.name, resolved: true, preconditionsChecked: cap.preconditions.length }
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

      // === PHASE 4b: EXECUTE AUTHORIZED MUTATIONS ===
      if (executionResult.mutations && executionResult.mutations.length > 0) {
        const mutationPhase = await this.runMutationPhase(executionResult.mutations, invocation.actor)
        phases.push(mutationPhase)
        if (!mutationPhase.passed) {
          throw new Error(mutationPhase.error || "MUTATION_FAILED")
        }
      }

      // === PHASE 5: EMIT EVENTS ===
      phases.push({
        phase: "EMIT_EVENTS",
        passed: true,
        output: { eventCount: executionResult.events.length },
        durationMs: 0,
      })

      // === PHASE 6: PERSIST EVENTS (single write path) ===
      const eventsToPersist = [...executionResult.events]
      if (executionResult.mutations && executionResult.mutations.length > 0) {
        const authorizedEvent = await this.createAuthorizedEvent(executionResult.mutations, invocation.actor)
        if (authorizedEvent) eventsToPersist.push(authorizedEvent)
      }
      if (eventsToPersist.length > 0) {
        await this.eventStore.appendBatch(eventsToPersist, EVENT_STORE_WRITE_TOKEN)
      }
      phases.push({
        phase: "PERSIST_EVENTS",
        passed: true,
        output: { persisted: eventsToPersist.length },
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

      // === LIFECYCLE CONTINUATION ===
      // Automatically progress the governance lifecycle when the committed
      // domain events trigger an expected transition (e.g. review gate
      // approval → acceptance gate, acceptance → convergence, etc.).
      // Certification and manual governance flows may opt out via context.
      if (lifecycleDepth < MAX_LIFECYCLE_DEPTH && invocation.context?.disableLifecycleContinuation !== true) {
        try {
          const updatedState = await this.runtime.getState()
          const continuation = getLifecycleContinuation(
            updatedState,
            executionResult.events,
            invocation.actor,
          )
          if (continuation) {
            // Execute the next lifecycle step but discard its return — the
            // caller receives this invocation's result, not the child's.
            await this.execute(continuation.invocation, lifecycleDepth + 1)
          }
        } catch (lifecycleErr) {
          // Lifecycle continuation failed but the original transaction is
          // already committed. Surface the error by appending a diagnostic
          // phase so callers can observe what went wrong.
          const msg = lifecycleErr instanceof Error ? lifecycleErr.message : String(lifecycleErr)
          phases.push({
            phase: "LIFECYCLE_CONTINUATION",
            passed: false,
            error: msg,
            durationMs: 0,
          })
        }
      }

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
    await this.eventStore.appendBatch(events, EVENT_STORE_WRITE_TOKEN)

    // Rebuild state from the committed events
    const finalState = await this.runtime.getState()
    return { committed: events.length, finalState }
  }

  /**
   * Mutation Authority gate.
   *
   * Checks whether a proposed repository mutation is authorized by an approved
   * Mission and an authorized Expedition. Returns `{ allowed: false, reason }`
   * when any requirement is not met.
   *
   * This is the runtime enforcement primitive for the Mutation Authority
   * invariant in the Constitutional Baseline.
   */
  async authorize(mutation: MutationRequest): Promise<MutationAuthorization> {
    const state = await this.runtime.getState()

    // 1. Authority must exist: at least one approved Mission.
    const approvedMissions = Object.values(state.missions).filter(
      (m) => m.status === "active"
    )
    if (approvedMissions.length === 0) {
      return { allowed: false, reason: "No approved Mission exists" }
    }

    // 2. Lifecycle must permit execution: at least one approved Expedition.
    const authorizedExpeditions = Object.values(state.expeditions).filter(
      (e) => e.status === "approved" || e.status === "committed" || e.status === "executing"
    )
    if (authorizedExpeditions.length === 0) {
      return { allowed: false, reason: "No authorized Expedition exists" }
    }

    // 3. Scope must be contained within the approved expedition scope, if scope
    //    is declared. If no scope is declared, the expedition is treated as
    //    unscoped and any mutation is allowed (preserves existing behavior).
    const scopedExpeditions = authorizedExpeditions.filter(
      (e) => Array.isArray(e.metadata?.scope) && e.metadata.scope.length > 0
    )
    if (scopedExpeditions.length > 0) {
      const allowedByScope = scopedExpeditions.some((e) =>
        (e.metadata.scope as string[]).some((scope) => mutation.target.startsWith(scope))
      )
      if (!allowedByScope) {
        return {
          allowed: false,
          reason: "Mutation target is outside authorized expedition scope",
        }
      }
    }

    // 4. ExecutionGate must be open (this method is invoked through it).
    const authority = authorizedExpeditions[0]
    return {
      allowed: true,
      authority: authority.id,
      reason: "Mutation authorized by ExecutionGate",
    }
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

  /**
   * Register a mutation provider for a capability namespace.
   * Providers are invoked only after mutation authority is confirmed.
   */
  registerMutationProvider(provider: MutationProvider): void {
    this.mutationProviders.set(provider.namespace, provider)
  }

  // ===== INTERNAL =====

  private async runMutationPhase(
    mutations: MutationRequest[],
    actor: string,
  ): Promise<PhaseResult> {
    for (const mutation of mutations) {
      const auth = await this.authorize({ ...mutation, actor })
      if (!auth.allowed) {
        return {
          phase: "MUTATE_EXTERNAL",
          passed: false,
          error: auth.reason,
          durationMs: 0,
        }
      }

      const provider = this.mutationProviders.get(mutation.capability)
      if (!provider) {
        return {
          phase: "MUTATE_EXTERNAL",
          passed: false,
          error: `No mutation provider registered for capability: ${mutation.capability}`,
          durationMs: 0,
        }
      }

      const result = await provider.mutate(mutation)
      if (!result.success) {
        return {
          phase: "MUTATE_EXTERNAL",
          passed: false,
          error: result.error || `Mutation failed for ${mutation.target}`,
          durationMs: 0,
        }
      }
    }

    return {
      phase: "MUTATE_EXTERNAL",
      passed: true,
      output: { mutations: mutations.length },
      durationMs: 0,
    }
  }

  private async createAuthorizedEvent(
    mutations: MutationRequest[],
    actor: string,
  ): Promise<SynthEvent | null> {
    const state = await this.runtime.getState()
    const authorizedExpedition = Object.values(state.expeditions).find(
      (e) => e.status === "approved" || e.status === "committed" || e.status === "executing"
    )
    if (!authorizedExpedition) return null

    const lastEvent = await this.eventStore.getLastEvent()
    const previousHash = lastEvent?.eventHash ?? "genesis"
    const timestamp = Date.now()
    const sequence = await this.eventStore.count()

    const event: SynthEvent = {
      id: crypto.randomUUID(),
      type: "EXPEDITION_AUTHORIZED",
      timestamp,
      transactionId: `tx-authorized-${sequence}`,
      capability: "mutation-authority",
      actor,
      payload: {
        id: authorizedExpedition.id,
        mutationCount: mutations.length,
        targets: mutations.map((m) => m.target),
      },
      previousHash,
      eventHash: "",
    }
    event.eventHash = computeEventHash(event)
    return event
  }

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
