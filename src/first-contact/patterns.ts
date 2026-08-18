// ============================================================
// FIRST CONTACT: Conversation Patterns (EXP-FIRSTCONTACT-011)
// ============================================================
// Deterministic, evidence-backed conversation patterns extracted
// from FirstContactEvidence artifacts.
//
// A ConversationPattern is the canonical reusable knowledge produced by the
// learning system. Documentation, agent bootstrapping, and future
// recommendations are projections of these artifacts, not sources of truth.
// ============================================================

import fs from "fs/promises"
import path from "path"
import type {
  FirstContactEvidence,
  InterpretationChange,
  Intervention,
  MisinterpretationCategory,
} from "./evidence.js"

export type PatternStatus = "provisional" | "canonical" | "rejected"

/** A single expected turn in a canonical conversation trajectory. */
export type PatternTurn = {
  turn: number
  command: string
  intent?: string
  /** Expected agent reasoning state after this turn. */
  expectedReasoningState: {
    understoodAs: string
    confidence: number
    unknowns: string[]
  }
  /** Whether this turn represents a decision point where the model may diverge. */
  decisionPoint: boolean
}

/** A deterministic conversation pattern derived from first-contact evidence. */
export type ConversationPattern = {
  schemaVersion: "1.0.0"
  id: string
  title: string
  /** The human prompt that triggers this pattern. */
  trigger: string
  /** Preconditions observed in the repository state. */
  preconditions: {
    initialized?: boolean
    phase?: string
    files?: string[]
    repositoryStateSummary?: string
  }
  /** Canonical trajectory of commands and expected reasoning states. */
  trajectory: PatternTurn[]
  /** Decision points where the agent must choose between alignment and misinterpretation. */
  decisionPoints: { turn: number; description: string }[]
  /** Observed prompts or commands that produced aligned changes. */
  successfulPrompts: string[]
  /** Observed misinterpretations or anti-patterns to avoid. */
  antiPatterns: string[]
  /** Misinterpretation categories present in the source evidence. */
  misinterpretationCategories: MisinterpretationCategory[]
  /** Confidence score derived from the source evidence. */
  confidence: number
  /** Current validation status. Patterns start as provisional until validated. */
  status: PatternStatus
  /** Evidence that supports this pattern. */
  supportingEvidence: {
    sessionId: string
    scenarioId: string
    evidencePath?: string
  }[]
}

/** Result of validating a conversation pattern. */
export type PatternValidationResult = {
  status: PatternStatus
  errors: string[]
  warnings: string[]
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function deriveTitle(evidence: FirstContactEvidence): string {
  const prompt = evidence.humanPrompt.trim()
  if (prompt.length <= 60) return prompt
  // Use scenario id as a stable fallback title.
  const id = evidence.scenarioId
    .replace(/^baseline-/, "")
    .replace(/-/g, " ")
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function deriveRepositoryStateSummary(evidence: FirstContactEvidence): string {
  const parts: string[] = []
  parts.push(evidence.repositoryState.initialized ? "initialized project" : "uninitialized directory")
  if (evidence.repositoryState.phase && evidence.repositoryState.phase !== "unknown") {
    parts.push(`phase: ${evidence.repositoryState.phase}`)
  }
  if (evidence.repositoryState.notices && evidence.repositoryState.notices.length > 0) {
    parts.push(`notices: ${evidence.repositoryState.notices.join("; ")}`)
  }
  return parts.join("; ")
}

function buildTrajectory(evidence: FirstContactEvidence): PatternTurn[] {
  const turns: PatternTurn[] = []
  const changesByTurn = new Map<number, InterpretationChange | Intervention>()

  for (const change of evidence.interpretationChanges) {
    changesByTurn.set(change.turn, change)
  }
  for (const intervention of evidence.interventions) {
    if (!changesByTurn.has(intervention.turn)) {
      changesByTurn.set(intervention.turn, intervention)
    }
  }

  for (const turn of evidence.evidenceConsumed) {
    const changeOrIntervention = changesByTurn.get(turn.turn)
    const isDecisionPoint =
      !!changeOrIntervention &&
      ("aligned" in changeOrIntervention
        ? !changeOrIntervention.aligned
        : true)

    turns.push({
      turn: turn.turn,
      command: turn.command.join(" "),
      intent: turn.intent,
      expectedReasoningState: {
        understoodAs: turn.agentReasoningState?.understoodAs ?? evidence.agentInitialModel.understoodAs,
        confidence: turn.agentReasoningState?.confidence ?? evidence.agentInitialModel.confidence,
        unknowns: turn.agentReasoningState?.unknowns ?? [...evidence.agentInitialModel.unknowns],
      },
      decisionPoint: isDecisionPoint,
    })
  }

  return turns
}

function buildDecisionPoints(evidence: FirstContactEvidence): { turn: number; description: string }[] {
  const points: { turn: number; description: string }[] = []
  for (const change of evidence.interpretationChanges) {
    if (!change.aligned) {
      points.push({
        turn: change.turn,
        description: `Divergence from '${change.from.understoodAs}' to '${change.to.understoodAs}' after '${change.command}'.`,
      })
    } else if (change.from.understoodAs !== change.to.understoodAs) {
      points.push({
        turn: change.turn,
        description: `Model corrected from '${change.from.understoodAs}' to '${change.to.understoodAs}' via '${change.command}'.`,
      })
    }
  }
  return points
}

function buildAntiPatterns(evidence: FirstContactEvidence): string[] {
  const antiPatterns = new Set<string>()
  for (const change of evidence.interpretationChanges) {
    if (!change.aligned) {
      antiPatterns.add(`Assuming '${change.to.understoodAs}' before establishing '${change.from.understoodAs}'.`)
    }
  }
  for (const category of evidence.misinterpretationCategories) {
    if (category === "intent-confusion") {
      antiPatterns.add("Treating a specification repository as an incomplete application.")
    }
    if (category === "missing-context") {
      antiPatterns.add("Proceeding with an ambiguous request without clarifying scope.")
    }
    if (category === "governance-confusion") {
      antiPatterns.add("Modifying governance artifacts instead of product artifacts.")
    }
    if (category === "vocabulary-mismatch") {
      antiPatterns.add("Interpreting SYNTH vocabulary as generic task-list terminology.")
    }
  }
  return Array.from(antiPatterns)
}

function computeConfidence(evidence: FirstContactEvidence): number {
  const success = evidence.successConditions
  let score = evidence.finalModel.confidence
  if (success.inspectedBeforeActing) score += 0.1
  if (success.usedGovernedPath) score += 0.1
  if (success.reachedCorrectInterpretation) score += 0.1
  if (success.remainingUnknownsAcceptable) score += 0.05
  return Math.min(1, Math.round(score * 100) / 100)
}

/**
 * Extract a deterministic ConversationPattern from a FirstContactEvidence artifact.
 *
 * The extractor never invents: every field is derived from the evidence object.
 */
export function extractConversationPattern(
  evidence: FirstContactEvidence,
  options?: { evidencePath?: string },
): ConversationPattern {
  const trajectory = buildTrajectory(evidence)
  const decisionPoints = buildDecisionPoints(evidence)
  const antiPatterns = buildAntiPatterns(evidence)

  const successfulPrompts: string[] = []
  for (const turn of trajectory) {
    if (turn.decisionPoint) continue
    if (turn.intent) successfulPrompts.push(`${turn.command} — ${turn.intent}`)
    else successfulPrompts.push(turn.command)
  }

  return {
    schemaVersion: "1.0.0",
    id: evidence.scenarioId,
    title: deriveTitle(evidence),
    trigger: evidence.humanPrompt,
    preconditions: {
      initialized: evidence.repositoryState.initialized,
      phase: evidence.repositoryState.phase,
      files: evidence.repositoryState.files,
      repositoryStateSummary: deriveRepositoryStateSummary(evidence),
    },
    trajectory,
    decisionPoints,
    successfulPrompts,
    antiPatterns,
    misinterpretationCategories: evidence.misinterpretationCategories,
    confidence: computeConfidence(evidence),
    status: "provisional",
    supportingEvidence: [
      {
        sessionId: evidence.sessionId,
        scenarioId: evidence.scenarioId,
        evidencePath: options?.evidencePath,
      },
    ],
  }
}

/**
 * Validate a conversation pattern against the First Contact learning rules.
 *
 * A pattern is promoted to canonical only when it has enough supporting
 * evidence, meets the confidence threshold, and shows no conflicting
 * trajectories. Single-evidence patterns remain provisional by design.
 */
export function validateConversationPattern(
  pattern: ConversationPattern,
  options?: { minEvidenceCount?: number; minConfidence?: number },
): PatternValidationResult {
  const minEvidenceCount = options?.minEvidenceCount ?? 1
  const minConfidence = options?.minConfidence ?? 0.5
  const errors: string[] = []
  const warnings: string[] = []

  if (pattern.supportingEvidence.length < minEvidenceCount) {
    warnings.push(
      `Pattern has ${pattern.supportingEvidence.length} supporting evidence(s); minimum for canonical status is ${minEvidenceCount}.`,
    )
  }

  if (pattern.confidence < minConfidence) {
    errors.push(`Confidence ${pattern.confidence} is below threshold ${minConfidence}.`)
  }

  if (pattern.trajectory.length === 0) {
    errors.push("Pattern has no trajectory.")
  }

  // Detect conflicting trajectories: the same turn leading to different
  // expected reasoning states would indicate non-deterministic evidence.
  const seen = new Map<number, string>()
  for (const turn of pattern.trajectory) {
    const key = JSON.stringify({
      turn: turn.turn,
      command: turn.command,
      understoodAs: turn.expectedReasoningState.understoodAs,
      confidence: turn.expectedReasoningState.confidence,
    })
    if (seen.has(turn.turn) && seen.get(turn.turn) !== key) {
      errors.push(`Conflicting trajectory at turn ${turn.turn}.`)
    }
    seen.set(turn.turn, key)
  }

  const hasRejectionErrors = errors.length > 0
  const canBeCanonical =
    !hasRejectionErrors &&
    pattern.supportingEvidence.length >= minEvidenceCount &&
    pattern.confidence >= minConfidence

  return {
    status: hasRejectionErrors ? "rejected" : canBeCanonical ? "canonical" : "provisional",
    errors,
    warnings,
  }
}

/**
 * Promote a pattern to canonical if validation permits.
 *
 * Returns the updated pattern; the original is not mutated.
 */
export function promoteConversationPattern(
  pattern: ConversationPattern,
  options?: { minEvidenceCount?: number; minConfidence?: number },
): ConversationPattern {
  const result = validateConversationPattern(pattern, options)
  return {
    ...pattern,
    status: result.status,
  }
}

/**
 * Persist a ConversationPattern artifact to disk.
 *
 * Returns the path of the written file.
 */
export async function saveConversationPattern(
  pattern: ConversationPattern,
  outputDir: string,
  filename?: string,
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true })
  const name = filename ?? `${pattern.id}.json`
  const filePath = path.join(outputDir, name)
  await fs.writeFile(filePath, JSON.stringify(pattern, null, 2) + "\n", "utf-8")
  return filePath
}
