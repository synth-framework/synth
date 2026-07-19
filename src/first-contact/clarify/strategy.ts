// ============================================================
// FIRST CONTACT: Default Clarification Strategy
// ============================================================
// Detects ambiguity, generates targeted questions, and applies
// answers to update the Discovery Artifact deterministically.
// ============================================================

import type {
  Ambiguity,
  AmbiguityClass,
  ClarificationAnswer,
  ClarificationQuestion,
  ClarificationResult,
  ClarificationStrategy,
} from "./types.js"
import type { IntentExtractionResult, TranscriptEntry } from "../extract/types.js"
import { computeConfidence } from "../extract/confidence.js"

const CONFIDENCE_THRESHOLD = 0.8
const OPTIONAL_FIELDS = [
  "capabilities.optional",
  "constraints.functional",
  "constraints.nonFunctional",
  "environment.platformConstraints",
]

function isOptionalField(field: string): boolean {
  return OPTIONAL_FIELDS.includes(field)
}

function isFieldEmpty(artifact: IntentExtractionResult, field: string): boolean {
  switch (field) {
    case "capabilities.optional":
      return artifact.capabilities.optional.length === 0
    case "constraints.functional":
      return artifact.constraints.functional.length === 0
    case "constraints.nonFunctional":
      return artifact.constraints.nonFunctional.length === 0
    default:
      return false
  }
}

function classifyConfidence(field: string, confidence: number): AmbiguityClass {
  if (confidence === 0) return "MISSING_REQUIRED"
  if (confidence < CONFIDENCE_THRESHOLD) return "LOW_CONFIDENCE"
  return "NEEDS_DISAMBIGUATION"
}

function questionFor(field: string, ambiguityClass: AmbiguityClass): string {
  const map: Record<string, string> = {
    "audience.primaryUsers": "Who are the primary users of this system?",
    "audience.stakeholders": "Who are the stakeholders or decision-makers?",
    "environment.targetRuntime": "Where will this system run? (e.g., web, CLI, mobile, desktop)",
    "environment.languagePreferences": "What programming language(s) should be used?",
    "environment.platformConstraints": "Are there any platform constraints? (e.g., serverless, offline, cross-platform)",
    "capabilities.required": "What are the must-have capabilities or features?",
    "capabilities.optional": "What nice-to-have capabilities should be considered?",
    "constraints.functional": "What functional constraints must be respected?",
    "constraints.nonFunctional": "What non-functional constraints matter? (e.g., performance, security)",
    "intent.goals": "What are the main goals this project should achieve?",
    "intent.successCriteria": "How will we know the project is successful?",
  }
  const base = map[field] ?? `Could you clarify '${field}'?`
  if (ambiguityClass === "CONFLICTING") {
    return `${base} (The existing values appear to conflict.)`
  }
  return base
}

export class DefaultClarificationStrategy implements ClarificationStrategy {
  readonly version = "1.0.0"

  detectAmbiguities(artifact: IntentExtractionResult): Ambiguity[] {
    const ambiguities: Ambiguity[] = []
    const byField = artifact.confidence.byField

    for (const [field, confidence] of Object.entries(byField)) {
      if (confidence >= CONFIDENCE_THRESHOLD) continue

      // Optional fields are not clarification blockers. They are only
      // collected if the operator chooses to provide them.
      if (isOptionalField(field)) {
        continue
      }

      ambiguities.push({
        field,
        ambiguityClass: classifyConfidence(field, confidence),
        description: `Field '${field}' has confidence ${confidence}, below threshold ${CONFIDENCE_THRESHOLD}.`,
        confidence,
      })
    }

    for (const unknown of artifact.unknowns) {
      if (unknown.accepted) continue
      if (!ambiguities.some((a) => a.field === unknown.field)) {
        ambiguities.push({
          field: unknown.field,
          ambiguityClass: "MISSING_REQUIRED",
          description: unknown.description,
          confidence: unknown.confidence,
        })
      }
    }

    return ambiguities
  }

  generateQuestions(ambiguities: Ambiguity[]): ClarificationQuestion[] {
    return ambiguities.map((ambiguity, index) => ({
      id: `q-${index + 1}`,
      ambiguityClass: ambiguity.ambiguityClass,
      field: ambiguity.field,
      question: questionFor(ambiguity.field, ambiguity.ambiguityClass),
      expectedAnswerType:
        ambiguity.field.startsWith("audience") ||
        ambiguity.field.startsWith("capabilities") ||
        ambiguity.field.startsWith("constraints") ||
        ambiguity.field.startsWith("environment.language") ||
        ambiguity.field.startsWith("environment.platform") ||
        ambiguity.field.startsWith("intent.goals") ||
        ambiguity.field.startsWith("intent.success")
          ? "list"
          : "single",
    }))
  }

  applyAnswer(
    artifact: IntentExtractionResult,
    question: ClarificationQuestion,
    answer: ClarificationAnswer,
  ): IntentExtractionResult {
    const updated: IntentExtractionResult = structuredClone(artifact)
    const content = answer.content.trim()

    if (content.length === 0) {
      return updated
    }

    if (question.expectedAnswerType === "list") {
      const values = content.split(/[,;]/).map((s) => s.trim()).filter((s) => s.length > 0)
      this.applyFieldValue(updated, question.field, values)
    } else {
      this.applyFieldValue(updated, question.field, content)
    }

    // Remove resolved unknowns.
    updated.unknowns = updated.unknowns.filter((u) => u.field !== question.field)

    // Record answer in transcript.
    const nextTurn = (updated.transcript.at(-1)?.turn ?? 0) + 1
    const questionEntry: TranscriptEntry = {
      turn: nextTurn,
      actor: "system",
      type: "question",
      content: question.question,
      timestamp: new Date().toISOString(),
    }
    const answerEntry: TranscriptEntry = {
      turn: nextTurn + 1,
      actor: "operator",
      type: "answer",
      content,
      timestamp: new Date().toISOString(),
    }
    updated.transcript.push(questionEntry, answerEntry)

    updated.confidence = computeConfidence(updated)
    return updated
  }

  private applyFieldValue(artifact: IntentExtractionResult, field: string, value: string | string[]): void {
    switch (field) {
      case "audience.primaryUsers":
        artifact.audience.primaryUsers = Array.isArray(value) ? value : [value]
        break
      case "audience.stakeholders":
        artifact.audience.stakeholders = Array.isArray(value) ? value : [value]
        break
      case "environment.targetRuntime":
        artifact.environment.targetRuntime = Array.isArray(value) ? value[0] : value
        break
      case "environment.languagePreferences":
        artifact.environment.languagePreferences = Array.isArray(value) ? value : [value]
        break
      case "environment.platformConstraints":
        artifact.environment.platformConstraints = Array.isArray(value) ? value : [value]
        break
      case "capabilities.required":
        artifact.capabilities.required = Array.isArray(value) ? value : [value]
        break
      case "capabilities.optional":
        artifact.capabilities.optional = Array.isArray(value) ? value : [value]
        break
      case "constraints.functional":
        artifact.constraints.functional = Array.isArray(value) ? value : [value]
        break
      case "constraints.nonFunctional":
        artifact.constraints.nonFunctional = Array.isArray(value) ? value : [value]
        break
      case "intent.goals":
        artifact.intent.goals = Array.isArray(value) ? value : [value]
        break
      case "intent.successCriteria":
        artifact.intent.successCriteria = Array.isArray(value) ? value : [value]
        break
    }
  }

  shouldContinue(artifact: IntentExtractionResult): boolean {
    const belowThreshold = Object.entries(artifact.confidence.byField).some(([field, confidence]) => {
      if (confidence >= CONFIDENCE_THRESHOLD) return false
      if (isOptionalField(field)) return false
      return true
    })
    const hasUnresolvedUnknowns = artifact.unknowns.some((u) => !u.accepted)
    return belowThreshold || hasUnresolvedUnknowns
  }
}

export function clarify(
  artifact: IntentExtractionResult,
  strategy: ClarificationStrategy = new DefaultClarificationStrategy(),
): ClarificationResult {
  const ambiguities = strategy.detectAmbiguities(artifact)
  const questions = strategy.generateQuestions(ambiguities)
  const canApprove = !strategy.shouldContinue(artifact)

  return {
    artifact,
    questions,
    ambiguities,
    canApprove,
    transcript: artifact.transcript,
  }
}
