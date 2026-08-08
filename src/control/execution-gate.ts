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
import os from "os"
import path from "path"
import type {
  CapabilityInvocation,
  CanonicalState,
  ExecutionResult,
  SynthEvent,
  ExecutionContext,
  MutationRequest,
  MutationProvider,
} from "../types/index.js"
import { isDerivedPath, matchesScope, toProjectRelativePath } from "../governance/derived-files.js"
import { dataDir, eventLogFile, stateFile } from "../sdk/paths/index.js"
import type { ValidationResult } from "../types/index.js"
import { computeEventHash } from "../core/hash.js"
import { signEventBatch } from "../signing/index.js"
import { isApprovalSatisfied } from "../approval/index.js"
import { sortKeys } from "../sdk/json/index.js"
import { loadAdrRegistry, type AdrRegistry } from "../governance/adr-registry.js"
import { resolveImplementationEligibility } from "../governance/implementation-eligibility.js"
import type { Registry } from "../capability/registry.js"
import type { PolicyEngine } from "../policy/policy-engine.js"
import type { RuntimeEngine } from "../runtime/engine.js"
import type { AgentIdentity } from "../identity/types.js"
import type { EventStore } from "../infra/event-store.js"
import { EVENT_STORE_WRITE_TOKEN } from "../infra/event-store.js"
import type { IStateStore } from "../infra/state-store.js"
import { getLifecycleContinuation, MAX_LIFECYCLE_DEPTH } from "../runtime/governance-lifecycle.js"
import { buildDerivedState } from "../state/derived/index.js"
import { assertDependencyGateAllowed, type DependencyRecord } from "../governance/dependency-graph.js"
import type { RepositoryAdapter } from "../adapters/repository/types.js"
import { createGitRepositoryAdapter } from "../adapters/repository/git.js"
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

/**
 * Determine whether a filesystem target is a runtime data path.
 * Writes to these paths are the bright-line mutation boundary: they require
 * an expedition at executing status and explicit operator approval.
 */
function isRuntimeDataPath(target: string): boolean {
  const absolute = path.resolve(target)
  const runtimeDir = path.resolve(dataDir(process.cwd()))
  const eventLogPath = path.resolve(eventLogFile(process.cwd()))
  const stateFilePath = path.resolve(stateFile(process.cwd()))

  if (absolute === eventLogPath || absolute === stateFilePath) {
    return true
  }
  const withSep = runtimeDir.endsWith(path.sep) ? runtimeDir : `${runtimeDir}${path.sep}`
  return absolute.startsWith(withSep)
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
  private adrRegistry: AdrRegistry
  private repositoryAdapter: RepositoryAdapter

  constructor(
    private registry: Registry,
    private policyEngine: PolicyEngine,
    private runtime: RuntimeEngine,
    private eventStore: EventStore,
    private stateStore: IStateStore,
    private validator: (invocation: CapabilityInvocation) => ValidationResult,
    private mutationProviders: Map<string, MutationProvider> = new Map(),
    private dependencyRecords: DependencyRecord[] = [],
  ) {
    this.adrRegistry = loadAdrRegistry()
    this.repositoryAdapter = createGitRepositoryAdapter({ path: this.resolveProjectRoot() })
  }

  // ===== PROJECT ROOT RESOLUTION =====

  /**
   * Infer the governed project root from the event store's data directory.
   *
   * The event store knows where its log lives; that path is the only reliable
   * source of the project root. Using process.cwd() here would bind the
   * repository adapter to the shell's working directory, which breaks tests
   * that create isolated data directories inside the SYNTH source tree.
   */
  private resolveProjectRoot(): string {
    const dataDir = this.eventStore.getDataDir()
    if (!dataDir) {
      // In-memory event stores have no file-system project root. Using
      // process.cwd() would bind the repository adapter to the shell's working
      // directory and break tests that run inside the SYNTH source tree while
      // it has uncommitted changes. Use a non-git directory so the adapter
      // skips VCS-specific readiness checks.
      return path.join(os.tmpdir(), "synth-anonymous-project")
    }

    const normalized = path.resolve(dataDir)
    const base = path.basename(normalized)
    const parent = path.basename(path.dirname(normalized))

    // Governed projects: event log lives at <root>/.synth/data/event-log.jsonl
    if (parent === ".synth" && base === "data") {
      return path.dirname(path.dirname(normalized))
    }

    // Legacy / source-repository layout: event log lives at <root>/data/event-log.jsonl
    if (base === "data") {
      return path.dirname(normalized)
    }

    // Isolated test data directories or custom layouts: treat the data
    // directory itself as the project root. If it is not a git repository,
    // the repository adapter will simply skip the completion-readiness check.
    return normalized
  }

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
      identity: invocation.context?.identity as import("../types/index.js").AgentIdentity | undefined,
    }

    try {
      // === PHASE 1: VALIDATE ===
      const validation = await this.runPhase("VALIDATE", () => {
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
      const events = await this.eventStore.loadAll()
      const derivedState = buildDerivedState(events)
      let approvalRequestId: string | undefined
      const policyCheck = await this.runPhase("POLICY_CHECK", () => {
        const result = this.policyEngine.isAllowed(invocation, currentState, derivedState)
        if (!result.allowed) {
          // EXP-APPROVAL-001: if the policy requires verification (two-party
          // approval), check whether a valid approval exists in state before
          // denying the mutation.
          if (result.reason?.startsWith("Verification required")) {
            const approvalCheck = isApprovalSatisfied(invocation, currentState)
            if (approvalCheck.required && approvalCheck.satisfied) {
              approvalRequestId = approvalCheck.requestId
              return { ...result, allowed: true, approvalRequestId }
            }
            throw new Error(
              `APPROVAL_REQUIRED: Operation requires two-party approval. ` +
                `Run: synth approval request --operation <op> --reason "..."`,
            )
          }
          throw new Error(`POLICY_DENIED: ${result.reason || "Execution blocked by policy"}`)
        }
        return result
      })
      phases.push(policyCheck)

      // === PHASE 2b: DEPENDENCY GATE CHECK (EXP-GATE-013) ===
      const dependencyGateCheck = await this.runPhase("DEPENDENCY_GATE_CHECK", () => {
        assertDependencyGateAllowed(invocation, currentState, derivedState, this.dependencyRecords)
        return { passed: true }
      })
      phases.push(dependencyGateCheck)

      // === PHASE 2c: REPOSITORY ADAPTER COMPLETION READINESS (EXP-GIT-001) ===
      // For expedition completion, ask the repository adapter whether the
      // working tree is in a state that can be snapshotted. This keeps
      // VCS-specific checks (clean working tree, stash policy, etc.) inside
      // the adapter contract instead of the core control boundary.
      if (invocation.capability === "CompleteExpedition") {
        const readinessCheck = await this.runPhase("REPOSITORY_ADAPTER_CHECK", async () => {
          const expeditionId = String(invocation.payload.id ?? invocation.payload.expeditionId ?? "")
          const readiness = await this.repositoryAdapter.validateCompletionReadiness({ expeditionId })
          if (!readiness.ok) {
            throw new Error(`REPOSITORY_NOT_READY: ${readiness.reason || "Repository adapter blocked expedition completion"}`)
          }
          return { passed: true }
        })
        phases.push(readinessCheck)
      }

      // === PHASE 3: RESOLVE CAPABILITY ===
      const resolveCap = await this.runPhase("RESOLVE_CAPABILITY", () => {
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
        // Propagate invocation context into each mutation request so that
        // authorization overrides (e.g. out-of-scope writes) are visible to
        // the mutation authority gate.
        for (const mutation of executionResult.mutations) {
          mutation.context = { ...invocation.context, ...mutation.context }
        }
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
      if (approvalRequestId) {
        const approvalExecutedEvent = await this.createApprovalExecutedEvent(approvalRequestId, invocation)
        if (approvalExecutedEvent) eventsToPersist.push(approvalExecutedEvent)
      }
      if (executionResult.mutations && executionResult.mutations.length > 0) {
        const authorizedEvent = await this.createAuthorizedEvent(executionResult.mutations, invocation.actor)
        if (authorizedEvent) eventsToPersist.push(authorizedEvent)
        for (const mutation of executionResult.mutations) {
          const outOfScopeEvent = await this.createOutOfScopeAuthorizedEvent(mutation, invocation.actor)
          if (outOfScopeEvent) eventsToPersist.push(outOfScopeEvent)
        }
      }
      if (eventsToPersist.length > 0) {
        // Sign events if an operator signing key is configured. Signing is
        // opt-in; unsigned events are still valid and replayable.
        const signedEvents = await signEventBatch(eventsToPersist)
        await this.eventStore.appendBatch(signedEvents, EVENT_STORE_WRITE_TOKEN)
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

      // === GOVERNANCE SNAPSHOT (EXP-GIT-001) ===
      // Automatically anchor governance state on expedition completion.
      // Snapshot failures are non-fatal and recorded as auxiliary events.
      const snapshotEvents = await this.maybeCreateSnapshot(process.cwd(), executionResult.events, invocation.actor)
      if (snapshotEvents.length > 0) {
        await this.eventStore.appendBatch(snapshotEvents, EVENT_STORE_WRITE_TOKEN)
        // EXP-STATE-LAG-001: snapshot events are part of the audit log, so the
        // canonical state must reflect them. Rebuild and save state to prevent
        // the canonical-state.json version from lagging the event log.
        const snapshotState = await this.runtime.getState()
        await this.stateStore.save(snapshotState)
      }

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

    // Genesis may only seed structural objects. Operational lifecycle
    // transitions (authorization, gates, acceptance, convergence) must
    // execute through the governed operational path so every transition
    // is backed by an approved Mission and authorized Expedition.
    const allowedGenesisTypes = new Set([
      "SYSTEM_GENESIS",
      "PROJECT_CREATED",
      "PLAN_CREATED",
      "WORK_ITEM_CREATED",
      "MISSION_CREATED",
      "EXPEDITION_CREATED",
      "OBJECTIVE_ADDED",
    ])
    const forbidden = events
      .map((e) => e.type)
      .filter((type) => !allowedGenesisTypes.has(type))
    if (forbidden.length > 0) {
      throw new Error(
        `GENESIS_EVENT_TYPE_REJECTED: genesis cannot seed operational event types: ${[...new Set(forbidden)].join(", ")}`
      )
    }

    // Single batch commit through the guarded store
    const signedEvents = await signEventBatch(events)
    await this.eventStore.appendBatch(signedEvents, EVENT_STORE_WRITE_TOKEN)

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

    // 0. Derived files are never writable through the public mutation boundary.
    if (isDerivedPath(mutation.target)) {
      return {
        allowed: false,
        reason: "This is derived state. Modify source events or evidence instead.",
      }
    }

    // 1. Authority must exist: at least one approved Mission.
    const approvedMissions = Object.values(state.missions).filter(
      (m) => m.status === "active"
    )
    if (approvedMissions.length === 0) {
      return { allowed: false, reason: "No approved Mission exists" }
    }

    // Bright-line rule for runtime data paths (EXP-GOV-023):
    // writes to data/ or canonical state require an expedition at executing
    // status AND explicit operator approval.
    const targetIsRuntimeData = isRuntimeDataPath(mutation.target)
    let authorizedExpeditions
    if (targetIsRuntimeData) {
      const executingExpeditions = Object.values(state.expeditions).filter(
        (e) => e.status === "executing"
      )
      if (executingExpeditions.length === 0) {
        return {
          allowed: false,
          reason:
            "Runtime data mutations require an expedition at executing status. " +
            "Run 'synth expedition start --id <id>' before modifying data/ or runtime state.",
        }
      }
      const identity = mutation.context?.identity as AgentIdentity | undefined
      if (identity?.approvalMode !== "human-approved") {
        return {
          allowed: false,
          reason:
            "Runtime data mutations require operator approval. " +
            "Run the command with --approve or set SYNTH_APPROVAL_MODE=human-approved.",
        }
      }
      authorizedExpeditions = executingExpeditions
    } else {
      // 2. Lifecycle must permit execution: at least one approved Expedition.
      authorizedExpeditions = Object.values(state.expeditions).filter(
        (e) => e.status === "approved" || e.status === "committed" || e.status === "executing"
      )
      if (authorizedExpeditions.length === 0) {
        return { allowed: false, reason: "No authorized Expedition exists" }
      }
    }

    // 3. Scope must be contained within the approved expedition scope, if scope
    //    is declared. If no scope is declared, the expedition is treated as
    //    unscoped and any mutation is allowed (preserves existing behavior).
    const scopedExpeditions = authorizedExpeditions.filter(
      (e) => Array.isArray(e.metadata?.scope) && e.metadata.scope.length > 0
    )
    if (scopedExpeditions.length > 0) {
      const relativeTarget = toProjectRelativePath(mutation.target)
      const allowedByScope = scopedExpeditions.some((e) =>
        (e.metadata.scope as string[]).some((scope) => matchesScope(relativeTarget, scope))
      )
      if (!allowedByScope) {
        const overrideReason = mutation.context?.authorizeOutOfScope
        if (typeof overrideReason === "string" && overrideReason.length > 0) {
          return {
            allowed: true,
            authority: scopedExpeditions[0].id,
            reason: overrideReason,
          }
        }
        return {
          allowed: false,
          reason: "Mutation target is outside authorized expedition scope",
        }
      }
    }

    // 4. Implementation authority must be complete (ADR-046).
    const authority = authorizedExpeditions[0]
    const eligibility = resolveImplementationEligibility({
      expedition: authority,
      state,
      adrRegistry: this.adrRegistry,
    })
    if (!eligibility.eligible) {
      return {
        allowed: false,
        reason: `Implementation ineligible for ${authority.id}: ${eligibility.reasons.join("; ")}`,
      }
    }

    // 5. ExecutionGate must be open (this method is invoked through it).
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

  private async maybeCreateSnapshot(
    cwd: string,
    events: SynthEvent[],
    actor: string,
  ): Promise<SynthEvent[]> {
    const completedEvent = events.find((e) => e.type === "EXPEDITION_COMPLETED")
    if (!completedEvent) return []

    const payload = completedEvent.payload as Record<string, unknown>
    const expeditionId = String(payload.expeditionId ?? payload.id ?? "")
    const state = await this.runtime.getState()
    const eventOffset = await this.eventStore.count()
    const stateHash = state.stateHash

    try {
      const result = await this.repositoryAdapter.createSnapshot({
        trigger: "EXPEDITION_COMPLETED",
        expeditionId,
        actor,
        stateHash,
        eventOffset,
      })

      const lastEvent = await this.eventStore.getLastEvent()
      const previousHash = lastEvent?.eventHash ?? "genesis"
      const timestamp = Date.now()
      const sequence = await this.eventStore.count()

      const event: SynthEvent = {
        id: crypto.randomUUID(),
        type: result.ok ? "GOVERNANCE_SNAPSHOT_CREATED" : "GOVERNANCE_SNAPSHOT_FAILED",
        timestamp,
        transactionId: `tx-snapshot-${sequence}`,
        capability: "git-snapshot",
        actor,
        payload: {
          snapshotId: result.snapshotId,
          trigger: result.trigger,
          ...(result.commitHash ? { commitHash: result.commitHash } : {}),
          ...(result.tagName ? { tagName: result.tagName } : {}),
          eventOffset: result.eventOffset,
          stateHash: result.stateHash,
          ...(expeditionId ? { expeditionId } : {}),
          ...(result.ok ? {} : { reason: result.reason }),
        },
        previousHash,
        eventHash: "",
      }
      event.eventHash = computeEventHash(event)
      return [event]
    } catch (err) {
      const lastEvent = await this.eventStore.getLastEvent()
      const previousHash = lastEvent?.eventHash ?? "genesis"
      const timestamp = Date.now()
      const sequence = await this.eventStore.count()
      const snapshotId = `${expeditionId || "unknown"}-${Date.now()}`
      const event: SynthEvent = {
        id: crypto.randomUUID(),
        type: "GOVERNANCE_SNAPSHOT_FAILED",
        timestamp,
        transactionId: `tx-snapshot-${sequence}`,
        capability: "git-snapshot",
        actor,
        payload: {
          snapshotId,
          trigger: "EXPEDITION_COMPLETED",
          eventOffset,
          stateHash,
          reason: err instanceof Error ? err.message : String(err),
          ...(expeditionId ? { expeditionId } : {}),
        },
        previousHash,
        eventHash: "",
      }
      event.eventHash = computeEventHash(event)
      return [event]
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

  private async createOutOfScopeAuthorizedEvent(
    mutation: MutationRequest,
    actor: string,
  ): Promise<SynthEvent | null> {
    const reason = mutation.context?.authorizeOutOfScope
    if (typeof reason !== "string" || reason.length === 0) return null

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
      type: "OUT_OF_SCOPE_AUTHORIZED",
      timestamp,
      transactionId: `tx-out-of-scope-${sequence}`,
      capability: "mutation-authority",
      actor,
      payload: {
        expeditionId: authorizedExpedition.id,
        target: mutation.target,
        reason,
      },
      previousHash,
      eventHash: "",
    }
    event.eventHash = computeEventHash(event)
    return event
  }

  private async createApprovalExecutedEvent(
    requestId: string,
    invocation: CapabilityInvocation,
  ): Promise<SynthEvent | null> {
    const state = await this.runtime.getState()
    const approval = state.approvals?.[requestId] as Record<string, unknown> | undefined
    if (!approval) return null

    const lastEvent = await this.eventStore.getLastEvent()
    const previousHash = lastEvent?.eventHash ?? "genesis"
    const timestamp = Date.now()
    const sequence = await this.eventStore.count()

    const event: SynthEvent = {
      id: crypto.randomUUID(),
      type: "APPROVAL_EXECUTED",
      timestamp,
      transactionId: `tx-approval-executed-${sequence}`,
      capability: invocation.capability,
      actor: invocation.actor,
      payload: {
        requestId,
        executedAt: new Date(timestamp).toISOString(),
        operation: approval.operation,
        operationFingerprint: approval.operationFingerprint,
      },
      previousHash,
      eventHash: "",
    }
    event.eventHash = computeEventHash(event)
    return event
  }

  private async runPhase<T>(phase: ExecutionPhase, fn: () => T | Promise<T>): Promise<PhaseResult<T>> {
    try {
      const output = await fn()
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
