// ============================================================
// GOVERNANCE: Intent Refinement & Review Gates
// ============================================================
// Pure types and state transitions for the three-gate model.
// No runtime/execution integration at this layer; this module
// defines the vocabulary, artifacts, and state machine.
// ============================================================

/** Gate kinds in the intent-to-acceptance lifecycle. */
export type GateType = "refinement" | "review" | "acceptance"

/** Completion policy for an expedition. Determines who may resolve gates. */
export type CompletionPolicy = "automatic" | "human_required" | "ai_required"

/** Actor kinds that may resolve a gate. */
export type ReviewerKind = "human" | "ai" | "council" | "engine" | "asset_owner"

/** Reviewer identity. */
export type Reviewer = {
  kind: ReviewerKind
  id: string
}

/** Decision types for the Refinement Gate. */
export type RefinementDecisionType = "refined_intent" | "clarification_requested"

/** Decision types for the Review Gate. */
export type ReviewDecisionType =
  | "approve"
  | "approve_with_conditions"
  | "revision_required"
  | "reject"
  | "supersede_expedition"
  | "split_expedition"
  | "merge_expedition"
  | "escalate_to_mission"
  | "escalate_to_program"

/** Decision types for the Acceptance Gate. */
export type AcceptanceDecisionType = "accepted" | "rejected"

/** Union of all gate decision types. */
export type GateDecisionType = RefinementDecisionType | ReviewDecisionType | AcceptanceDecisionType

/** Current status of a gate instance. */
export type GateStatus =
  | "pending"
  | "awaiting_review"
  | "approved"
  | "revision_requested"
  | "rejected"
  | "accepted"
  | "closed"

/** Expedition lifecycle status under review-gate governance. */
export type ReviewGateExpeditionStatus =
  | "proposed"
  | "executing"
  | "implementation_complete"
  | "awaiting_review"
  | "revision_requested"
  | "approved"
  | "awaiting_acceptance"
  | "accepted"
  | "closed"
  | "rejected"

/** Refined Intent — canonical pre-Mission contract. */
export type RefinedIntent = {
  id: string
  missionId: string
  objective: string
  scope: string
  nonGoals: string[]
  successCriteria: string[]
  visualReferences: string[]
  behavioralReferences: string[]
  constraints: string[]
  protectedAssets: string[]
  acceptanceExamples: string[]
  knownUnknowns: string[]
  risks: string[]
  approvedBy?: Reviewer
  approvedAt?: number
  version: number
}

/** Gate package produced at every Review Gate. */
export type ReviewGatePackage = {
  id: string
  expeditionId: string
  refinedIntentId: string
  implementationReference: string
  knownDivergence: string[]
  acceptedDivergence: string[]
  rejectedDivergence: string[]
  reviewer: Reviewer
  decision: ReviewDecisionType
  reason: string
  nextAction: string
  evidence: string[]
  timestamp: number
}

/** Replayable decision event produced by any gate. */
export type ReviewDecision = {
  id: string
  gateType: GateType
  expeditionId: string
  decision: GateDecisionType
  reason: string
  affectedAssets: string[]
  requiredChanges?: string[]
  evidence: string[]
  reviewer: Reviewer
  timestamp: number
}

/** Revision request event. */
export type RevisionRequest = {
  id: string
  expeditionId: string
  reason: string
  evidence: string[]
  reviewer: Reviewer
  timestamp: number
}

/** Acceptance gate package. */
export type AcceptanceGatePackage = {
  id: string
  expeditionId: string
  reviewDecisionId: string
  certificationEvidence: string[]
  stakeholderApprovals: string[]
  rolloutReadiness: string[]
  reviewer: Reviewer
  decision: AcceptanceDecisionType
  timestamp: number
}

/** Acceptance policy for a gate. */
export type AcceptancePolicy = {
  gateType: GateType
  reviewerKind: ReviewerKind
  requiredEvidence: string[]
  autoAdvance?: boolean
}

/** A gate instance attached to an expedition. */
export type GateInstance = {
  id: string
  expeditionId: string
  gateType: GateType
  status: GateStatus
  policy: AcceptancePolicy
  packageId?: string
  decisionId?: string
  createdAt: number
  resolvedAt?: number
}

/** Expedition augmented with review-gate state. */
export type ReviewGateExpedition = {
  expeditionId: string
  completionPolicy: CompletionPolicy
  status: ReviewGateExpeditionStatus
  gates: GateInstance[]
  refinedIntentId?: string
  reviewPackageId?: string
  acceptancePackageId?: string
  currentGateId?: string
}

/** Error thrown when a state transition is invalid. */
export class ReviewGateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReviewGateError"
  }
}

/** Generate a stable id from a prefix and timestamp. */
export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Create a fresh expedition under review-gate governance. */
export function createReviewGateExpedition(
  expeditionId: string,
  completionPolicy: CompletionPolicy = "human_required"
): ReviewGateExpedition {
  return {
    expeditionId,
    completionPolicy,
    status: "proposed",
    gates: [],
  }
}

/** Begin executing an expedition. */
export function beginExecution(expedition: ReviewGateExpedition): ReviewGateExpedition {
  if (expedition.status !== "proposed") {
    throw new ReviewGateError(`Cannot begin execution from status ${expedition.status}`)
  }
  if (!expedition.refinedIntentId) {
    throw new ReviewGateError("Cannot begin execution without an approved Refined Intent")
  }
  return { ...expedition, status: "executing" }
}

/** Mark implementation complete and open the Review Gate. */
export function completeImplementation(expedition: ReviewGateExpedition): ReviewGateExpedition {
  if (expedition.status !== "executing") {
    throw new ReviewGateError(`Cannot complete implementation from status ${expedition.status}`)
  }
  const gate: GateInstance = {
    id: makeId("gate"),
    expeditionId: expedition.expeditionId,
    gateType: "review",
    status: "awaiting_review",
    policy: { gateType: "review", reviewerKind: resolveReviewerKind(expedition.completionPolicy), requiredEvidence: [] },
    createdAt: Date.now(),
  }
  return {
    ...expedition,
    status: "awaiting_review",
    currentGateId: gate.id,
    gates: [...expedition.gates, gate],
  }
}

/** Resolve a Review Gate with a decision. */
export function resolveReviewGate(
  expedition: ReviewGateExpedition,
  decision: ReviewDecisionType,
  reviewer: Reviewer,
  reason: string,
  evidence: string[] = [],
  affectedAssets: string[] = []
): { expedition: ReviewGateExpedition; decision: ReviewDecision } {
  if (expedition.status !== "awaiting_review") {
    throw new ReviewGateError(`Cannot resolve review gate from status ${expedition.status}`)
  }

  if (expedition.completionPolicy !== "automatic" && reviewer.id === "implementer") {
    throw new ReviewGateError("Implementation agent cannot approve its own work")
  }

  const gate = expedition.gates.find((g) => g.id === expedition.currentGateId)
  if (!gate || gate.gateType !== "review") {
    throw new ReviewGateError("No active review gate found")
  }

  const reviewDecision: ReviewDecision = {
    id: makeId("decision"),
    gateType: "review",
    expeditionId: expedition.expeditionId,
    decision,
    reason,
    affectedAssets,
    evidence,
    reviewer,
    timestamp: Date.now(),
  }

  const resolvedGate: GateInstance = {
    ...gate,
    status: decision === "approve" || decision === "approve_with_conditions" ? "approved" : "rejected",
    decisionId: reviewDecision.id,
    resolvedAt: Date.now(),
  }

  let nextStatus: ReviewGateExpeditionStatus
  switch (decision) {
    case "approve":
    case "approve_with_conditions":
      nextStatus = "approved"
      break
    case "revision_required":
      nextStatus = "revision_requested"
      break
    case "reject":
      nextStatus = "rejected"
      break
    default:
      nextStatus = "awaiting_review"
  }

  return {
    expedition: {
      ...expedition,
      status: nextStatus,
      gates: expedition.gates.map((g) => (g.id === resolvedGate.id ? resolvedGate : g)),
    },
    decision: reviewDecision,
  }
}

/** Begin a revision after a Review Gate requested changes. */
export function beginRevision(
  expedition: ReviewGateExpedition,
  request: Omit<RevisionRequest, "id" | "timestamp">
): { expedition: ReviewGateExpedition; revisionRequest: RevisionRequest } {
  if (expedition.status !== "revision_requested") {
    throw new ReviewGateError(`Cannot begin revision from status ${expedition.status}`)
  }

  const revisionRequest: RevisionRequest = {
    id: makeId("revision"),
    expeditionId: expedition.expeditionId,
    reason: request.reason,
    evidence: request.evidence,
    reviewer: request.reviewer,
    timestamp: Date.now(),
  }

  return {
    expedition: { ...expedition, status: "executing" },
    revisionRequest,
  }
}

/** Open the Acceptance Gate after a successful Review Gate. */
export function openAcceptanceGate(expedition: ReviewGateExpedition): ReviewGateExpedition {
  if (expedition.status !== "approved") {
    throw new ReviewGateError(`Cannot open acceptance gate from status ${expedition.status}`)
  }

  const gate: GateInstance = {
    id: makeId("gate"),
    expeditionId: expedition.expeditionId,
    gateType: "acceptance",
    status: "awaiting_review",
    policy: { gateType: "acceptance", reviewerKind: "engine", requiredEvidence: [] },
    createdAt: Date.now(),
  }

  return {
    ...expedition,
    status: "awaiting_acceptance",
    currentGateId: gate.id,
    gates: [...expedition.gates, gate],
  }
}

/** Resolve the Acceptance Gate. */
export function resolveAcceptanceGate(
  expedition: ReviewGateExpedition,
  decision: AcceptanceDecisionType,
  reviewer: Reviewer,
  reason: string,
  evidence: string[] = []
): { expedition: ReviewGateExpedition; decision: ReviewDecision } {
  if (expedition.status !== "awaiting_acceptance") {
    throw new ReviewGateError(`Cannot resolve acceptance gate from status ${expedition.status}`)
  }

  const gate = expedition.gates.find((g) => g.id === expedition.currentGateId)
  if (!gate || gate.gateType !== "acceptance") {
    throw new ReviewGateError("No active acceptance gate found")
  }

  const acceptanceDecision: ReviewDecision = {
    id: makeId("decision"),
    gateType: "acceptance",
    expeditionId: expedition.expeditionId,
    decision,
    reason,
    affectedAssets: [],
    evidence,
    reviewer,
    timestamp: Date.now(),
  }

  const resolvedGate: GateInstance = {
    ...gate,
    status: decision === "accepted" ? "accepted" : "rejected",
    decisionId: acceptanceDecision.id,
    resolvedAt: Date.now(),
  }

  return {
    expedition: {
      ...expedition,
      status: decision === "accepted" ? "accepted" : "rejected",
      gates: expedition.gates.map((g) => (g.id === resolvedGate.id ? resolvedGate : g)),
    },
    decision: acceptanceDecision,
  }
}

/** Close an accepted expedition. */
export function closeExpedition(expedition: ReviewGateExpedition): ReviewGateExpedition {
  if (expedition.status !== "accepted") {
    throw new ReviewGateError(`Cannot close expedition from status ${expedition.status}`)
  }
  return { ...expedition, status: "closed" }
}

/** Create and approve a Refined Intent, enabling Mission approval.
 *  Re-approving after a Review Gate decision invalidates downstream reviews. */
export function approveRefinedIntent(
  expedition: ReviewGateExpedition,
  refinedIntent: Omit<RefinedIntent, "id" | "version" | "approvedAt">,
  reviewer: Reviewer
): { expedition: ReviewGateExpedition; refinedIntent: RefinedIntent } {
  const isRerun = expedition.status !== "proposed"

  const version = expedition.gates.filter((g) => g.gateType === "refinement").length + 1
  const full: RefinedIntent = {
    ...refinedIntent,
    id: makeId("refined-intent"),
    version,
    approvedBy: reviewer,
    approvedAt: Date.now(),
  }

  const gate: GateInstance = {
    id: makeId("gate"),
    expeditionId: expedition.expeditionId,
    gateType: "refinement",
    status: "approved",
    policy: { gateType: "refinement", reviewerKind: reviewer.kind, requiredEvidence: [] },
    createdAt: Date.now(),
    resolvedAt: Date.now(),
  }

  // Re-approving a Refined Intent resets the expedition to proposed and
  // invalidates any prior review or acceptance state.
  return {
    expedition: {
      ...expedition,
      status: "proposed",
      refinedIntentId: full.id,
      currentGateId: undefined,
      gates: [...expedition.gates, gate],
    },
    refinedIntent: full,
  }
}

/** Check whether an upstream expedition blocks downstream work. */
export function blocksDownstream(expedition: ReviewGateExpedition): boolean {
  return expedition.status === "awaiting_review" || expedition.status === "awaiting_acceptance"
}

/** Map a completion policy to the default reviewer kind. */
function resolveReviewerKind(policy: CompletionPolicy): ReviewerKind {
  switch (policy) {
    case "automatic":
      return "engine"
    case "human_required":
      return "human"
    case "ai_required":
      return "ai"
  }
}
