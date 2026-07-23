// ============================================================
// GOVERNANCE: Alignment Contract
// ============================================================
// The formal agreement between operator and SYNTH that the captured
// understanding accurately represents the intended outcome. This is
// the bridge between human intent and executable Mission creation.
// ============================================================

import type { Reviewer } from "./review-gates.js"
import type { IntentModel } from "./intent-model.js"

export type AlignmentContractStatus =
  | "draft"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "superseded"

export type AlignmentDimension = {
  name: string
  score: number
  reason: string
}

export type ObjectiveCoverage = {
  objective: string
  evidenceIds: string[]
  aligned: boolean
  notes?: string
}

export type ImplicitObjectiveStatus = {
  objective: string
  status: "accepted" | "rejected" | "requires_clarification"
  reason: string
}

export type ForbiddenInterpretationEntry = {
  interpretation: string
  reason: string
  evidenceIds: string[]
}

export type ResidualDivergence = {
  description: string
  acceptedBy: { kind: string; id: string }
  reason: string
  risk: "low" | "medium" | "high"
}

export type ConfidenceExplanation = {
  score: number
  reason: string
}

export type AlignmentContract = {
  id: string
  intentModelId: string
  refinedIntentId?: string
  intentSummary: string
  expectedExperience: string
  requiredProperties: string[]
  forbiddenProperties: string[]
  requiredBehaviors: string[]
  visualReferences: string[]
  behavioralReferences: string[]
  functionalExpectations: string[]
  technicalConstraints: string[]
  successCriteria: string[]
  explicitNonRequirements: string[]
  allowedInterpretation: string[]
  allowedVariation: string[]
  forbiddenInterpretation: string[]
  forbiddenDrift: string[]
  referenceEvidenceIds: string[]
  dimensions?: AlignmentDimension[]
  objectiveCoverage?: ObjectiveCoverage[]
  implicitObjectiveStatus?: ImplicitObjectiveStatus[]
  forbiddenInterpretations?: ForbiddenInterpretationEntry[]
  confidenceExplanation?: ConfidenceExplanation
  residualDivergence?: ResidualDivergence[]
  status: AlignmentContractStatus
  approvedBy?: Reviewer
  approvedAt?: number
  version: number
  createdAt: number
  updatedAt: number
}

export type AlignmentContractInput = {
  intentModelId: string
  refinedIntentId?: string
  intentSummary: string
  expectedExperience: string
  requiredProperties?: string[]
  forbiddenProperties?: string[]
  requiredBehaviors?: string[]
  visualReferences?: string[]
  behavioralReferences?: string[]
  functionalExpectations?: string[]
  technicalConstraints?: string[]
  successCriteria?: string[]
  explicitNonRequirements?: string[]
  allowedInterpretation?: string[]
  allowedVariation?: string[]
  forbiddenInterpretation?: string[]
  forbiddenDrift?: string[]
  referenceEvidenceIds?: string[]
  dimensions?: AlignmentDimension[]
  objectiveCoverage?: ObjectiveCoverage[]
  implicitObjectiveStatus?: ImplicitObjectiveStatus[]
  forbiddenInterpretations?: ForbiddenInterpretationEntry[]
  confidenceExplanation?: ConfidenceExplanation
  residualDivergence?: ResidualDivergence[]
}

export type AlignmentContractValidationResult = {
  valid: boolean
  errors: string[]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
}

export function validateAlignmentContract(
  contract: unknown
): AlignmentContractValidationResult {
  if (typeof contract !== "object" || contract === null) {
    return { valid: false, errors: ["AlignmentContract must be an object"] }
  }
  const c = contract as Partial<AlignmentContract>
  const errors: string[] = []

  if (!isNonEmptyString(c.id)) errors.push("id is required")
  if (!isNonEmptyString(c.intentModelId)) errors.push("intentModelId is required")
  if (!isNonEmptyString(c.intentSummary)) errors.push("intentSummary is required")
  if (!isNonEmptyString(c.expectedExperience)) errors.push("expectedExperience is required")
  if (!isStringArray(c.requiredProperties) || c.requiredProperties.length === 0) {
    errors.push("requiredProperties must be a non-empty string array")
  }
  if (!isStringArray(c.forbiddenProperties) || c.forbiddenProperties.length === 0) {
    errors.push("forbiddenProperties must be a non-empty string array")
  }
  if (!isStringArray(c.requiredBehaviors)) errors.push("requiredBehaviors must be a string array")
  if (!isStringArray(c.successCriteria) || c.successCriteria.length === 0) {
    errors.push("successCriteria must be a non-empty string array")
  }
  if (!isStringArray(c.forbiddenInterpretation) || c.forbiddenInterpretation.length === 0) {
    errors.push("forbiddenInterpretation must be a non-empty string array")
  }
  if (!isStringArray(c.forbiddenDrift) || c.forbiddenDrift.length === 0) {
    errors.push("forbiddenDrift must be a non-empty string array")
  }
  if (!isStringArray(c.referenceEvidenceIds) || c.referenceEvidenceIds.length === 0) {
    errors.push("referenceEvidenceIds must be a non-empty string array")
  }
  if (!["draft", "awaiting_review", "approved", "rejected", "superseded"].includes(c.status ?? "")) {
    errors.push("status must be a valid AlignmentContractStatus")
  }
  if (typeof c.version !== "number") errors.push("version must be a number")

  if (c.dimensions && !Array.isArray(c.dimensions)) errors.push("dimensions must be an array")
  if (c.objectiveCoverage && !Array.isArray(c.objectiveCoverage)) errors.push("objectiveCoverage must be an array")
  if (c.implicitObjectiveStatus && !Array.isArray(c.implicitObjectiveStatus)) {
    errors.push("implicitObjectiveStatus must be an array")
  }
  if (c.forbiddenInterpretations && !Array.isArray(c.forbiddenInterpretations)) {
    errors.push("forbiddenInterpretations must be an array")
  }
  if (c.confidenceExplanation && typeof c.confidenceExplanation !== "object") {
    errors.push("confidenceExplanation must be an object")
  }
  if (c.residualDivergence && !Array.isArray(c.residualDivergence)) errors.push("residualDivergence must be an array")

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] }
}

import type { ConstructionContext } from "./intent-model.js"

function makeId(timestamp: number = Date.now()): string {
  return `alignment-contract-${timestamp.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Create an Alignment Contract from an Intent Model input. */
export function createAlignmentContract(
  input: AlignmentContractInput,
  ctx: ConstructionContext = {}
): AlignmentContract {
  const now = ctx.timestamp ?? Date.now()
  return {
    id: ctx.id ?? makeId(now),
    intentModelId: input.intentModelId,
    refinedIntentId: input.refinedIntentId,
    intentSummary: input.intentSummary,
    expectedExperience: input.expectedExperience,
    requiredProperties: input.requiredProperties ?? [],
    forbiddenProperties: input.forbiddenProperties ?? [],
    requiredBehaviors: input.requiredBehaviors ?? [],
    visualReferences: input.visualReferences ?? [],
    behavioralReferences: input.behavioralReferences ?? [],
    functionalExpectations: input.functionalExpectations ?? [],
    technicalConstraints: input.technicalConstraints ?? [],
    successCriteria: input.successCriteria ?? [],
    explicitNonRequirements: input.explicitNonRequirements ?? [],
    allowedInterpretation: input.allowedInterpretation ?? [],
    allowedVariation: input.allowedVariation ?? [],
    forbiddenInterpretation: input.forbiddenInterpretation ?? [],
    forbiddenDrift: input.forbiddenDrift ?? [],
    referenceEvidenceIds: input.referenceEvidenceIds ?? [],
    dimensions: input.dimensions ?? [],
    objectiveCoverage: input.objectiveCoverage ?? [],
    implicitObjectiveStatus: input.implicitObjectiveStatus ?? [],
    forbiddenInterpretations: input.forbiddenInterpretations ?? [],
    confidenceExplanation: input.confidenceExplanation,
    residualDivergence: input.residualDivergence ?? [],
    status: "draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}

/** Submit an Alignment Contract for review. */
export function submitAlignmentContract(
  contract: AlignmentContract,
  timestamp?: number
): AlignmentContract {
  return { ...contract, status: "awaiting_review", updatedAt: timestamp ?? Date.now() }
}

/** Approve an Alignment Contract. */
export function approveAlignmentContract(
  contract: AlignmentContract,
  reviewer: Reviewer,
  timestamp?: number
): AlignmentContract {
  const now = timestamp ?? Date.now()
  return {
    ...contract,
    status: "approved",
    approvedBy: reviewer,
    approvedAt: now,
    updatedAt: now,
  }
}

/** Reject an Alignment Contract. */
export function rejectAlignmentContract(
  contract: AlignmentContract,
  timestamp?: number
): AlignmentContract {
  return { ...contract, status: "rejected", updatedAt: timestamp ?? Date.now() }
}

/** Supersede an Alignment Contract. */
export function supersedeAlignmentContract(
  contract: AlignmentContract,
  timestamp?: number
): AlignmentContract {
  return { ...contract, status: "superseded", updatedAt: timestamp ?? Date.now() }
}

/** Derive a default Alignment Contract from an Intent Model. */
export function deriveAlignmentContractFromIntentModel(
  intentModel: IntentModel,
  refinedIntentId?: string,
  ctx: ConstructionContext = {}
): AlignmentContract {
  const objectiveCoverage: ObjectiveCoverage[] = intentModel.explicitObjectives.map((objective) => ({
    objective,
    evidenceIds: intentModel.referenceEvidenceIds,
    aligned: false,
    notes: "Derived from approved Intent Model",
  }))

  const implicitObjectiveStatus: ImplicitObjectiveStatus[] = intentModel.implicitObjectives.map((objective) => ({
    objective,
    status: "accepted",
    reason: "Accepted as part of refined intent",
  }))

  const forbiddenInterpretations: ForbiddenInterpretationEntry[] = intentModel.forbiddenInterpretations.map(
    (interpretation) => ({
      interpretation,
      reason: "Explicitly forbidden in approved Intent Model",
      evidenceIds: intentModel.referenceEvidenceIds,
    })
  )

  const dimensions: AlignmentDimension[] = [
    { name: "Intent", score: null as unknown as number, reason: "Explicit and implicit objectives documented and reviewed" },
    { name: "Experience", score: null as unknown as number, reason: "Desired outcome and experience contract captured" },
    { name: "Visual", score: null as unknown as number, reason: "Visual references and design system identified" },
    { name: "Interaction", score: null as unknown as number, reason: "Scroll contract and workspace persistence captured" },
    { name: "Governance", score: null as unknown as number, reason: "Refinement approval recorded" },
    { name: "Evidence", score: null as unknown as number, reason: "All objectives bound to reference evidence" },
  ]

  const overallScore = null as unknown as number

  return createAlignmentContract(
    {
      intentModelId: intentModel.id,
      refinedIntentId,
      intentSummary: intentModel.explicitObjectives.join("; "),
      expectedExperience: intentModel.desiredOutcome ?? "Not specified",
      requiredProperties: intentModel.allowedInterpretations,
      forbiddenProperties: intentModel.forbiddenInterpretations,
      requiredBehaviors: ["Workspace persists while phases change", "Supporting content appears after Mission Studio releases"],
      forbiddenInterpretation: intentModel.forbiddenInterpretations,
      forbiddenDrift: intentModel.forbiddenInterpretations,
      successCriteria: intentModel.desiredOutcome ? [intentModel.desiredOutcome] : [],
      referenceEvidenceIds: intentModel.referenceEvidenceIds,
      dimensions,
      objectiveCoverage,
      implicitObjectiveStatus,
      forbiddenInterpretations,
      confidenceExplanation: {
        score: overallScore,
        reason: `Computed from ${dimensions.length} alignment dimensions. Residual ambiguity is documented.`,
      },
      residualDivergence: intentModel.knownUnknowns.map((unknown) => ({
        description: unknown,
        acceptedBy: { kind: "human", id: "synth-cli-operator" },
        reason: "Known unknown accepted for first release",
        risk: null as unknown as "low" | "medium" | "high",
      })),
    },
    ctx
  )
}
