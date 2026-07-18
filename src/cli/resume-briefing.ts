// ============================================================
// CLI: Resume Briefing Projection (EXP-CONT-001)
// ============================================================
// Deterministic "what happened / what was decided / what is next?"
// surface for `synth explain resume`. All values are projections of
// replayable evidence: events, state, decisions, and snapshots.
//
// Usage:
//   synth explain resume [--json]
// ============================================================

import fs from "fs/promises"
import path from "path"
import { bootstrap } from "../core/bootstrap.js"
import { rebuildState } from "../runtime/replay.js"
import { listDecisions } from "../mission-studio/decision-log.js"
import { createFileSystemSnapshotStore } from "../mission-studio/snapshot-store.js"
import { getRuntimeDataDir } from "../infra/paths.js"
import { ensureRuntimeDataDir } from "../infra/migrate-data-dir.js"
import type { SynthEvent, CanonicalState } from "../types/index.js"
import type { StoredSnapshot, WorldModelNode } from "../mission-studio/types.js"

export const RESUME_BRIEFING_VERSION = 1

export type TimelineEntry = {
  at: number
  type: string
  summary: string
  ids: string[]
}

export type DecisionEntry = {
  at: number
  type: string
  draftId: string
  reason?: string
  confidence?: number
}

export type NextActionEntry = {
  command: string
  reason: string
  priority: number
}

export type Warning = {
  kind: string
  description: string
}

export type ResumeContext = {
  repositoryKind: string
  phase: string
  eventCount: number
  stateHash?: string
  lastEventAt?: number
}

export type ResumeBriefing = {
  status: "ok"
  kind: "ResumeBriefing"
  version: number
  context: ResumeContext
  whatHappened: TimelineEntry[]
  whatWasDecided: DecisionEntry[]
  whatIsNext: NextActionEntry[]
  warnings: Warning[]
}

function printJson(obj: unknown) {
  console.log(JSON.stringify(obj, null, 2))
}

function fail(error: string): never {
  printJson({ status: "error", error })
  process.exit(1)
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function readJsonMaybe(target: string): Promise<Record<string, any> | undefined> {
  try {
    return JSON.parse(await fs.readFile(target, "utf-8"))
  } catch {
    return undefined
  }
}

async function readEventLog(logPath: string): Promise<SynthEvent[]> {
  try {
    const text = await fs.readFile(logPath, "utf-8")
    const events: SynthEvent[] = []
    for (const line of text.split("\n")) {
      if (!line.trim()) continue
      try {
        events.push(JSON.parse(line))
      } catch {
        // Skip malformed lines; warnings are emitted separately.
      }
    }
    return events
  } catch {
    return []
  }
}

async function loadSnapshots(snapshotsDir: string): Promise<StoredSnapshot[]> {
  if (!(await pathExists(snapshotsDir))) return []
  try {
    const store = createFileSystemSnapshotStore(snapshotsDir)
    return await store.list()
  } catch {
    return []
  }
}

async function listSnapshotSummaries(snapshotsDir: string): Promise<{ id: string; timestamp?: number }[]> {
  const stored = await loadSnapshots(snapshotsDir)
  return stored
    .map((s) => ({
      id: s.snapshot.id,
      timestamp: s.snapshot.timestamp,
    }))
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
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

function extractName(payload: any): string | undefined {
  if (!payload || typeof payload !== "object") return undefined
  if (payload.mission && typeof payload.mission === "object") {
    return payload.mission.name || payload.mission.id
  }
  if (payload.expedition && typeof payload.expedition === "object") {
    return payload.expedition.name || payload.expedition.id
  }
  if (payload.workItem && typeof payload.workItem === "object") {
    return payload.workItem.metadata?.name || payload.workItem.id
  }
  if (payload.objective && typeof payload.objective === "object") {
    return payload.objective.title || payload.objective.id
  }
  if (payload.plan && typeof payload.plan === "object") {
    return payload.plan.name || payload.plan.id
  }
  if (payload.project && typeof payload.project === "object") {
    return payload.project.name || payload.project.id
  }
  return payload.name || payload.title || payload.id
}

function extractIds(payload: any): string[] {
  if (!payload || typeof payload !== "object") return []
  const ids: string[] = []
  for (const key of ["missionId", "expeditionId", "workItemId", "objectiveId", "planId", "projectId", "id"]) {
    const value = payload[key]
    if (typeof value === "string") ids.push(value)
  }
  // Also look inside nested objects.
  for (const nested of ["mission", "expedition", "workItem", "objective", "plan", "project"]) {
    const value = payload[nested]
    if (value && typeof value === "object" && typeof value.id === "string") {
      if (!ids.includes(value.id)) ids.push(value.id)
    }
  }
  return ids
}

function summarizeEvent(event: SynthEvent): { summary: string; ids: string[] } | undefined {
  const payload = event.payload as any
  const name = extractName(payload)
  const ids = extractIds(payload)

  switch (event.type) {
    case "MISSION_CREATED":
      return { summary: name ? `Mission "${name}" created` : "Mission created", ids }
    case "MISSION_APPROVED":
      return { summary: name ? `Mission "${name}" approved` : "Mission approved", ids }
    case "MISSION_COMPLETED":
      return { summary: name ? `Mission "${name}" completed` : "Mission completed", ids }
    case "MISSION_ARCHIVED":
      return { summary: name ? `Mission "${name}" archived` : "Mission archived", ids }
    case "EXPEDITION_CREATED":
      return { summary: name ? `Expedition "${name}" created` : "Expedition created", ids }
    case "EXPEDITION_APPROVED":
      return { summary: name ? `Expedition "${name}" approved` : "Expedition approved", ids }
    case "EXPEDITION_STARTED":
      return { summary: name ? `Expedition "${name}" started` : "Expedition started", ids }
    case "EXPEDITION_COMPLETED":
      return { summary: name ? `Expedition "${name}" completed` : "Expedition completed", ids }
    case "OBJECTIVE_ADDED":
      return { summary: name ? `Objective "${name}" added` : "Objective added", ids }
    case "WORK_ITEM_CREATED":
      return { summary: name ? `Work item "${name}" created` : "Work item created", ids }
    case "WORK_ITEM_STARTED":
      return { summary: name ? `Work item "${name}" started` : "Work item started", ids }
    case "WORK_ITEM_COMPLETED":
      return { summary: name ? `Work item "${name}" completed` : "Work item completed", ids }
    case "WORK_ITEM_BLOCKED":
      return { summary: name ? `Work item "${name}" blocked` : "Work item blocked", ids }
    case "PLAN_CREATED":
      return { summary: name ? `Plan "${name}" created` : "Plan created", ids }
    case "PROJECT_CREATED":
      return { summary: name ? `Project "${name}" created` : "Project created", ids }
    case "DECISION_ACCEPTED":
      return { summary: "Decision accepted", ids }
    case "DECISION_REJECTED":
      return { summary: "Decision rejected", ids }
    case "DISCOVERY_RECORDED":
      return { summary: "Discovery recorded", ids }
    case "SYSTEM_GENESIS":
      return { summary: "System genesis", ids: [] }
    default:
      return undefined
  }
}

function buildTimeline(events: SynthEvent[], maxEntries = 20): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  for (const event of events) {
    const summary = summarizeEvent(event)
    if (!summary) continue
    entries.push({
      at: event.timestamp,
      type: event.type,
      summary: summary.summary,
      ids: summary.ids,
    })
  }
  // Deduplicate adjacent identical summaries (common during repeated genesis runs).
  const deduped: TimelineEntry[] = []
  for (const entry of entries) {
    const last = deduped[deduped.length - 1]
    if (last && last.type === entry.type && last.summary === entry.summary) continue
    deduped.push(entry)
  }
  return deduped.slice(-maxEntries)
}

async function buildDecisions(dataDir: string): Promise<{ entries: DecisionEntry[]; chainValid: boolean }> {
  const { records, chainValid } = await listDecisions(dataDir)
  const entries = records.map((d) => ({
    at: d.timestamp,
    type: d.type,
    draftId: d.draftId,
    reason: d.reason,
    confidence: d.confidence,
  }))
  return { entries, chainValid }
}

function derivePhase(state: CanonicalState): string {
  const missions = Object.values(state.missions || {})
  const expeditions = Object.values(state.expeditions || {})
  const workItems = Object.values(state.workItems || {})

  if (missions.length === 0) return "uninitialized"

  const hasBlockedWorkItem = workItems.some((w) => w.status === "blocked")
  if (hasBlockedWorkItem) return "blocked"

  const activeExecution = expeditions.some((e) => e.status === "executing") || workItems.some((w) => w.status === "active")
  if (activeExecution) return "executing"

  const activeMissions = missions.filter((m) => m.status === "active")
  if (activeMissions.length > 0) return "approved"

  const allTerminal = missions.every((m) => m.status === "completed" || m.status === "archived")
  if (allTerminal) return "complete"

  return "planning"
}

function deriveNextActions(state: CanonicalState): NextActionEntry[] {
  const actions: NextActionEntry[] = []
  const phase = derivePhase(state)
  const missions = Object.values(state.missions || {})
  const expeditions = Object.values(state.expeditions || {})
  const activeMissions = missions.filter((m) => m.status === "active")
  const draftMissions = missions.filter((m) => m.status === "draft")
  const activeExpeditions = expeditions.filter((e) => e.status === "approved" || e.status === "executing")
  const blockedWorkItems = Object.values(state.workItems || {}).filter((w) => w.status === "blocked")

  if (phase === "uninitialized") {
    actions.push({
      command: "synth init --name \"<project>\"",
      reason: "Initialize a SYNTH project",
      priority: 1,
    })
    return actions
  }

  if (blockedWorkItems.length > 0) {
    actions.push({
      command: "synth explain diagnostics",
      reason: "A work item is blocked; diagnose the blocker",
      priority: 1,
    })
  }

  if (phase === "planning") {
    if (draftMissions.length > 0) {
      actions.push({
        command: `synth mission approve --draft-id ${draftMissions[0].id}`,
        reason: "Approve the Mission draft once confidence is sufficient",
        priority: 1,
      })
    } else {
      actions.push({
        command: "synth mission create --subject \"<mission>\" --purpose \"<purpose>\"",
        reason: "Create the first Mission draft",
        priority: 1,
      })
    }
    return actions
  }

  if (phase === "approved") {
    const targetMission = activeMissions[0]
    if (targetMission && activeExpeditions.length === 0) {
      actions.push({
        command: `synth expedition create --mission ${targetMission.id} --subject \"<expedition>\" --goal \"<goal>\"`,
        reason: `Approved Mission "${targetMission.name}" has no active Expeditions`,
        priority: 1,
      })
    } else if (targetMission) {
      actions.push({
        command: `synth explain status`,
        reason: `Review active expeditions for Mission "${targetMission.name}"`,
        priority: 1,
      })
    }
    return actions
  }

  if (phase === "executing") {
    actions.push({
      command: "synth explain status",
      reason: "Inspect active execution and next pending step",
      priority: 1,
    })
    actions.push({
      command: "synth explain replay",
      reason: "Verify replay consistency of recent execution",
      priority: 2,
    })
    return actions
  }

  if (phase === "complete") {
    actions.push({
      command: "synth mission archive --id <mission-id>",
      reason: "Archive completed Missions",
      priority: 1,
    })
    return actions
  }

  return actions
}

function detectWarnings(
  events: SynthEvent[],
  state: CanonicalState | undefined,
  decisionChainValid: boolean,
  snapshots: { id: string; timestamp?: number }[],
  dataDir: string,
): Warning[] {
  const warnings: Warning[] = []

  if (!decisionChainValid) {
    warnings.push({
      kind: "decision-chain-broken",
      description: "The decision log chain is broken; recorded approvals may not be trustworthy.",
    })
  }

  if (!state) return warnings

  const activeMissions = Object.values(state.missions || {}).filter((m) => m.status === "active")
  if (activeMissions.length > 0 && snapshots.length === 0) {
    warnings.push({
      kind: "approved-mission-no-snapshot",
      description: `Active mission "${activeMissions[0].name}" has no certified snapshot artifact.`,
    })
  }

  const stateEventCount = state.lastEventOffset ?? 0
  if (events.length > stateEventCount) {
    warnings.push({
      kind: "state-lags-events",
      description: `Canonical state (${stateEventCount} events) lags the event log (${events.length} events).`,
    })
  }

  const completedExpeditions = Object.values(state.expeditions || {}).filter((e) => e.status === "completed")
  const acceptedDecisions = new Set(
    Object.values(state.decisions || {})
      .filter((d) => d.status === "accepted")
      .map((d) => d.id),
  )
  for (const expedition of completedExpeditions) {
    const hasAcceptance = expedition.decisions?.some((id) => acceptedDecisions.has(id))
    if (!hasAcceptance) {
      warnings.push({
        kind: "completed-expedition-no-acceptance",
        description: `Expedition "${expedition.name}" is completed but has no accepted decision record.`,
      })
    }
  }

  return warnings
}

function deriveRepositoryKind(state: CanonicalState): string {
  const missions = Object.values(state.missions || {})
  const expeditions = Object.values(state.expeditions || {})
  if (missions.length === 0 && expeditions.length === 0) return "Uninitialized SYNTH project"
  if (missions.length > 0 && expeditions.length === 0) return "SYNTH project with Mission, no Expeditions"
  return "SYNTH project with active Expedition work"
}

function mergeSnapshotState(
  state: CanonicalState | undefined,
  storedSnapshots: StoredSnapshot[],
): CanonicalState | undefined {
  if (!state && storedSnapshots.length === 0) return undefined

  const approvedMissions = getApprovedMissionsFromSnapshots(storedSnapshots)
  if (approvedMissions.length === 0) return state

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
      }
    }
  }

  return base
}

function buildSnapshotTimeline(storedSnapshots: StoredSnapshot[]): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  for (const s of storedSnapshots) {
    for (const mission of getApprovedMissionsFromSnapshots([s])) {
      entries.push({
        at: mission.approvedAt,
        type: "MISSION_APPROVED",
        summary: `Mission "${mission.name}" approved (snapshot)`,
        ids: [mission.id],
      })
    }
  }
  return entries.sort((a, b) => a.at - b.at)
}

/**
 * Build a Resume Briefing from the current working directory.
 * Every field is derived from replayable evidence (events, state, decisions,
 * snapshots). No mutable status file or hand-authored narrative is consulted.
 */
export async function buildResumeBriefing(
  cwd: string,
  overrides?: { logPath?: string; statePath?: string; snapshotsDir?: string },
): Promise<ResumeBriefing> {
  const runtimeDataDir = getRuntimeDataDir(cwd)
  const logPath = overrides?.logPath ?? path.join(runtimeDataDir, "event-log.jsonl")
  const statePath = overrides?.statePath ?? path.join(runtimeDataDir, "canonical-state.json")
  const snapshotsDir = overrides?.snapshotsDir ?? path.join(runtimeDataDir, "snapshots")
  const dataDir = path.dirname(logPath)

  const manifestPath = path.join(cwd, ".synth", "manifest.json")
  const manifestExists = await pathExists(manifestPath)

  const events = await readEventLog(logPath)
  const eventState = events.length > 0 ? rebuildState(events) : ((await readJsonMaybe(statePath)) as CanonicalState | undefined)
  const storedSnapshots = await loadSnapshots(snapshotsDir)
  const state = mergeSnapshotState(eventState, storedSnapshots)

  if (!state && !manifestExists) {
    return {
      status: "ok",
      kind: "ResumeBriefing",
      version: RESUME_BRIEFING_VERSION,
      context: {
        repositoryKind: "Uninitialized repository",
        phase: "uninitialized",
        eventCount: 0,
      },
      whatHappened: [],
      whatWasDecided: [],
      whatIsNext: [
        {
          command: "synth init --name \"<project>\"",
          reason: "Initialize this directory as a SYNTH project",
          priority: 1,
        },
      ],
      warnings: [],
    }
  }

  const { entries: decisionEntries, chainValid: decisionChainValid } = await buildDecisions(dataDir)
  const snapshotSummaries = await listSnapshotSummaries(snapshotsDir)

  // Manifest exists but no events/state yet: project is initialized and
  // waiting for its first Mission. Still read the decision log so that a
  // broken chain is surfaced even before the first Mission is created.
  if (!state) {
    const warnings = detectWarnings(events, undefined, decisionChainValid, snapshotSummaries, dataDir)
    return {
      status: "ok",
      kind: "ResumeBriefing",
      version: RESUME_BRIEFING_VERSION,
      context: {
        repositoryKind: "SYNTH project",
        phase: "planning",
        eventCount: 0,
      },
      whatHappened: [],
      whatWasDecided: decisionEntries,
      whatIsNext: [
        {
          command: "synth mission create --subject \"<mission>\" --purpose \"<purpose>\"",
          reason: "Create the first Mission draft",
          priority: 1,
        },
      ],
      warnings,
    }
  }

  const eventTimeline = buildTimeline(events)
  const snapshotTimeline = buildSnapshotTimeline(storedSnapshots)
  // Merge timelines, avoiding duplicate MISSION_APPROVED entries for the same mission.
  const approvedIdsFromEvents = new Set(eventTimeline.filter((e) => e.type === "MISSION_APPROVED").flatMap((e) => e.ids))
  const timeline = [...eventTimeline, ...snapshotTimeline.filter((e) => !approvedIdsFromEvents.has(e.ids[0]))].sort(
    (a, b) => a.at - b.at,
  )

  const nextActions = deriveNextActions(state)
  const warnings = detectWarnings(events, state, decisionChainValid, snapshotSummaries, dataDir)

  return {
    status: "ok",
    kind: "ResumeBriefing",
    version: RESUME_BRIEFING_VERSION,
    context: {
      repositoryKind: deriveRepositoryKind(state),
      phase: derivePhase(state),
      eventCount: events.length,
      stateHash: state.stateHash,
      lastEventAt: events.length > 0 ? events[events.length - 1].timestamp : undefined,
    },
    whatHappened: timeline,
    whatWasDecided: decisionEntries,
    whatIsNext: nextActions,
    warnings,
  }
}

/**
 * CLI handler for `synth explain resume`.
 */
export async function cmdExplainResume(flags: Record<string, string | boolean>): Promise<void> {
  const logFlag = flags.log
  if (logFlag !== undefined && typeof logFlag !== "string") {
    fail("--log requires a path")
  }

  const cwd = process.cwd()
  await ensureRuntimeDataDir(cwd)
  const overrides = logFlag
    ? {
        logPath: path.resolve(cwd, logFlag),
        statePath: path.join(path.dirname(path.resolve(cwd, logFlag)), "canonical-state.json"),
        snapshotsDir: path.join(path.dirname(path.resolve(cwd, logFlag)), "snapshots"),
      }
    : undefined

  const briefing = await buildResumeBriefing(cwd, overrides)
  printJson(briefing)
}
