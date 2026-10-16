// ============================================================
// FIRST CONTACT: Intent Extraction Types
// ============================================================
// Shared types for the Intent Extraction Engine (EXP-AIFC-003).
// These types mirror the Discovery Artifact schema fields produced
// by EXP-AIFC-002.
// ============================================================

export type ConfidenceScore = number

export interface AgentChoice {
  id: string
  actor: "agent"
  status: "open"
  choice: string
  reason: string
  scope: string
  alternatives: string[]
  originIntent: string
  recordedAt: string
}

export interface TranscriptEntry {
  turn: number
  actor: "operator" | "system" | "agent"
  type: "input" | "question" | "answer" | "proposal" | "approval"
  content: string
  timestamp: string
  /** A provisional agent choice is not an operator answer or an approval. */
  agentChoice?: AgentChoice
}

export interface ExtractedIntent {
  description: string
  goals: string[]
  successCriteria: string[]
}

export interface ExtractedAudience {
  primaryUsers: string[]
  stakeholders: string[]
}

export interface ExtractedEnvironment {
  targetRuntime: string
  languagePreferences: string[]
  platformConstraints: string[]
}

export interface ExtractedCapabilities {
  required: string[]
  optional: string[]
}

export interface ExtractedConstraints {
  functional: string[]
  nonFunctional: string[]
}

export interface ExtractedUnknown {
  field: string
  description: string
  confidence: ConfidenceScore
  accepted: boolean
}

export interface FieldConfidence {
  overall: ConfidenceScore
  byField: Record<string, ConfidenceScore>
}

export interface IntentExtractionResult {
  id?: string
  intent: ExtractedIntent
  audience: ExtractedAudience
  environment: ExtractedEnvironment
  capabilities: ExtractedCapabilities
  constraints: ExtractedConstraints
  unknowns: ExtractedUnknown[]
  confidence: FieldConfidence
  transcript: TranscriptEntry[]
}

export interface IntentExtractionContext {
  sessionId?: string
  turn?: number
  priorTranscript?: TranscriptEntry[]
}

/**
 * Adapter contract for intent extraction strategies.
 *
 * Implementations must be deterministic: the same input and context
 * produce the same result for a fixed adapter version.
 */
export interface IntentExtractionAdapter {
  readonly version: string
  extract(input: string, context?: IntentExtractionContext): IntentExtractionResult
}
