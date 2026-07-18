// ============================================================
// RUNTIME: Governance Model
// ============================================================
// Declarative, side-effect-free description of SYNTH governance
// semantics. It defines phases, allowed transitions, preconditions,
// terminal states, and blocking conditions. It performs no state
// mutation, artifact access, or command execution.
//
// Future lifecycle changes (additional phases, completion rules,
// acceptance rules, authorization rules) extend this module rather
// than leaking policy into the Transition Engine or CLI projection.
// ============================================================

import type { GovernanceRule, ValidTransition, ResolvedGovernanceContext } from "./governance-types.js"

export const APPROVAL_THRESHOLD = 0.7

function hasBlockingWorkItem(ctx: ResolvedGovernanceContext): boolean {
  return Object.values(ctx.authoritative.replayedState.workItems || {}).some((w) => w.status === "blocked")
}

function hasActiveExecution(ctx: ResolvedGovernanceContext): boolean {
  const expeditions = Object.values(ctx.authoritative.replayedState.expeditions || {})
  const workItems = Object.values(ctx.authoritative.replayedState.workItems || {})
  return expeditions.some((e) => e.status === "executing") || workItems.some((w) => w.status === "active")
}

function hasActiveMission(ctx: ResolvedGovernanceContext): boolean {
  return Object.values(ctx.authoritative.replayedState.missions || {}).some((m) => m.status === "active")
}

function hasDraftMission(ctx: ResolvedGovernanceContext): boolean {
  return Object.values(ctx.authoritative.replayedState.missions || {}).some((m) => m.status === "draft")
}

function activeMission(ctx: ResolvedGovernanceContext) {
  return (
    Object.values(ctx.authoritative.replayedState.missions || {}).find((m) => m.status === "active") ?? null
  )
}

function activeExpedition(ctx: ResolvedGovernanceContext) {
  return (
    Object.values(ctx.authoritative.replayedState.expeditions || {}).find(
      (e) => e.status === "approved" || e.status === "executing",
    ) ?? null
  )
}

function allMissionsTerminal(ctx: ResolvedGovernanceContext): boolean {
  const missions = Object.values(ctx.authoritative.replayedState.missions || {})
  return missions.length > 0 && missions.every((m) => m.status === "completed" || m.status === "archived")
}

function hasDraft(ctx: ResolvedGovernanceContext): boolean {
  return hasDraftMission(ctx) || ctx.derived.latestDraft != null
}

function draftReady(ctx: ResolvedGovernanceContext): boolean {
  const draft = ctx.derived.latestDraft
  if (!draft) return false
  return draft.confidence >= APPROVAL_THRESHOLD && draft.blockingUnknowns === 0
}

function transition(kind: ValidTransition["kind"], reason: string, targetId?: string): ValidTransition {
  return { kind, reason, targetId }
}

/**
 * Ordered governance rules. The Transition Engine evaluates rules in
 * priority order and returns the first matching transition. Lower
 * priority numbers are evaluated first.
 */
export const GOVERNANCE_RULES: GovernanceRule[] = [
  {
    id: "uninitialized",
    priority: 1,
    when: (ctx) => !ctx.authoritative.manifestExists,
    transition: transition("InitializeProject", "No SYNTH project manifest found in current directory"),
  },
  {
    id: "blocked-work-item",
    priority: 2,
    when: (ctx) => hasBlockingWorkItem(ctx),
    transition: transition("DiagnoseBlocker", "A work item is blocked; diagnose the blocker"),
  },
  {
    id: "executing",
    priority: 3,
    when: (ctx) => hasActiveExecution(ctx),
    transition: transition("InspectExecution", "Inspect active execution and next pending step"),
  },
  {
    id: "complete",
    priority: 4,
    when: (ctx) => allMissionsTerminal(ctx),
    transition: transition("ArchiveMission", "All tracked Missions are complete"),
  },
  {
    id: "approved-mission-no-expedition",
    priority: 5,
    when: (ctx) => hasActiveMission(ctx) && !activeExpedition(ctx),
    transition: (ctx) =>
      transition(
        "CreateExpedition",
        "Approved Mission has no active Expeditions",
        activeMission(ctx)?.id,
      ),
  },
  {
    id: "approved-mission-with-expedition",
    priority: 6,
    when: (ctx) => hasActiveMission(ctx) && activeExpedition(ctx) !== null,
    transition: (ctx) =>
      transition(
        "CreateExpedition",
        "Add an Expedition to the approved Mission",
        activeMission(ctx)?.id,
      ),
  },
  {
    id: "draft-not-ready",
    priority: 7,
    when: (ctx) => hasDraft(ctx) && !draftReady(ctx),
    transition: transition("AddMissionEvidence", "Mission draft needs more evidence before approval"),
  },
  {
    id: "draft-ready",
    priority: 8,
    when: (ctx) => hasDraft(ctx) && draftReady(ctx),
    transition: transition("ApproveMission", "Mission draft is ready for approval"),
  },
  {
    id: "no-draft",
    priority: 9,
    when: (ctx) => ctx.authoritative.manifestExists && !hasDraft(ctx) && !hasActiveMission(ctx),
    transition: transition("CreateMission", "Project initialized; create a Mission to begin planning"),
  },
]
