// ============================================================
// CLI: Agent Guide (EXP-AGENT-GUIDE-001)
// =========================================================
// Produces a comprehensive, machine-readable SYNTH overview and
// interoperability guide for AI agents. The output is designed to
// be consumed by another agent as context, reducing onboarding
// friction and operational mistakes.
//
// Usage:
//   synth explain agents [--state] [--markdown]
// ============================================================

import * as sdk from "../sdk/index.js"
import { root } from "../sdk/workspace/index.js"
import { ensureDataDir } from "../sdk/paths/index.js"
import { printJson } from "./print.js"
import { bootstrap } from "../core/bootstrap.js"

interface AgentGuideSection {
  title: string
  content: string
}

interface AgentCommand {
  command: string
  purpose: string
  whenToUse: string
}

interface AgentLifecycleStep {
  phase: string
  command: string
  actor: "agent" | "operator" | "both"
  note?: string
}

interface AgentGuide {
  status: string
  kind: string
  schema: string
  generatedAt: string
  projectName: string
  overview: string
  corePrinciple: string
  publicVocabulary: Record<string, string>
  agentContract: {
    identity: string
    responsibilities: string[]
    hardConstraints: string[]
    preFlightCheckpoint: string[]
  }
  lifecycle: {
    mission: AgentLifecycleStep[]
    expedition: AgentLifecycleStep[]
  }
  commandReference: AgentCommand[]
  currentState?: {
    missions: Array<{ id: string; name: string; status: string }>
    expeditions: Array<{ id: string; name: string; status: string; missionId: string }>
  }
  furtherReading: AgentGuideSection[]
}

const PUBLIC_VOCABULARY: Record<string, string> = {
  Mission: "A human-approved objective that describes what the project wants to achieve.",
  Expedition: "A bounded, provable unit of work that contributes to a Mission.",
  Evidence: "Artifacts and notes that prove an expedition's output matches its intent.",
  Plan: "The approved path for achieving expedition objectives.",
  Event: "An immutable fact recorded in the canonical event log.",
  State: "The derived, replayable view of the project produced from events.",
  Replay: "The process of reconstructing state from the event log to prove consistency.",
}

const AGENT_RESPONSIBILITIES = [
  "Capture human intent as a Mission.",
  "Break the Mission into Expeditions.",
  "Record every action as an Event.",
  "Let Replay prove the state is correct.",
  "Validate source-code changes with targeted tests.",
  "Ensure the operator runs the full governance pipeline before merge (ADR-043).",
]

const HARD_CONSTRAINTS = [
  "Never bypass Mission Studio. Mission approval is explicit.",
  "Never bypass Genesis. Execution state mutates only through the ExecutionGate.",
  "Never modify replay history. Events are immutable.",
  "Never violate Protected Assets: Mission Studio, Genesis, Replay, ExecutionGate, the Event Model, the Capability Model, and the Constitutional Baseline are frozen.",
  "Never write to data/ or runtime state without an executing expedition and operator approval.",
  "Never call SDK domain functions directly for state mutations. All state mutations go through synth <subcommand> CLI commands.",
  "Never commit without the operator running npm run govern (ADR-043).",
  "Do not run the full governance pipeline locally; run only targeted validations needed to confirm source-code changes.",
]

const PRE_FLIGHT_CHECKPOINT = [
  "synth status — confirm status is ok.",
  "synth explain replay — confirm consistent is true.",
  "synth checkpoint — confirm an expedition is at executing status.",
  "Confirm intended file changes are within the scope of that executing expedition.",
  "Only then write code or state.",
]

const MISSION_LIFECYCLE: AgentLifecycleStep[] = [
  { phase: "Draft", command: "synth mission create --subject '...' --purpose '...'", actor: "agent", note: "Returns a draftId, confidence, unknowns, questions, and proposals." },
  { phase: "Approve", command: "synth mission approve --draft-id <id>", actor: "operator", note: "Human approval is required." },
]

const EXPEDITION_LIFECYCLE: AgentLifecycleStep[] = [
  { phase: "Create", command: "synth expedition create --mission '...' --subject '...' --goal '...'", actor: "agent" },
  { phase: "Approve", command: "synth expedition approve --draft-id <id>", actor: "operator" },
  { phase: "Commit", command: "synth expedition commit --proposal-id <id>", actor: "agent" },
  { phase: "Start", command: "synth expedition start --id <id>", actor: "agent" },
  { phase: "Refine", command: "synth expedition refine --id <id> --note '...'", actor: "agent", note: "Record charter scope changes without changing status." },
  { phase: "Evidence", command: "synth expedition evidence --id <id> --git-diff --note '...'", actor: "agent" },
  { phase: "Certify", command: "synth expedition certify --id <id>", actor: "agent" },
  { phase: "Complete", command: "synth expedition complete --id <id>", actor: "agent" },
]

const COMMAND_REFERENCE: AgentCommand[] = [
  { command: "synth --help", purpose: "List commands and public vocabulary.", whenToUse: "Any time you need a command refresher." },
  { command: "synth status", purpose: "Project health and governance readiness.", whenToUse: "Pre-flight checkpoint." },
  { command: "synth explain replay", purpose: "Verify event log and state consistency.", whenToUse: "Pre-flight and post-change." },
  { command: "synth validate", purpose: "Adaptive validation plan for current changes.", whenToUse: "Local iteration after source changes." },
  { command: "synth validate --full", purpose: "Full governance pipeline preview.", whenToUse: "Before asking the operator to run npm run govern." },
  { command: "synth mission create --subject '...' --purpose '...'", purpose: "Create a Mission Draft.", whenToUse: "When the operator describes a new objective." },
  { command: "synth expedition create --mission '...' --subject '...' --goal '...'", purpose: "Create an Expedition proposal.", whenToUse: "After a Mission is approved." },
  { command: "synth expedition start --id <id>", purpose: "Begin executing a committed expedition.", whenToUse: "Before writing code for an expedition." },
  { command: "synth expedition complete --id <id>", purpose: "Complete an executing expedition.", whenToUse: "After evidence is attached and certification passes." },
  { command: "npm run govern", purpose: "Full governance pipeline.", whenToUse: "Before merge; operator runs this, not the agent." },
]

const FURTHER_READING: AgentGuideSection[] = [
  { title: "Agent Integration Guides", content: "docs/guides/agents/index.md" },
  { title: "Agent Handbook", content: "docs/guides/agents/handbook.md" },
  { title: "Agent Constitution", content: "docs/guides/agents/constitution.md" },
  { title: "Public Vocabulary", content: "docs/reference/public-vocabulary.md" },
  { title: "Getting Started", content: "docs/operator/01-getting-started.md" },
  { title: "Architecture Constitution", content: "docs/architecture/constitution.md" },
]

async function readProjectName(): Promise<string> {
  try {
    const manifestPath = sdk.paths.manifestPath(root())
    const manifest = (await sdk.json.readJson(manifestPath)) as Record<string, unknown>
    return typeof manifest.projectName === "string" ? manifest.projectName : "unknown"
  } catch {
    return "unknown"
  }
}

async function readCurrentState(): Promise<AgentGuide["currentState"] | undefined> {
  try {
    const cwd = root()
    await ensureDataDir(cwd)
    const ctx = await bootstrap({ infra: { persistence: "file" } })
    const state = await ctx.runtime.getState()

    const missions = Object.values(state.missions || {}).map((m: any) => ({
      id: m.id,
      name: m.name,
      status: m.status,
    }))

    const expeditions = Object.values(state.expeditions || {}).map((e: any) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      missionId: e.missionId,
    }))

    return { missions, expeditions }
  } catch {
    return undefined
  }
}

function renderMarkdown(guide: AgentGuide): string {
  const lines: string[] = []
  lines.push(`# SYNTH Agent Guide — ${guide.projectName}`)
  lines.push("")
  lines.push(guide.overview)
  lines.push("")
  lines.push(`> ${guide.corePrinciple}`)
  lines.push("")
  lines.push("## Public Vocabulary")
  lines.push("")
  for (const [term, definition] of Object.entries(guide.publicVocabulary)) {
    lines.push(`- **${term}**: ${definition}`)
  }
  lines.push("")
  lines.push("## Agent Contract")
  lines.push("")
  lines.push("### Responsibilities")
  for (const item of guide.agentContract.responsibilities) {
    lines.push(`- ${item}`)
  }
  lines.push("")
  lines.push("### Hard Constraints")
  for (const item of guide.agentContract.hardConstraints) {
    lines.push(`- ${item}`)
  }
  lines.push("")
  lines.push("### Pre-flight Checkpoint")
  for (const item of guide.agentContract.preFlightCheckpoint) {
    lines.push(`1. ${item}`)
  }
  lines.push("")
  lines.push("## Command Reference")
  lines.push("")
  for (const cmd of guide.commandReference) {
    lines.push(`### ${cmd.command}`)
    lines.push(`- Purpose: ${cmd.purpose}`)
    lines.push(`- When to use: ${cmd.whenToUse}`)
    lines.push("")
  }
  lines.push("## Further Reading")
  lines.push("")
  for (const section of guide.furtherReading) {
    lines.push(`- ${section.title}: ${section.content}`)
  }
  return lines.join("\n")
}

/**
 * CLI handler for `synth explain agents`.
 */
export async function cmdExplainAgents(flags: Record<string, string | boolean>): Promise<void> {
  const includeState = flags.state === true || flags.state === "true"
  const asMarkdown = flags.markdown === true || flags.markdown === "true"

  const projectName = await readProjectName()
  const currentState = includeState ? await readCurrentState() : undefined

  const guide: AgentGuide = {
    status: "ok",
    kind: "AgentGuide",
    schema: "synth-agent-guide-v1",
    generatedAt: new Date().toISOString(),
    projectName,
    overview:
      "SYNTH is a deterministic execution system for engineering work. Humans explore, SYNTH remembers, and AI agents execute deterministically. This guide is the single source of truth for how an AI agent should operate inside a SYNTH repository.",
    corePrinciple: "Humans explore. SYNTH remembers. AI executes deterministically.",
    publicVocabulary: PUBLIC_VOCABULARY,
    agentContract: {
      identity:
        "An agent operating in SYNTH has a name (actor identifier), a context (session state), capabilities (what it can do), and constraints (what it cannot do).",
      responsibilities: AGENT_RESPONSIBILITIES,
      hardConstraints: HARD_CONSTRAINTS,
      preFlightCheckpoint: PRE_FLIGHT_CHECKPOINT,
    },
    lifecycle: {
      mission: MISSION_LIFECYCLE,
      expedition: EXPEDITION_LIFECYCLE,
    },
    commandReference: COMMAND_REFERENCE,
    currentState,
    furtherReading: FURTHER_READING,
  }

  if (asMarkdown) {
    console.log(renderMarkdown(guide))
    return
  }

  printJson(guide)
}
