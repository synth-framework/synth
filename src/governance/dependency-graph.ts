import fs from "fs/promises"
import path from "path"
import type { Policy, PolicyEngine } from "../policy/policy-engine.js"
import type { CanonicalState, CapabilityInvocation } from "../types/index.js"

export type DependencyStatus = "resolved" | "partial" | "unresolved"

export type DependencyRecord = {
  expeditionId: string
  dependsOn: string[]
  blocks: string[]
  upstreamGateStatus?: DependencyStatus
}

/** Parse `Depends On` / `Blocks` headers from expedition charter content */
export function parseDependencyRecord(expeditionId: string, charterContent: string): DependencyRecord {
  const dependsOn: string[] = []
  const blocks: string[] = []

  const dependsOnMatch = charterContent.match(/^\*\*Depends On:\*\*\s*(.+)$/m)
  if (dependsOnMatch) {
    const raw = dependsOnMatch[1]
    for (const id of raw.split(",")) {
      const trimmed = id.trim()
      if (trimmed) dependsOn.push(trimmed)
    }
  }

  const fallbackDependsOn = charterContent.match(/^Depends On:\s*(.+)$/m)
  if (fallbackDependsOn) {
    const raw = fallbackDependsOn[1]
    for (const id of raw.split(",")) {
      const trimmed = id.trim()
      if (trimmed && !dependsOn.includes(trimmed)) dependsOn.push(trimmed)
    }
  }

  const blocksMatch = charterContent.match(/^\*\*Blocks:\*\*\s*(.+)$/m)
  if (blocksMatch) {
    const raw = blocksMatch[1]
    for (const id of raw.split(",")) {
      const trimmed = id.trim()
      if (trimmed) blocks.push(trimmed)
    }
  }

  const fallbackBlocks = charterContent.match(/^Blocks:\s*(.+)$/m)
  if (fallbackBlocks) {
    const raw = fallbackBlocks[1]
    for (const id of raw.split(",")) {
      const trimmed = id.trim()
      if (trimmed && !blocks.includes(trimmed)) blocks.push(trimmed)
    }
  }

  return { expeditionId, dependsOn, blocks }
}

/** Parse all expedition charters from a directory into dependency records */
export async function parseCharterDirectory(charterDir: string): Promise<DependencyRecord[]> {
  const records: DependencyRecord[] = []

  let files: string[]
  try {
    files = await fs.readdir(charterDir)
  } catch {
    return []
  }

  for (const file of files) {
    if (!file.endsWith(".md")) continue
    const content = await fs.readFile(path.join(charterDir, file), "utf-8")

    const subjectMatch = content.match(/^#\s+(.*)$/m)
    const expeditionId = subjectMatch
      ? subjectMatch[1].trim()
      : file.replace(/\.md$/, "")

    records.push(parseDependencyRecord(expeditionId, content))
  }

  return records
}

export type DependencyCheckResult = {
  expeditionId: string
  status: DependencyStatus
  upstreamExpeditions: {
    id: string
    gateStatus: string | undefined
    resolved: boolean
  }[]
}

/** Check whether an expedition's upstream dependencies are resolved */
export function checkUpstreamDependencies(
  expeditionId: string,
  state: CanonicalState,
  records?: DependencyRecord[],
): DependencyCheckResult {
  const upstreamExpeditions: DependencyCheckResult["upstreamExpeditions"] = []

  let dependsOn: string[] = []

  const runtimeExpedition = state.expeditions?.[expeditionId]
  if (runtimeExpedition?.dependsOn?.length) {
    dependsOn = runtimeExpedition.dependsOn
  } else if (records) {
    const record = records.find((r) => r.expeditionId === expeditionId)
    if (record) dependsOn = record.dependsOn
  }

  for (const depId of dependsOn) {
    const depExpedition = state.expeditions?.[depId]
    const depStatus = depExpedition?.status
    const resolved = depStatus === "completed" || depStatus === "cancelled"
    upstreamExpeditions.push({ id: depId, gateStatus: depStatus, resolved })
  }

  const allResolved = upstreamExpeditions.every((u) => u.resolved)
  const anyInProgress = upstreamExpeditions.some(
    (u) => !u.resolved && (u.gateStatus === "executing" || u.gateStatus === "approved" || u.gateStatus === "committed"),
  )

  let status: DependencyStatus
  if (upstreamExpeditions.length === 0) {
    status = "resolved"
  } else if (allResolved) {
    status = "resolved"
  } else if (anyInProgress) {
    status = "partial"
  } else {
    status = "unresolved"
  }

  return { expeditionId, status, upstreamExpeditions }
}

/** Create a dependency enforcement policy for the policy engine */
export function createDependencyEnforcementPolicy(
  dependencyRecords: DependencyRecord[],
): Policy {
  return {
    id: "dependency-enforcement",
    name: "Dependency Enforcement",
    scope: {
      excludeActors: ["synth-cli"],
    },
    condition: (intent: CapabilityInvocation, state: CanonicalState) => {
      const expeditionId = String(intent.payload?.expeditionId || intent.payload?.id || "")
      if (!expeditionId) return false

      const result = checkUpstreamDependencies(expeditionId, state, dependencyRecords)
      return result.status !== "resolved"
    },
    effect: "DENY",
    severity: "high",
    enabled: true,
  }
}

/** Register the dependency enforcement policy before the policy engine is frozen */
export function registerDependencyPolicy(
  policyEngine: PolicyEngine,
  dependencyRecords: DependencyRecord[],
): void {
  if (policyEngine.isFrozen()) {
    throw new Error("INVARIANT_VIOLATION: policy engine is frozen — cannot register dependency policy")
  }
  const policy = createDependencyEnforcementPolicy(dependencyRecords)
  policyEngine.register(policy)
}

export type PropagationResult = {
  policyId: string
  effect: string
  blockedExpeditions: string[]
}
