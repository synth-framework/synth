// ============================================================
// GOVERNANCE: Review Gate Artifact Validation
// ============================================================
// Canonical validators and JSON Schema-like definitions for the
// artifacts produced and consumed by review gates.
// ============================================================

import type {
  RefinedIntent,
  ReviewGatePackage,
  ReviewDecision,
  RevisionRequest,
  AcceptanceGatePackage,
  AcceptanceRecord,
  GatePolicy,
  Reviewer,
  GateType,
  GateDecisionType,
  DecisionValidity,
} from "./review-gates.js"

export type ValidationResult = {
  valid: boolean
  errors: string[]
}

function ok(): ValidationResult {
  return { valid: true, errors: [] }
}

function fail(errors: string[]): ValidationResult {
  return { valid: false, errors }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
}

function isReviewer(value: unknown): value is Reviewer {
  if (typeof value !== "object" || value === null) return false
  const r = value as Record<string, unknown>
  return (
    isNonEmptyString(r.id) &&
    isNonEmptyString(r.kind) &&
    ["human", "ai", "council", "engine", "asset_owner"].includes(r.kind)
  )
}

/** Validate a Refined Intent artifact. */
export function validateRefinedIntent(artifact: unknown): ValidationResult {
  if (typeof artifact !== "object" || artifact === null) {
    return fail(["RefinedIntent must be an object"])
  }
  const r = artifact as Partial<RefinedIntent>
  const errors: string[] = []

  if (!isNonEmptyString(r.id)) errors.push("id is required")
  if (!isNonEmptyString(r.missionId)) errors.push("missionId is required")
  if (!isNonEmptyString(r.objective)) errors.push("objective is required")
  if (!isNonEmptyString(r.scope)) errors.push("scope is required")
  if (!isStringArray(r.nonGoals)) errors.push("nonGoals must be a string array")
  if (!isStringArray(r.successCriteria)) errors.push("successCriteria must be a string array")
  if (!isStringArray(r.visualReferences)) errors.push("visualReferences must be a string array")
  if (!isStringArray(r.behavioralReferences)) errors.push("behavioralReferences must be a string array")
  if (!isStringArray(r.constraints)) errors.push("constraints must be a string array")
  if (!isStringArray(r.protectedAssets)) errors.push("protectedAssets must be a string array")
  if (!isStringArray(r.acceptanceExamples)) errors.push("acceptanceExamples must be a string array")
  if (!isStringArray(r.knownUnknowns)) errors.push("knownUnknowns must be a string array")
  if (!isStringArray(r.risks)) errors.push("risks must be a string array")
  if (typeof r.version !== "number") errors.push("version must be a number")

  if (r.approvedBy !== undefined && !isReviewer(r.approvedBy)) errors.push("approvedBy must be a valid reviewer")

  return errors.length ? fail(errors) : ok()
}

/** Validate a Review Gate Package artifact. */
export function validateReviewGatePackage(artifact: unknown): ValidationResult {
  if (typeof artifact !== "object" || artifact === null) {
    return fail(["ReviewGatePackage must be an object"])
  }
  const r = artifact as Partial<ReviewGatePackage>
  const errors: string[] = []

  if (!isNonEmptyString(r.id)) errors.push("id is required")
  if (!isNonEmptyString(r.gateId)) errors.push("gateId is required")
  if (!isNonEmptyString(r.expeditionId)) errors.push("expeditionId is required")
  if (!isNonEmptyString(r.refinedIntentId)) errors.push("refinedIntentId is required")
  if (!isNonEmptyString(r.implementationReference)) errors.push("implementationReference is required")
  if (!isStringArray(r.knownDivergence)) errors.push("knownDivergence must be a string array")
  if (!isStringArray(r.acceptedDivergence)) errors.push("acceptedDivergence must be a string array")
  if (!isStringArray(r.rejectedDivergence)) errors.push("rejectedDivergence must be a string array")

  return errors.length ? fail(errors) : ok()
}

const GATE_TYPES: GateType[] = ["refinement", "review", "acceptance"]
const GATE_DECISIONS: GateDecisionType[] = [
  "refined_intent",
  "clarification_requested",
  "approve",
  "approve_with_conditions",
  "revision_required",
  "reject",
  "supersede_expedition",
  "split_expedition",
  "merge_expedition",
  "escalate_to_mission",
  "escalate_to_program",
  "accepted",
  "rejected",
]
const DECISION_VALIDITIES: DecisionValidity[] = ["valid", "invalid", "obsolete"]

/** Validate a Review Decision artifact. */
export function validateReviewDecision(artifact: unknown): ValidationResult {
  if (typeof artifact !== "object" || artifact === null) {
    return fail(["ReviewDecision must be an object"])
  }
  const r = artifact as Partial<ReviewDecision>
  const errors: string[] = []

  if (!isNonEmptyString(r.id)) errors.push("id is required")
  if (!isNonEmptyString(r.gateId)) errors.push("gateId is required")
  if (!GATE_TYPES.includes(r.gateType as GateType)) errors.push("gateType must be refinement, review, or acceptance")
  if (!isNonEmptyString(r.expeditionId)) errors.push("expeditionId is required")
  if (!GATE_DECISIONS.includes(r.decision as GateDecisionType)) errors.push("decision is not a recognized gate decision")
  if (!isNonEmptyString(r.reason)) errors.push("reason is required")
  if (!isStringArray(r.affectedAssets)) errors.push("affectedAssets must be a string array")
  if (r.requiredChanges !== undefined && !isStringArray(r.requiredChanges)) {
    errors.push("requiredChanges must be a string array")
  }
  if (!isStringArray(r.evidence)) errors.push("evidence must be a string array")
  if (!isReviewer(r.reviewer)) errors.push("reviewer is required and must be valid")
  if (!DECISION_VALIDITIES.includes(r.validity as DecisionValidity)) errors.push("validity must be valid, invalid, or obsolete")
  if (typeof r.timestamp !== "number") errors.push("timestamp must be a number")

  return errors.length ? fail(errors) : ok()
}

/** Validate a Revision Request artifact. */
export function validateRevisionRequest(artifact: unknown): ValidationResult {
  if (typeof artifact !== "object" || artifact === null) {
    return fail(["RevisionRequest must be an object"])
  }
  const r = artifact as Partial<RevisionRequest>
  const errors: string[] = []

  if (!isNonEmptyString(r.id)) errors.push("id is required")
  if (!isNonEmptyString(r.gateId)) errors.push("gateId is required")
  if (!isNonEmptyString(r.expeditionId)) errors.push("expeditionId is required")
  if (!isNonEmptyString(r.reason)) errors.push("reason is required")
  if (!isStringArray(r.evidence)) errors.push("evidence must be a string array")
  if (!isReviewer(r.reviewer)) errors.push("reviewer is required and must be valid")
  if (typeof r.timestamp !== "number") errors.push("timestamp must be a number")

  return errors.length ? fail(errors) : ok()
}

/** Validate an Acceptance Gate Package artifact. */
export function validateAcceptanceGatePackage(artifact: unknown): ValidationResult {
  if (typeof artifact !== "object" || artifact === null) {
    return fail(["AcceptanceGatePackage must be an object"])
  }
  const r = artifact as Partial<AcceptanceGatePackage>
  const errors: string[] = []

  if (!isNonEmptyString(r.id)) errors.push("id is required")
  if (!isNonEmptyString(r.gateId)) errors.push("gateId is required")
  if (!isNonEmptyString(r.expeditionId)) errors.push("expeditionId is required")
  if (!isNonEmptyString(r.reviewDecisionId)) errors.push("reviewDecisionId is required")
  if (!isStringArray(r.certificationEvidence)) errors.push("certificationEvidence must be a string array")
  if (!isStringArray(r.stakeholderApprovals)) errors.push("stakeholderApprovals must be a string array")
  if (!isStringArray(r.rolloutReadiness)) errors.push("rolloutReadiness must be a string array")

  return errors.length ? fail(errors) : ok()
}

/** Validate an Acceptance Record artifact. */
export function validateAcceptanceRecord(artifact: unknown): ValidationResult {
  if (typeof artifact !== "object" || artifact === null) {
    return fail(["AcceptanceRecord must be an object"])
  }
  const r = artifact as Partial<AcceptanceRecord>
  const errors: string[] = []

  if (!isNonEmptyString(r.id)) errors.push("id is required")
  if (!isNonEmptyString(r.gateId)) errors.push("gateId is required")
  if (!isNonEmptyString(r.expeditionId)) errors.push("expeditionId is required")
  if (r.decision !== "accepted" && r.decision !== "rejected") errors.push("decision must be accepted or rejected")
  if (!isReviewer(r.reviewer)) errors.push("reviewer is required and must be valid")
  if (typeof r.timestamp !== "number") errors.push("timestamp must be a number")

  return errors.length ? fail(errors) : ok()
}

const REVIEWER_KINDS = ["human", "ai", "council", "engine", "asset_owner"]

/** Validate a Gate Policy. */
export function validateGatePolicy(policy: unknown): ValidationResult {
  if (typeof policy !== "object" || policy === null) {
    return fail(["GatePolicy must be an object"])
  }
  const p = policy as Partial<GatePolicy>
  const errors: string[] = []

  if (!Array.isArray(p.reviewers) || p.reviewers.length === 0) {
    errors.push("reviewers must be a non-empty array")
  } else if (!p.reviewers.every((k) => REVIEWER_KINDS.includes(k))) {
    errors.push("reviewers must be valid reviewer kinds")
  }

  if (p.quorum !== "all" && p.quorum !== "any" && typeof p.quorum !== "number") {
    errors.push("quorum must be 'all', 'any', or a number")
  }

  if (p.timeout !== undefined && typeof p.timeout !== "number") errors.push("timeout must be a number")
  if (p.revisionLimit !== undefined && typeof p.revisionLimit !== "number") errors.push("revisionLimit must be a number")
  if (p.autoAdvance !== undefined && typeof p.autoAdvance !== "boolean") errors.push("autoAdvance must be a boolean")

  return errors.length ? fail(errors) : ok()
}

/** JSON Schema-like definitions for documentation and serialization. */
export const ARTIFACT_SCHEMAS = {
  refinedIntent: {
    type: "object",
    required: [
      "id",
      "missionId",
      "objective",
      "scope",
      "nonGoals",
      "successCriteria",
      "visualReferences",
      "behavioralReferences",
      "constraints",
      "protectedAssets",
      "acceptanceExamples",
      "knownUnknowns",
      "risks",
      "version",
    ],
    properties: {
      id: { type: "string" },
      missionId: { type: "string" },
      objective: { type: "string" },
      scope: { type: "string" },
      nonGoals: { type: "array", items: { type: "string" } },
      successCriteria: { type: "array", items: { type: "string" } },
      visualReferences: { type: "array", items: { type: "string" } },
      behavioralReferences: { type: "array", items: { type: "string" } },
      constraints: { type: "array", items: { type: "string" } },
      protectedAssets: { type: "array", items: { type: "string" } },
      acceptanceExamples: { type: "array", items: { type: "string" } },
      knownUnknowns: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      approvedBy: { type: "object", properties: { kind: { type: "string" }, id: { type: "string" } } },
      approvedAt: { type: "number" },
      version: { type: "number" },
    },
  },
  reviewGatePackage: {
    type: "object",
    required: ["id", "gateId", "expeditionId", "refinedIntentId", "implementationReference"],
    properties: {
      id: { type: "string" },
      gateId: { type: "string" },
      expeditionId: { type: "string" },
      refinedIntentId: { type: "string" },
      implementationReference: { type: "string" },
      knownDivergence: { type: "array", items: { type: "string" } },
      acceptedDivergence: { type: "array", items: { type: "string" } },
      rejectedDivergence: { type: "array", items: { type: "string" } },
    },
  },
  reviewDecision: {
    type: "object",
    required: ["id", "gateId", "gateType", "expeditionId", "decision", "reason", "affectedAssets", "evidence", "reviewer", "validity", "timestamp"],
    properties: {
      id: { type: "string" },
      gateId: { type: "string" },
      gateType: { type: "string", enum: ["refinement", "review", "acceptance"] },
      expeditionId: { type: "string" },
      decision: { type: "string" },
      reason: { type: "string" },
      affectedAssets: { type: "array", items: { type: "string" } },
      requiredChanges: { type: "array", items: { type: "string" } },
      evidence: { type: "array", items: { type: "string" } },
      reviewer: { type: "object", properties: { kind: { type: "string" }, id: { type: "string" } } },
      validity: { type: "string", enum: ["valid", "invalid", "obsolete"] },
      timestamp: { type: "number" },
    },
  },
  gatePolicy: {
    type: "object",
    required: ["reviewers", "quorum"],
    properties: {
      reviewers: { type: "array", items: { type: "string", enum: REVIEWER_KINDS } },
      quorum: { oneOf: [{ type: "string", enum: ["all", "any"] }, { type: "number" }] },
      timeout: { type: "number" },
      revisionLimit: { type: "number" },
      autoAdvance: { type: "boolean" },
    },
  },
}
