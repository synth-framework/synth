// ============================================================
// MISSION STUDIO: Mission Intake
// ============================================================
// Boundary between adapters and Mission Studio. Validates,
// deduplicates, and canonicalizes observations into Evidence.
// Mission Studio itself never imports adapter implementations.
// ============================================================

import crypto from "crypto"
import type { PlanningObservation } from "../planning/observation.js"
import type { Evidence, EvidenceCollection } from "./types.js"

export class MissionIntake {
  /**
   * Validate and deduplicate observations.
   * Returns a clean array of normalized observations.
   */
  normalize(observations: PlanningObservation[]): PlanningObservation[] {
    const seen = new Set<string>()
    const normalized: PlanningObservation[] = []

    for (const obs of observations) {
      if (!this.isValidObservation(obs)) continue
      const key = `${obs.id}-${obs.sourceAdapter}-${obs.type}`
      if (seen.has(key)) continue
      seen.add(key)
      normalized.push({
        ...obs,
        payload: obs.payload || {},
        confidence: obs.confidence || "unknown",
      })
    }

    return normalized
  }

  /**
   * Convert observations into immutable Evidence.
   */
  extractEvidence(observations: PlanningObservation[]): Evidence[] {
    const evidence: Evidence[] = []

    for (const obs of observations) {
      const payload = obs.payload || {}
      const snippet =
        typeof payload.snippet === "string"
          ? payload.snippet
          : typeof payload.description === "string"
            ? payload.description
            : JSON.stringify(payload).slice(0, 200)

      evidence.push({
        id: this.hash(`evidence-${obs.id}-${obs.sourceAdapter}`),
        observationId: obs.id,
        source: obs.sourceAdapter,
        description: typeof payload.description === "string" ? payload.description : `${obs.type} observation from ${obs.sourceAdapter}`,
        snippet,
        fingerprint: this.hash(`${obs.sourceAdapter}-${obs.type}-${snippet}-${obs.timestamp}`),
        immutable: true,
      })
    }

    return evidence
  }

  /**
   * Build an EvidenceCollection with lookup indexes.
   */
  buildEvidenceCollection(observations: PlanningObservation[]): EvidenceCollection {
    const evidence = this.extractEvidence(observations)
    const byObservationId = new Map<string, Evidence>()
    for (const e of evidence) {
      byObservationId.set(e.observationId, e)
    }
    return { evidence, byObservationId }
  }

  /**
   * Filter observations by adapter, type, confidence, or custom predicate.
   */
  filter(
    observations: PlanningObservation[],
    criteria: {
      adapter?: string
      type?: string
      minConfidence?: "unknown" | "low" | "medium" | "high" | "certain"
      predicate?: (obs: PlanningObservation) => boolean
    } = {},
  ): PlanningObservation[] {
    const confidenceOrder = { unknown: 0, low: 1, medium: 2, high: 3, certain: 4 }
    const min = criteria.minConfidence ? confidenceOrder[criteria.minConfidence] : 0

    return observations.filter((obs) => {
      if (criteria.adapter && obs.sourceAdapter !== criteria.adapter) return false
      if (criteria.type && obs.type !== criteria.type) return false
      if (criteria.minConfidence && confidenceOrder[obs.confidence || "unknown"] < min) return false
      if (criteria.predicate && !criteria.predicate(obs)) return false
      return true
    })
  }

  private isValidObservation(obs: unknown): obs is PlanningObservation {
    if (!obs || typeof obs !== "object") return false
    const o = obs as Partial<PlanningObservation>
    return (
      typeof o.id === "string" &&
      o.id.length > 0 &&
      typeof o.sourceAdapter === "string" &&
      o.sourceAdapter.length > 0 &&
      typeof o.type === "string" &&
      o.type.length > 0
    )
  }

  private hash(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16)
  }
}

export function createMissionIntake(): MissionIntake {
  return new MissionIntake()
}
