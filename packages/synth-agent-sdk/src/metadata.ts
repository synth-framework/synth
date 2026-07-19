// ============================================================
// SYNTH Agent SDK — Metadata Consumer
// ============================================================
// Reads the .synth/ai/ metadata files produced by SYNTH and
// converts them into a normalized agent context.
// ============================================================

import fs from "fs/promises"
import path from "path"

export type AiDiscoveryMetadata = {
  version: string
  supportedInputTypes: string[]
  supportedOutputArtifacts: string[]
  discoveryModes: Array<{
    name: string
    repositoryType: string
    command: string
    description: string
  }>
}

export type AiCapabilityMetadata = {
  version: string
  capabilities: Array<{
    name: string
    description: string
    availability: string
  }>
}

export type AiLifecycleMetadata = {
  version: string
  repositoryType: string
  currentPhase: string
  governanceVersion: string
  mutationPolicy: string
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

export type AiInteractionManifest = {
  schema: string
  version: string
  generatedAt: string
  repositoryPurpose: string
  repositoryType: string
  lifecyclePhase: string
  mutationPolicy: string
  expectedWorkflows: Array<{
    name: string
    trigger: string
    command: string
    requiresApproval: boolean
  }>
  prohibitedActions: Array<{
    action: string
    reason: string
  }>
  approvalRequirements: Array<{
    action: string
    evidence: string[]
    escalationMessage: string
  }>
  preferredInteractionPattern: string
  evidenceExpectations: string[]
  escalationRules: Array<{
    condition: string
    action: string
  }>
  ownershipBoundaries: Array<{
    domain: string
    scope: string
  }>
}

export type RepositoryContext = {
  isSynthGoverned: boolean
  governanceVersion: string
  repositoryType: string
  lifecyclePhase: string
  mutationPolicy: string
  activeMissionId?: string
  activeExpeditionId?: string
  blockers: string[]
  purpose: string
  capabilities: string[]
  skills: string[]
  prohibitedActions: string[]
  nextCommand?: string
}

export async function readAiMetadata(aiDir: string): Promise<{
  discovery?: AiDiscoveryMetadata
  capabilities?: AiCapabilityMetadata
  lifecycle?: AiLifecycleMetadata
  protocols?: AiProtocolMetadata
  skills?: AiSkillRecommendation
  interactionManifest?: AiInteractionManifest
}> {
  const readJson = async (filename: string) => {
    try {
      const content = await fs.readFile(path.join(aiDir, filename), "utf-8")
      return JSON.parse(content)
    } catch {
      return undefined
    }
  }

  return {
    discovery: await readJson("discovery.json"),
    capabilities: await readJson("capabilities.json"),
    lifecycle: await readJson("lifecycle.json"),
    protocols: await readJson("protocols.json"),
    skills: await readJson("skills.json"),
    interactionManifest: await readJson("interaction-manifest.json"),
  }
}

export async function resolveRepositoryContext(repositoryRoot: string): Promise<RepositoryContext> {
  const aiDir = path.join(repositoryRoot, ".synth", "ai")
  const metadata = await readAiMetadata(aiDir)

  const lifecycle = metadata.lifecycle
  const manifest = metadata.interactionManifest

  return {
    isSynthGoverned: Boolean(lifecycle),
    governanceVersion: lifecycle?.governanceVersion || "unknown",
    repositoryType: lifecycle?.repositoryType || manifest?.repositoryType || "unknown",
    lifecyclePhase: lifecycle?.currentPhase || manifest?.lifecyclePhase || "uninitialized",
    mutationPolicy: lifecycle?.mutationPolicy || manifest?.mutationPolicy || "READ_ONLY",
    activeMissionId: lifecycle?.activeMissionId,
    activeExpeditionId: lifecycle?.activeExpeditionId,
    blockers: lifecycle?.blockers || [],
    purpose: manifest?.repositoryPurpose || "No purpose declared.",
    capabilities: metadata.capabilities?.capabilities.map((c) => c.name) || [],
    skills: metadata.skills?.skills.map((s) => s.id) || [],
    prohibitedActions: manifest?.prohibitedActions.map((a) => a.action) || [],
    nextCommand: manifest?.expectedWorkflows[0]?.command,
  }
}
