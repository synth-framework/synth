// ============================================================
// GOVERNANCE: Intent Model Artifact
// ============================================================
// Canonical representation of raw human intent before it becomes a
// Refined Intent or Alignment Contract. Captures explicit and implicit
// objectives, forbidden interpretations, and unresolved ambiguity.
// ============================================================

export type InterpretationDirection =
  | "explicit_objective"
  | "implicit_objective"
  | "forbidden"
  | "allowed"
  | "unknown"

export type IntentInterpretation = {
  kind: InterpretationDirection
  text: string
  evidence?: string[]
}

export type IntentModelStatus =
  | "draft"
  | "awaiting_clarification"
  | "sufficient"
  | "insufficient"
  | "superseded"

export type IntentModel = {
  id: string
  rawIntentReference: string
  explicitObjectives: string[]
  implicitObjectives: string[]
  audience?: string
  problemStatement?: string
  desiredOutcome?: string
  nonGoals: string[]
  forbiddenInterpretations: string[]
  allowedInterpretations: string[]
  interpretations: IntentInterpretation[]
  referenceEvidenceIds: string[]
  confidenceLevel: number
  unresolvedAmbiguity: string[]
  knownUnknowns: string[]
  status: IntentModelStatus
  version: number
  createdAt: number
  updatedAt: number
}

export type IntentModelInput = {
  rawIntentReference: string
  explicitObjectives: string[]
  implicitObjectives?: string[]
  audience?: string
  problemStatement?: string
  desiredOutcome?: string
  nonGoals?: string[]
  forbiddenInterpretations?: string[]
  allowedInterpretations?: string[]
  interpretations?: IntentInterpretation[]
  referenceEvidenceIds?: string[]
  unresolvedAmbiguity?: string[]
  knownUnknowns?: string[]
}

export type IntentModelValidationResult = {
  valid: boolean
  errors: string[]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string")
}

export function validateIntentModel(model: unknown): IntentModelValidationResult {
  if (typeof model !== "object" || model === null) {
    return { valid: false, errors: ["IntentModel must be an object"] }
  }
  const m = model as Partial<IntentModel>
  const errors: string[] = []

  if (!isNonEmptyString(m.id)) errors.push("id is required")
  if (!isNonEmptyString(m.rawIntentReference)) errors.push("rawIntentReference is required")
  if (!isStringArray(m.explicitObjectives) || m.explicitObjectives.length === 0) {
    errors.push("explicitObjectives must be a non-empty string array")
  }
  if (!isStringArray(m.implicitObjectives)) errors.push("implicitObjectives must be a string array")
  if (!isStringArray(m.nonGoals)) errors.push("nonGoals must be a string array")
  if (!isStringArray(m.forbiddenInterpretations)) errors.push("forbiddenInterpretations must be a string array")
  if (!isStringArray(m.allowedInterpretations)) errors.push("allowedInterpretations must be a string array")
  if (!isStringArray(m.referenceEvidenceIds)) errors.push("referenceEvidenceIds must be a string array")
  if (!isStringArray(m.unresolvedAmbiguity)) errors.push("unresolvedAmbiguity must be a string array")
  if (!isStringArray(m.knownUnknowns)) errors.push("knownUnknowns must be a string array")
  if (typeof m.confidenceLevel !== "number" || m.confidenceLevel < 0 || m.confidenceLevel > 1) {
    errors.push("confidenceLevel must be a number between 0 and 1")
  }
  if (!["draft", "awaiting_clarification", "sufficient", "insufficient", "superseded"].includes(m.status ?? "")) {
    errors.push("status must be a valid IntentModelStatus")
  }
  if (typeof m.version !== "number") errors.push("version must be a number")

  return errors.length ? { valid: false, errors } : { valid: true, errors: [] }
}

function makeId(timestamp: number = Date.now()): string {
  return `intent-model-${timestamp.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Compute a simple confidence score based on required evidence. */
export function computeConfidence(input: IntentModelInput): number {
  let score = 0.5
  const checks = [
    input.audience,
    input.problemStatement,
    input.desiredOutcome,
    input.explicitObjectives.length > 0,
    (input.implicitObjectives?.length ?? 0) > 0,
    (input.nonGoals?.length ?? 0) > 0,
    (input.forbiddenInterpretations?.length ?? 0) > 0,
    (input.referenceEvidenceIds?.length ?? 0) > 0,
    (input.unresolvedAmbiguity?.length ?? 0) === 0,
  ]
  const passed = checks.filter(Boolean).length
  score += passed * 0.05
  return Math.min(1, Math.max(0, score))
}

export type ConstructionContext = {
  /** Explicit identifier. Omit to generate one from the timestamp and random suffix. */
  id?: string
  /** Explicit timestamp. Omit to use the current wall-clock time. */
  timestamp?: number
}

/** Create a new Intent Model from raw input. */
export function createIntentModel(
  input: IntentModelInput,
  ctx: ConstructionContext = {}
): IntentModel {
  const now = ctx.timestamp ?? Date.now()
  const confidenceLevel = computeConfidence(input)
  return {
    id: ctx.id ?? makeId(now),
    rawIntentReference: input.rawIntentReference,
    explicitObjectives: input.explicitObjectives,
    implicitObjectives: input.implicitObjectives ?? [],
    audience: input.audience,
    problemStatement: input.problemStatement,
    desiredOutcome: input.desiredOutcome,
    nonGoals: input.nonGoals ?? [],
    forbiddenInterpretations: input.forbiddenInterpretations ?? [],
    allowedInterpretations: input.allowedInterpretations ?? [],
    interpretations: input.interpretations ?? [],
    referenceEvidenceIds: input.referenceEvidenceIds ?? [],
    confidenceLevel,
    unresolvedAmbiguity: input.unresolvedAmbiguity ?? [],
    knownUnknowns: input.knownUnknowns ?? [],
    status: confidenceLevel >= 0.8 ? "sufficient" : "draft",
    version: 1,
    createdAt: now,
    updatedAt: now,
  }
}

/** Revise an existing Intent Model. */
export function reviseIntentModel(
  model: IntentModel,
  input: Partial<IntentModelInput>,
  timestamp?: number
): IntentModel {
  const merged: IntentModelInput = {
    rawIntentReference: input.rawIntentReference ?? model.rawIntentReference,
    explicitObjectives: input.explicitObjectives ?? model.explicitObjectives,
    implicitObjectives: input.implicitObjectives ?? model.implicitObjectives,
    audience: input.audience ?? model.audience,
    problemStatement: input.problemStatement ?? model.problemStatement,
    desiredOutcome: input.desiredOutcome ?? model.desiredOutcome,
    nonGoals: input.nonGoals ?? model.nonGoals,
    forbiddenInterpretations: input.forbiddenInterpretations ?? model.forbiddenInterpretations,
    allowedInterpretations: input.allowedInterpretations ?? model.allowedInterpretations,
    interpretations: input.interpretations ?? model.interpretations,
    referenceEvidenceIds: input.referenceEvidenceIds ?? model.referenceEvidenceIds,
    unresolvedAmbiguity: input.unresolvedAmbiguity ?? model.unresolvedAmbiguity,
    knownUnknowns: input.knownUnknowns ?? model.knownUnknowns,
  }
  const confidenceLevel = computeConfidence(merged)
  return {
    ...model,
    ...merged,
    id: model.id,
    confidenceLevel,
    status: confidenceLevel >= 0.8 ? "sufficient" : "awaiting_clarification",
    version: model.version + 1,
    updatedAt: timestamp ?? Date.now(),
  }
}

/** Mark an Intent Model as superseded. */
export function supersedeIntentModel(model: IntentModel, timestamp?: number): IntentModel {
  return { ...model, status: "superseded", updatedAt: timestamp ?? Date.now() }
}
