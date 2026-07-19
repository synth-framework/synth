// ============================================================
// FIRST CONTACT: Confidence Scoring
// ============================================================
// Deterministic confidence scoring for extracted fields.
// ============================================================

import type { ConfidenceScore, FieldConfidence, IntentExtractionResult } from "./types.js"

const FIELD_THRESHOLDS: Record<string, number> = {
  "intent.description": 1.0,
  "intent.goals": 0.7,
  "intent.successCriteria": 0.5,
  "audience.primaryUsers": 0.4,
  "audience.stakeholders": 0.3,
  "environment.targetRuntime": 0.6,
  "environment.languagePreferences": 0.5,
  "environment.platformConstraints": 0.3,
  "capabilities.required": 0.6,
  "capabilities.optional": 0.2,
  "constraints.functional": 0.3,
  "constraints.nonFunctional": 0.3,
}

function clamp(value: number): ConfidenceScore {
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000))
}

function scorePresence(value: string | string[] | undefined, threshold: number): ConfidenceScore {
  if (value === undefined) return 0
  if (Array.isArray(value)) {
    if (value.length === 0) return 0
    // Confidence increases with count up to a cap.
    return clamp(Math.min(1, threshold + value.length * 0.1))
  }
  if (value.trim().length === 0) return 0
  return clamp(threshold)
}

export function computeConfidence(result: IntentExtractionResult): FieldConfidence {
  const byField: Record<string, ConfidenceScore> = {
    "intent.description": scorePresence(result.intent.description, FIELD_THRESHOLDS["intent.description"]),
    "intent.goals": scorePresence(result.intent.goals, FIELD_THRESHOLDS["intent.goals"]),
    "intent.successCriteria": scorePresence(result.intent.successCriteria, FIELD_THRESHOLDS["intent.successCriteria"]),
    "audience.primaryUsers": scorePresence(result.audience.primaryUsers, FIELD_THRESHOLDS["audience.primaryUsers"]),
    "audience.stakeholders": scorePresence(result.audience.stakeholders, FIELD_THRESHOLDS["audience.stakeholders"]),
    "environment.targetRuntime": scorePresence(result.environment.targetRuntime, FIELD_THRESHOLDS["environment.targetRuntime"]),
    "environment.languagePreferences": scorePresence(result.environment.languagePreferences, FIELD_THRESHOLDS["environment.languagePreferences"]),
    "environment.platformConstraints": scorePresence(result.environment.platformConstraints, FIELD_THRESHOLDS["environment.platformConstraints"]),
    "capabilities.required": scorePresence(result.capabilities.required, FIELD_THRESHOLDS["capabilities.required"]),
    "capabilities.optional": scorePresence(result.capabilities.optional, FIELD_THRESHOLDS["capabilities.optional"]),
    "constraints.functional": scorePresence(result.constraints.functional, FIELD_THRESHOLDS["constraints.functional"]),
    "constraints.nonFunctional": scorePresence(result.constraints.nonFunctional, FIELD_THRESHOLDS["constraints.nonFunctional"]),
  }

  const values = Object.values(byField)
  const overall = clamp(values.reduce((sum, v) => sum + v, 0) / values.length)

  return { overall, byField }
}
