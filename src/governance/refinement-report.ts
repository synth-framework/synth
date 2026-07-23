// ============================================================
// GOVERNANCE: Refinement Report Artifact
// ============================================================
// Captures the outcome of a refinement session: questions asked,
// answers provided, assumptions removed, interpretations added or
// strengthened, evidence linked, and the confidence delta between the
// initial Intent Model and the refined result.
// ============================================================

import type { IntentModel, ConstructionContext } from "./intent-model.js"
import type { RefinementSession, RefinementQuestion } from "./refinement-layer.js"

export type RefinementReportChange = {
  kind: "assumption_removed" | "forbidden_added" | "allowed_added" | "evidence_linked" | "objective_clarified" | "unknown_resolved"
  description: string
  before?: string
  after?: string
}

export type RefinementReportEntry = {
  question: RefinementQuestion
  answer: string
  change?: RefinementReportChange
}

export type RefinementReportRecommendation =
  | "approve_for_alignment"
  | "clarification_required"
  | "reject_intent"
  | "supersede_intent"

export type RefinementReport = {
  id: string
  sessionId: string
  intentModelId: string
  createdAt: number
  reviewer: { kind: string; id: string }
  initialConfidence: number
  finalConfidence: number
  entries: RefinementReportEntry[]
  assumptionsRemoved: string[]
  forbiddenInterpretationsAdded: string[]
  allowedInterpretationsAdded: string[]
  evidenceLinked: string[]
  openQuestions: string[]
  recommendation: RefinementReportRecommendation
  reason: string
}

function makeId(timestamp: number = Date.now()): string {
  return `refinement-report-${timestamp.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Build a Refinement Report from a completed session and its resulting model. */
export function createRefinementReport(
  session: RefinementSession,
  initialModel: IntentModel,
  finalModel: IntentModel,
  reviewer: { kind: string; id: string },
  recommendation: RefinementReportRecommendation,
  reason: string,
  additionalEntries?: RefinementReportEntry[],
  ctx: ConstructionContext = {}
): RefinementReport {
  const now = ctx.timestamp ?? Date.now()
  const entries: RefinementReportEntry[] = session.answers.map((answer) => {
    const question = session.questions.find((q) => q.id === answer.questionId)
    if (!question) throw new Error(`Question not found: ${answer.questionId}`)
    return { question, answer: answer.text }
  })
  if (additionalEntries) {
    entries.push(...additionalEntries)
  }

  const assumptionsRemoved: string[] = []
  const forbiddenAdded: string[] = []
  const allowedAdded: string[] = []

  for (const item of finalModel.forbiddenInterpretations) {
    if (!initialModel.forbiddenInterpretations.includes(item)) {
      forbiddenAdded.push(item)
    }
  }

  for (const item of finalModel.allowedInterpretations) {
    if (!initialModel.allowedInterpretations.includes(item)) {
      allowedAdded.push(item)
    }
  }

  const evidenceLinked = Array.from(
    new Set([...initialModel.referenceEvidenceIds, ...finalModel.referenceEvidenceIds])
  )

  const openQuestions = finalModel.unresolvedAmbiguity.length > 0 ? finalModel.unresolvedAmbiguity : []

  return {
    id: ctx.id ?? makeId(now),
    sessionId: session.id,
    intentModelId: finalModel.id,
    createdAt: now,
    reviewer,
    initialConfidence: initialModel.confidenceLevel,
    finalConfidence: finalModel.confidenceLevel,
    entries,
    assumptionsRemoved,
    forbiddenInterpretationsAdded: forbiddenAdded,
    allowedInterpretationsAdded: allowedAdded,
    evidenceLinked,
    openQuestions,
    recommendation,
    reason,
  }
}

export type RefinementReportValidationResult = { valid: boolean; errors: string[] }

export function validateRefinementReport(report: unknown): RefinementReportValidationResult {
  if (typeof report !== "object" || report === null) {
    return { valid: false, errors: ["RefinementReport must be an object"] }
  }
  const r = report as Partial<RefinementReport>
  const errors: string[] = []
  if (!r.id) errors.push("id is required")
  if (!r.sessionId) errors.push("sessionId is required")
  if (!r.intentModelId) errors.push("intentModelId is required")
  if (typeof r.createdAt !== "number") errors.push("createdAt is required")
  if (!r.reviewer || typeof r.reviewer.kind !== "string" || typeof r.reviewer.id !== "string") {
    errors.push("reviewer with kind and id is required")
  }
  if (typeof r.initialConfidence !== "number") errors.push("initialConfidence is required")
  if (typeof r.finalConfidence !== "number") errors.push("finalConfidence is required")
  if (!Array.isArray(r.entries)) errors.push("entries must be an array")
  if (!Array.isArray(r.assumptionsRemoved)) errors.push("assumptionsRemoved must be an array")
  if (!Array.isArray(r.forbiddenInterpretationsAdded)) errors.push("forbiddenInterpretationsAdded must be an array")
  if (!Array.isArray(r.allowedInterpretationsAdded)) errors.push("allowedInterpretationsAdded must be an array")
  if (!Array.isArray(r.evidenceLinked)) errors.push("evidenceLinked must be an array")
  if (!Array.isArray(r.openQuestions)) errors.push("openQuestions must be an array")
  if (!r.recommendation) errors.push("recommendation is required")
  if (!r.reason) errors.push("reason is required")
  return errors.length ? { valid: false, errors } : { valid: true, errors: [] }
}
