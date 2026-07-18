// ============================================================
// RUNTIME: Governance Resolver
// ============================================================
// Single authoritative interpreter of durable governance artifacts.
// This is the only runtime component that may read:
//   - event-log.jsonl
//   - canonical-state.json
//   - decisions.jsonl
//   - certified snapshots
//   - .synth/manifest.json
//
// All operator commands consume ResolvedGovernanceContext (or
// GovernanceResolutionFailure). No downstream component may mutate the
// resolved context; state changes happen only through events,
// persistence, and a fresh resolution pass.
// ============================================================

import type { SynthEvent, CanonicalState, Mission } from "../types/index.js"
import { rebuildState, createEmptyState } from "./replay.js"
import {
  getRuntimeDataDir,
  getRuntimeSnapshotDir,
  hasManifest,
} from "../infra/paths.js"
import { listDecisions } from "../mission-studio/decision-log.js"
import { createFileSystemSnapshotStore } from "../mission-studio/snapshot-store.js"
import type { StoredSnapshot, WorldModelNode } from "../mission-studio/types.js"
import { validateConsistency } from "./state-consistency-validator.js"
import type {
  DraftSummary,
  GovernancePhase,
  GovernanceResolutionFailure,
  GovernanceResolutionResult,
  ResolvedGovernanceContext,
  StateDivergence,
} from "./governance-types.js"
import { buildCanonicalState } from "./canonical-state-builder.js"
import type { NormalizationNotice } from "./historical-normalizer.js"
import type { ReferenceResolutionNotice } from "./reference-resolver.js"
import type { FilesystemProvider } from "../environment/filesystem-capability.js"
import { createPosixFilesystemProvider } from "../environment/filesystem-capability.js"
import { loadHistoricalAliasRegistry, type HistoricalAliasRegistry } from "./historical-aliases.js"

export type ResolveGovernanceContextOptions = {
  dataDir?: string
}

async function readJsonMaybe<T>(fs: FilesystemProvider, filePath: string): Promise<T | undefined> {
  try {
    const text = await fs.readFile(filePath)
    if (text === undefined) return undefined
    return JSON.parse(text) as T
  } catch {
    return undefined
  }
}

async function readEventLog(fs: FilesystemProvider, logPath: string): Promise<SynthEvent[]> {
  if (!(await fs.pathExists(logPath))) return []
  try {
    const text = await fs.readFile(logPath)
    if (text === undefined) return []
    const events: SynthEvent[] = []
    for (const line of text.split("\n")) {
      if (!line.trim()) continue
      try {
        events.push(JSON.parse(line))
      } catch {
        // Malformed lines are surfaced as replay/graph violations.
      }
    }
    return events
  } catch {
    return []
  }
}

async function loadDrafts(fs: FilesystemProvider): Promise<DraftSummary[]> {
  const draftsDir = "drafts"
  if (!(await fs.pathExists(draftsDir))) return []

  const entries = await fs.listDirectory(draftsDir)
  const drafts: DraftSummary[] = []

  for (const entry of entries) {
    if (!entry.endsWith(".json") || entry.endsWith(".integrity.json")) continue
    const draftPath = `${draftsDir}/${entry}`
    try {
      const text = await fs.readFile(draftPath)
      if (text === undefined) continue
      const content = JSON.parse(text)
      const confidence = content.confidence?.overall ?? 0
      const unknowns = Array.isArray(content.unknowns) ? content.unknowns : []
      drafts.push({
        id: content.id || entry.replace(/\.json$/, ""),
        confidence: typeof confidence === "number" ? confidence : 0,
        unknowns: unknowns.length,
        blockingUnknowns: unknowns.filter((u: any) => u.blocking).length,
        approvalState: content.approvalState || "draft",
        createdAt: content.createdAt || 0,
      })
    } catch {
      // Ignore unreadable draft artifacts.
    }
  }

  return drafts.sort((a, b) => b.createdAt - a.createdAt)
}

function getApprovedMissionsFromSnapshots(stored: StoredSnapshot[]): Array<{ id: string; name: string; approvedAt: number }> {
  const missions: Array<{ id: string; name: string; approvedAt: number }> = []
  for (const s of stored) {
    if (!s.snapshot.worldModel?.nodes) continue
    for (const node of s.snapshot.worldModel.nodes.values() as IterableIterator<WorldModelNode>) {
      if (node.kind === "mission") {
        missions.push({
          id: node.id,
          name: node.name,
          approvedAt: s.snapshot.timestamp,
        })
      }
    }
  }
  return missions
}

function mergeSnapshotState(
  state: CanonicalState | undefined,
  storedSnapshots: StoredSnapshot[],
): CanonicalState {
  if (!state && storedSnapshots.length === 0) {
    return createEmptyState()
  }

  const approvedMissions = getApprovedMissionsFromSnapshots(storedSnapshots)
  const base: CanonicalState = state ?? {
    version: 1,
    stateHash: "snapshot-derived",
    lifecycle: "uninitialized",
    workItems: {},
    plans: {},
    milestones: {},
    projects: {},
    missions: {},
    expeditions: {},
    objectives: {},
    discoveries: {},
    decisions: {},
    generatedWorkItems: {},
    executions: {},
    executionIntents: {},
    executionGraphs: {},
    lastEventOffset: 0,
  }

  for (const mission of approvedMissions) {
    if (base.missions[mission.id]) {
      base.missions[mission.id].status = "active"
    } else {
      base.missions[mission.id] = {
        id: mission.id,
        name: mission.name,
        purpose: "Approved from snapshot",
        status: "active",
        expeditions: [],
        metadata: { source: "ApprovedMissionModelSnapshot" },
        createdAt: mission.approvedAt,
        updatedAt: mission.approvedAt,
      } as Mission
    }
  }

  return base
}

function derivePhase(
  manifestExists: boolean,
  state: CanonicalState,
  latestDraft: DraftSummary | undefined,
): GovernancePhase {
  if (!manifestExists) return "uninitialized"

  const missions = Object.values(state.missions || {})
  const expeditions = Object.values(state.expeditions || {})
  const workItems = Object.values(state.workItems || {})

  const blockedWorkItem = workItems.some((w) => w.status === "blocked")
  if (blockedWorkItem) return "blocked"

  const activeExecution =
    expeditions.some((e) => e.status === "executing") || workItems.some((w) => w.status === "active")
  if (activeExecution) return "executing"

  const activeMissions = missions.filter((m) => m.status === "active")
  if (activeMissions.length > 0) return "approved"

  const allTerminal =
    missions.length > 0 && missions.every((m) => m.status === "completed" || m.status === "archived")
  if (allTerminal) return "complete"

  // EXP-GOV-008: distinguish a freshly initialized project from one that
  // has already entered mission planning.
  if (state.lifecycle === "initialized" && missions.length === 0 && !latestDraft) {
    return "initialized"
  }

  return "planning"
}

function toFailure(
  diagnostic: string,
  recovery: string,
  divergences: import("./governance-types.js").StateDivergence[],
): GovernanceResolutionFailure {
  const conflicts: GovernanceResolutionFailure["conflicts"] = divergences.map((d) => ({
    artifact: d.artifact || "unknown",
    issue: d.description,
  }))
  return {
    status: "error",
    kind: "GovernanceResolutionFailure",
    severity: "fatal",
    recoverable: true,
    diagnostic,
    recovery,
    conflicts,
  }
}

function deduplicateDivergences(divergences: StateDivergence[]): StateDivergence[] {
  const seen = new Set<string>()
  return divergences.filter((d) => {
    const key = `${d.kind}:${d.description}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizationToDivergence(notice: NormalizationNotice): StateDivergence {
  return {
    kind: notice.kind,
    severity: notice.severity,
    description: notice.message,
    artifact: notice.aggregateKind,
  }
}

function referenceToDivergence(notice: ReferenceResolutionNotice): StateDivergence {
  return {
    kind: notice.kind,
    severity: notice.severity,
    description: notice.message,
    artifact: notice.aggregateKind,
  }
}

/**
 * Resolve the governance context for a working directory.
 * This is the only supported entry point for reading governance artifacts.
 */
export async function resolveGovernanceContext(
  rootDir: string,
  options?: ResolveGovernanceContextOptions,
): Promise<GovernanceResolutionResult> {
  const manifestExists = hasManifest(rootDir)

  const dataDir = options?.dataDir ?? getRuntimeDataDir(rootDir)
  const rootFs = createPosixFilesystemProvider(rootDir)
  const dataFs = createPosixFilesystemProvider(dataDir)

  const events = await readEventLog(dataFs, "event-log.jsonl")
  const persistedState = (await readJsonMaybe<CanonicalState>(dataFs, "canonical-state.json")) ?? null
  const decisions = await listDecisions(dataDir, undefined, dataFs)
  const historicalAliases = await loadHistoricalAliasRegistry(dataFs)

  let snapshots: StoredSnapshot[] = []
  try {
    snapshots = await createFileSystemSnapshotStore(getRuntimeSnapshotDir(rootDir)).list()
  } catch {
    snapshots = []
  }

  // EXP-GOV-007: canonical state is derived through the resolver pipeline.
  // Historical duplicates, identity aliases, and recoverable references are
  // normalized deterministically before validation.
  const buildResult = buildCanonicalState(events, historicalAliases)

  if (!buildResult.success) {
    return toFailure(
      buildResult.diagnostic,
      "Inspect the unresolved references. If the ambiguity is historical, add an alias or accept the inferred mapping. If it is genuine, resolve the conflicting artifacts in the event log.",
      buildResult.report.unresolvedReferences.map((n) => ({
        kind: "unresolved-reference",
        severity: "error" as const,
        description: n.message,
        artifact: n.aggregateKind,
      })),
    )
  }

  const replayedStateBeforeSnapshots = buildResult.state

  // Validate against the normalized event-log replay before merging lower-authority
  // snapshots. Snapshots that add new approved missions are allowed;
  // snapshots that contradict the event log are surfaced as conflicts.
  const { divergences, graphViolations } = validateConsistency({
    events: buildResult.report.normalizedEvents,
    persistedState,
    replayedState: replayedStateBeforeSnapshots,
    decisions,
    snapshots,
    aliasRegistry: historicalAliases,
  })

  const replayedState = mergeSnapshotState(replayedStateBeforeSnapshots, snapshots)

  const allDivergences: StateDivergence[] = deduplicateDivergences([
    ...divergences,
    ...buildResult.report.normalizationNotices.map(normalizationToDivergence),
    ...buildResult.report.referenceNotices
      .filter((n) => n.kind !== "resolved")
      .map(referenceToDivergence),
  ])

  const errors = allDivergences.filter((d) => d.severity === "error")
  if (errors.length > 0) {
    return toFailure(
      "Governance artifacts are inconsistent with the authoritative event log.",
      "Inspect the reported conflicts. For replay mismatches, regenerate canonical-state.json from the event log. For missing events, restore the event log or truncate state to the available offset.",
      errors,
    )
  }

  const drafts = await loadDrafts(dataFs)
  const latestDraft = drafts[0]

  const phase = derivePhase(manifestExists, replayedState, latestDraft)
  const activeMission =
    Object.values(replayedState.missions || {}).find((m) => m.status === "active") ?? null
  const activeExpedition =
    Object.values(replayedState.expeditions || {}).find(
      (e) => e.status === "approved" || e.status === "executing",
    ) ?? null

  const context: ResolvedGovernanceContext = {
    schemaVersion: 1,
    authoritative: {
      manifestExists,
      events,
      persistedState: persistedState ?? null,
      replayedState,
      decisions,
      snapshots,
    },
    derived: {
      phase,
      activeMission,
      activeExpedition,
      latestDraft,
      divergences: allDivergences,
      graphViolations,
    },
  }

  return context
}

export function isGovernanceResolutionFailure(
  result: GovernanceResolutionResult,
): result is GovernanceResolutionFailure {
  return "kind" in result && result.kind === "GovernanceResolutionFailure"
}
