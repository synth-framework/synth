// ============================================================
// GOVERNANCE: Refinement Layer
// ============================================================
// Orchestrates the transformation of raw intent into a governed
// Refined Intent. Produces clarification questions, tracks revision,
// and decides when an Intent Model is sufficient for downstream use.
// ============================================================

import type { IntentModel, IntentModelInput } from "./intent-model.js"
import { createIntentModel, reviseIntentModel, supersedeIntentModel } from "./intent-model.js"

export type RefinementQuestion = {
  id: string
  text: string
  category: "audience" | "outcome" | "constraint" | "reference" | "scope" | "risk"
  priority: "high" | "medium" | "low"
}

export type RefinementSession = {
  id: string
  intentModelId: string
  status: "active" | "clarifying" | "sufficient" | "insufficient" | "superseded"
  questions: RefinementQuestion[]
  answers: Array<{ questionId: string; text: string }>
  version: number
  createdAt: number
  updatedAt: number
}

export class RefinementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "RefinementError"
  }
}

const QUESTION_TEMPLATES: RefinementQuestion[] = [
  { id: "q-audience", text: "Who is the audience?", category: "audience", priority: "high" },
  { id: "q-outcome", text: "What does success look like?", category: "outcome", priority: "high" },
  { id: "q-authoritative", text: "Which reference is authoritative?", category: "reference", priority: "high" },
  { id: "q-protected", text: "What must not change?", category: "constraint", priority: "high" },
  { id: "q-problem", text: "What problem does this solve?", category: "outcome", priority: "medium" },
  { id: "q-out-of-scope", text: "What is explicitly out of scope?", category: "scope", priority: "medium" },
  { id: "q-risk", text: "What is the biggest risk if this fails?", category: "risk", priority: "medium" },
]

/** Generate clarification questions based on gaps in the Intent Model. */
export function generateQuestions(model: IntentModel): RefinementQuestion[] {
  const questions: RefinementQuestion[] = []
  if (!model.audience) questions.push(QUESTION_TEMPLATES.find((q) => q.id === "q-audience")!)
  if (!model.desiredOutcome) questions.push(QUESTION_TEMPLATES.find((q) => q.id === "q-outcome")!)
  if (model.referenceEvidenceIds.length === 0) questions.push(QUESTION_TEMPLATES.find((q) => q.id === "q-authoritative")!)
  if (model.forbiddenInterpretations.length === 0) questions.push(QUESTION_TEMPLATES.find((q) => q.id === "q-protected")!)
  if (!model.problemStatement) questions.push(QUESTION_TEMPLATES.find((q) => q.id === "q-problem")!)
  if (model.nonGoals.length === 0) questions.push(QUESTION_TEMPLATES.find((q) => q.id === "q-out-of-scope")!)
  if (model.knownUnknowns.length === 0) questions.push(QUESTION_TEMPLATES.find((q) => q.id === "q-risk")!)
  return questions.filter(Boolean)
}

function makeSessionId(): string {
  return `refinement-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Start a refinement session for an Intent Model. */
export function startRefinement(intentModel: IntentModel): RefinementSession {
  return {
    id: makeSessionId(),
    intentModelId: intentModel.id,
    status: "active",
    questions: generateQuestions(intentModel),
    answers: [],
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/** Answer a clarification question and revise the Intent Model. */
export function answerQuestion(
  session: RefinementSession,
  model: IntentModel,
  questionId: string,
  answerText: string
): { session: RefinementSession; model: IntentModel } {
  if (!session.questions.find((q) => q.id === questionId)) {
    throw new RefinementError(`Question ${questionId} is not part of this session`)
  }

  const answers = [...session.answers, { questionId, text: answerText }]
  const patch: Partial<IntentModelInput> = {}

  switch (questionId) {
    case "q-audience":
      patch.audience = answerText
      break
    case "q-outcome":
      patch.desiredOutcome = answerText
      break
    case "q-authoritative":
      patch.referenceEvidenceIds = [...model.referenceEvidenceIds, answerText]
      break
    case "q-protected":
      patch.forbiddenInterpretations = [...model.forbiddenInterpretations, answerText]
      break
    case "q-problem":
      patch.problemStatement = answerText
      break
    case "q-out-of-scope":
      patch.nonGoals = [...model.nonGoals, answerText]
      break
    case "q-risk":
      patch.knownUnknowns = [...model.knownUnknowns, answerText]
      break
  }

  const revised = reviseIntentModel(model, patch)
  const remainingQuestions = generateQuestions(revised)
  const nextStatus: RefinementSession["status"] =
    revised.confidenceLevel >= 0.8 ? "sufficient" : remainingQuestions.length > 0 ? "clarifying" : "insufficient"

  return {
    session: {
      ...session,
      status: nextStatus,
      questions: remainingQuestions,
      answers,
      updatedAt: Date.now(),
    },
    model: revised,
  }
}

/** Submit an Intent Model for downstream use (e.g., Refined Intent creation). */
export function submitForRefinedIntent(model: IntentModel): IntentModel {
  if (model.status !== "sufficient" && model.confidenceLevel < 0.8) {
    throw new RefinementError("Intent Model confidence is too low to produce a Refined Intent")
  }
  return { ...model, status: "sufficient", updatedAt: Date.now() }
}

/** Mark a refinement session as superseded. */
export function supersedeRefinement(
  session: RefinementSession,
  model: IntentModel
): { session: RefinementSession; model: IntentModel } {
  return {
    session: { ...session, status: "superseded", updatedAt: Date.now() },
    model: supersedeIntentModel(model),
  }
}
