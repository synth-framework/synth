import fs from "fs/promises"
import path from "path"
import type { Policy, PolicyEngine } from "../policy/policy-engine.js"
import type { CanonicalState, CapabilityInvocation, ConvergenceCertificationState, DerivedState } from "../types/index.js"

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
  const cachePath = path.join(charterDir, "..", "..", ".synth", "data", "dependency-records-cache.json")
  
  let cache: {
    mtimes: Record<string, number>
    records: Record<string, DependencyRecord>
  } = { mtimes: {}, records: {} }

  try {
    const cacheData = await fs.readFile(cachePath, "utf-8")
    cache = JSON.parse(cacheData)
  } catch {
    // Cache missing or invalid
  }

  let files: string[]
  try {
    files = await fs.readdir(charterDir)
  } catch {
    return []
  }

  const records: DependencyRecord[] = []
  const newMtimes: Record<string, number> = {}
  const newRecords: Record<string, DependencyRecord> = {}
  let cacheDirty = false

  const parsePromises = files.map(async (file) => {
    if (!file.endsWith(".md")) return null
    const filePath = path.join(charterDir, file)
    
    let mtime = 0
    try {
      const stat = await fs.stat(filePath)
      mtime = stat.mtimeMs
    } catch {
      // If stat fails, we can't cache
    }

    newMtimes[file] = mtime

    if (cache.mtimes && cache.mtimes[file] === mtime && cache.records && cache.records[file]) {
      newRecords[file] = cache.records[file]
      return cache.records[file]
    }

    cacheDirty = true
    const content = await fs.readFile(filePath, "utf-8")

    const subjectMatch = content.match(/^#\s+(.*)$/m)
    const expeditionId = subjectMatch
      ? subjectMatch[1].trim()
      : file.replace(/\.md$/, "")

    const record = parseDependencyRecord(expeditionId, content)
    newRecords[file] = record
    return record
  })

  const results = await Promise.all(parsePromises)
  for (const result of results) {
    if (result) records.push(result)
  }

  if (cacheDirty || Object.keys(cache.mtimes || {}).length !== Object.keys(newMtimes).length) {
    try {
      await fs.mkdir(path.dirname(cachePath), { recursive: true })
      await fs.writeFile(
        cachePath,
        JSON.stringify({ mtimes: newMtimes, records: newRecords }, null, 2),
        "utf-8"
      )
    } catch {
      // Ignore write errors to degrade gracefully
    }
  }

  return records
}

/** Certification result categories used for dependency propagation. */
export type GateStatus = "pass" | "partial_pass" | "fail"

export type DependencyCheckResult = {
  expeditionId: string
  status: DependencyStatus
  upstreamExpeditions: {
    id: string
    gateStatus: string | undefined
    resolved: boolean
  }[]
}

const LIFECYCLE_CAPABILITIES = new Set([
  "CreateExpedition",
  "ApproveExpedition",
  "CommitExpedition",
  "StartExpedition",
  "CompleteExpedition",
  "ArchiveExpedition",
  "CertifyConvergence",
])

/** Extract the expedition context from a capability invocation. */
function getExpeditionIdFromInvocation(intent: CapabilityInvocation): string | undefined {
  const payload = (intent.payload ?? {}) as Record<string, unknown>
  if (payload.expeditionId) return String(payload.expeditionId)
  if (LIFECYCLE_CAPABILITIES.has(intent.capability) && payload.id) return String(payload.id)
  return undefined
}

/** Map a convergence certification decision to a gate status. */
function getCertificationGateStatus(
  certifications: Record<string, ConvergenceCertificationState>,
  expeditionId: string,
): GateStatus | undefined {
  const certification = Object.values(certifications).find((c) => c.expeditionId === expeditionId)
  if (!certification) return undefined
  switch (certification.decision) {
    case "converged":
      return "pass"
    case "insufficient_evidence":
      return "partial_pass"
    case "diverged":
      return "fail"
    default:
      return undefined
  }
}

/** Convert a gate status into the dependency vocabulary. */
function gateStatusToDependencyStatus(gateStatus: GateStatus | undefined): DependencyStatus {
  switch (gateStatus) {
    case "pass":
      return "resolved"
    case "partial_pass":
      return "partial"
    case "fail":
      return "unresolved"
    default:
      return "unresolved"
  }
}

/** Check whether an expedition's upstream dependencies are resolved. */
export function checkUpstreamDependencies(
  expeditionId: string,
  state: CanonicalState,
  records?: DependencyRecord[],
  convergenceCertifications?: Record<string, ConvergenceCertificationState>,
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
    const lifecycleComplete = depStatus === "completed" || depStatus === "cancelled"

    let gateStatus: string | undefined = depStatus
    let resolved = lifecycleComplete

    if (lifecycleComplete && convergenceCertifications) {
      const certificationGate = getCertificationGateStatus(convergenceCertifications, depId)
      if (certificationGate === "pass") {
        resolved = true
        gateStatus = "pass"
      } else if (certificationGate === "partial_pass") {
        resolved = false
        gateStatus = "partial_pass"
      } else if (certificationGate === "fail") {
        resolved = false
        gateStatus = "fail"
      } else {
        // Completed without certification is treated as unresolved.
        resolved = false
        gateStatus = depStatus
      }
    }

    upstreamExpeditions.push({ id: depId, gateStatus, resolved })
  }

  const allResolved = upstreamExpeditions.every((u) => u.resolved)
  const anyPartial = upstreamExpeditions.some((u) => u.gateStatus === "partial_pass")
  const anyInProgress = upstreamExpeditions.some(
    (u) =>
      !u.resolved &&
      (u.gateStatus === "executing" || u.gateStatus === "approved" || u.gateStatus === "committed"),
  )

  let status: DependencyStatus
  if (upstreamExpeditions.length === 0) {
    status = "resolved"
  } else if (allResolved) {
    status = "resolved"
  } else if (anyPartial || anyInProgress) {
    status = "partial"
  } else {
    status = "unresolved"
  }

  return { expeditionId, status, upstreamExpeditions }
}

/** Capabilities that may carry an expedition context and should be gated. */
const GOVERNED_CAPABILITIES = [
  "CreateExpedition",
  "ApproveExpedition",
  "CommitExpedition",
  "StartExpedition",
  "CompleteExpedition",
  "ArchiveExpedition",
  "CertifyConvergence",
  "CreateExecutionIntent",
  "StartExecutionIntent",
  "CompleteExecutionIntent",
  "FailExecutionIntent",
  "OpenReviewGate",
  "ResolveReviewGate",
  "OpenAcceptanceGate",
  "ResolveAcceptanceGate",
  "RequestRevision",
  "FulfillCondition",
  "ApproveRefinedIntent",
]

/** Create a dependency enforcement policy for the policy engine */
function createDependencyEnforcementPolicy(
  dependencyRecords: DependencyRecord[],
): Policy {
  return {
    id: "dependency-enforcement",
    name: "Dependency Enforcement",
    scope: {
      capabilities: GOVERNED_CAPABILITIES,
    },
    condition: (intent: CapabilityInvocation, state: CanonicalState, derivedState?: DerivedState) => {
      const expeditionId = getExpeditionIdFromInvocation(intent)
      if (!expeditionId) return false

      const certifications = derivedState?.convergenceCertifications
      const result = checkUpstreamDependencies(expeditionId, state, dependencyRecords, certifications)
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

/** Error thrown when an expedition is blocked by an upstream gate. */
export class DependencyGateBlockedError extends Error {
  constructor(
    public readonly expeditionId: string,
    public readonly dependencyCheck: DependencyCheckResult,
  ) {
    super(
      `DEPENDENCY_GATE_BLOCKED: Expedition ${expeditionId} is blocked by an upstream gate: ${dependencyCheck.status}`
    )
    this.name = "DependencyGateBlockedError"
  }
}

/** Assert that a capability invocation is not blocked by upstream dependencies. */
export function assertDependencyGateAllowed(
  intent: CapabilityInvocation,
  state: CanonicalState,
  derivedState: DerivedState,
  dependencyRecords?: DependencyRecord[],
): void {
  const expeditionId = getExpeditionIdFromInvocation(intent)
  if (!expeditionId) return

  const result = checkUpstreamDependencies(
    expeditionId,
    state,
    dependencyRecords,
    derivedState.convergenceCertifications,
  )
  if (result.status !== "resolved") {
    throw new DependencyGateBlockedError(expeditionId, result)
  }
}

/** List downstream expeditions that would be blocked by an upstream gate status. */
function getBlockedDownstreamExpeditions(
  upstreamExpeditionId: string,
  state: CanonicalState,
  dependencyRecords: DependencyRecord[],
): string[] {
  return dependencyRecords
    .filter(
      (record) =>
        record.dependsOn.includes(upstreamExpeditionId) &&
        state.expeditions[record.expeditionId]?.status !== "completed" &&
        state.expeditions[record.expeditionId]?.status !== "cancelled",
    )
    .map((record) => record.expeditionId)
}

/** Build a status map for every expedition that declares dependencies. */
function buildDependencyStatusMap(
  state: CanonicalState,
  dependencyRecords: DependencyRecord[],
  convergenceCertifications?: Record<string, ConvergenceCertificationState>,
): Record<string, DependencyStatus> {
  const map: Record<string, DependencyStatus> = {}
  const ids = new Set([
    ...Object.keys(state.expeditions).filter((id) => state.expeditions[id].dependsOn?.length),
    ...dependencyRecords.map((r) => r.expeditionId),
  ])
  for (const id of ids) {
    map[id] = checkUpstreamDependencies(id, state, dependencyRecords, convergenceCertifications).status
  }
  return map
}
