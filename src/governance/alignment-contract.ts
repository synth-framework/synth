// ============================================================
// GOVERNANCE: Alignment Contract
// ============================================================
// The formal agreement between operator and SYNTH that the captured
// understanding accurately represents the intended outcome. This is
// the bridge between human intent and executable Mission creation.
// ============================================================

import type { Reviewer } from "./review-gates.js"

export type AlignmentContractStatus =
  | "draft"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "superseded"

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

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] }
}

function makeId(): string {
  return `alignment-contract-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Create an Alignment Contract from an Intent Model input. */
export function createAlignmentContract(input: AlignmentContractInput): AlignmentContract {
  const now = Date.now()
  return {
    id: makeId(),
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
    status: "draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}

/** Submit an Alignment Contract for review. */
export function submitAlignmentContract(contract: AlignmentContract): AlignmentContract {
  return { ...contract, status: "awaiting_review", updatedAt: Date.now() }
}

/** Approve an Alignment Contract. */
export function approveAlignmentContract(
  contract: AlignmentContract,
  reviewer: Reviewer
): AlignmentContract {
  return {
    ...contract,
    status: "approved",
    approvedBy: reviewer,
    approvedAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/** Reject an Alignment Contract. */
export function rejectAlignmentContract(contract: AlignmentContract): AlignmentContract {
  return { ...contract, status: "rejected", updatedAt: Date.now() }
}

/** Supersede an Alignment Contract. */
export function supersedeAlignmentContract(contract: AlignmentContract): AlignmentContract {
  return { ...contract, status: "superseded", updatedAt: Date.now() }
}

/** Derive a default Alignment Contract from an Intent Model. */
export function deriveAlignmentContractFromIntentModel(
  intentModel: {
    id: string
    explicitObjectives: string[]
    forbiddenInterpretations: string[]
    allowedInterpretations: string[]
    referenceEvidenceIds: string[]
    desiredOutcome?: string
    audience?: string
  },
  refinedIntentId?: string
): AlignmentContract {
  return createAlignmentContract({
    intentModelId: intentModel.id,
    refinedIntentId,
    intentSummary: intentModel.explicitObjectives.join("; "),
    expectedExperience: intentModel.desiredOutcome ?? "Not specified",
    requiredProperties: intentModel.allowedInterpretations,
    forbiddenProperties: intentModel.forbiddenInterpretations,
    forbiddenInterpretation: intentModel.forbiddenInterpretations,
    forbiddenDrift: intentModel.forbiddenInterpretations,
    successCriteria: intentModel.desiredOutcome ? [intentModel.desiredOutcome] : [],
    referenceEvidenceIds: intentModel.referenceEvidenceIds,
  })
}
