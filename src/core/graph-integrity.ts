// ============================================================
// CORE: Graph Integrity Validator (EXP-HARDEN-005)
// ============================================================
// Graph Integrity is a first-class constitutional proof, equal in
// importance to Replay Integrity. Replay proves the state is a pure
// fold of history; Graph Integrity proves the aggregate graph that
// history carries is semantically valid:
//
//   Mission ──contains──▶ Expedition ──contains──▶ Objective
//                                                     │
//                                                     └─produces──▶ Work Item
//
// The validator reuses the replay engine's aggregate-graph checks
// (validateAggregateGraph, EXP-HARDEN-004) and extends them toward
// the full invariant set of docs/reference/graph-integrity.md:
// well-formed creations, unique identities, parent presence,
// parent resolution, acyclicity, connectivity (no orphans),
// post-replay navigation, and Work Item → Objective membership as
// far as the event model allows.
//
// Provability boundary (no schema change — the event model is a
// Protected Asset): WORK_ITEM_GENERATED payloads carry a
// GeneratedWorkItem with objectiveId/expeditionId, so their edges
// are validated. Canonical WORK_ITEM_CREATED payloads carry no
// objective reference, so "every Work Item belongs to exactly one
// Objective" is reported as not-event-provable — a documented model
// gap and a candidate for a future ADR, never silently skipped.
//
// Pure: no IO, no environment access. Reports, never mutates.
// ============================================================

import { rebuildState, validateAggregateGraph } from "../runtime/replay.js"
import type { AggregateGraphViolation } from "../runtime/replay.js"
import type { CanonicalState, DerivedState, SynthEvent } from "../types/index.js"
import { buildDerivedState } from "../state/derived/index.js"

// ============================================================
// Types
// ============================================================

/** Validator schema version carried by every report and proof artifact. */
export const GRAPH_INTEGRITY_VALIDATOR_VERSION = 1

/** Aggregate kinds the graph integrity model recognizes. */
export type GraphAggregateKind = "mission" | "expedition" | "objective" | "generatedWorkItem"

/** A single graph-integrity violation (superset of the replay violation shape). */
export type GraphIntegrityViolation = {
  kind: AggregateGraphViolation["kind"]
  message: string
  aggregateKind: GraphAggregateKind
  aggregateId: string
  parentId?: string
}

/** One invariant of the formal model and its verdict. */
export type GraphIntegrityInvariant = {
  /** Stable identifier, e.g. "parent-resolution". */
  invariant: string
  /** "not-event-provable" marks documented model gaps; it never fails a report. */
  status: "pass" | "fail" | "not-event-provable"
  detail: string
  violations: string[]
}

/** Per-kind counts and structural statistics of the materialized graph. */
export type GraphIntegritySummary = {
  missions: number
  expeditions: number
  objectives: number
  /** Canonical work items; the event payloads carry no objective edge (documented gap). */
  workItems: number
  generatedWorkItems: number
  nodes: number
  /** Resolved parent edges in the replayed state. */
  edges: number
  /** Mission roots. */
  roots: number
}

/** Structured result of a Graph Integrity validation run. */
export type GraphIntegrityReport = {
  kind: "graph-integrity-report"
  version: 1
  result: "valid" | "invalid"
  eventCount: number
  invariants: GraphIntegrityInvariant[]
  graph: GraphIntegritySummary
  violations: GraphIntegrityViolation[]
}

// ============================================================
// Generated Work Item membership (Work Item → Objective edge)
// ============================================================

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

/**
 * Validate the Work Item → Objective edge carried by WORK_ITEM_GENERATED
 * events. The objectiveId parent is required and must resolve to an
 * objective materialized by replay; the expeditionId parent (redundant,
 * derivable via the objective) is validated when present. A generated
 * work item identity must not collide with the mission/expedition/
 * objective identity space (cross-kind clash, EXP-HARDEN-006). Canonical
 * WORK_ITEM_CREATED events are out of scope here: their payloads carry
 * no objective reference (see work-item-objective-membership below).
 */
function validateGeneratedWorkItems(
  events: SynthEvent[],
  state: CanonicalState,
): GraphIntegrityViolation[] {
  const violations: GraphIntegrityViolation[] = []
  const seen = new Set<string>()

  for (const event of events) {
    if (event.type !== "WORK_ITEM_GENERATED") continue
    const payload = event.payload as Record<string, unknown> | undefined
    const workItem = payload?.workItem as
      | { id?: unknown; objectiveId?: unknown; expeditionId?: unknown }
      | undefined

    const id = workItem?.id
    if (!isNonEmptyString(id)) {
      violations.push({
        kind: "malformed-creation",
        message: "WORK_ITEM_GENERATED event is missing its workItem payload id",
        aggregateKind: "generatedWorkItem",
        aggregateId: "",
      })
      continue
    }

    if (seen.has(id)) {
      violations.push({
        kind: "duplicate-creation",
        message: `Duplicate generatedWorkItem identity in event log: ${id}`,
        aggregateKind: "generatedWorkItem",
        aggregateId: id,
      })
    } else {
      seen.add(id)
    }

    // Cross-kind identity clash with the mission/expedition/objective
    // space materialized by replay (EXP-HARDEN-006).
    const clashKind = state.missions[id]
      ? "mission"
      : state.expeditions[id]
        ? "expedition"
        : state.objectives[id]
          ? "objective"
          : undefined
    if (clashKind) {
      violations.push({
        kind: "duplicate-creation",
        message: `Event log identity ${id} is used as both ${clashKind} and generatedWorkItem`,
        aggregateKind: "generatedWorkItem",
        aggregateId: id,
      })
    }

    const objectiveId = workItem?.objectiveId
    if (!isNonEmptyString(objectiveId)) {
      violations.push({
        kind: "missing-parent-reference",
        message: `WORK_ITEM_GENERATED ${id} has no objective parent`,
        aggregateKind: "generatedWorkItem",
        aggregateId: id,
      })
    } else if (!state.objectives[objectiveId]) {
      violations.push({
        kind: "broken-parent-reference",
        message: `WORK_ITEM_GENERATED ${id} references unknown objective ${objectiveId}`,
        aggregateKind: "generatedWorkItem",
        aggregateId: id,
        parentId: objectiveId,
      })
    }

    const expeditionId = workItem?.expeditionId
    if (isNonEmptyString(expeditionId) && !state.expeditions[expeditionId]) {
      violations.push({
        kind: "broken-parent-reference",
        message: `WORK_ITEM_GENERATED ${id} references unknown expedition ${expeditionId}`,
        aggregateKind: "generatedWorkItem",
        aggregateId: id,
        parentId: expeditionId,
      })
    }
  }

  return violations
}

// ============================================================
// Invariant bucketing
// ============================================================

type InvariantSpec = {
  invariant: string
  detail: string
  /** Violation kinds (for mission/expedition/objective aggregates) mapped here. */
  violationKinds: Array<AggregateGraphViolation["kind"]>
}

const INVARIANT_SPECS: InvariantSpec[] = [
  {
    invariant: "well-formed-creation",
    detail: "Every creation event carries a well-formed aggregate payload id.",
    violationKinds: ["malformed-creation"],
  },
  {
    invariant: "unique-identity",
    detail: "No aggregate identity is created more than once or shared across kinds.",
    violationKinds: ["duplicate-creation"],
  },
  {
    invariant: "parent-presence",
    detail: "Every expedition has a mission parent; every objective has an expedition parent (exactly-one-parent semantics).",
    violationKinds: ["missing-parent-reference"],
  },
  {
    invariant: "parent-resolution",
    detail: "Every parent reference resolves to an aggregate of the expected kind in the log.",
    violationKinds: ["broken-parent-reference"],
  },
  {
    invariant: "acyclicity",
    detail: "Parent chains never loop.",
    violationKinds: ["cycle"],
  },
  {
    invariant: "connectivity",
    detail: "Every aggregate is reachable from a mission root; no orphan nodes exist.",
    violationKinds: ["orphan-aggregate"],
  },
  {
    invariant: "navigation",
    detail: "Post-replay navigation resolves: state.missions[expedition.missionId] and state.expeditions[objective.expeditionId] exist.",
    violationKinds: ["broken-navigation"],
  },
  {
    invariant: "generated-work-item-membership",
    detail: "Every WORK_ITEM_GENERATED work item belongs to exactly one objective (objectiveId resolves; expeditionId resolves when present).",
    violationKinds: [],
  },
]

const GENERATED_WORK_ITEM_GAP =
  "Canonical WORK_ITEM_CREATED payloads carry no objective reference (the objectiveId edge exists only on GeneratedWorkItem/WORK_ITEM_GENERATED, which nothing emits today), so this invariant cannot be proven from events. Documented model gap — candidate for a future ADR; the event model is a Protected Asset."

function bucketViolations(
  violations: GraphIntegrityViolation[],
): GraphIntegrityInvariant[] {
  const invariants: GraphIntegrityInvariant[] = INVARIANT_SPECS.map((spec) => {
    const messages = violations
      .filter((violation) => {
        if (spec.invariant === "generated-work-item-membership") {
          return (
            violation.aggregateKind === "generatedWorkItem" &&
            (violation.kind === "missing-parent-reference" || violation.kind === "broken-parent-reference")
          )
        }
        if (violation.aggregateKind === "generatedWorkItem") {
          // Malformed/duplicate generated work items bucket with their kind's invariant.
          return spec.violationKinds.includes(violation.kind)
        }
        return spec.violationKinds.includes(violation.kind)
      })
      .map((violation) => violation.message)
    return {
      invariant: spec.invariant,
      status: messages.length === 0 ? "pass" : "fail",
      detail: spec.detail,
      violations: messages,
    }
  })

  invariants.push({
    invariant: "work-item-objective-membership",
    status: "not-event-provable",
    detail: GENERATED_WORK_ITEM_GAP,
    violations: [],
  })

  return invariants
}

// ============================================================
// Validator
// ============================================================

/**
 * Validate the aggregate graph carried by an event log against the full
 * Graph Integrity invariant set. When the replayed state is not provided
 * it is rebuilt from the events, so post-replay navigation invariants
 * always run. The report is deterministic for a given event log.
 */
export function validateGraphIntegrity(
  events: SynthEvent[],
  state?: CanonicalState,
): GraphIntegrityReport {
  const replayed = state ?? rebuildState(events)
  const derivedState: DerivedState = buildDerivedState(events)

  const violations: GraphIntegrityViolation[] = validateAggregateGraph(events, replayed)
  violations.push(...validateGeneratedWorkItems(events, replayed))

  const invariants = bucketViolations(violations)

  const missions = Object.keys(replayed.missions).length
  const expeditions = Object.values(replayed.expeditions)
  const objectives = Object.values(replayed.objectives)
  const generatedWorkItems = Object.values(derivedState.generatedWorkItems)

  let edges = 0
  for (const expedition of expeditions) {
    if (replayed.missions[expedition.missionId]) edges += 1
  }
  for (const objective of objectives) {
    if (replayed.expeditions[objective.expeditionId]) edges += 1
  }
  for (const workItem of generatedWorkItems) {
    if (replayed.objectives[workItem.objectiveId]) edges += 1
  }

  const graph: GraphIntegritySummary = {
    missions,
    expeditions: expeditions.length,
    objectives: objectives.length,
    workItems: Object.keys(replayed.workItems).length,
    generatedWorkItems: generatedWorkItems.length,
    nodes: missions + expeditions.length + objectives.length + generatedWorkItems.length,
    edges,
    roots: missions,
  }

  return {
    kind: "graph-integrity-report",
    version: GRAPH_INTEGRITY_VALIDATOR_VERSION,
    result: violations.length === 0 ? "valid" : "invalid",
    eventCount: events.length,
    invariants,
    graph,
    violations,
  }
}
