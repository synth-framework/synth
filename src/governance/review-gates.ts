// ============================================================
// GOVERNANCE: Intent Refinement & Review Gates
// ============================================================
// Generic, artifact-driven gate model for SYNTH governance.
// A Gate is a stateless checkpoint identified by ID. It consumes
// input artifacts and produces output artifacts. The engine
// executes gates; the gateType defines semantics.
// ============================================================

/** Gate kinds in the intent-to-acceptance lifecycle. */
export type GateType = "refinement" | "review" | "acceptance"

/** Reviewer identity. */
export type Reviewer = {
  kind: ReviewerKind
  id: string
}

/** Actor kinds that may resolve a gate. */
export type ReviewerKind = "human" | "ai" | "council" | "engine" | "asset_owner"

/** Quorum rule for multi-reviewer gates. */
export type QuorumRule = "all" | "any" | number

/** Policy controlling who may resolve a gate and how. */
export type GatePolicy = {
  reviewers: ReviewerKind[]
  quorum: QuorumRule
  timeout?: number
  revisionLimit?: number
  autoAdvance?: boolean
}

/** Pre-defined policy templates for common cases. */
export const GATE_POLICIES = {
  automatic: (): GatePolicy => ({
    reviewers: ["engine"],
    quorum: "any",
    autoAdvance: true,
  }),
  humanRequired: (): GatePolicy => ({
    reviewers: ["human"],
    quorum: "all",
  }),
  aiRequired: (): GatePolicy => ({
    reviewers: ["ai"],
    quorum: "all",
  }),
  humanAndAi: (): GatePolicy => ({
    reviewers: ["human", "ai"],
    quorum: "all",
  }),
  council: (): GatePolicy => ({
    reviewers: ["council"],
    quorum: "all",
  }),
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

/** Validity of a recorded decision. */
export type DecisionValidity = "valid" | "invalid" | "obsolete"

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

// ============================================================
// Artifacts
// ============================================================

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

/** Inputs consumed by a Review Gate. */
export type ReviewGateInputs = {
  refinedIntentId: string
  implementationReference: string
  divergenceReportId?: string
}

/** Outputs produced by a Review Gate. */
export type ReviewGateOutputs = {
  reviewPackageId: string
  reviewDecisionId: string
}

/** Review Gate Package artifact. */
export type ReviewGatePackage = {
  id: string
  gateId: string
  expeditionId: string
  refinedIntentId: string
  implementationReference: string
  knownDivergence: string[]
  acceptedDivergence: string[]
  rejectedDivergence: string[]
}

/** Replayable decision event produced by any gate. */
export type ReviewDecision = {
  id: string
  gateId: string
  gateType: GateType
  expeditionId: string
  decision: GateDecisionType
  reason: string
  affectedAssets: string[]
  requiredChanges?: string[]
  evidence: string[]
  reviewer: Reviewer
  validity: DecisionValidity
  timestamp: number
}

/** Revision request artifact. */
export type RevisionRequest = {
  id: string
  gateId: string
  expeditionId: string
  reason: string
  evidence: string[]
  reviewer: Reviewer
  timestamp: number
}

/** Acceptance Gate Package artifact. */
export type AcceptanceGatePackage = {
  id: string
  gateId: string
  expeditionId: string
  reviewDecisionId: string
  certificationEvidence: string[]
  stakeholderApprovals: string[]
  rolloutReadiness: string[]
}

/** Acceptance Record artifact. */
export type AcceptanceRecord = {
  id: string
  gateId: string
  expeditionId: string
  decision: AcceptanceDecisionType
  reviewer: Reviewer
  timestamp: number
}

// ============================================================
// Gate Instance
// ============================================================

/** A gate instance — stateless checkpoint identified by ID. */
export type Gate = {
  id: string
  gateType: GateType
  expeditionId: string
  policy: GatePolicy
  status: GateStatus
  inputs: string[]
  outputs: string[]
  reviewer?: Reviewer
  decisionId?: string
  parentGateId?: string
  blocking: boolean
  createdAt: number
  resolvedAt?: number
}

/** Expedition augmented with review-gate state. */
export type ReviewGateExpedition = {
  expeditionId: string
  status: ReviewGateExpeditionStatus
  gates: Gate[]
  refinedIntentId?: string
  reviewPackageId?: string
  reviewDecisionId?: string
  acceptancePackageId?: string
  acceptanceRecordId?: string
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
export function createReviewGateExpedition(expeditionId: string): ReviewGateExpedition {
  return {
    expeditionId,
    status: "proposed",
    gates: [],
  }
}

/** Create a gate instance. */
export function createGate(
  gateType: GateType,
  expeditionId: string,
  policy: GatePolicy,
  inputs: string[] = [],
  parentGateId?: string
): Gate {
  return {
    id: makeId("gate"),
    gateType,
    expeditionId,
    policy,
    status: "awaiting_review",
    inputs,
    outputs: [],
    parentGateId,
    blocking: true,
    createdAt: Date.now(),
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
export function completeImplementation(
  expedition: ReviewGateExpedition,
  implementationReference: string,
  policy: GatePolicy = GATE_POLICIES.humanRequired()
): { expedition: ReviewGateExpedition; gate: Gate; reviewPackage: ReviewGatePackage } {
  if (expedition.status !== "executing") {
    throw new ReviewGateError(`Cannot complete implementation from status ${expedition.status}`)
  }
  if (!expedition.refinedIntentId) {
    throw new ReviewGateError("Cannot review without a Refined Intent")
  }

  const reviewPackage: ReviewGatePackage = {
    id: makeId("review-package"),
    gateId: "", // filled after gate creation
    expeditionId: expedition.expeditionId,
    refinedIntentId: expedition.refinedIntentId,
    implementationReference,
    knownDivergence: [],
    acceptedDivergence: [],
    rejectedDivergence: [],
  }

  const gate = createGate("review", expedition.expeditionId, policy, [
    expedition.refinedIntentId,
    reviewPackage.id,
  ])
  reviewPackage.gateId = gate.id

  return {
    expedition: {
      ...expedition,
      status: "awaiting_review",
      currentGateId: gate.id,
      reviewPackageId: reviewPackage.id,
      gates: [...expedition.gates, gate],
    },
    gate,
    reviewPackage,
  }
}

/** Resolve a Review Gate with a decision. */
export function resolveReviewGate(
  expedition: ReviewGateExpedition,
  decisionType: ReviewDecisionType,
  reviewer: Reviewer,
  reason: string,
  evidence: string[] = [],
  affectedAssets: string[] = [],
  requiredChanges: string[] = []
): { expedition: ReviewGateExpedition; gate: Gate; decision: ReviewDecision } {
  if (expedition.status !== "awaiting_review") {
    throw new ReviewGateError(`Cannot resolve review gate from status ${expedition.status}`)
  }

  const gate = expedition.gates.find((g) => g.id === expedition.currentGateId)
  if (!gate || gate.gateType !== "review") {
    throw new ReviewGateError("No active review gate found")
  }

  if (!gate.policy.autoAdvance && reviewer.id === "implementer") {
    throw new ReviewGateError("Implementation agent cannot approve its own work")
  }

  const decision: ReviewDecision = {
    id: makeId("decision"),
    gateId: gate.id,
    gateType: "review",
    expeditionId: expedition.expeditionId,
    decision: decisionType,
    reason,
    affectedAssets,
    requiredChanges,
    evidence,
    reviewer,
    validity: "valid",
    timestamp: Date.now(),
  }

  const nextStatus = reviewDecisionStatus(decisionType)
  const resolvedGate: Gate = {
    ...gate,
    status: reviewGateStatus(decisionType),
    decisionId: decision.id,
    reviewer,
    outputs: [decision.id],
    resolvedAt: Date.now(),
  }

  return {
    expedition: {
      ...expedition,
      status: nextStatus,
      reviewDecisionId: decision.id,
      gates: expedition.gates.map((g) => (g.id === resolvedGate.id ? resolvedGate : g)),
    },
    gate: resolvedGate,
    decision,
  }
}

/** Begin a revision after a Review Gate requested changes. */
export function beginRevision(
  expedition: ReviewGateExpedition,
  gate: Gate,
  reviewer: Reviewer,
  reason: string,
  evidence: string[] = []
): { expedition: ReviewGateExpedition; revisionRequest: RevisionRequest } {
  if (expedition.status !== "revision_requested") {
    throw new ReviewGateError(`Cannot begin revision from status ${expedition.status}`)
  }

  const revisionRequest: RevisionRequest = {
    id: makeId("revision"),
    gateId: gate.id,
    expeditionId: expedition.expeditionId,
    reason,
    evidence,
    reviewer,
    timestamp: Date.now(),
  }

  return {
    expedition: { ...expedition, status: "executing" },
    revisionRequest,
  }
}

/** Open the Acceptance Gate after a successful Review Gate. */
export function openAcceptanceGate(
  expedition: ReviewGateExpedition,
  reviewDecision: ReviewDecision,
  policy: GatePolicy = GATE_POLICIES.council()
): { expedition: ReviewGateExpedition; gate: Gate; acceptancePackage: AcceptanceGatePackage } {
  if (expedition.status !== "approved") {
    throw new ReviewGateError(`Cannot open acceptance gate from status ${expedition.status}`)
  }

  const acceptancePackage: AcceptanceGatePackage = {
    id: makeId("acceptance-package"),
    gateId: "",
    expeditionId: expedition.expeditionId,
    reviewDecisionId: reviewDecision.id,
    certificationEvidence: [],
    stakeholderApprovals: [],
    rolloutReadiness: [],
  }

  const gate = createGate(
    "acceptance",
    expedition.expeditionId,
    policy,
    [reviewDecision.id, acceptancePackage.id],
    reviewDecision.gateId
  )
  acceptancePackage.gateId = gate.id

  return {
    expedition: {
      ...expedition,
      status: "awaiting_acceptance",
      currentGateId: gate.id,
      acceptancePackageId: acceptancePackage.id,
      gates: [...expedition.gates, gate],
    },
    gate,
    acceptancePackage,
  }
}

/** Resolve the Acceptance Gate. */
export function resolveAcceptanceGate(
  expedition: ReviewGateExpedition,
  decisionType: AcceptanceDecisionType,
  reviewer: Reviewer,
  reason: string,
  evidence: string[] = []
): { expedition: ReviewGateExpedition; gate: Gate; record: AcceptanceRecord; decision: ReviewDecision } {
  if (expedition.status !== "awaiting_acceptance") {
    throw new ReviewGateError(`Cannot resolve acceptance gate from status ${expedition.status}`)
  }

  const gate = expedition.gates.find((g) => g.id === expedition.currentGateId)
  if (!gate || gate.gateType !== "acceptance") {
    throw new ReviewGateError("No active acceptance gate found")
  }

  const record: AcceptanceRecord = {
    id: makeId("acceptance-record"),
    gateId: gate.id,
    expeditionId: expedition.expeditionId,
    decision: decisionType,
    reviewer,
    timestamp: Date.now(),
  }

  const decision: ReviewDecision = {
    id: makeId("decision"),
    gateId: gate.id,
    gateType: "acceptance",
    expeditionId: expedition.expeditionId,
    decision: decisionType,
    reason,
    affectedAssets: [],
    evidence,
    reviewer,
    validity: "valid",
    timestamp: Date.now(),
  }

  const resolvedGate: Gate = {
    ...gate,
    status: decisionType === "accepted" ? "accepted" : "rejected",
    decisionId: decision.id,
    reviewer,
    outputs: [record.id, decision.id],
    resolvedAt: Date.now(),
  }

  return {
    expedition: {
      ...expedition,
      status: decisionType === "accepted" ? "accepted" : "rejected",
      acceptanceRecordId: record.id,
      gates: expedition.gates.map((g) => (g.id === resolvedGate.id ? resolvedGate : g)),
    },
    gate: resolvedGate,
    record,
    decision,
  }
}

/** Close an accepted expedition. */
export function closeExpedition(expedition: ReviewGateExpedition): ReviewGateExpedition {
  if (expedition.status !== "accepted") {
    throw new ReviewGateError(`Cannot close expedition from status ${expedition.status}`)
  }
  return { ...expedition, status: "closed" }
}

/** Create and approve a Refined Intent, opening a Refinement Gate. */
export function approveRefinedIntent(
  expedition: ReviewGateExpedition,
  refinedIntent: Omit<RefinedIntent, "id" | "version" | "approvedAt">,
  reviewer: Reviewer,
  policy: GatePolicy = GATE_POLICIES.humanRequired()
): { expedition: ReviewGateExpedition; gate: Gate; refinedIntent: RefinedIntent } {
  const version = expedition.gates.filter((g) => g.gateType === "refinement").length + 1
  const full: RefinedIntent = {
    ...refinedIntent,
    id: makeId("refined-intent"),
    version,
    approvedBy: reviewer,
    approvedAt: Date.now(),
  }

  const gate = createGate("refinement", expedition.expeditionId, policy, [])
  gate.status = "approved"
  gate.decisionId = full.id
  gate.reviewer = reviewer
  gate.outputs = [full.id]
  gate.resolvedAt = Date.now()
  gate.blocking = false

  // Re-approving a Refined Intent resets the expedition and invalidates
  // downstream review/acceptance decisions (they become obsolete).
  const obsoleteGates = expedition.gates.map((g) => {
    if (g.decisionId && (g.gateType === "review" || g.gateType === "acceptance")) {
      return { ...g, blocking: true, status: "rejected" as GateStatus }
    }
    return g
  })

  return {
    expedition: {
      ...expedition,
      status: "proposed",
      refinedIntentId: full.id,
      currentGateId: undefined,
      reviewPackageId: undefined,
      reviewDecisionId: undefined,
      acceptancePackageId: undefined,
      acceptanceRecordId: undefined,
      gates: [...obsoleteGates, gate],
    },
    gate,
    refinedIntent: full,
  }
}

/** Mark a recorded decision as invalid or obsolete. */
export function invalidateDecision(
  expedition: ReviewGateExpedition,
  gateId: string,
  validity: Exclude<DecisionValidity, "valid">,
  reason: string
): ReviewGateExpedition {
  return {
    ...expedition,
    gates: expedition.gates.map((g) => {
      if (g.id === gateId) {
        return { ...g, blocking: validity === "invalid" || g.gateType === "review" || g.gateType === "acceptance" }
      }
      return g
    }),
  }
}

/** Check whether an upstream expedition blocks downstream work. */
export function blocksDownstream(expedition: ReviewGateExpedition): boolean {
  return expedition.gates.some((g) => g.blocking && !g.resolvedAt)
}

/** Map a review decision type to an expedition status. */
function reviewDecisionStatus(decision: ReviewDecisionType): ReviewGateExpeditionStatus {
  switch (decision) {
    case "approve":
    case "approve_with_conditions":
      return "approved"
    case "revision_required":
      return "revision_requested"
    case "reject":
    case "supersede_expedition":
    case "split_expedition":
    case "merge_expedition":
    case "escalate_to_mission":
    case "escalate_to_program":
      return "rejected"
  }
}

/** Map a review decision type to a gate status. */
function reviewGateStatus(decision: ReviewDecisionType): GateStatus {
  switch (decision) {
    case "approve":
    case "approve_with_conditions":
      return "approved"
    case "revision_required":
      return "revision_requested"
    case "reject":
    case "supersede_expedition":
    case "split_expedition":
    case "merge_expedition":
    case "escalate_to_mission":
    case "escalate_to_program":
      return "rejected"
  }
}
