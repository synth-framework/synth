// ============================================================
// GOVERNANCE: Expedition Scope-and-Intent Alignment
// ============================================================
// Deterministic scope-and-intent verification for re-parenting an
// expedition to a different mission (EXP-MISSION-FLEXIBILITY).
// Purely lexical: reuses the Mission Studio weighted-token similarity
// utilities. No ML, no LLM, no runtime dependencies.
//
// An expedition is "aligned" with a target mission when its scope
// (name + goal) shares enough weighted tokens with the mission's
// charter (name + purpose). Misaligned moves require explicit
// operator approval before the EXPEDITION_MOVED event is emitted.
// ============================================================

import type { Mission, Expedition } from "../types/index.js"
import {
  buildWeightedTokens,
  scoreWeightedJaccard,
} from "../mission-studio/index.js"

/**
 * Score threshold above which an expedition is considered aligned
 * with a target mission. Mirrors the duplicate-detection default so
 * the similarity semantics stay consistent across the CLI surface.
 */
const SCOPE_ALIGNMENT_THRESHOLD = 0.3

export type ScopeAlignmentResult = {
  aligned: boolean
  score: number
  overlap: string[]
}

/**
 * Assess whether an expedition's scope and intent align with a
 * target mission. The expedition's name and goal contribute intent
 * tokens; the mission's name and purpose contribute its charter.
 */
export function assessExpeditionMissionAlignment(
  expedition: Pick<Expedition, "name" | "goal">,
  mission: Pick<Mission, "name" | "purpose">,
): ScopeAlignmentResult {
  const intentBag = buildWeightedTokens({
    text: `${expedition.name} ${expedition.goal}`.trim(),
  })
  const charterBag = buildWeightedTokens({
    text: `${mission.name} ${mission.purpose ?? ""}`.trim(),
  })
  const overlap = Array.from(intentBag.keys()).filter((token) => charterBag.has(token))
  const score = scoreWeightedJaccard(intentBag, charterBag)
  return {
    aligned: score >= SCOPE_ALIGNMENT_THRESHOLD,
    score,
    overlap,
  }
}
