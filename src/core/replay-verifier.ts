// ============================================================
// LAYER 4: Replay Consistency Verifier (Root of Trust)
// ============================================================
// The ReplayVerifier is an independent witness.
//
// It does NOT trust the runtime. It:
//   1. Reads the immutable event log.
//   2. Verifies the cryptographic hash-chain.
//   3. Rebuilds canonical state from scratch.
//   4. Loads the operational (persisted) state.
//   5. Reports exact divergence if any.
//
// Core invariant:
//   Operational state == pure fold of immutable history
//
// This proves the system is event-sourced, not merely event-storing.
//
// EXP-HARDEN-004 adds a second, separate tier: graph correctness.
// The aggregate graph of the full event log and the post-replay
// navigation of the replayed state are validated and reported as
// `graphValid` / `graphViolations`. Graph violations never feed the
// legacy `consistent` verdict, so deterministic-but-polluted legacy
// logs stay green by default; strict consumers enforce `graphValid`.
// ============================================================


import { EventStore } from "../infra/event-store.js"
import type { IStateStore } from "../infra/state-store.js"
import { rebuildState, validateAggregateGraph } from "../runtime/replay.js"
import type { AggregateGraphViolation } from "../runtime/replay.js"
import type { SynthEvent } from "../types/index.js"
import { computeEventHash, stableStringify } from "./hash.js"
import { createPosixFilesystemProvider } from "../environment/filesystem-capability.js"
import {
  loadHistoricalAliasRegistry,
  createEmptyHistoricalAliasRegistry,
  type HistoricalAliasRegistry,
} from "../runtime/historical-aliases.js"

/** Detailed divergence between operational and replayed state. */
export type ReplayDivergence = {
  key: string
  live: unknown
  replayed: unknown
}

/** Hash-chain verification result. */
export type ChainCheckResult = {
  valid: boolean
  firstBrokenIndex: number | null
  firstBrokenReason: string | null
  eventCount: number
}

/** Replay verification result. */
export type ReplayCheckResult = {
  consistent: boolean
  chainValid: boolean
  liveHash: string | null
  replayHash: string
  eventCount: number
  divergences: ReplayDivergence[]
  explanation: string
  /**
   * EXP-HARDEN-004: true when the event log's aggregate graph and
   * post-replay navigation are free of violations. Reported separately
   * from `consistent`; violations are warnings unless a strict
   * consumer (e.g. verify-replay.js --strict-graph) enforces them.
   */
  graphValid: boolean
  graphViolations: AggregateGraphViolation[]
}

/** Verifies that operational state matches replayed state. */
export class ReplayVerifier {
  constructor(
    private eventStore: EventStore,
    private stateStore: IStateStore,
  ) {}

  /**
   * Verify the cryptographic hash-chain of the event log.
   * Returns detailed information about the first break, if any.
   */
  async verifyChain(): Promise<ChainCheckResult> {
    const events = await this.eventStore.loadAll()

    // Find the first event that participates in the hash chain.
    // Earlier legacy events are tolerated for historical compatibility.
    const chainStart = events.findIndex(
      (e) => e.eventHash !== undefined && e.previousHash !== undefined
    )

    if (chainStart === -1) {
      // No events have hash-chain fields; the log predates chain enforcement.
      // State replay remains the authoritative check.
      return {
        valid: true,
        firstBrokenIndex: null,
        firstBrokenReason: null,
        eventCount: events.length,
      }
    }

    for (let i = chainStart; i < events.length; i++) {
      const event = events[i]

      // Once the chain has started, every subsequent event must participate.
      if (event.eventHash === undefined || event.previousHash === undefined) {
        return {
          valid: false,
          firstBrokenIndex: i,
          firstBrokenReason: `chain gap at index ${i}: event lacks hash fields after chain started`,
          eventCount: events.length,
        }
      }

      const expectedPreviousHash = i === chainStart ? "genesis" : events[i - 1].eventHash

      if (event.previousHash !== expectedPreviousHash) {
        return {
          valid: false,
          firstBrokenIndex: i,
          firstBrokenReason: `previousHash mismatch at index ${i}: expected ${expectedPreviousHash}, got ${event.previousHash}`,
          eventCount: events.length,
        }
      }

      const expectedEventHash = computeEventHash(event)
      if (event.eventHash !== expectedEventHash) {
        return {
          valid: false,
          firstBrokenIndex: i,
          firstBrokenReason: `eventHash mismatch at index ${i}: event payload may have been altered`,
          eventCount: events.length,
        }
      }
    }

    return {
      valid: true,
      firstBrokenIndex: null,
      firstBrokenReason: null,
      eventCount: events.length,
    }
  }

  /**
   * Run full replay consistency check.
   * Returns a detailed result explaining any divergence.
   */
  async verify(): Promise<ReplayCheckResult> {
    const events = await this.eventStore.loadAll()
    const chain = await this.verifyChain()

    // Replay all events from scratch (no live state)
    const replayedState = rebuildState(events)

    // Load the operational persisted state (if any)
    const liveState = await this.stateStore.load()
    const liveHash = liveState?.stateHash ?? null

    const divergences: ReplayDivergence[] = []

    // Structural invariant checks on replayed state
    divergences.push(...this.checkStructuralConsistency(replayedState))

    // Graph-integrity checks (EXP-HARDEN-004). These validate the
    // aggregate graph of the full event log and post-replay navigation.
    // They are reported in their own fields and deliberately do NOT feed
    // `divergences` or `consistent`, keeping the legacy verdict stable.
    const dataDir = this.eventStore.getDataDir()
    const aliasRegistry = dataDir
      ? await loadHistoricalAliasRegistry(createPosixFilesystemProvider(dataDir))
      : createEmptyHistoricalAliasRegistry()
    const graphViolations = validateAggregateGraph(events, replayedState, aliasRegistry)
    const graphValid = graphViolations.length === 0

    // Hash comparison with live state
    if (liveHash !== null && liveHash !== replayedState.stateHash) {
      divergences.push({
        key: "stateHash",
        live: liveHash,
        replayed: replayedState.stateHash,
      })
    }

    // Deep diff of key projections
    if (liveState) {
      divergences.push(...this.deepDiff("workItems", liveState.workItems, replayedState.workItems))
      divergences.push(...this.deepDiff("plans", liveState.plans, replayedState.plans))
      divergences.push(...this.deepDiff("milestones", liveState.milestones, replayedState.milestones))
      divergences.push(...this.deepDiff("projects", liveState.projects, replayedState.projects))
      divergences.push(...this.deepDiff("missions", liveState.missions, replayedState.missions))
      divergences.push(...this.deepDiff("expeditions", liveState.expeditions, replayedState.expeditions))
      divergences.push(...this.deepDiff("objectives", liveState.objectives, replayedState.objectives))
      divergences.push(...this.deepDiff("discoveries", liveState.discoveries, replayedState.discoveries))
      divergences.push(...this.deepDiff("decisions", liveState.decisions, replayedState.decisions))
    }

    // First Contact artifact integrity (EXP-AIFC-009): if a DISCOVERY_APPROVED
    // event exists, the stored discovery artifact hash must match.
    divergences.push(...(await this.checkFirstContactArtifact(events)))

    const consistent = chain.valid && divergences.length === 0
    const explanation = consistent
      ? "Operational state is bit-for-bit identical to replayed state."
      : this.buildExplanation(chain, divergences)

    return {
      consistent,
      chainValid: chain.valid,
      liveHash,
      replayHash: replayedState.stateHash,
      eventCount: events.length,
      divergences,
      explanation,
      graphValid,
      graphViolations,
    }
  }

  /**
   * Check that replayed state satisfies structural invariants.
   * These properties must hold regardless of event content.
   *
   * EXP-HARDEN-006: mission/expedition/objective status enums are
   * validated alongside workItem/plan (deferred from EXP-HARDEN-004).
   * The enums mirror src/types/state.ts exactly.
   */
  private checkStructuralConsistency(state: {
    workItems: Record<string, unknown>
    plans: Record<string, unknown>
    missions: Record<string, unknown>
    expeditions: Record<string, unknown>
    objectives: Record<string, unknown>
  }): ReplayDivergence[] {
    const diffs: ReplayDivergence[] = []

    for (const [id, workItem] of Object.entries(state.workItems)) {
      const wi = workItem as Record<string, unknown>
      if (!["idle", "active", "blocked", "complete"].includes(wi.status as string)) {
        diffs.push({ key: `workItem.${id}.status`, live: wi.status, replayed: "valid_status_required" })
      }
    }

    for (const [id, plan] of Object.entries(state.plans)) {
      const p = plan as Record<string, unknown>
      if (!["draft", "active", "completed", "deprecated"].includes(p.status as string)) {
        diffs.push({ key: `plan.${id}.status`, live: p.status, replayed: "valid_status_required" })
      }
    }

    for (const [id, mission] of Object.entries(state.missions)) {
      const m = mission as Record<string, unknown>
      if (!["draft", "active", "completed", "archived"].includes(m.status as string)) {
        diffs.push({ key: `mission.${id}.status`, live: m.status, replayed: "valid_status_required" })
      }
    }

    for (const [id, expedition] of Object.entries(state.expeditions)) {
      const e = expedition as Record<string, unknown>
      if (!["draft", "approved", "executing", "completed", "cancelled"].includes(e.status as string)) {
        diffs.push({ key: `expedition.${id}.status`, live: e.status, replayed: "valid_status_required" })
      }
    }

    for (const [id, objective] of Object.entries(state.objectives)) {
      const o = objective as Record<string, unknown>
      if (!["draft", "completed"].includes(o.status as string)) {
        diffs.push({ key: `objective.${id}.status`, live: o.status, replayed: "valid_status_required" })
      }
    }

    return diffs
  }

  /**
   * Compute a deep diff between two projection maps.
   */
  private deepDiff(
    prefix: string,
    live: Record<string, unknown>,
    replayed: Record<string, unknown>,
  ): ReplayDivergence[] {
    const diffs: ReplayDivergence[] = []
    const allKeys = new Set([...Object.keys(live ?? {}), ...Object.keys(replayed ?? {})])

    for (const key of allKeys) {
      const liveValue = live?.[key]
      const replayedValue = replayed?.[key]
      if (stableStringify(liveValue) !== stableStringify(replayedValue)) {
        diffs.push({ key: `${prefix}.${key}`, live: liveValue, replayed: replayedValue })
      }
    }

    return diffs
  }

  private buildExplanation(
    chain: ChainCheckResult,
    divergences: ReplayDivergence[],
  ): string {
    const parts: string[] = []

    if (!chain.valid) {
      parts.push(`Hash-chain broken at index ${chain.firstBrokenIndex}: ${chain.firstBrokenReason}`)
    }

    if (divergences.length > 0) {
      const keys = divergences.slice(0, 3).map((d) => d.key).join(", ")
      parts.push(`State divergence detected (${divergences.length} differences); first: ${keys}`)
    }

    return parts.join("; ") || "Unknown inconsistency"
  }

  /**
   * Check First Contact artifact integrity.
   * If a DISCOVERY_APPROVED event exists, verify that the stored artifact
   * at `.synth/first-contact/discovery-artifact.json` has the same hash.
   */
  private async checkFirstContactArtifact(events: SynthEvent[]): Promise<ReplayDivergence[]> {
    const approvedEvent = events.find((e) => e.type === "DISCOVERY_APPROVED")
    if (!approvedEvent) return []

    const dataDir = this.eventStore.getDataDir()
    if (!dataDir) return []

    // Use the Environment Layer filesystem provider; never import fs/path
    // directly from Core (ADR-006 §7).
    const fs = createPosixFilesystemProvider(dataDir)
    const raw = await fs.readFile("../first-contact/discovery-artifact.json")
    if (!raw) {
      return [
        {
          key: "firstContactArtifact.missing",
          live: null,
          replayed: "No stored artifact found at .synth/first-contact/discovery-artifact.json",
        },
      ]
    }

    let storedArtifact: Record<string, unknown>
    try {
      storedArtifact = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return [
        {
          key: "firstContactArtifact.malformed",
          live: null,
          replayed: "Stored artifact is not valid JSON",
        },
      ]
    }

    const expectedHash = String((approvedEvent.payload as Record<string, unknown>)?.artifactHash ?? "")
    const storedHash = String(storedArtifact.artifactHash ?? "")
    if (expectedHash && storedHash && expectedHash !== storedHash) {
      return [
        {
          key: "firstContactArtifact.hashMismatch",
          live: storedHash,
          replayed: expectedHash,
        },
      ]
    }

    return []
  }

  /** Quick check: are events replayable? */
  async isReplayable(): Promise<boolean> {
    try {
      const events = await this.eventStore.loadAll()
      rebuildState(events)
      return true
    } catch {
      return false
    }
  }

  /** Get replay statistics */
  async getStats(): Promise<{
    eventCount: number
    workItemCount: number
    planCount: number
    milestoneCount: number
    projectCount: number
    stateHash: string
  }> {
    const events = await this.eventStore.loadAll()
    const state = rebuildState(events)

    return {
      eventCount: events.length,
      workItemCount: Object.keys(state.workItems).length,
      planCount: Object.keys(state.plans).length,
      milestoneCount: Object.keys(state.milestones).length,
      projectCount: Object.keys(state.projects).length,
      stateHash: state.stateHash,
    }
  }
}

/** Factory function */
export function createReplayVerifier(
  eventStore: EventStore,
  stateStore: IStateStore,
): ReplayVerifier {
  return new ReplayVerifier(eventStore, stateStore)
}
