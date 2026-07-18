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

import fs from "fs/promises"
import path from "path"
import type { SynthEvent, CanonicalState, Mission } from "../types/index.js"
import { rebuildState, createEmptyState } from "./replay.js"
import { getRuntimeDataDir } from "../infra/paths.js"
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
} from "./governance-types.js"

const MANIFEST_FILE = ".synth/manifest.json"

export type ResolveGovernanceContextOptions = {
  dataDir?: string
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function readJsonMaybe<T>(target: string): Promise<T | undefined> {
  try {
    return JSON.parse(await fs.readFile(target, "utf-8")) as T
  } catch {
    return undefined
  }
}

async function readEventLog(logPath: string): Promise<SynthEvent[]> {
  if (!(await pathExists(logPath))) return []
  try {
    const text = await fs.readFile(logPath, "utf-8")
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

async function loadDrafts(dataDir: string): Promise<DraftSummary[]> {
  const draftsDir = path.join(dataDir, "drafts")
  if (!(await pathExists(draftsDir))) return []

  const entries = await fs.readdir(draftsDir)
  const drafts: DraftSummary[] = []

  for (const entry of entries) {
    if (!entry.endsWith(".json") || entry.endsWith(".integrity.json")) continue
    const draftPath = path.join(draftsDir, entry)
    try {
      const content = JSON.parse(await fs.readFile(draftPath, "utf-8"))
      const confidence = content.confidence?.overall ?? 0
      const unknowns = Array.isArray(content.unknowns) ? content.unknowns : []
      drafts.push({
        id: content.id || path.basename(entry, ".json"),
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

/**
 * Resolve the governance context for a working directory.
 * This is the only supported entry point for reading governance artifacts.
 */
export async function resolveGovernanceContext(
  rootDir: string,
  options?: ResolveGovernanceContextOptions,
): Promise<GovernanceResolutionResult> {
  const manifestPath = path.join(rootDir, MANIFEST_FILE)
  const manifestExists = await pathExists(manifestPath)

  const dataDir = options?.dataDir ?? getRuntimeDataDir(rootDir)
  const logPath = path.join(dataDir, "event-log.jsonl")
  const statePath = path.join(dataDir, "canonical-state.json")
  const snapshotsDir = path.join(dataDir, "snapshots")

  const events = await readEventLog(logPath)
  const persistedState = (await readJsonMaybe<CanonicalState>(statePath)) ?? null
  const decisions = await listDecisions(dataDir)

  let snapshots: StoredSnapshot[] = []
  try {
    snapshots = await createFileSystemSnapshotStore(snapshotsDir).list()
  } catch {
    snapshots = []
  }

  const eventReplayedState = events.length > 0 ? rebuildState(events) : createEmptyState()

  // Validate against the event-log replay before merging lower-authority
  // snapshots. Snapshots that add new approved missions are allowed;
  // snapshots that contradict the event log are surfaced as conflicts.
  const { divergences, graphViolations } = validateConsistency({
    events,
    persistedState,
    replayedState: eventReplayedState,
    decisions,
    snapshots,
  })

  const replayedState = mergeSnapshotState(eventReplayedState, snapshots)

  const errors = divergences.filter((d) => d.severity === "error")
  if (errors.length > 0) {
    return toFailure(
      "Governance artifacts are inconsistent with the authoritative event log.",
      "Inspect the reported conflicts. For replay mismatches, regenerate canonical-state.json from the event log. For missing events, restore the event log or truncate state to the available offset.",
      errors,
    )
  }

  const drafts = await loadDrafts(dataDir)
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
      divergences,
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
