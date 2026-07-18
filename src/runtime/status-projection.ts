// ============================================================
// RUNTIME: Status Projection
// ============================================================
// Projects the runtime governance model (ResolvedGovernanceContext +
// ValidTransition) into consumer-facing shapes such as the CLI
// OperatorBriefing and ResumeBriefing next-actions list. This layer
// contains all command-string formatting; the Transition Engine and
// Governance Model remain independent of adapters.
// ============================================================

import type {
  OperatorBriefing,
  MissionBrief,
  ActiveExpeditionBrief,
  Blocker,
  NextAction,
} from "../cli/status-briefing.js"
import type { ResolvedGovernanceContext, ValidTransition } from "./governance-types.js"
import { APPROVAL_THRESHOLD } from "./governance-model.js"

function formatConfidence(value: number): string {
  return value.toFixed(2)
}

function deriveMissions(ctx: ResolvedGovernanceContext): MissionBrief[] {
  return Object.values(ctx.authoritative.replayedState.missions || {}).map((mission) => ({
    id: mission.id,
    name: mission.name,
    status: mission.status,
  }))
}

function deriveActiveExpeditions(ctx: ResolvedGovernanceContext): ActiveExpeditionBrief[] {
  return Object.values(ctx.authoritative.replayedState.expeditions || {})
    .filter((e) => e.status === "approved" || e.status === "executing")
    .map((expedition) => ({
      id: expedition.id,
      name: expedition.name,
      missionId: expedition.missionId,
      status: expedition.status,
    }))
}

function findDraftId(ctx: ResolvedGovernanceContext): string | undefined {
  return (
    ctx.derived.latestDraft?.id ??
    Object.values(ctx.authoritative.replayedState.missions || {}).find((m) => m.status === "draft")?.id
  )
}

function deriveBlockers(ctx: ResolvedGovernanceContext): Blocker[] {
  const blockers: Blocker[] = []
  const phase = ctx.derived.phase
  const latestDraft = ctx.derived.latestDraft
  const missions = deriveMissions(ctx)
  const workItems = Object.values(ctx.authoritative.replayedState.workItems || {})

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

  if ((phase === "initialized" || phase === "planning") && missions.length === 0 && !latestDraft) {
    blockers.push({
      kind: "no-mission",
      description: "Project is initialized but has no Mission draft.",
      remediation: "synth mission create --subject \"<mission>\" --purpose \"<purpose>\"",
    })
  }

  for (const workItem of workItems) {
    if (workItem.status === "blocked") {
      const name = (workItem as typeof workItem & { name?: string }).name
      blockers.push({
        kind: "blocked-work-item",
        description: `Work item "${name || workItem.id}" is blocked.`,
        remediation: `synth explain diagnostics --work-item ${workItem.id}`,
      })
    }
  }

  for (const divergence of ctx.derived.divergences) {
    if (divergence.severity !== "warning") continue
    blockers.push({
      kind: divergence.kind,
      description: divergence.description,
      remediation: `Inspect ${divergence.artifact || "governance artifacts"} and follow the recovery guidance.`,
    })
  }

  return blockers
}

function toNextAction(ctx: ResolvedGovernanceContext, transition: ValidTransition): NextAction {
  const latestDraft = ctx.derived.latestDraft
  const activeMission = ctx.derived.activeMission

  switch (transition.kind) {
    case "InitializeProject":
      return {
        command: "synth init --name \"<project>\"",
        reason: transition.reason,
        priority: 1,
      }
    case "CreateMission":
      return {
        command: "synth mission create --subject \"<mission>\" --purpose \"<purpose>\"",
        reason: transition.reason,
        priority: 1,
      }
    case "AddMissionEvidence": {
      const evidenceDraftId = findDraftId(ctx) ?? "<draft-id>"
      return {
        command: `synth mission evidence add --draft-id ${evidenceDraftId} --subject \"<evidence>\" [--purpose \"<context>\"] [--confidence high]`,
        reason: transition.reason,
        priority: 1,
      }
    }
    case "ApproveMission": {
      const approveDraftId = findDraftId(ctx) ?? "<draft-id>"
      return {
        command: `synth mission approve --draft-id ${approveDraftId}`,
        reason: transition.reason,
        priority: 1,
      }
    }
    case "CreateExpedition":
      return {
        command: activeMission
          ? `synth expedition create --mission ${activeMission.id} --subject \"<expedition>\" --goal \"<goal>\"`
          : "synth expedition create --mission <mission-id> --subject \"<expedition>\" --goal \"<goal>\"",
        reason: transition.reason,
        priority: 1,
      }
    case "InspectExecution":
      return {
        command: "synth explain status",
        reason: transition.reason,
        priority: 1,
      }
    case "DiagnoseBlocker":
      return {
        command: "synth explain diagnostics",
        reason: transition.reason,
        priority: 1,
      }
    case "ArchiveMission":
      return {
        command: "synth mission archive --id <mission-id>",
        reason: transition.reason,
        priority: 1,
      }
    case "NoOp":
    default:
      return {
        command: "synth explain status",
        reason: transition.reason || "Inspect current state.",
        priority: 1,
      }
  }
}

function deriveSummary(ctx: ResolvedGovernanceContext): string {
  const phase = ctx.derived.phase
  const missions = deriveMissions(ctx)
  const activeExpeditions = deriveActiveExpeditions(ctx)
  const latestDraft = ctx.derived.latestDraft

  switch (phase) {
    case "uninitialized":
      return "No SYNTH project found in this directory."
    case "initialized":
      return "Project initialized; create a Mission to begin planning."
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

export function toOperatorBriefing(
  ctx: ResolvedGovernanceContext,
  transition: ValidTransition,
): OperatorBriefing {
  return {
    status: "ok",
    kind: "OperatorBriefing",
    phase: ctx.derived.phase,
    summary: deriveSummary(ctx),
    missions: deriveMissions(ctx),
    activeExpeditions: deriveActiveExpeditions(ctx),
    blockers: deriveBlockers(ctx),
    nextActions: [toNextAction(ctx, transition)],
    eventCount: ctx.authoritative.events.length,
    stateHash: ctx.authoritative.replayedState.stateHash,
  }
}

export function toResumeNextAction(ctx: ResolvedGovernanceContext, transition: ValidTransition) {
  const action = toNextAction(ctx, transition)
  return {
    command: action.command,
    reason: action.reason,
    priority: action.priority,
  }
}
