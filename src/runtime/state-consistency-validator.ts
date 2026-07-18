// ============================================================
// RUNTIME: State Consistency Validator
// ============================================================
// Pure validator that compares durable governance artifacts against
// the authoritative replayed state. It reports every divergence it
// finds but performs no mutation, repair, or side effects.
// ============================================================

import type { SynthEvent, CanonicalState } from "../types/index.js"
import type { DecisionLogRead } from "../mission-studio/decision-log.js"
import type { StoredSnapshot, WorldModelNode } from "../mission-studio/types.js"
import { computeStateHash, validateAggregateGraph } from "./replay.js"
import type { StateDivergence } from "./governance-types.js"

export type ValidateConsistencyInput = {
  events: SynthEvent[]
  persistedState: CanonicalState | null
  replayedState: CanonicalState
  decisions: DecisionLogRead
  snapshots: StoredSnapshot[]
}

export type ValidateConsistencyOutput = {
  divergences: StateDivergence[]
  graphViolations: ReturnType<typeof validateAggregateGraph>
}

function getApprovedMissionsFromSnapshots(stored: StoredSnapshot[]): Array<{ id: string; name: string; approvedAt: number }> {
  const missions: Array<{ id: string; name: string; approvedAt: number }> = []
  for (const s of stored) {
    if (!s.snapshot.worldModel?.nodes) continue
    for (const node of s.snapshot.worldModel.nodes.values() as IterableIterator<WorldModelNode>) {
      if (node.kind === "mission") {
        missions.push({
          id: node.id,
          name: node.name,
          approvedAt: s.snapshot.timestamp,
        })
      }
    }
  }
  return missions
}

export function validateConsistency(input: ValidateConsistencyInput): ValidateConsistencyOutput {
  const { events, persistedState, replayedState, decisions, snapshots } = input
  const divergences: StateDivergence[] = []

  const graphViolations = validateAggregateGraph(events, replayedState)
  if (graphViolations.length > 0) {
    for (const violation of graphViolations) {
      divergences.push({
        kind: "aggregate-graph-violation",
        severity: "error",
        description: violation.message,
        artifact: "event-log",
      })
    }
  }

  if (persistedState) {
    const persistedOffset = persistedState.lastEventOffset ?? 0
    const eventCount = events.length

    if (persistedOffset > eventCount) {
      divergences.push({
        kind: "missing-events",
        severity: "error",
        description: `Persisted state references event ${persistedOffset} but event log ends at ${eventCount}.`,
        artifact: "event-log.jsonl",
      })
    } else if (persistedOffset < eventCount) {
      // A lagging projection is stale but recoverable; report it as a
      // warning rather than a hash mismatch error.
      divergences.push({
        kind: "state-lags-events",
        severity: "warning",
        description: `Canonical state (${persistedOffset} events) lags the event log (${eventCount} events).`,
        artifact: "canonical-state.json",
      })
    } else {
      // Same event count: any hash difference is a genuine divergence.
      const replayedHash = computeStateHash(replayedState)
      if (persistedState.stateHash !== replayedHash) {
        divergences.push({
          kind: "replayed-state-mismatch",
          severity: "error",
          description: `Persisted state hash ${persistedState.stateHash} differs from replayed state hash ${replayedHash}.`,
          artifact: "canonical-state.json",
        })
      }
    }
  }

  if (!decisions.chainValid) {
    divergences.push({
      kind: "decision-chain-broken",
      severity: "warning",
      description: "The decision log chain is broken; recorded approvals may not be trustworthy.",
      artifact: "decisions.jsonl",
    })
  }

  const approvedMissions = getApprovedMissionsFromSnapshots(snapshots)
  for (const mission of approvedMissions) {
    const replayed = replayedState.missions[mission.id]
    if (replayed && replayed.status !== "active") {
      divergences.push({
        kind: "snapshot-state-conflict",
        severity: "error",
        description: `Snapshot approves mission "${mission.name}" (${mission.id}) but replayed state shows it as ${replayed.status}.`,
        artifact: "snapshots",
      })
    }
  }

  const activeMissions = Object.values(replayedState.missions || {}).filter((m) => m.status === "active")
  if (activeMissions.length > 0 && snapshots.length === 0) {
    divergences.push({
      kind: "approved-mission-no-snapshot",
      severity: "warning",
      description: `Active mission "${activeMissions[0].name}" has no certified snapshot artifact.`,
      artifact: "snapshots",
    })
  }

  return { divergences, graphViolations }
}
