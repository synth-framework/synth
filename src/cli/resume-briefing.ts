// ============================================================
// CLI: Resume Briefing Projection (EXP-CONT-001)
// ============================================================
// Deterministic "what happened / what was decided / what is next?"
// surface for `synth explain resume`. All values are projections of
// the runtime governance model produced by the Governance Resolver.
//
// Usage:
//   synth explain resume [--json]
// ============================================================

import fs from "fs/promises"
import path from "path"
import {
  resolveGovernanceContext,
  isGovernanceResolutionFailure,
} from "../runtime/governance-resolver.js"
import { deriveValidTransition } from "../runtime/transition-engine.js"
import { toResumeNextAction } from "../runtime/status-projection.js"
import { getRuntimeDataDir } from "../infra/paths.js"
import { ensureRuntimeDataDir } from "../infra/paths.js"
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

function deriveRepositoryKind(state: CanonicalState): string {
  const missions = Object.values(state.missions || {})
  const expeditions = Object.values(state.expeditions || {})
  if (missions.length === 0 && expeditions.length === 0) return "Uninitialized SYNTH project"
  if (missions.length > 0 && expeditions.length === 0) return "SYNTH project with Mission, no Expeditions"
  return "SYNTH project with active Expedition work"
}

function detectWarnings(ctx: import("../runtime/governance-types.js").ResolvedGovernanceContext): Warning[] {
  const warnings: Warning[] = []

  for (const divergence of ctx.derived.divergences) {
    if (divergence.severity !== "warning") continue
    warnings.push({
      kind: divergence.kind,
      description: divergence.description,
    })
  }

  const state = ctx.authoritative.replayedState
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

/**
 * Build a Resume Briefing from the current working directory.
 * Every field is derived from the ResolvedGovernanceContext produced by
 * the Governance Resolver. No mutable status file or hand-authored
 * narrative is consulted.
 */
export async function buildResumeBriefing(
  cwd: string,
  overrides?: { logPath?: string; statePath?: string; snapshotsDir?: string },
): Promise<ResumeBriefing> {
  const dataDir = overrides?.logPath
    ? path.dirname(path.resolve(cwd, overrides.logPath))
    : getRuntimeDataDir(cwd)

  const result = await resolveGovernanceContext(cwd, { dataDir })

  if (isGovernanceResolutionFailure(result)) {
    // Resume is a diagnostic command; even when resolution fails we
    // return a structured error shape so the operator can inspect it.
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
          command: "synth explain replay",
          reason: result.diagnostic,
          priority: 1,
        },
      ],
      warnings: [
        {
          kind: "governance-resolution-failed",
          description: `${result.diagnostic} Recovery: ${result.recovery}`,
        },
      ],
    }
  }

  const { authoritative, derived } = result
  const { events, replayedState, decisions, snapshots } = authoritative

  if (!derived.phase || derived.phase === "uninitialized") {
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

  const eventTimeline = buildTimeline(events)
  const snapshotTimeline = buildSnapshotTimeline(snapshots)
  const approvedIdsFromEvents = new Set(
    eventTimeline.filter((e) => e.type === "MISSION_APPROVED").flatMap((e) => e.ids),
  )
  const timeline = [...eventTimeline, ...snapshotTimeline.filter((e) => !approvedIdsFromEvents.has(e.ids[0]))].sort(
    (a, b) => a.at - b.at,
  )

  const decisionEntries = decisions.records.map((d) => ({
    at: d.timestamp,
    type: d.type,
    draftId: d.draftId,
    reason: d.reason,
    confidence: d.confidence,
  }))

  const transition = deriveValidTransition(result)
  const warnings = detectWarnings(result)

  return {
    status: "ok",
    kind: "ResumeBriefing",
    version: RESUME_BRIEFING_VERSION,
    context: {
      repositoryKind: deriveRepositoryKind(replayedState),
      phase: derived.phase,
      eventCount: events.length,
      stateHash: replayedState.stateHash,
      lastEventAt: events.length > 0 ? events[events.length - 1].timestamp : undefined,
    },
    whatHappened: timeline,
    whatWasDecided: decisionEntries,
    whatIsNext: [toResumeNextAction(result, transition)],
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
  if (!logFlag) {
    await ensureRuntimeDataDir(cwd)
  }
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
