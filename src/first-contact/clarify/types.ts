// ============================================================
// FIRST CONTACT: Clarification Types
// ============================================================
// Shared types for the Clarification Strategy (EXP-AIFC-004).
// ============================================================

import type { ExtractedUnknown, IntentExtractionResult, TranscriptEntry } from "../extract/types.js"

export type AmbiguityClass =
  | "MISSING_REQUIRED"
  | "LOW_CONFIDENCE"
  | "CONFLICTING"
  | "NEEDS_DISAMBIGUATION"

export interface ClarificationQuestion {
  id: string
  ambiguityClass: AmbiguityClass
  field: string
  question: string
  expectedAnswerType: "single" | "list" | "boolean"
}

export interface ClarificationAnswer {
  questionId: string
  content: string
}

export interface Ambiguity {
  field: string
  ambiguityClass: AmbiguityClass
  description: string
  confidence: number
}

export interface ClarificationResult {
  artifact: IntentExtractionResult
  questions: ClarificationQuestion[]
  ambiguities: Ambiguity[]
  canApprove: boolean
  transcript: TranscriptEntry[]
}

export interface ClarificationStrategy {
  readonly version: string
  detectAmbiguities(artifact: IntentExtractionResult): Ambiguity[]
  generateQuestions(ambiguities: Ambiguity[]): ClarificationQuestion[]
  applyAnswer(
    artifact: IntentExtractionResult,
    question: ClarificationQuestion,
    answer: ClarificationAnswer,
  ): IntentExtractionResult
  shouldContinue(artifact: IntentExtractionResult): boolean
}
