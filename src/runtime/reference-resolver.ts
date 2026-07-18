// ============================================================
// RUNTIME: Reference Resolver
// ============================================================
// Third stage of the governance resolver pipeline.
//
// Resolves parent references inside creation events:
//   - expedition.missionId -> mission
//   - objective.expeditionId -> expedition
//
// Resolution hierarchy:
//   1. Direct canonical identity match.
//   2. Legacy alias lookup.
//   3. Unique-candidate inference (only when exactly one candidate exists).
//   4. Unresolved fatal.
//
// The output is a derived event stream with corrected references and a
// report describing every recovery and unresolved ambiguity.
// ============================================================

import type { SynthEvent } from "../types/index.js"
import { CREATION_EVENTS, creationPayload, type AggregateGraphNode } from "./replay.js"
import type { IdentityRegistry } from "./identity-resolver.js"

export type ReferenceResolutionKind = "resolved" | "recovered-alias" | "recovered-unique-candidate" | "unresolved"

export type ReferenceResolutionNotice = {
  kind: ReferenceResolutionKind
  severity: "info" | "warning" | "error"
  aggregateKind: AggregateGraphNode["kind"]
  aggregateId: string
  referenceName: "missionId" | "expeditionId"
  originalReference: string
  resolvedReference?: string
  message: string
  provenance: {
    eventId: string
    reason: string
  }
}

export type ReferenceResolutionResult = {
  events: SynthEvent[]
  notices: ReferenceResolutionNotice[]
  unresolved: ReferenceResolutionNotice[]
}

function expectedParentKind(kind: AggregateGraphNode["kind"]): AggregateGraphNode["kind"] | undefined {
  if (kind === "expedition") return "mission"
  if (kind === "objective") return "expedition"
  return undefined
}

function parentKeyFor(kind: AggregateGraphNode["kind"]): "missionId" | "expeditionId" | undefined {
  if (kind === "expedition") return "missionId"
  if (kind === "objective") return "expeditionId"
  return undefined
}

function countCandidates(registry: IdentityRegistry, kind: AggregateGraphNode["kind"]): number {
  let count = 0
  for (const entry of registry.values()) {
    if (entry.kind === kind) count++
  }
  return count
}

function findOnlyCandidate(registry: IdentityRegistry, kind: AggregateGraphNode["kind"]): string | undefined {
  let candidate: string | undefined
  for (const entry of registry.values()) {
    if (entry.kind === kind) {
      if (candidate !== undefined) return undefined // more than one
      candidate = entry.canonicalId
    }
  }
  return candidate
}

/**
 * Resolve parent references in creation events against the identity registry.
 */
export function resolveReferences(
  events: SynthEvent[],
  registry: IdentityRegistry,
): ReferenceResolutionResult {
  const resolvedEvents: SynthEvent[] = []
  const notices: ReferenceResolutionNotice[] = []
  const unresolved: ReferenceResolutionNotice[] = []

  for (const event of events) {
    let matched = false

    for (const spec of CREATION_EVENTS) {
      if (event.type !== spec.eventType) continue
      matched = true

      const entity = creationPayload(event, spec.payloadKey)
      const id = entity?.id
      if (!id || typeof id !== "string") {
        resolvedEvents.push(event)
        break
      }

      const parentKind = expectedParentKind(spec.kind)
      const parentKey = parentKeyFor(spec.kind)
      if (!parentKind || !parentKey) {
        resolvedEvents.push(event)
        break
      }

      const parentId = entity[parentKey]
      if (!parentId || typeof parentId !== "string") {
        // Missing parent reference is an unresolved fatal.
        const notice: ReferenceResolutionNotice = {
          kind: "unresolved",
          severity: "error",
          aggregateKind: spec.kind,
          aggregateId: id,
          referenceName: parentKey,
          originalReference: "",
          message: `${spec.eventType} ${id} has no ${parentKind} parent reference`,
          provenance: { eventId: event.id, reason: "missing-parent-reference" },
        }
        notices.push(notice)
        unresolved.push(notice)
        resolvedEvents.push(event)
        break
      }

      // 1. Direct canonical match
      const direct = registry.get(parentId)
      if (direct && direct.kind === parentKind) {
        notices.push({
          kind: "resolved",
          severity: "info",
          aggregateKind: spec.kind,
          aggregateId: id,
          referenceName: parentKey,
          originalReference: parentId,
          resolvedReference: parentId,
          message: `${spec.kind} ${id} references ${parentKind} ${parentId}`,
          provenance: { eventId: event.id, reason: "canonical-identity" },
        })
        resolvedEvents.push(event)
        break
      }

      // 2. Legacy alias lookup (placeholder for future alias registry)
      // No alias map yet; fall through.

      // 3. Unique-candidate inference
      const onlyCandidate = findOnlyCandidate(registry, parentKind)
      if (onlyCandidate) {
        const notice: ReferenceResolutionNotice = {
          kind: "recovered-unique-candidate",
          severity: "warning",
          aggregateKind: spec.kind,
          aggregateId: id,
          referenceName: parentKey,
          originalReference: parentId,
          resolvedReference: onlyCandidate,
          message: `${spec.kind} ${id} references unknown ${parentKind} ${parentId}; recovered to unique candidate ${onlyCandidate}`,
          provenance: { eventId: event.id, reason: "unique-candidate-inference" },
        }
        notices.push(notice)

        const payload = event.payload as Record<string, unknown>
        resolvedEvents.push({
          ...event,
          payload: {
            ...payload,
            [spec.payloadKey]: {
              ...entity,
              [parentKey]: onlyCandidate,
            },
          },
        })
        break
      }

      // 4. Unresolved fatal
      const notice: ReferenceResolutionNotice = {
        kind: "unresolved",
        severity: "error",
        aggregateKind: spec.kind,
        aggregateId: id,
        referenceName: parentKey,
        originalReference: parentId,
        message: `${spec.kind} ${id} references unknown ${parentKind} ${parentId}`,
        provenance: { eventId: event.id, reason: "no-matching-candidate" },
      }
      notices.push(notice)
      unresolved.push(notice)
      resolvedEvents.push(event)
      break
    }

    if (!matched) {
      resolvedEvents.push(event)
    }
  }

  return { events: resolvedEvents, notices, unresolved }
}
