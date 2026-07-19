// ============================================================
// FIRST CONTACT: Mission Materialization Engine
// ============================================================
// Initializes repository, manifest, Mission, and Expedition proposals
// only after Discovery approval (EXP-AIFC-007).
// ============================================================

import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import type {
  MaterializationOptions,
  MaterializationResult,
  MissionProposal,
  ExpeditionProposal,
} from "./types.js"
import { hashArtifact } from "../artifact/canonical.js"

function nowTimestamp(): number {
  return Date.now()
}

function nowIso(): string {
  return new Date().toISOString()
}

function uuid(): string {
  return crypto.randomUUID()
}

function eventHash(event: Record<string, unknown>, previousHash: string): string {
  const canonical = JSON.stringify({ event, previousHash })
  return crypto.createHash("sha256").update(canonical).digest("hex")
}

function createEvent(
  type: string,
  payload: Record<string, unknown>,
  previousHash: string,
): Record<string, unknown> {
  const event = {
    id: uuid(),
    type,
    timestamp: nowTimestamp(),
    transactionId: uuid(),
    capability: "first-contact",
    actor: "operator",
    payload,
    previousHash,
  }
  return { ...event, eventHash: eventHash(event, previousHash) }
}

function buildMission(artifactId: string, architecture: { id: string; name: string }, intent: { description: string }): MissionProposal {
  return {
    id: `mission-${uuid()}`,
    subject: intent.description.slice(0, 80),
    purpose: `Establish deterministic governance baseline for ${architecture.name}.`,
    derivedFrom: {
      discoveryArtifactId: artifactId,
      selectedArchitectureId: architecture.id,
    },
  }
}

function buildExpeditions(mission: MissionProposal): ExpeditionProposal[] {
  return [
    {
      id: `expedition-${uuid()}`,
      missionId: mission.id,
      subject: "Greenfield Baseline Capture",
      goal: "Capture the approved intent, architecture, and initial constraints as governed state.",
    },
    {
      id: `expedition-${uuid()}`,
      missionId: mission.id,
      subject: "Architecture Validation",
      goal: "Validate the selected architecture assumptions and produce the first working increment.",
    },
  ]
}

/**
 * Materialize a SYNTH project from an approved Discovery Artifact.
 *
 * Throws if the capability verification report is not `passed` or if the
 * artifact is missing required fields.
 */
export async function materialize(options: MaterializationOptions): Promise<MaterializationResult> {
  const { projectRoot, projectName, approvedArtifact, selectedArchitecture, verificationReport } = options

  if (verificationReport.status !== "passed") {
    throw new Error(`Cannot materialize: capability verification is ${verificationReport.status}.`)
  }

  if (!approvedArtifact.intent.description || approvedArtifact.intent.goals.length === 0) {
    throw new Error("Cannot materialize: approved artifact is missing intent.")
  }

  const synthDir = path.join(projectRoot, ".synth")
  const dataDir = path.join(synthDir, "data")
  const firstContactDir = path.join(synthDir, "first-contact")
  const proposalsDir = path.join(synthDir, "proposals")

  await fs.mkdir(dataDir, { recursive: true })
  await fs.mkdir(firstContactDir, { recursive: true })
  await fs.mkdir(proposalsDir, { recursive: true })

  const artifactId = approvedArtifact.id ?? `artifact-${uuid()}`
  const enrichedArtifact = {
    ...approvedArtifact,
    id: artifactId,
    approvedAt: nowIso(),
    selectedArchitecture: {
      id: selectedArchitecture.id,
      name: selectedArchitecture.name,
    },
    capabilityVerification: {
      status: verificationReport.status,
      blockers: verificationReport.blockers,
      reportHash: verificationReport.reportHash,
    },
    artifactHash: "",
  }
  enrichedArtifact.artifactHash = hashArtifact(enrichedArtifact)

  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: "2.3.0",
    governanceVersion: "2.3.0",
    projectName: projectName ?? artifactId,
    root: projectRoot,
    generatedAt: nowIso(),
    bootstrapped: true,
    source: "first-contact",
    discoveryArtifactId: artifactId,
    commands: [
      { name: "version", description: "Print the installed Synth version" },
      { name: "init", description: "Initialize the current directory as a Synth project" },
      { name: "first-contact", description: "Greenfield onboarding workflow" },
      { name: "govern", description: "Run the full governance pipeline" },
      { name: "status", description: "Report the current project state" },
      { name: "mission", description: "Mission Studio operations" },
      { name: "expedition", description: "Planning operations" },
    ],
    layout: {
      data: ".synth/data/",
      proof: "proof/",
      firstContact: ".synth/first-contact/",
    },
    publicVocabulary: ["Mission", "Expedition", "Evidence", "Plan", "Event", "State", "Replay"],
  }

  const mission = buildMission(artifactId, selectedArchitecture, approvedArtifact.intent)
  const expeditions = buildExpeditions(mission)

  let previousHash = "genesis"
  const events: Record<string, unknown>[] = []

  events.push(
    createEvent(
      "FIRST_CONTACT_STARTED",
      { discoveryArtifactId: artifactId, intent: approvedArtifact.intent.description },
      previousHash,
    ),
  )
  previousHash = events[events.length - 1].eventHash as string

  events.push(
    createEvent(
      "DISCOVERY_APPROVED",
      { discoveryArtifactId: artifactId, artifactHash: enrichedArtifact.artifactHash },
      previousHash,
    ),
  )
  previousHash = events[events.length - 1].eventHash as string

  events.push(
    createEvent(
      "MISSION_MATERIALIZED",
      { missionId: mission.id, subject: mission.subject },
      previousHash,
    ),
  )
  previousHash = events[events.length - 1].eventHash as string

  events.push(
    createEvent(
      "EXPEDITIONS_PROPOSED",
      { missionId: mission.id, expeditionIds: expeditions.map((e) => e.id) },
      previousHash,
    ),
  )

  const state = {
    projectId: artifactId,
    missionId: mission.id,
    expeditionIds: expeditions.map((e) => e.id),
    discoveryArtifactHash: enrichedArtifact.artifactHash,
    lifecycle: "materialized",
  }

  const manifestPath = path.join(synthDir, "manifest.json")
  const eventLogPath = path.join(dataDir, "event-log.jsonl")
  const statePath = path.join(dataDir, "canonical-state.json")
  const artifactPath = path.join(firstContactDir, "discovery-artifact.json")
  const transcriptPath = path.join(firstContactDir, "transcript.jsonl")
  const missionProposalPath = path.join(proposalsDir, "mission-proposal.json")
  const expeditionProposalsPath = path.join(proposalsDir, "expedition-proposals.json")

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf-8")
  await fs.writeFile(
    eventLogPath,
    events.map((e) => JSON.stringify(e)).join("\n") + "\n",
    "utf-8",
  )
  await fs.writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf-8")
  await fs.writeFile(artifactPath, JSON.stringify(enrichedArtifact, null, 2) + "\n", "utf-8")
  await fs.writeFile(
    transcriptPath,
    approvedArtifact.transcript.map((t) => JSON.stringify(t)).join("\n") + "\n",
    "utf-8",
  )
  await fs.writeFile(missionProposalPath, JSON.stringify(mission, null, 2) + "\n", "utf-8")
  await fs.writeFile(
    expeditionProposalsPath,
    JSON.stringify(expeditions, null, 2) + "\n",
    "utf-8",
  )

  return {
    projectRoot,
    manifestPath,
    eventLogPath,
    statePath,
    artifactPath,
    transcriptPath,
    missionProposalPath,
    expeditionProposalsPath,
    mission,
    expeditions,
  }
}
