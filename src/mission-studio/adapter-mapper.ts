// ============================================================
// MISSION STUDIO: Adapter Observation Mapper
// ============================================================
// Converts adapter-facing Observation objects into the
// PlanningObservation shape consumed by Mission Studio.
//
// This is the single authoritative boundary between adapter evidence
// and Mission Studio intake. Adapters remain adapter-agnostic;
// Mission Studio remains planning-agnostic.
// ============================================================

import crypto from "crypto"
import type { Observation } from "../types/observation.js"
import type { PlanningObservation, PlanningObservationType, PlanningObservationConfidence } from "../planning/observation.js"

const VALID_PLANNING_TYPES: ReadonlySet<PlanningObservationType> = new Set([
  "intent",
  "language",
  "framework",
  "dependency",
  "component",
  "architecture",
  "constraint",
  "risk",
  "assumption",
  "unknown",
  "evidence",
  "actor",
  "capability",
  "test",
  "coverage",
  "mission",
  "expedition",
  "objective",
  "wizard",
  "custom",
])

/**
 * Map a single adapter Observation to a PlanningObservation.
 * Returns null if the observation is structurally invalid or its category
 * is not supported by the planning layer.
 */
export function mapObservationToPlanningObservation(obs: Observation): PlanningObservation | null {
  if (!obs || typeof obs !== "object") return null
  if (typeof obs.id !== "string" || obs.id.length === 0) return null
  if (!obs.source || typeof obs.source.adapter !== "string" || obs.source.adapter.length === 0) return null
  if (!VALID_PLANNING_TYPES.has(obs.category as PlanningObservationType)) return null

  const type = obs.category as PlanningObservationType
  const evidenceReference = deriveEvidenceReference(obs)
  const payload = buildPayload(obs)

  return {
    id: obs.id,
    sourceAdapter: obs.source.adapter,
    type,
    payload,
    evidenceReference,
    confidence: normalizeConfidence(obs.confidence),
    timestamp: typeof obs.timestamp === "number" ? obs.timestamp : Date.now(),
  }
}

/**
 * Map a batch of adapter Observations to PlanningObservations.
 * Invalid or unsupported observations are filtered out.
 * Duplicates by id + sourceAdapter + type are removed.
 */
export function mapObservationsToPlanningObservations(observations: Observation[]): PlanningObservation[] {
  const result: PlanningObservation[] = []
  const seen = new Set<string>()

  for (const obs of observations) {
    const mapped = mapObservationToPlanningObservation(obs)
    if (!mapped) continue

    const key = `${mapped.id}-${mapped.sourceAdapter}-${mapped.type}`
    if (seen.has(key)) continue
    seen.add(key)

    result.push(mapped)
  }

  return result
}

function normalizeConfidence(confidence: string | undefined): PlanningObservationConfidence {
  switch (confidence) {
    case "certain":
    case "high":
    case "medium":
    case "low":
    case "unknown":
      return confidence
    default:
      return "unknown"
  }
}

function deriveEvidenceReference(obs: Observation): string {
  if (obs.evidence && obs.evidence.length > 0) {
    const first = obs.evidence[0]
    if (first.fingerprint && first.fingerprint.length > 0) {
      return first.fingerprint
    }
    if (first.description && first.description.length > 0) {
      return hash(`${obs.source.adapter}-${obs.category}-${first.description}-${obs.timestamp}`)
    }
  }
  return hash(`${obs.source.adapter}-${obs.category}-${obs.subject}-${obs.timestamp}`)
}

function buildPayload(obs: Observation): Record<string, unknown> {
  const firstEvidence = obs.evidence && obs.evidence.length > 0 ? obs.evidence[0] : undefined

  const payload: Record<string, unknown> = {
    subject: obs.subject,
    description:
      firstEvidence?.description || `${obs.category} observation from ${obs.source.adapter}`,
  }

  if (firstEvidence?.snippet) {
    payload.snippet = firstEvidence.snippet
  }

  if (obs.metadata && typeof obs.metadata === "object") {
    Object.assign(payload, obs.metadata)
  }

  // Preserve full evidence array for richer downstream planning use.
  payload.evidence = (obs.evidence || []).map((e) => ({
    description: e.description,
    snippet: e.snippet,
    fingerprint: e.fingerprint,
  }))

  return payload
}

function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)
}
