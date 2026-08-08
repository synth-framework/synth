// ============================================================
// GOVERNANCE: Agent Intake Gate
// ============================================================
// Runtime boundary that resolves whether an agent action is allowed
// against the current canonical state. The gate is read-only: it never
// mutates state, it only decides whether the requested transition is
// valid according to the SYNTH lifecycle.
//
// Lifecycle (existing statuses, not renamed):
//   Mission:    draft -> active -> completed | archived
//   Expedition: draft -> approved -> committed -> executing <-> paused -> completed | cancelled | archived
//
// The gate makes the SYNTH-conformant path the lowest-friction valid
// path for agents.
// ============================================================

import type { CanonicalState, Mission, Expedition, DerivedState } from "../types/index.js"
import { isBlockedByUpstreamGate } from "./review-gate-engine.js"

export type AgentAction =
  | { kind: "mission.create" }
  | { kind: "mission.approve"; missionId?: string }
  | { kind: "mission.evidence.add"; missionId?: string }
  | { kind: "expedition.create"; missionId?: string }
  | { kind: "expedition.approve"; expeditionId: string }
  | { kind: "expedition.commit"; expeditionId: string }
  | { kind: "expedition.start"; expeditionId: string }
  | { kind: "expedition.pause"; expeditionId: string }
  | { kind: "expedition.cancel"; expeditionId: string }
  | { kind: "expedition.refine"; expeditionId: string }
  | { kind: "expedition.complete"; expeditionId: string; force?: boolean }
  | { kind: "expedition.archive"; expeditionId: string }
  | { kind: "execution.mutate"; expeditionId: string }

export type IntakeResult =
  | {
      decision: "ALLOW"
      activeMissionId?: string
      activeExpeditionId?: string
      note?: string
    }
  | {
      decision: "BLOCK"
      reason: string
      requiredAction: string
    }

function findActiveMission(state: CanonicalState): Mission | undefined {
  return Object.values(state.missions).find((m) => m.status === "active")
}

function findExecutingExpedition(state: CanonicalState): Expedition | undefined {
  return Object.values(state.expeditions).find((e) => e.status === "executing")
}

function findExpedition(state: CanonicalState, id: string): Expedition | undefined {
  return state.expeditions[id]
}

/**
 * Validate an agent action against the current canonical state.
 *
 * The gate is intentionally simple: it checks lifecycle preconditions,
 * not semantic correctness. Domain invariants are enforced later by the
 * ExecutionGate and pure domain functions.
 */
export function validateAgentAction(action: AgentAction, state: CanonicalState, derivedState?: DerivedState): IntakeResult {
  const activeMission = findActiveMission(state)
  const executingExpedition = findExecutingExpedition(state)

  switch (action.kind) {
    case "mission.create": {
      // Top-level intent capture. Always allowed; the mission itself
      // remains draft until approved through the proper lifecycle.
      return { decision: "ALLOW", note: "Capture intent as a new Mission draft." }
    }

    case "mission.approve": {
      // Planning approval happens before canonical state mutation.
      // We only enforce that no expedition is currently executing,
      // because mission-level intent should not drift while work is
      // supposedly bounded by an active expedition.
      if (executingExpedition) {
        return {
          decision: "BLOCK",
          reason: `Mission approval is blocked while expedition ${executingExpedition.id} is executing.`,
          requiredAction: `Complete the active expedition first: synth expedition complete --expedition-id ${executingExpedition.id}`,
        }
      }

      // Governance gate check: verify a Refined Intent exists and
      // the Alignment Contract passed the Divergence Gate.
      if (derivedState) {
        const alignmentContracts = Object.values(derivedState.alignmentContracts)
        const hasAlignedContract = alignmentContracts.some(
          (ac) => ac.status === "aligned" || ac.approvedBy !== undefined,
        )
        if (!hasAlignedContract) {
          return {
            decision: "BLOCK",
            reason: "Mission approval requires an Alignment Contract that has passed the Divergence Gate. No aligned contract found.",
            requiredAction: "Complete the Genesis Alignment Layer: capture intent, create an Alignment Contract, and pass the Divergence Gate first.",
          }
        }
      }

      return { decision: "ALLOW", activeMissionId: activeMission?.id }
    }

    case "mission.evidence.add": {
      // Evidence is gathered during planning. We allow it unless an
      // expedition is already executing, which would indicate the agent
      // is gathering evidence for a new mission instead of closing the
      // active expedition.
      if (executingExpedition) {
        return {
          decision: "BLOCK",
          reason: `Evidence cannot be added to a mission draft while expedition ${executingExpedition.id} is executing.`,
          requiredAction: `Complete the active expedition first: synth expedition complete --expedition-id ${executingExpedition.id}`,
        }
      }
      return { decision: "ALLOW" }
    }

    case "expedition.create": {
      // Expeditions can be created at any time; only starting a second
      // executing expedition is blocked. This allows parallel planning
      // and queueing of work while another expedition is in flight.

      // If a missionId is supplied, validate it. We do not require a
      // canonical active mission for every expedition proposal because
      // mission approval currently lives in the planning snapshot layer.
      if (action.missionId) {
        const parent = state.missions[action.missionId]
        if (parent && parent.status !== "active") {
          return {
            decision: "BLOCK",
            reason: `Mission ${action.missionId} is ${parent.status}; expeditions can only be created under an active mission.`,
            requiredAction: "Approve the mission before creating expeditions.",
          }
        }
        return { decision: "ALLOW", activeMissionId: parent?.id }
      }

      return { decision: "ALLOW", activeMissionId: activeMission?.id }
    }

    case "expedition.approve": {
      const expedition = findExpedition(state, action.expeditionId)
      if (!expedition) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} does not exist.`,
          requiredAction: "Create the expedition through the lifecycle first.",
        }
      }
      if (expedition.status !== "draft") {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} is ${expedition.status}; only draft expeditions can be approved.`,
          requiredAction: "Create a new expedition draft if the current one is no longer in draft state.",
        }
      }
      return { decision: "ALLOW", activeMissionId: expedition.missionId, activeExpeditionId: expedition.id }
    }

    case "expedition.commit": {
      const expedition = findExpedition(state, action.expeditionId)
      if (!expedition) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} does not exist.`,
          requiredAction: "Create and approve the expedition through the lifecycle first.",
        }
      }
      if (expedition.status !== "approved") {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} is ${expedition.status}; only approved expeditions can be committed.`,
          requiredAction: `Approve the expedition first: synth expedition approve --draft-id <id>`,
        }
      }
      return { decision: "ALLOW", activeMissionId: expedition.missionId, activeExpeditionId: expedition.id }
    }

    case "expedition.start": {
      const expedition = findExpedition(state, action.expeditionId)
      if (!expedition) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} does not exist.`,
          requiredAction: "Create the expedition through the lifecycle first.",
        }
      }
      const startableStatuses: Expedition["status"][] = ["committed", "archived", "paused", "cancelled"]
      if (!startableStatuses.includes(expedition.status)) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} is ${expedition.status}; only committed, archived, paused, or cancelled expeditions can be started.`,
          requiredAction: `Commit the expedition first: synth expedition commit --proposal-id ${action.expeditionId}`,
        }
      }
      if (executingExpedition && executingExpedition.id !== expedition.id) {
        return {
          decision: "BLOCK",
          reason: `Another expedition (${executingExpedition.id}) is already executing.`,
          requiredAction: `Complete ${executingExpedition.id} before starting ${expedition.id}.`,
        }
      }

      // Governance gate check: verify no upstream expedition blocks this one.
      if (derivedState && isBlockedByUpstreamGate(state, derivedState, action.expeditionId)) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} is blocked by an upstream expedition that has not passed its review gate.`,
          requiredAction: "Complete the review and acceptance gates on the upstream expedition before starting this one.",
        }
      }

      return { decision: "ALLOW", activeMissionId: expedition.missionId, activeExpeditionId: expedition.id }
    }

    case "expedition.pause": {
      const expedition = findExpedition(state, action.expeditionId)
      if (!expedition) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} does not exist.`,
          requiredAction: "Create and start the expedition through the lifecycle first.",
        }
      }
      if (expedition.status !== "executing") {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} is ${expedition.status}; only executing expeditions can be paused.`,
          requiredAction: `Start the expedition first: synth expedition start --expedition-id ${expedition.id}`,
        }
      }
      return { decision: "ALLOW", activeMissionId: expedition.missionId, activeExpeditionId: expedition.id }
    }

    case "expedition.complete": {
      const expedition = findExpedition(state, action.expeditionId)
      if (!expedition) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} does not exist.`,
          requiredAction: "Create and start the expedition through the lifecycle first.",
        }
      }
      if (expedition.status !== "executing") {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} is ${expedition.status}; only executing expeditions can be completed.`,
          requiredAction: `Start the expedition first: synth expedition start --expedition-id ${expedition.id}`,
        }
      }

return { decision: "ALLOW", activeMissionId: expedition.missionId, activeExpeditionId: expedition.id }
    }

    case "expedition.cancel": {
      const expedition = findExpedition(state, action.expeditionId)
      if (!expedition) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} does not exist.`,
          requiredAction: "Create the expedition through the lifecycle first.",
        }
      }
      if (expedition.status === "completed" || expedition.status === "cancelled" || expedition.status === "archived") {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} is ${expedition.status}; cannot cancel a terminal or already cancelled expedition.`,
          requiredAction: "Only draft, approved, committed, executing, or paused expeditions can be cancelled.",
        }
      }
      return { decision: "ALLOW", activeMissionId: expedition.missionId, activeExpeditionId: expedition.id }
    }

    case "expedition.refine": {
      const expedition = findExpedition(state, action.expeditionId)
      if (!expedition) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} does not exist.`,
          requiredAction: "Create the expedition through the lifecycle first.",
        }
      }
      if (expedition.status === "completed" || expedition.status === "cancelled" || expedition.status === "archived") {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} is ${expedition.status}; cannot refine a terminal expedition.`,
          requiredAction: "Only draft, approved, committed, executing, or paused expeditions can be refined.",
        }
      }
      return { decision: "ALLOW", activeMissionId: expedition.missionId, activeExpeditionId: expedition.id }
    }

    case "expedition.archive": {
      const expedition = findExpedition(state, action.expeditionId)
      if (!expedition) {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} does not exist.`,
          requiredAction: "Create the expedition through the lifecycle first.",
        }
      }
      if (expedition.status === "completed" || expedition.status === "cancelled" || expedition.status === "archived") {
        return {
          decision: "BLOCK",
          reason: `Expedition ${action.expeditionId} is already ${expedition.status}.`,
          requiredAction: "Only active or paused expeditions can be archived.",
        }
      }
      return { decision: "ALLOW", activeMissionId: expedition.missionId, activeExpeditionId: expedition.id }
    }

    case "execution.mutate": {
      if (!executingExpedition) {
        return {
          decision: "BLOCK",
          reason: "No expedition is currently executing. All execution mutations require an active expedition.",
          requiredAction: "Start an expedition before performing execution work.",
        }
      }
      if (action.expeditionId && executingExpedition.id !== action.expeditionId) {
        return {
          decision: "BLOCK",
          reason: `Execution is bound to expedition ${executingExpedition.id}, not ${action.expeditionId}.`,
          requiredAction: `Either work on ${executingExpedition.id} or complete it and start ${action.expeditionId}.`,
        }
      }
      return {
        decision: "ALLOW",
        activeMissionId: executingExpedition.missionId,
        activeExpeditionId: executingExpedition.id,
      }
    }
  }
}
