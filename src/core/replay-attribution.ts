// ============================================================
// CORE: Replay Attribution (EXP-HARDEN-007)
// ============================================================
// Which events contributed to which state fields?
//
// Replay proves the state is a pure fold of history; attribution
// explains that fold. It walks the immutable event log once, in
// order, and records for every aggregate:
//   - the event that created it,
//   - the event that last wrote it,
//   - how many events wrote it in total.
//
// The trace mirrors the replay engine's own payload extraction
// (src/runtime/replay.ts applyEvent) so attribution always agrees
// with what replay actually materialized. It observes events only:
// pure, read-only, no IO, no mutation — the same contract as the
// graph validators (EXP-HARDEN-004/005).
// ============================================================

import type { SynthEvent } from "../types/index.js"

/** Report schema version carried by every attribution report. */
export const REPLAY_ATTRIBUTION_VERSION = 1

/** A reference to one event in the log. */
export type AttributedEventRef = {
  /** Zero-based position in the log. */
  index: number
  id: string
  type: string
  timestamp: number
}

/** Per-aggregate attribution: which events wrote this state-field entry. */
export type AggregateAttribution = {
  /** Canonical state field, e.g. "missions". */
  projection: string
  aggregateId: string
  /** First creation event; null when the aggregate only received writes. */
  createdBy: AttributedEventRef | null
  /** Last event that wrote the aggregate; null only for empty traces. */
  lastWrittenBy: AttributedEventRef | null
  /** Total contributing events (creation counts as the first write). */
  writeCount: number
}

/** Rollup of attribution over one state field. */
export type ProjectionAttribution = {
  projection: string
  aggregates: number
  writes: number
}

/** Structured result of an attribution trace. */
export type ReplayAttributionReport = {
  kind: "replay-attribution-report"
  version: 1
  eventCount: number
  /** Events that wrote at least one state-field aggregate. */
  attributedEvents: number
  /** Events with no state-field effect (genesis, policy, unknown types). */
  unattributedEvents: number
  projections: ProjectionAttribution[]
  attribution: AggregateAttribution[]
}

// ============================================================
// Touch table — mirrors applyEvent's payload extraction
// ============================================================

type TouchSpec = {
  eventType: string
  projection: string
  /** Creation: id lives at payload[payloadKey].id. */
  payloadKey?: string
  /** Mutation: id lives at the first present key of idKeys. */
  idKeys?: string[]
}

const TOUCH_SPECS: TouchSpec[] = [
  // Canonical + legacy work items
  { eventType: "WORK_ITEM_CREATED", projection: "workItems", payloadKey: "workItem" },
  { eventType: "TICKET_CREATED", projection: "workItems", payloadKey: "ticket" },
  { eventType: "WORK_ITEM_STARTED", projection: "workItems", idKeys: ["workItemId", "id"] },
  { eventType: "WORK_ITEM_COMPLETED", projection: "workItems", idKeys: ["workItemId", "id"] },
  { eventType: "WORK_ITEM_BLOCKED", projection: "workItems", idKeys: ["workItemId", "id"] },
  { eventType: "TICKET_STARTED", projection: "workItems", idKeys: ["ticketId", "id"] },
  { eventType: "TICKET_COMPLETED", projection: "workItems", idKeys: ["ticketId", "id"] },
  { eventType: "TICKET_BLOCKED", projection: "workItems", idKeys: ["ticketId", "id"] },
  { eventType: "WORK_ITEM_GENERATED", projection: "generatedWorkItems", payloadKey: "workItem" },

  // Plans and milestones
  { eventType: "PLAN_CREATED", projection: "plans", payloadKey: "plan" },
  { eventType: "PLAN_ACTIVATED", projection: "plans", idKeys: ["id"] },
  { eventType: "PLAN_COMPLETED", projection: "plans", idKeys: ["id"] },
  { eventType: "MILESTONE_CREATED", projection: "milestones", payloadKey: "milestone" },
  { eventType: "MILESTONE_STARTED", projection: "milestones", idKeys: ["id"] },
  { eventType: "MILESTONE_COMPLETED", projection: "milestones", idKeys: ["id"] },

  // Projects and the planning graph
  { eventType: "PROJECT_CREATED", projection: "projects", payloadKey: "project" },
  { eventType: "MISSION_CREATED", projection: "missions", payloadKey: "mission" },
  { eventType: "MISSION_APPROVED", projection: "missions", idKeys: ["id"] },
  { eventType: "MISSION_COMPLETED", projection: "missions", idKeys: ["id"] },
  { eventType: "MISSION_ARCHIVED", projection: "missions", idKeys: ["id"] },
  { eventType: "EXPEDITION_CREATED", projection: "expeditions", payloadKey: "expedition" },
  { eventType: "EXPEDITION_APPROVED", projection: "expeditions", idKeys: ["id"] },
  { eventType: "EXPEDITION_STARTED", projection: "expeditions", idKeys: ["id"] },
  { eventType: "EXPEDITION_COMPLETED", projection: "expeditions", idKeys: ["id"] },
  { eventType: "OBJECTIVE_ADDED", projection: "objectives", payloadKey: "objective" },
  { eventType: "OBJECTIVE_COMPLETED", projection: "objectives", idKeys: ["id"] },
  { eventType: "DISCOVERY_RECORDED", projection: "discoveries", payloadKey: "discovery" },
  { eventType: "DECISION_REJECTED", projection: "decisions", idKeys: ["id"] },

  // Transaction lifecycle
  { eventType: "TRANSACTION_STARTED", projection: "executions", idKeys: ["txId"] },
]

/** Canonical projection order for the report rollup. */
const PROJECTION_ORDER = [
  "projects",
  "missions",
  "expeditions",
  "objectives",
  "workItems",
  "generatedWorkItems",
  "plans",
  "milestones",
  "discoveries",
  "decisions",
  "executions",
]

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function extractAggregateId(payload: Record<string, unknown>, spec: TouchSpec): string | null {
  if (spec.payloadKey) {
    const entity = payload[spec.payloadKey]
    if (entity && typeof entity === "object") {
      const id = (entity as { id?: unknown }).id
      return isNonEmptyString(id) ? id : null
    }
    return null
  }
  for (const key of spec.idKeys ?? []) {
    const value = payload[key]
    if (value !== undefined && value !== null) return String(value)
  }
  return null
}

/**
 * Trace an event log and attribute every state-field aggregate to the
 * events that wrote it. Deterministic for a given log: aggregates are
 * ordered by first contributing event, projections in canonical order.
 */
export function attributeReplay(events: SynthEvent[]): ReplayAttributionReport {
  const byAggregate = new Map<string, AggregateAttribution>()
  let attributedEvents = 0

  for (let index = 0; index < events.length; index++) {
    const event = events[index]
    const payload = event.payload as Record<string, unknown> | undefined
    const ref: AttributedEventRef = {
      index,
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
    }

    // One event touches at most one aggregate in the current event model.
    // DECISION_ACCEPTED creates when it carries the decision payload and
    // writes when it carries only an id (mirroring applyEvent).
    let projection: string | null = null
    let aggregateId: string | null = null
    let creation = false

    if (event.type === "DECISION_ACCEPTED") {
      const decision = payload?.decision as { id?: unknown } | undefined
      projection = "decisions"
      if (decision && isNonEmptyString(decision.id)) {
        aggregateId = decision.id
        creation = true
      } else if (payload && payload.id !== undefined && payload.id !== null) {
        aggregateId = String(payload.id)
      }
    } else {
      for (const spec of TOUCH_SPECS) {
        if (event.type !== spec.eventType) continue
        projection = spec.projection
        aggregateId = payload ? extractAggregateId(payload, spec) : null
        creation = spec.payloadKey !== undefined
        break
      }
    }

    if (projection === null || aggregateId === null) continue
    attributedEvents += 1

    const key = `${projection}:${aggregateId}`
    const existing = byAggregate.get(key)
    if (existing) {
      existing.lastWrittenBy = ref
      existing.writeCount += 1
      if (creation && existing.createdBy === null) existing.createdBy = ref
    } else {
      byAggregate.set(key, {
        projection,
        aggregateId,
        createdBy: creation ? ref : null,
        lastWrittenBy: ref,
        writeCount: 1,
      })
    }
  }

  const attribution = Array.from(byAggregate.values())
  const projections: ProjectionAttribution[] = []
  for (const projection of PROJECTION_ORDER) {
    const members = attribution.filter((entry) => entry.projection === projection)
    if (members.length === 0) continue
    projections.push({
      projection,
      aggregates: members.length,
      writes: members.reduce((total, entry) => total + entry.writeCount, 0),
    })
  }

  return {
    kind: "replay-attribution-report",
    version: REPLAY_ATTRIBUTION_VERSION,
    eventCount: events.length,
    attributedEvents,
    unattributedEvents: events.length - attributedEvents,
    projections,
    attribution,
  }
}
