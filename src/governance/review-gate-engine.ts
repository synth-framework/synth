// ============================================================
// GOVERNANCE: Review Gate Engine
// ============================================================
// Execution-facing engine that drives the review-gate lifecycle
// and emits canonical events. Wraps the pure review-gates logic
// with state transitions suitable for the domain layer.
// ============================================================

import type { CanonicalState, DerivedState, ReviewGateExpeditionState } from "../types/index.js"
import type {
  GatePolicy,
  Reviewer,
  ReviewDecisionType,
  AcceptanceDecisionType,
  RefinedIntent,
} from "./review-gates.js"
import type { EvaluationResult } from "./proposal-evaluation/types.js"
import {
  createReviewGateExpedition,
  beginExecution,
  completeImplementation,
  resolveReviewGate,
  beginRevision,
  openAcceptanceGate,
  resolveAcceptanceGate,
  closeExpedition,
  approveRefinedIntent,
  blocksDownstream,
  fulfillCondition,
  allConditionsFulfilled,
} from "./review-gates.js"

export type ReviewGateEngineEvent = {
  type: string
  payload: Record<string, unknown>
}

export type ReviewGateEngineResult = {
  state: ReviewGateExpeditionState
  events: ReviewGateEngineEvent[]
}

function toState(state: ReviewGateExpeditionState): ReviewGateExpeditionState {
  return JSON.parse(JSON.stringify(state))
}

/** Cast replay state to the engine's internal type.
 *
 * The replay state uses string-based policy representations for
 * serializability; the engine uses the narrower GatePolicy type.
 * Structural compatibility is guaranteed by construction.
 */
function asEngineState(state: ReviewGateExpeditionState): import("./review-gates.js").ReviewGateExpedition {
  return state as unknown as import("./review-gates.js").ReviewGateExpedition
}

function fromEngineState(state: import("./review-gates.js").ReviewGateExpedition): ReviewGateExpeditionState {
  return JSON.parse(JSON.stringify(state)) as ReviewGateExpeditionState
}

/** Ensure a review-gate expedition record exists. */
export function ensureReviewGateExpedition(
  derivedState: DerivedState,
  expeditionId: string
): ReviewGateExpeditionState {
  return derivedState.reviewGateExpeditions[expeditionId] ?? createReviewGateExpedition(expeditionId)
}

/** Approve a Refined Intent and bind it to the expedition. */
export function engineApproveRefinedIntent(
  current: ReviewGateExpeditionState | undefined,
  expeditionId: string,
  refinedIntentInput: Omit<RefinedIntent, "id" | "version" | "approvedAt">,
  reviewer: Reviewer,
  policy: GatePolicy
): ReviewGateEngineResult {
  const rge = current ?? createReviewGateExpedition(expeditionId)
  const { expedition, refinedIntent } = approveRefinedIntent(asEngineState(rge), refinedIntentInput, reviewer, policy)
  return {
    state: toState(expedition),
    events: [
      {
        type: "REFINED_INTENT_APPROVED",
        payload: {
          expeditionId,
          refinedIntentId: refinedIntent.id,
          refinedIntent: JSON.parse(JSON.stringify(refinedIntent)),
        },
      },
    ],
  }
}

/** Mark implementation complete and open a Review Gate. */
export function engineOpenReviewGate(
  current: ReviewGateExpeditionState | undefined,
  expeditionId: string,
  implementationReference: string,
  policy: GatePolicy
): ReviewGateEngineResult {
  let rge = current ?? createReviewGateExpedition(expeditionId)
  rge = fromEngineState(beginExecution(asEngineState(rge)))
  const { expedition, gate, reviewPackage } = completeImplementation(
    asEngineState(rge),
    implementationReference,
    policy
  )
  return {
    state: fromEngineState(expedition),
    events: [
      {
        type: "REVIEW_GATE_OPENED",
        payload: {
          expeditionId,
          gateId: gate.id,
          reviewPackageId: reviewPackage.id,
          policy: JSON.parse(JSON.stringify(policy)),
          reviewPackage: JSON.parse(JSON.stringify(reviewPackage)),
        },
      },
    ],
  }
}

/** Resolve a Review Gate with a decision. */
export function engineResolveReviewGate(
  current: ReviewGateExpeditionState,
  decisionType: ReviewDecisionType,
  reviewer: Reviewer,
  reason: string,
  evidence: string[] = [],
  affectedAssets: string[] = [],
  requiredChanges: string[] = [],
  evaluation?: EvaluationResult
): ReviewGateEngineResult {
  const { expedition, gate, decision } = resolveReviewGate(
    asEngineState(current),
    decisionType,
    reviewer,
    reason,
    evidence,
    affectedAssets,
    requiredChanges
  )
  const payload: Record<string, unknown> = {
    expeditionId: expedition.expeditionId,
    gateId: gate.id,
    decisionId: decision.id,
    decision: decisionType,
    reason,
    evidence,
    affectedAssets,
    requiredChanges,
    reviewer: JSON.parse(JSON.stringify(reviewer)),
  }
  if (evaluation) {
    payload.evaluation = JSON.parse(JSON.stringify(evaluation))
  }
  return {
    state: fromEngineState(expedition),
    events: [
      {
        type: "REVIEW_GATE_RESOLVED",
        payload,
      },
    ],
  }
}

/** Begin a revision after a Review Gate requested changes. */
export function engineRequestRevision(
  current: ReviewGateExpeditionState,
  gateId: string,
  reviewer: Reviewer,
  reason: string,
  evidence: string[] = []
): ReviewGateEngineResult {
  const gate = current.gates.find((g) => g.id === gateId)
  if (!gate) throw new Error(`Gate ${gateId} not found`)
  const { expedition, revisionRequest } = beginRevision(asEngineState(current), gate as import("./review-gates.js").Gate, reviewer, reason, evidence)
  return {
    state: fromEngineState(expedition),
    events: [
      {
        type: "REVISION_REQUESTED",
        payload: {
          expeditionId: expedition.expeditionId,
          gateId,
          revisionRequestId: revisionRequest.id,
          reason,
          evidence,
          reviewer: JSON.parse(JSON.stringify(reviewer)),
        },
      },
    ],
  }
}

/** Open the Acceptance Gate after a successful Review Gate. */
export function engineOpenAcceptanceGate(
  current: ReviewGateExpeditionState,
  policy: GatePolicy
): ReviewGateEngineResult {
  const reviewDecisionId = current.reviewDecisionId
  if (!reviewDecisionId) throw new Error("No review decision to accept")
  const reviewGate = current.gates.find((g) => g.gateType === "review" && g.decisionId === reviewDecisionId)

  if (reviewGate && !allConditionsFulfilled(reviewGate as unknown as import("./review-gates.js").Gate)) {
    throw new Error(
      `Cannot open acceptance gate: gate ${reviewGate.id} has unfulfilled conditions. ` +
      `Fulfill all conditions before opening acceptance gate.`
    )
  }

  const reviewDecision = {
    id: reviewDecisionId,
    gateId: reviewGate?.id ?? "",
    gateType: "review" as const,
    expeditionId: current.expeditionId,
    decision: (reviewGate?.decision as ReviewDecisionType) ?? "approve",
    reason: reviewGate?.decisionReason ?? "",
    affectedAssets: reviewGate?.decisionAffectedAssets ?? [],
    evidence: reviewGate?.decisionEvidence ?? [],
    reviewer: (reviewGate?.reviewer as Reviewer) ?? { kind: "human" as const, id: "operator" },
    validity: "valid" as const,
    timestamp: reviewGate?.resolvedAt ?? Date.now(),
  }
  const { expedition, gate, acceptancePackage } = openAcceptanceGate(asEngineState(current), reviewDecision, policy)
  return {
    state: fromEngineState(expedition),
    events: [
      {
        type: "ACCEPTANCE_GATE_OPENED",
        payload: {
          expeditionId: expedition.expeditionId,
          gateId: gate.id,
          acceptancePackageId: acceptancePackage.id,
          policy: JSON.parse(JSON.stringify(policy)),
          acceptancePackage: JSON.parse(JSON.stringify(acceptancePackage)),
        },
      },
    ],
  }
}

/** Resolve the Acceptance Gate. */
export function engineResolveAcceptanceGate(
  current: ReviewGateExpeditionState,
  decisionType: AcceptanceDecisionType,
  reviewer: Reviewer,
  reason: string,
  evidence: string[] = [],
  evaluation?: EvaluationResult
): ReviewGateEngineResult {
  const { expedition, gate, record, decision } = resolveAcceptanceGate(
    asEngineState(current),
    decisionType,
    reviewer,
    reason,
    evidence
  )
  const payload: Record<string, unknown> = {
    expeditionId: expedition.expeditionId,
    gateId: gate.id,
    decisionId: decision.id,
    recordId: record.id,
    decision: decisionType,
    reason,
    evidence,
    reviewer: JSON.parse(JSON.stringify(reviewer)),
  }
  if (evaluation) {
    payload.evaluation = JSON.parse(JSON.stringify(evaluation))
  }
  return {
    state: fromEngineState(expedition),
    events: [
      {
        type: "ACCEPTANCE_GATE_RESOLVED",
        payload,
      },
    ],
  }
}

/** Close an accepted expedition. */
export function engineCloseExpedition(current: ReviewGateExpeditionState): ReviewGateEngineResult {
  const expedition = closeExpedition(asEngineState(current))
  return {
    state: fromEngineState(expedition),
    events: [
      {
        type: "EXPEDITION_CLOSED",
        payload: { expeditionId: expedition.expeditionId },
      },
    ],
  }
}

/** Fulfill a condition on a review gate. */
export function engineFulfillCondition(
  current: ReviewGateExpeditionState,
  gateId: string,
  conditionId: string,
  fulfilledBy: string
): ReviewGateEngineResult {
  const gate = current.gates.find((g) => g.id === gateId)
  if (!gate) throw new Error(`Gate ${gateId} not found`)
  const updatedGate = fulfillCondition(
    gate as unknown as import("./review-gates.js").Gate,
    conditionId,
    fulfilledBy
  )
  return {
    state: {
      ...current,
      gates: current.gates.map((g) => (g.id === gateId ? { ...g, conditions: updatedGate.conditions } : g)),
    },
    events: [
      {
        type: "CONDITION_FULFILLED",
        payload: { gateId, conditionId, fulfilledBy },
      },
    ],
  }
}

/** Check whether an upstream expedition blocks downstream work. */
export function isBlockedByUpstreamGate(
  state: CanonicalState,
  derivedState: DerivedState,
  expeditionId: string
): boolean {
  const expedition = state.expeditions[expeditionId]
  if (!expedition) return false
  for (const dependencyId of expedition.dependsOn ?? []) {
    const upstream = derivedState.reviewGateExpeditions[dependencyId]
    if (upstream && blocksDownstream(asEngineState(upstream))) {
      return true
    }
  }
  return false
}
