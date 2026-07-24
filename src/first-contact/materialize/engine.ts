// ============================================================
// FIRST CONTACT: Mission Materialization Engine
// ============================================================
// Initializes repository, manifest, Mission, and Expedition proposals
// only after Discovery approval (EXP-AIFC-007).
// ============================================================

import path from "path"
import crypto from "crypto"
import * as sdk from "../../sdk/index.js"
import type {
  MaterializationOptions,
  MaterializationResult,
  MissionProposal,
  ExpeditionProposal,
} from "./types.js"
import { hashArtifact } from "../artifact/canonical.js"
import { computeEventHash } from "../../core/hash.js"
import { createEmptyState, applyEvent, computeStateHash } from "../../runtime/replay.js"

function nowTimestamp(): number {
  return Date.now()
}

function nowIso(): string {
  return new Date().toISOString()
}

function uuid(): string {
  return crypto.randomUUID()
}

function createEvent(
  type: string,
  payload: Record<string, unknown>,
  previousHash: string,
): import("../../types/index.js").SynthEvent {
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
  return { ...event, eventHash: computeEventHash(event as Parameters<typeof computeEventHash>[0]) } as import("../../types/index.js").SynthEvent
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

  const root = projectRoot

  await sdk.files.ensureDirectory(sdk.paths.dataDir(root))
  await sdk.files.ensureDirectory(sdk.paths.firstContactDir(root))
  await sdk.files.ensureDirectory(sdk.paths.proposalsDir(root))

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
  const events: import("../../types/index.js").SynthEvent[] = []

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

  // Derive canonical state by replaying the first-contact events so the
  // persisted state is consistent with the runtime replay model.
  const state = events.reduce(applyEvent, createEmptyState())
  state.stateHash = computeStateHash(state)

  const manifestPath = sdk.paths.manifestPath(root)
  const eventLogPath = sdk.paths.eventLogFile(root)
  const statePath = sdk.paths.stateFile(root)
  const artifactPath = path.join(sdk.paths.firstContactDir(root), "discovery-artifact.json")
  const transcriptPath = path.join(sdk.paths.firstContactDir(root), "transcript.jsonl")
  const missionProposalPath = path.join(sdk.paths.proposalsDir(root), "mission-proposal.json")
  const expeditionProposalsPath = path.join(sdk.paths.proposalsDir(root), "expedition-proposals.json")

  await sdk.json.writeJsonNewline(manifestPath, manifest)
  await sdk.files.writeFile(
    eventLogPath,
    events.map((e) => JSON.stringify(e)).join("\n") + "\n",
  )
  await sdk.json.writeJsonNewline(statePath, state)
  await sdk.json.writeJsonNewline(artifactPath, enrichedArtifact)
  await sdk.files.writeFile(
    transcriptPath,
    approvedArtifact.transcript.map((t) => JSON.stringify(t)).join("\n") + "\n",
  )
  await sdk.json.writeJsonNewline(missionProposalPath, mission)
  await sdk.json.writeJsonNewline(expeditionProposalsPath, expeditions)

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
