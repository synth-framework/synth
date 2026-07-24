// ============================================================
// CLI: AI Metadata
// ============================================================
// Generates .synth/ai/ metadata files that let any AI agent
// discover SYNTH capabilities, lifecycle phase, supported
// protocols, and interaction constraints without repository-
// specific instructions.
//
// These files are generated artifacts, not source-of-truth.
// They are derived from canonical SYNTH state and the manifest.
// ============================================================

import fs from "fs/promises"
import path from "path"
import * as sdk from "../sdk/index.js"
import type { CanonicalState } from "../types/index.js"
import { writeAiInteractionManifest } from "./ai-interaction-manifest.js"

export const AI_METADATA_DIR = "ai"

export type RepositoryType = "greenfield" | "brownfield" | "hybrid" | "unknown"
export type MutationPolicy = "READ_ONLY" | "PROPOSAL_ONLY" | "MUTATING"
export type LifecyclePhase =
  | "uninitialized"
  | "initialized"
  | "planning"
  | "approved"
  | "executing"
  | "blocked"
  | "complete"

export type AiDiscoveryMetadata = {
  version: string
  supportedInputTypes: string[]
  supportedOutputArtifacts: string[]
  discoveryModes: Array<{
    name: string
    repositoryType: RepositoryType
    command: string
    description: string
  }>
}

export type AiCapabilityMetadata = {
  version: string
  capabilities: Array<{
    name: string
    description: string
    availability: "available" | "requires_mission" | "requires_expedition" | "unavailable"
  }>
}

export type AiLifecycleMetadata = {
  version: string
  repositoryType: RepositoryType
  currentPhase: LifecyclePhase
  governanceVersion: string
  mutationPolicy: MutationPolicy
  activeMissionId?: string
  activeExpeditionId?: string
  blockers: string[]
}

export type AiProtocolMetadata = {
  version: string
  protocols: Array<{
    name: string
    version: string
    url?: string
  }>
}

export type AiSkillRecommendation = {
  version: string
  skills: Array<{
    id: string
    name: string
    trigger: string
    description: string
  }>
}

export type AiMetadataBundle = {
  discovery: AiDiscoveryMetadata
  capabilities: AiCapabilityMetadata
  lifecycle: AiLifecycleMetadata
  protocols: AiProtocolMetadata
  skills: AiSkillRecommendation
}

export function deriveRepositoryType(state: CanonicalState): RepositoryType {
  // The canonical Project type does not persist sourceType. We infer repository
  // class from recorded discoveries and lifecycle state. A materialized project
  // with discoveries has almost certainly been through brownfield discovery.
  const hasDiscoveries = Object.keys(state.discoveries).length > 0
  if (hasDiscoveries) return "brownfield"
  if (state.lifecycle === "materialized") return "greenfield"
  return "unknown"
}

export function deriveLifecyclePhase(state: CanonicalState): LifecyclePhase {
  if (state.lifecycle === "uninitialized") return "uninitialized"
  const missions = Object.values(state.missions)
  const activeMission = missions.find((m) => m.status === "active")
  const executingExpedition = Object.values(state.expeditions).find((e) => e.status === "executing")
  if (executingExpedition) {
    const blockedWorkItem = Object.values(state.workItems).find((w) => w.status === "blocked")
    return blockedWorkItem ? "blocked" : "executing"
  }
  if (activeMission) return "approved"
  const draftMission = missions.find((m) => m.status === "draft")
  if (draftMission) return "planning"
  const allMissionsComplete = missions.length > 0 && missions.every((m) => m.status === "completed" || m.status === "archived")
  if (allMissionsComplete) return "complete"
  return state.lifecycle === "materialized" ? "complete" : "initialized"
}

export function deriveMutationPolicy(phase: LifecyclePhase): MutationPolicy {
  switch (phase) {
    case "uninitialized":
    case "initialized":
      return "MUTATING" // bootstrap and mission creation are allowed
    case "planning":
      return "PROPOSAL_ONLY"
    case "approved":
    case "executing":
      return "MUTATING" // expedition execution
    case "blocked":
      return "READ_ONLY" // agent should diagnose, not mutate
    case "complete":
      return "PROPOSAL_ONLY"
    default:
      return "READ_ONLY"
  }
}

export function deriveActiveMission(state: CanonicalState): { id: string; name: string } | undefined {
  const active = Object.values(state.missions).find((m) => m.status === "active")
  return active ? { id: active.id, name: active.name } : undefined
}

export function deriveActiveExpedition(state: CanonicalState): { id: string; name: string } | undefined {
  const active = Object.values(state.expeditions).find((e) => e.status === "executing")
  return active ? { id: active.id, name: active.name } : undefined
}

export function deriveBlockers(state: CanonicalState): string[] {
  const blockers: string[] = []
  const phase = deriveLifecyclePhase(state)
  if (phase === "blocked") {
    const blocked = Object.values(state.workItems).find((w) => w.status === "blocked")
    if (blocked) blockers.push(`Work item ${blocked.id} is blocked`)
  }
  if (phase === "planning") {
    const draft = Object.values(state.missions).find((m) => m.status === "draft")
    if (draft) blockers.push(`Mission ${draft.id} is awaiting approval`)
  }
  return blockers
}

export function deriveAiMetadata(
  state: CanonicalState,
  manifest: { name?: string; governanceVersion?: string },
): AiMetadataBundle {
  const repositoryType = deriveRepositoryType(state)
  const currentPhase = deriveLifecyclePhase(state)
  const mutationPolicy = deriveMutationPolicy(currentPhase)
  const activeMission = deriveActiveMission(state)
  const activeExpedition = deriveActiveExpedition(state)
  const governanceVersion = manifest.governanceVersion || "2.3.0"

  return {
    discovery: {
      version: "1.0.0",
      supportedInputTypes: ["natural_language", "repository", "document", "url", "diagram", "image"],
      supportedOutputArtifacts: [
        "DiscoveryArtifact",
        "IntentModel",
        "DomainModel",
        "MissionProposal",
        "UncertaintyReport",
      ],
      discoveryModes: [
        {
          name: "greenfield",
          repositoryType: "greenfield",
          command: "synth first-contact start --intent '<intent>'",
          description: "Start from raw intent and produce a Discovery artifact.",
        },
        {
          name: "brownfield",
          repositoryType: "brownfield",
          command: "synth discover [--export]",
          description: "Capture baseline from an existing repository.",
        },
        {
          name: "hybrid",
          repositoryType: "hybrid",
          command: "synth first-contact start --intent '<intent>' && synth discover [--export]",
          description: "Combine intent and repository baseline.",
        },
      ],
    },
    capabilities: {
      version: "1.0.0",
      capabilities: [
        { name: "Mission", description: "Create and approve Missions", availability: "available" },
        { name: "Expedition", description: "Create and execute Expeditions", availability: activeMission ? "available" : "requires_mission" },
        { name: "Discovery", description: "Run Discovery workflows", availability: "available" },
        { name: "Governance", description: "Validate governance state", availability: "available" },
        { name: "Replay", description: "Inspect replayed state", availability: "available" },
        { name: "Knowledge", description: "Access canonical knowledge graph", availability: "available" },
        { name: "Execution", description: "Perform execution mutations", availability: activeExpedition ? "available" : "requires_expedition" },
      ],
    },
    lifecycle: {
      version: "1.0.0",
      repositoryType,
      currentPhase,
      governanceVersion,
      mutationPolicy,
      activeMissionId: activeMission?.id,
      activeExpeditionId: activeExpedition?.id,
      blockers: deriveBlockers(state),
    },
    protocols: {
      version: "1.0.0",
      protocols: [
        { name: "genesis", version: "1.0.0", url: "docs/reference/genesis-protocol.md" },
      ],
    },
    skills: {
      version: "1.0.0",
      skills: [
        { id: "genesis", name: "Genesis Skill", trigger: "User expresses raw product intent", description: "Begin a structured Discovery process." },
        { id: "brownfield-discovery", name: "Brownfield Discovery Skill", trigger: "Repository exists and is SYNTH-governed", description: "Capture baseline before proposing transformation." },
        { id: "mission-authoring", name: "Mission Authoring Skill", trigger: "Discovery artifact is approved", description: "Refine and approve a Mission draft." },
        { id: "expedition-planning", name: "Expedition Planning Skill", trigger: "Mission is active", description: "Propose Expeditions for the active Mission." },
        { id: "governance-verification", name: "Governance Verification Skill", trigger: "Before any state mutation", description: "Verify the action complies with governance." },
        { id: "replay-inspection", name: "Replay Inspection Skill", trigger: "Need to understand previous decisions", description: "Inspect replay output for context." },
      ],
    },
  }
}

export async function writeAiMetadata(
  synthDir: string,
  state: CanonicalState,
  manifest: { name?: string; governanceVersion?: string },
): Promise<void> {
  const aiDir = path.join(synthDir, AI_METADATA_DIR)
  await fs.mkdir(aiDir, { recursive: true })

  const bundle = deriveAiMetadata(state, manifest)

  await fs.writeFile(path.join(aiDir, "discovery.json"), JSON.stringify(bundle.discovery, null, 2), "utf-8")
  await fs.writeFile(path.join(aiDir, "capabilities.json"), JSON.stringify(bundle.capabilities, null, 2), "utf-8")
  await fs.writeFile(path.join(aiDir, "lifecycle.json"), JSON.stringify(bundle.lifecycle, null, 2), "utf-8")
  await fs.writeFile(path.join(aiDir, "protocols.json"), JSON.stringify(bundle.protocols, null, 2), "utf-8")
  await fs.writeFile(path.join(aiDir, "skills.json"), JSON.stringify(bundle.skills, null, 2), "utf-8")

  // EXP-AI-004: interaction manifest is derived from the same canonical state.
  await writeAiInteractionManifest(synthDir, state, manifest)
}

export async function refreshAiMetadata(synthDir: string): Promise<void> {
  const root = path.dirname(synthDir)

  let state: CanonicalState | null
  try {
    state = await sdk.state.readState(root)
  } catch {
    // If state is unavailable or malformed, skip refresh.
    return
  }
  if (!state) {
    return
  }

  const manifest = await sdk.manifest.readManifestMaybe<{ name?: string; governanceVersion?: string }>(root) ?? {}

  await writeAiMetadata(synthDir, state, manifest)
}
