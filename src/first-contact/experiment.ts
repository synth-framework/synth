// ============================================================
// FIRST CONTACT: Experiment Runner
// ============================================================
// Executes the canonical first-contact scenarios and produces
// replayable session artifacts with CLI telemetry.
//
// The runner is the experimental sensor for EXP-FIRSTCONTACT-010.
// It does not require a live autonomous agent; it can replay a
// scripted trajectory so that the session artifact format and the
// CLI telemetry path can be validated before real agent sessions
// are conducted.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import crypto from "crypto"
import type { Scenario, Turn, AgentReasoningState } from "./scenarios.js"

export interface TurnResult {
  turn: number
  command: string[]
  intent?: string
  agentReasoningState?: AgentReasoningState
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  stateBefore: Record<string, unknown>
  stateAfter: Record<string, unknown>
  stateChange: Record<string, unknown>
  evidenceGenerated: unknown[]
}

export interface SessionArtifact {
  schemaVersion: "1.0.0"
  sessionId: string
  scenarioId: string
  humanPrompt: string
  description: string
  cliPath: string
  repositoryRoot: string
  startedAt: string
  completedAt?: string
  turns: TurnResult[]
}

export interface RunOptions {
  /** Path to the synth CLI executable. */
  cliPath: string
  /** Optional working directory; a temp directory is created if omitted. */
  repositoryRoot?: string
  /** Optional session identifier; a UUID is generated if omitted. */
  sessionId?: string
}

/** A single entry in the intent reconstruction log. */
export interface IntentReconstructionEntry {
  turn: number
  command: string
  intent?: string
  understoodAs: string
  confidence: number
  unknowns: string[]
  evidenceConsumed: string[]
  modelDelta?: { from: string; to: string }
}

/** A failure-taxonomy classification for a session. */
export interface FailureTaxonomyEntry {
  category: "intent-confusion" | "missing-context" | "governance-confusion" | "vocabulary-mismatch" | "none"
  severity: "low" | "medium" | "high"
  description: string
}

/** Derived report from a session artifact. */
export interface SessionReport {
  schemaVersion: "1.0.0"
  sessionId: string
  scenarioId: string
  intentReconstruction: IntentReconstructionEntry[]
  failureTaxonomy: FailureTaxonomyEntry[]
}

function nowIso(): string {
  return new Date().toISOString()
}

function runSynth(
  cliPath: string,
  cwd: string,
  args: string[],
  telemetry?: { agentSession?: string; agentReasoningState?: AgentReasoningState },
): { status: number; stdout: string; stderr: string } {
  const fullArgs = [...args]
  if (telemetry?.agentSession) {
    fullArgs.push("--agent-session", telemetry.agentSession)
  }
  if (telemetry?.agentReasoningState) {
    fullArgs.push("--agent-reasoning-state", JSON.stringify(telemetry.agentReasoningState))
  }

  const result = spawnSync("node", [cliPath, ...fullArgs], {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  })
  return {
    status: result.status ?? -1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  }
}

function safeJsonParse(raw: string): Record<string, unknown> {
  try {
    const trimmed = raw.trim()
    if (!trimmed) return {}
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    return { raw }
  }
}

function shallowDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, unknown> {
  const diff: Record<string, unknown> = {}
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const beforeJson = JSON.stringify(before[key])
    const afterJson = JSON.stringify(after[key])
    if (beforeJson !== afterJson) {
      diff[key] = after[key]
    }
  }
  return diff
}

async function writeRepositoryFiles(root: string, files: Record<string, string>): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = path.join(root, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content, "utf-8")
  }
}

async function readState(root: string, cliPath: string): Promise<Record<string, unknown>> {
  const result = runSynth(cliPath, root, ["status"])
  return safeJsonParse(result.stdout)
}

/**
 * Run a first-contact scenario and return a session artifact.
 *
 * The runner materializes the scenario repository, optionally initializes
 * SYNTH, executes each scripted turn through the CLI, and captures the
 * command output plus state change telemetry.
 */
export async function runScenario(
  scenario: Scenario,
  options: RunOptions,
): Promise<SessionArtifact> {
  const sessionId = options.sessionId || crypto.randomUUID()
  const repositoryRoot = options.repositoryRoot || (await fs.mkdtemp(path.join(os.tmpdir(), "synth-first-contact-")))
  const cliPath = path.resolve(options.cliPath)

  await fs.mkdir(repositoryRoot, { recursive: true })
  await writeRepositoryFiles(repositoryRoot, scenario.repositoryFiles)

  const artifact: SessionArtifact = {
    schemaVersion: "1.0.0",
    sessionId,
    scenarioId: scenario.id,
    humanPrompt: scenario.humanPrompt,
    description: scenario.description,
    cliPath,
    repositoryRoot,
    startedAt: nowIso(),
    turns: [],
  }

  if (scenario.initializeSynth) {
    const initResult = runSynth(cliPath, repositoryRoot, ["init", "--name", scenario.id])
    if (initResult.status !== 0) {
      throw new Error(`Scenario initialization failed: ${initResult.stderr}`)
    }
  }

  let stateBefore = await readState(repositoryRoot, cliPath)

  for (let i = 0; i < scenario.turns.length; i++) {
    const turn = scenario.turns[i]
    const telemetry = { agentSession: sessionId, agentReasoningState: turn.agentReasoningState }
    const result = runSynth(cliPath, repositoryRoot, turn.command, telemetry)
    const stateAfter = await readState(repositoryRoot, cliPath)

    const turnResult: TurnResult = {
      turn: i + 1,
      command: turn.command,
      intent: turn.intent,
      agentReasoningState: turn.agentReasoningState,
      inputs: {},
      outputs: safeJsonParse(result.stdout),
      stateBefore,
      stateAfter,
      stateChange: shallowDiff(stateBefore, stateAfter),
      evidenceGenerated: [],
    }

    artifact.turns.push(turnResult)
    stateBefore = stateAfter
  }

  artifact.completedAt = nowIso()
  return artifact
}

/**
 * Persist a session artifact to disk.
 *
 * Returns the path of the written file.
 */
export async function saveSessionArtifact(
  artifact: SessionArtifact,
  outputDir: string,
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true })
  const filename = `${nowIso().replace(/[:.]/g, "-")}-${artifact.sessionId}.json`
  return saveSessionArtifactAs(artifact, outputDir, filename)
}

/**
 * Persist a session artifact to disk with an explicit filename.
 *
 * Returns the path of the written file.
 */
export async function saveSessionArtifactAs(
  artifact: SessionArtifact,
  outputDir: string,
  filename: string,
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true })
  const filePath = path.join(outputDir, filename)
  await fs.writeFile(filePath, JSON.stringify(artifact, null, 2), "utf-8")
  return filePath
}

/**
 * Persist a session report to disk next to its artifact.
 *
 * Returns the path of the written file.
 */
export async function saveSessionReport(
  report: SessionReport,
  outputDir: string,
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true })
  const filename = `${nowIso().replace(/[:.]/g, "-")}-${report.sessionId}-report.json`
  return saveSessionReportAs(report, outputDir, filename)
}

/**
 * Persist a session report to disk with an explicit filename.
 *
 * Returns the path of the written file.
 */
export async function saveSessionReportAs(
  report: SessionReport,
  outputDir: string,
  filename: string,
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true })
  const filePath = path.join(outputDir, filename)
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf-8")
  return filePath
}

/**
 * Compute a simple Semantic Alignment Score from a completed session artifact.
 *
 * This is a placeholder rubric; real scoring will be derived from observed
 * agent trajectories in EXP-FIRSTCONTACT-011.
 */
export function computeSemanticAlignmentScore(artifact: SessionArtifact): {
  intentRecognition: number
  boundaryRecognition: number
  evidenceSeeking: number
  governanceCompliance: number
  recoveryAbility: number
  compressionEfficiency: number
  overall: number
} {
  const turns = artifact.turns
  const totalTurns = turns.length || 1

  // Intent recognition: did the agent's understoodAs become more specific?
  const intentRecognition = turns.length > 0 ? 0.5 : 0

  // Boundary recognition: did the agent use SYNTH commands rather than raw file edits?
  const synthCommands = turns.filter((t) =>
    ["status", "explain", "mission", "expedition", "docs", "validate", "verify"].includes(t.command[0] || ""),
  ).length
  const boundaryRecognition = synthCommands / totalTurns

  // Evidence seeking: did the agent inspect (status/explain) before acting?
  const inspectCommands = turns.filter((t) => ["status", "explain"].includes(t.command[0] || "")).length
  const evidenceSeeking = inspectCommands / totalTurns

  // Governance compliance: did the agent create missions/expeditions instead of editing files?
  const governanceCommands = turns.filter((t) => ["mission", "expedition"].includes(t.command[0] || "")).length
  const governanceCompliance = governanceCommands / totalTurns

  // Recovery ability: placeholder — measured by model deformation in scenario 4.
  const recoveryAbility = 0.5

  // Compression efficiency: fewer turns to reach stable model is better.
  const compressionEfficiency = Math.max(0, 1 - turns.length / 10)

  const overall =
    (intentRecognition +
      boundaryRecognition +
      evidenceSeeking +
      governanceCompliance +
      recoveryAbility +
      compressionEfficiency) /
    6

  return {
    intentRecognition,
    boundaryRecognition,
    evidenceSeeking,
    governanceCompliance,
    recoveryAbility,
    compressionEfficiency,
    overall,
  }
}

/**
 * Reconstruct the agent's intent model across the session.
 *
 * Produces a chronological log of how the agent's understanding changed
 * with each piece of evidence, including the model delta between turns.
 */
export function reconstructIntent(artifact: SessionArtifact): IntentReconstructionEntry[] {
  const entries: IntentReconstructionEntry[] = []
  let previousUnderstoodAs = "unknown repository"

  for (const turn of artifact.turns) {
    const reasoning = turn.agentReasoningState ?? { understoodAs: previousUnderstoodAs, confidence: 0, unknowns: [] }
    const understoodAs = reasoning.understoodAs || previousUnderstoodAs
    const evidenceConsumed = Object.keys(turn.outputs).filter(
      (key) => key !== "agentSession" && key !== "agentReasoningState",
    )

    const entry: IntentReconstructionEntry = {
      turn: turn.turn,
      command: turn.command.join(" "),
      intent: turn.intent,
      understoodAs,
      confidence: reasoning.confidence ?? 0,
      unknowns: reasoning.unknowns ?? [],
      evidenceConsumed,
    }

    if (understoodAs !== previousUnderstoodAs) {
      entry.modelDelta = { from: previousUnderstoodAs, to: understoodAs }
    }

    entries.push(entry)
    previousUnderstoodAs = understoodAs
  }

  return entries
}

/**
 * Classify a session against the first-contact failure taxonomy.
 *
 * Categories mirror the misinterpretation patterns observed in the
 * Windows agent experiment and the canonical scenarios:
 *   - intent-confusion: the agent models the project as the wrong kind of thing
 *   - missing-context: the request is underspecified and the agent lacks criteria
 *   - governance-confusion: the agent treats SYNTH/project boundaries incorrectly
 *   - vocabulary-mismatch: a feature request is treated as an immediate coding task
 */
export function classifySession(artifact: SessionArtifact, scenario?: Scenario): FailureTaxonomyEntry[] {
  const entries: FailureTaxonomyEntry[] = []
  const turns = artifact.turns
  const lastTurn = turns[turns.length - 1]
  const finalReasoning = lastTurn?.agentReasoningState
  const commands = turns.map((t) => t.command[0] || "")

  // Intent confusion: agent settles on "application" / "React Native" when the
  // repository is actually a specification or design repository.
  const applicationSignals = ["application", "react native", "frontend app", "mobile app"]
  const confusedTurn = turns.find((t) =>
    applicationSignals.some((signal) => (t.agentReasoningState?.understoodAs || "").toLowerCase().includes(signal)),
  )
  if (confusedTurn) {
    entries.push({
      category: "intent-confusion",
      severity: artifact.scenarioId === "recovering-from-wrong-model" ? "medium" : "high",
      description: `Turn ${confusedTurn.turn} models the project as an implementation (${confusedTurn.agentReasoningState?.understoodAs}).`,
    })
  }

  // Missing context: ambiguous request or persistent critical unknowns.
  const criticalUnknowns = ["target outcome", "user impact", "current limitations", "acceptance criteria"]
  const finalUnknowns = finalReasoning?.unknowns ?? []
  const missingCritical = criticalUnknowns.filter((u) => finalUnknowns.some((fu) => fu.toLowerCase().includes(u)))
  if (missingCritical.length > 0 || artifact.scenarioId === "ambiguous-request") {
    entries.push({
      category: "missing-context",
      severity: missingCritical.length > 2 ? "high" : "medium",
      description: `Session ends with unresolved context: ${missingCritical.join(", ") || "ambiguous human prompt"}.`,
    })
  }

  // Vocabulary mismatch: a feature request is not channeled through a Mission/Expedition.
  const isFeatureRequest =
    artifact.humanPrompt.toLowerCase().includes("add") ||
    artifact.humanPrompt.toLowerCase().includes("authentication") ||
    scenario?.id === "create-new-capability"
  const hasGovernedChange = commands.some((c) => c === "mission" || c === "expedition")
  if (isFeatureRequest && !hasGovernedChange) {
    entries.push({
      category: "vocabulary-mismatch",
      severity: "high",
      description: "Feature request was not translated into a governed Mission/Expedition.",
    })
  }

  // Governance confusion: the agent edits files or runs non-SYNTH commands before inspecting.
  const nonSynthCommands = turns.filter(
    (t) => !["status", "explain", "mission", "expedition", "docs", "init", "validate", "verify"].includes(t.command[0] || ""),
  )
  if (nonSynthCommands.length > 0) {
    entries.push({
      category: "governance-confusion",
      severity: "medium",
      description: `Turns ${nonSynthCommands.map((t) => t.turn).join(", ")} used commands outside the SYNTH governance surface.`,
    })
  }

  if (entries.length === 0) {
    entries.push({
      category: "none",
      severity: "low",
      description: "No first-contact failure patterns detected in the scripted trajectory.",
    })
  }

  return entries
}

/**
 * Build a derived session report from an artifact and its source scenario.
 */
export function buildSessionReport(artifact: SessionArtifact, scenario?: Scenario): SessionReport {
  return {
    schemaVersion: "1.0.0",
    sessionId: artifact.sessionId,
    scenarioId: artifact.scenarioId,
    intentReconstruction: reconstructIntent(artifact),
    failureTaxonomy: classifySession(artifact, scenario),
  }
}


