// ============================================================
// RUNTIME: Identity Resolver
// ============================================================
// Second stage of the governance resolver pipeline.
//
// Builds the canonical identity registry from normalized events.
// The registry maps every recognized aggregate identity to its kind,
// canonical creation event, and any known aliases.
//
// Resolution rules (in priority order):
//   1. Explicit canonical identity from normalized events.
//   2. Latest accepted identity (for conflicting versions).
//   3. Lineage relationship.
//   4. Deterministic fallback (earliest creation event).
//
// This stage does not mutate events. It produces the identity graph
// used by the Reference Resolver.
// ============================================================

import type { SynthEvent } from "../types/index.js"
import { CREATION_EVENTS, creationPayload, type AggregateGraphNode } from "./replay.js"
import type { NormalizationNotice } from "./historical-normalizer.js"

export type IdentityEntry = {
  canonicalId: string
  kind: AggregateGraphNode["kind"]
  canonicalEventId: string
  canonicalEventIndex: number
  aliases: string[]
}

export type IdentityRegistry = Map<string, IdentityEntry>

export type IdentityResolutionResult = {
  registry: IdentityRegistry
  /** Identity-related notices (duplicates, superseded versions, etc.) */
  notices: NormalizationNotice[]
}

/**
 * Build the canonical identity registry from normalized events.
 *
 * The current implementation uses deterministic fallback (earliest creation
 * wins) because the Historical Normalizer has already collapsed exact
 * duplicates. This function is the explicit home for future priority rules
 * such as "latest accepted" or "lineage relationship".
 */
export function resolveIdentities(events: SynthEvent[]): IdentityResolutionResult {
  const registry: IdentityRegistry = new Map()
  const notices: NormalizationNotice[] = []

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    for (const spec of CREATION_EVENTS) {
      if (event.type !== spec.eventType) continue

      const entity = creationPayload(event, spec.payloadKey)
      const id = entity?.id
      if (!id || typeof id !== "string") continue

      const existing = registry.get(id)
      if (existing) {
        // The normalizer should have collapsed exact duplicates, but guard
        // against any remaining duplicates in the input stream.
        notices.push({
          kind: "duplicate-identity",
          severity: "warning",
          aggregateKind: spec.kind,
          aggregateId: id,
          message: `Identity resolver encountered duplicate ${spec.kind} identity: ${id}`,
          provenance: { eventIds: [existing.canonicalEventId, event.id] },
        })
        continue
      }

      registry.set(id, {
        canonicalId: id,
        kind: spec.kind,
        canonicalEventId: event.id,
        canonicalEventIndex: i,
        aliases: [],
      })
      break
    }
  }

  return { registry, notices }
}

export function getCanonicalId(registry: IdentityRegistry, id: string): string | undefined {
  return registry.has(id) ? id : undefined
}
