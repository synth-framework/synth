// ============================================================
// GOVERNANCE: Proposal Evaluation — Decision Mapping
// ============================================================
// Maps a deterministic EvaluationResult to gate-specific decisions.
// This module owns the interpretation of evaluation outcomes; the gate
// engine remains responsible only for lifecycle transitions.
// ============================================================

import type { EvaluationResult } from "./types.js"
import type { ReviewDecisionType, AcceptanceDecisionType } from "../review-gates.js"

/** Map an EvaluationResult to a Review Gate decision.
 *
 * Review Gate is an intermediate checkpoint: implementation may still be
 * revised, so `revision_required` is a valid outcome.
 */
export function mapToReviewDecision(evaluation: EvaluationResult): ReviewDecisionType {
  switch (evaluation.decision) {
    case "aligned":
      return "approve"
    case "revision_required":
      return "revision_required"
    case "rejected":
      return "reject"
    case "superseded":
      return "supersede_expedition"
  }
}

/** Map an EvaluationResult to an Acceptance Gate decision.
 *
 * Acceptance Gate is terminal. Once implementation reaches this stage, any
 * remaining divergence is rejected; there is no revision at acceptance.
 */
export function mapToAcceptanceDecision(evaluation: EvaluationResult): AcceptanceDecisionType {
  switch (evaluation.decision) {
    case "aligned":
      return "accepted"
    case "revision_required":
    case "rejected":
    case "superseded":
      return "rejected"
  }
}
