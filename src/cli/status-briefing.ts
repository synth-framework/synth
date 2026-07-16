// ============================================================
// CLI: Operator Briefing Projection
// ============================================================
// Deterministic "where am I and what happens next?" surface for
// `synth status`. All values are projections of replayable evidence.
// ============================================================

import fs from "fs/promises"
import path from "path"
import type { SynthContext } from "../core/bootstrap.js"

export type MissionBrief = {
  id: string
  name: string
  status: string
  approvedAt?: number
}

export type ActiveExpeditionBrief = {
  id: string
  name: string
  missionId: string
  status: string
}

export type Blocker = {
  kind: string
  description: string
  remediation: string
}

export type NextAction = {
  command: string
  reason: string
  priority: number
}

export type OperatorPhase = "uninitialized" | "planning" | "approved" | "executing" | "blocked" | "complete"

export type OperatorBriefing = {
  status: "ok"
  kind: "OperatorBriefing"
  phase: OperatorPhase
  summary: string
  missions: MissionBrief[]
  activeExpeditions: ActiveExpeditionBrief[]
  blockers: Blocker[]
  nextActions: NextAction[]
  eventCount: number
  stateHash: string
}

type DraftSummary = {
  id: string
  confidence: number
  unknowns: number
  blockingUnknowns: number
  approvalState: string
  createdAt: number
}

const APPROVAL_THRESHOLD = 0.7

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function listDrafts(rootDir: string): Promise<DraftSummary[]> {
  const draftsDir = path.join(rootDir, "data", "drafts")
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

function formatConfidence(value: number): string {
  return value.toFixed(2)
}

function derivePhase(
  manifestExists: boolean,
  missions: Array<{ status: string }>,
  expeditions: Array<{ status: string }>,
  workItems: Array<{ status: string }>,
  drafts: DraftSummary[],
): OperatorPhase {
  if (!manifestExists) return "uninitialized"

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

  // No approved mission yet: either a draft exists (explicit planning) or
  // the project is initialized and waiting for its first Mission.
  return drafts.length > 0 ? "planning" : "planning"
}

function deriveMissions(state: Awaited<ReturnType<SynthContext["runtime"]["getState"]>>): MissionBrief[] {
  return Object.values(state.missions || {}).map((mission) => ({
    id: mission.id,
    name: mission.name,
    status: mission.status,
  }))
}

function deriveActiveExpeditions(
  state: Awaited<ReturnType<SynthContext["runtime"]["getState"]>>,
): ActiveExpeditionBrief[] {
  return Object.values(state.expeditions || {})
    .filter((e) => e.status === "approved" || e.status === "executing")
    .map((expedition) => ({
      id: expedition.id,
      name: expedition.name,
      missionId: expedition.missionId,
      status: expedition.status,
    }))
}

function deriveBlockers(
  phase: OperatorPhase,
  latestDraft: DraftSummary | undefined,
  workItems: Array<{ id: string; status: string; name?: string }>,
  missions: MissionBrief[],
): Blocker[] {
  const blockers: Blocker[] = []

  if (phase === "planning" && latestDraft) {
    if (latestDraft.blockingUnknowns > 0) {
      blockers.push({
        kind: "blocking-unknowns",
        description: `Mission draft "${latestDraft.id}" has ${latestDraft.blockingUnknowns} blocking unknown(s).`,
        remediation: `synth mission evidence add --draft-id ${latestDraft.id} --subject "<answer>" [--purpose "<context>"] [--confidence <level>]`,
      })
    }
    if (latestDraft.confidence < APPROVAL_THRESHOLD) {
      blockers.push({
        kind: "low-confidence",
        description: `Mission draft "${latestDraft.id}" confidence is ${formatConfidence(latestDraft.confidence)} (threshold ${APPROVAL_THRESHOLD}).`,
        remediation: `synth mission evidence add --draft-id ${latestDraft.id} --subject "<evidence>" [--purpose "<context>"] [--confidence high]`,
      })
    }
  }

  if (phase === "planning" && missions.length === 0 && !latestDraft) {
    blockers.push({
      kind: "no-mission",
      description: "Project is initialized but has no Mission draft.",
      remediation: "synth mission create --subject \"<mission>\" --purpose \"<purpose>\"",
    })
  }

  for (const workItem of workItems) {
    if (workItem.status === "blocked") {
      blockers.push({
        kind: "blocked-work-item",
        description: `Work item "${workItem.name || workItem.id}" is blocked.`,
        remediation: `synth explain diagnostics --work-item ${workItem.id}`,
      })
    }
  }

  return blockers
}

function deriveNextActions(
  phase: OperatorPhase,
  latestDraft: DraftSummary | undefined,
  missions: MissionBrief[],
  activeExpeditions: ActiveExpeditionBrief[],
): NextAction[] {
  const actions: NextAction[] = []

  if (phase === "uninitialized") {
    actions.push({
      command: "synth init --name \"<project>\"",
      reason: "Initialize a SYNTH project",
      priority: 1,
    })
    return actions
  }

  if (phase === "planning") {
    if (latestDraft) {
      if (latestDraft.confidence < APPROVAL_THRESHOLD || latestDraft.blockingUnknowns > 0) {
        actions.push({
          command: `synth mission evidence add --draft-id ${latestDraft.id} --subject "<evidence>" [--purpose "<context>"] [--confidence high]`,
          reason: latestDraft.blockingUnknowns > 0
            ? "Blocking unknowns must be resolved before approval"
            : "Confidence is below the approval threshold",
          priority: 1,
        })
      }
      actions.push({
        command: `synth mission approve --draft-id ${latestDraft.id}`,
        reason: "Approve the Mission once confidence is sufficient",
        priority: 2,
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
    const activeMissions = missions.filter((m) => m.status === "active")
    const targetMission = activeMissions[0]
    if (targetMission && activeExpeditions.length === 0) {
      actions.push({
        command: `synth expedition create --mission ${targetMission.id} --subject "<expedition>" --goal "<goal>"`,
        reason: `Approved Mission "${targetMission.name}" has no active Expeditions`,
        priority: 1,
      })
    } else if (targetMission) {
      actions.push({
        command: `synth expedition create --mission ${targetMission.id} --subject "<expedition>" --goal "<goal>"`,
        reason: `Add an Expedition to approved Mission "${targetMission.name}"`,
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

  if (phase === "blocked") {
    actions.push({
      command: "synth explain diagnostics",
      reason: "Diagnose the blocked work item and determine remediation",
      priority: 1,
    })
    actions.push({
      command: "synth explain status",
      reason: "Review the full operational context",
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

function deriveSummary(
  phase: OperatorPhase,
  missions: MissionBrief[],
  activeExpeditions: ActiveExpeditionBrief[],
  latestDraft: DraftSummary | undefined,
): string {
  switch (phase) {
    case "uninitialized":
      return "No SYNTH project found in this directory."
    case "planning": {
      if (latestDraft) {
        const name = missions.find((m) => m.status === "draft")?.name || "Mission"
        return `${name} is awaiting approval (confidence ${formatConfidence(latestDraft.confidence)}).`
      }
      return "Project initialized; create a Mission to begin planning."
    }
    case "approved": {
      const mission = missions.find((m) => m.status === "active")
      const expCount = activeExpeditions.length
      return mission
        ? `Mission "${mission.name}" is approved${expCount > 0 ? ` with ${expCount} active expedition${expCount === 1 ? "" : "s"}` : " and ready for Expeditions"}.`
        : "Project has an approved Mission."
    }
    case "executing": {
      const count = activeExpeditions.filter((e) => e.status === "executing").length
      return count > 0
        ? `${count} expedition${count === 1 ? "" : "s"} currently executing.`
        : "Execution is in progress."
    }
    case "blocked":
      return "Execution is blocked by a work item."
    case "complete":
      return "All tracked Missions are complete."
    default:
      return "Project state is unknown."
  }
}

/**
 * Build an Operator Briefing from the current working directory.
 * Every field is derived from replayable evidence (events, state, drafts,
 * snapshots, decisions). No mutable status file is consulted.
 */
export async function buildOperatorBriefing(rootDir: string, ctx: SynthContext): Promise<OperatorBriefing> {
  const manifestPath = path.join(rootDir, ".synth", "manifest.json")
  const manifestExists = await pathExists(manifestPath)

  const state = await ctx.runtime.getState()
  const eventCount = await ctx.runtime.getEventCount()

  const missionList = deriveMissions(state)
  const activeExpeditions = deriveActiveExpeditions(state)
  const workItems = Object.values(state.workItems || {})
  const drafts = await listDrafts(rootDir)
  const latestDraft = drafts[0]

  const phase = derivePhase(manifestExists, missionList, activeExpeditions, workItems, drafts)
  const blockers = deriveBlockers(phase, latestDraft, workItems, missionList)
  const nextActions = deriveNextActions(phase, latestDraft, missionList, activeExpeditions)
  const summary = deriveSummary(phase, missionList, activeExpeditions, latestDraft)

  return {
    status: "ok",
    kind: "OperatorBriefing",
    phase,
    summary,
    missions: missionList,
    activeExpeditions,
    blockers,
    nextActions,
    eventCount,
    stateHash: state.stateHash,
  }
}
