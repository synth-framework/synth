// ============================================================
// FIRST CONTACT: Evidence Model (EXP-FIRSTCONTACT-011)
// ============================================================
// Structured evidence produced by a first-contact session.
//
// A FirstContactEvidence artifact captures the agent's trajectory from an
// unknown repository state to a (hopefully) correct interpretation. It is
// the input to the conversation-pattern extractor and the quick-start
// library generator.
// ============================================================

import fs from "fs/promises"
import path from "path"
import type { SessionArtifact, TurnResult } from "./experiment.js"

export type MisinterpretationCategory =
  | "intent-confusion"
  | "missing-context"
  | "governance-confusion"
  | "vocabulary-mismatch"
  | "none"

/** Snapshot of the repository state before the agent acts. */
export type RepositoryStateSnapshot = {
  /** Whether the directory was already a SYNTH project. */
  initialized: boolean
  /** Top-level files and directories present. */
  files: string[]
  /** Lifecycle phase reported by synth status, if any. */
  phase?: string
  /** Any warnings or blockers visible to the agent. */
  notices?: string[]
}

/** The agent's model of the project at a point in time. */
export type AgentModel = {
  understoodAs: string
  confidence: number
  unknowns: string[]
}

/** A single change in the agent's interpretation after consuming evidence. */
export type InterpretationChange = {
  turn: number
  command: string
  evidenceConsumed: string[]
  from: AgentModel
  to: AgentModel
  /** Whether this change moved the model toward the intended interpretation. */
  aligned: boolean
}

/** An intervention is any action or evidence that corrected the agent's model. */
export type Intervention = {
  turn: number
  command: string
  description: string
  category?: MisinterpretationCategory
}

/** Success conditions for the session, derived from the scenario. */
export type SuccessConditions = {
  inspectedBeforeActing: boolean
  usedGovernedPath: boolean
  reachedCorrectInterpretation: boolean
  remainingUnknownsAcceptable: boolean
}

/** Canonical evidence artifact for a first-contact session. */
export type FirstContactEvidence = {
  schemaVersion: "1.0.0"
  sessionId: string
  scenarioId: string
  humanPrompt: string
  repositoryState: RepositoryStateSnapshot
  agentInitialModel: AgentModel
  evidenceConsumed: TurnResult[]
  interpretationChanges: InterpretationChange[]
  interventions: Intervention[]
  finalModel: AgentModel
  misinterpretationCategories: MisinterpretationCategory[]
  successConditions: SuccessConditions
}

function toAgentModel(reasoning?: { understoodAs?: string; confidence?: number; unknowns?: string[] }): AgentModel {
  return {
    understoodAs: reasoning?.understoodAs ?? "unknown repository",
    confidence: reasoning?.confidence ?? 0,
    unknowns: reasoning?.unknowns ?? [],
  }
}

function deduceCategories(changes: InterpretationChange[]): MisinterpretationCategory[] {
  const categories = new Set<MisinterpretationCategory>()
  for (const change of changes) {
    const understood = change.to.understoodAs.toLowerCase()
    if (understood.includes("application") || understood.includes("react native")) {
      categories.add("intent-confusion")
    }
    if (understood.includes("ambiguous")) {
      categories.add("missing-context")
    }
  }
  if (categories.size === 0) categories.add("none")
  return Array.from(categories)
}

function isAligned(change: Omit<InterpretationChange, "aligned">): boolean {
  // A change is aligned if confidence is stable or increasing and the model
  // becomes more specific (fewer unknowns or more concrete language).
  const confidenceImproved = change.to.confidence >= change.from.confidence
  const unknownsReduced = change.to.unknowns.length <= change.from.unknowns.length
  return confidenceImproved && unknownsReduced
}

/**
 * Extract a canonical FirstContactEvidence artifact from a session artifact.
 *
 * This is a pure projection: it does not run any new commands, it only
 * restructures the captured trajectory into the evidence model.
 */
export function extractFirstContactEvidence(artifact: SessionArtifact): FirstContactEvidence {
  const turns = artifact.turns
  const firstTurn = turns[0]
  const lastTurn = turns[turns.length - 1]

  const repositoryState: RepositoryStateSnapshot = {
    initialized: firstTurn?.outputs.phase !== "uninitialized" && firstTurn?.outputs.status === "ok",
    files: Object.keys(firstTurn?.stateBefore ?? {}),
    phase: String(firstTurn?.outputs.phase ?? "unknown"),
    notices: Array.isArray(firstTurn?.outputs.warnings)
      ? firstTurn.outputs.warnings.map((w: { description?: string }) => w.description ?? String(w))
      : undefined,
  }

  const agentInitialModel = toAgentModel(firstTurn?.agentReasoningState)
  const finalModel = toAgentModel(lastTurn?.agentReasoningState)

  const interpretationChanges: InterpretationChange[] = []
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]
    const from = toAgentModel(turns[i - 1]?.agentReasoningState ?? firstTurn?.agentReasoningState)
    const to = toAgentModel(turn.agentReasoningState)
    if (i === 0 || from.understoodAs !== to.understoodAs || from.confidence !== to.confidence) {
      const change: InterpretationChange = {
        turn: turn.turn,
        command: turn.command.join(" "),
        evidenceConsumed: Object.keys(turn.outputs).filter((k) => k !== "agentSession" && k !== "agentReasoningState"),
        from,
        to,
        aligned: isAligned({ turn: turn.turn, command: turn.command.join(" "), evidenceConsumed: [], from, to }),
      }
      interpretationChanges.push(change)
    }
  }

  const interventions: Intervention[] = []
  for (const change of interpretationChanges) {
    if (!change.aligned) {
      interventions.push({
        turn: change.turn,
        command: change.command,
        description: `Model diverged or confidence dropped; '${change.command}' did not produce a clearer interpretation.`,
      })
    } else if (change.from.understoodAs !== change.to.understoodAs) {
      interventions.push({
        turn: change.turn,
        command: change.command,
        description: `Model corrected from '${change.from.understoodAs}' to '${change.to.understoodAs}'.`,
      })
    }
  }

  const successConditions: SuccessConditions = {
    inspectedBeforeActing: turns.some((t) => ["status", "explain"].includes(t.command[0])),
    usedGovernedPath: turns.some((t) => ["mission", "expedition", "init"].includes(t.command[0])),
    reachedCorrectInterpretation: finalModel.confidence >= 0.5 && finalModel.unknowns.length <= 2,
    remainingUnknownsAcceptable: finalModel.unknowns.length <= 3,
  }

  return {
    schemaVersion: "1.0.0",
    sessionId: artifact.sessionId,
    scenarioId: artifact.scenarioId,
    humanPrompt: artifact.humanPrompt,
    repositoryState,
    agentInitialModel,
    evidenceConsumed: turns,
    interpretationChanges,
    interventions,
    finalModel,
    misinterpretationCategories: deduceCategories(interpretationChanges),
    successConditions,
  }
}

/**
 * Persist a FirstContactEvidence artifact to disk.
 *
 * Returns the path of the written file.
 */
export async function saveFirstContactEvidence(
  evidence: FirstContactEvidence,
  outputDir: string,
  filename?: string,
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true })
  const file =
    filename ?? `${new Date().toISOString().replace(/[:.]/g, "-")}-${evidence.sessionId}-evidence.json`
  const filePath = path.join(outputDir, file)
  await fs.writeFile(filePath, JSON.stringify(evidence, null, 2), "utf-8")
  return filePath
}
