// ============================================================
// RUNTIME: Historical Normalizer
// ============================================================
// First stage of the governance resolver pipeline.
//
// Reads the raw event stream and produces a normalized stream without
// mutating history. It detects and classifies legacy artifacts:
//   - duplicate identities
//   - cross-kind identity conflicts
//   - malformed creation payloads
//
// The output is a deterministic, order-preserving event stream where
// duplicate creation events for the same aggregate are collapsed to a
// single canonical event. All historical deviations are reported as
// notices with provenance.
// ============================================================

import type { SynthEvent } from "../types/index.js"
import { CREATION_EVENTS, creationPayload, type AggregateGraphNode } from "./replay.js"

export type NormalizationKind =
  | "duplicate-identity"
  | "cross-kind-conflict"
  | "malformed-creation"

export type NormalizationNotice = {
  kind: NormalizationKind
  severity: "warning" | "error"
  aggregateKind: AggregateGraphNode["kind"]
  aggregateId: string
  message: string
  provenance: {
    /** Event ids that contributed to this notice */
    eventIds: string[]
    /** Original references observed, if any */
    references?: Record<string, unknown>
  }
}

export type HistoricalNormalizationResult = {
  /** Events with duplicate creations collapsed */
  events: SynthEvent[]
  /** Notices describing historical deviations */
  notices: NormalizationNotice[]
  /** Canonical identity entries: key = `${kind}:${id}` */
  canonicalIdentities: Map<string, { kind: AggregateGraphNode["kind"]; canonicalEventId: string }>
}

function identityKey(kind: AggregateGraphNode["kind"], id: string): string {
  return `${kind}:${id}`
}

/**
 * Normalize a raw event stream for canonical state derivation.
 *
 * Duplicate creation events for the same aggregate identity are collapsed.
 * The first occurrence is kept as the canonical creation; subsequent
 * identical occurrences are recorded as duplicate-identity notices.
 */
export function normalizeHistoricalEvents(events: SynthEvent[]): HistoricalNormalizationResult {
  const normalized: SynthEvent[] = []
  const notices: NormalizationNotice[] = []
  const canonicalIdentities = new Map<string, { kind: AggregateGraphNode["kind"]; canonicalEventId: string }>()

  for (const event of events) {
    let matched = false

    for (const spec of CREATION_EVENTS) {
      if (event.type !== spec.eventType) continue
      matched = true

      const entity = creationPayload(event, spec.payloadKey)
      const id = entity?.id
      if (!id || typeof id !== "string") {
        notices.push({
          kind: "malformed-creation",
          severity: "error",
          aggregateKind: spec.kind,
          aggregateId: "",
          message: `${spec.eventType} event is missing its ${spec.payloadKey} payload id`,
          provenance: { eventIds: [event.id] },
        })
        normalized.push(event)
        break
      }

      const key = identityKey(spec.kind, id)
      const existing = canonicalIdentities.get(key)

      if (existing) {
        // Duplicate identity. Historical genesis snapshots and replay
        // re-creations may repeat the same aggregate id with different
        // timestamps. We collapse them to the earliest event and record a
        // warning; the identity resolver decides the canonical identity.
        notices.push({
          kind: "duplicate-identity",
          severity: "warning",
          aggregateKind: spec.kind,
          aggregateId: id,
          message: `Duplicate ${spec.kind} identity in event log: ${id}`,
          provenance: { eventIds: [existing.canonicalEventId, event.id] },
        })
      } else {
        // First time seeing this identity. Check for cross-kind reuse.
        let crossKindConflict = false
        for (const [registeredKey, registered] of canonicalIdentities) {
          if (registeredKey.endsWith(`:${id}`) && registered.kind !== spec.kind) {
            crossKindConflict = true
            notices.push({
              kind: "cross-kind-conflict",
              severity: "error",
              aggregateKind: spec.kind,
              aggregateId: id,
              message: `Event log identity ${id} is used as both ${registered.kind} and ${spec.kind}`,
              provenance: {
                eventIds: [registered.canonicalEventId, event.id],
                references: { existingKind: registered.kind, newKind: spec.kind },
              },
            })
            break
          }
        }

        if (!crossKindConflict) {
          canonicalIdentities.set(key, { kind: spec.kind, canonicalEventId: event.id })
        }
        normalized.push(event)
      }

      break
    }

    if (!matched) {
      // Non-creation events pass through unchanged.
      normalized.push(event)
    }
  }

  return { events: normalized, notices, canonicalIdentities }
}
