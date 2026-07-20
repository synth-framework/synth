// ============================================================
// DOMAIN: Execution Logic (Pure)
// ============================================================

import type { CanonicalState, CapabilityInvocation, CapabilityResult, Discovery, DomainContext, ExecutionContext } from "../types/index.js"
import { computeEventHash } from "../core/hash.js"
import * as workItemLogic from "./workitem.js"
import * as planLogic from "./plan.js"
import * as milestoneLogic from "./milestone.js"
import * as projectLogic from "./project.js"
import * as planningLogic from "./planning.js"
import {
  ensureReviewGateExpedition,
  engineOpenReviewGate,
  engineResolveReviewGate,
  engineRequestRevision,
  engineOpenAcceptanceGate,
  engineResolveAcceptanceGate,
  engineCloseExpedition,
  engineApproveRefinedIntent,
  isBlockedByUpstreamGate,
} from "../governance/review-gate-engine.js"
import type { GatePolicy, ReviewDecisionType } from "../governance/review-gates.js"

/** Execute domain logic — pure function: (intent, state, ctx) → result */
export function applyDomain(
  intent: CapabilityInvocation,
  state: CanonicalState,
  ctx: DomainContext,
): CapabilityResult {
  switch (intent.capability) {
    // ============================================================
    // WorkItem capabilities (canonical)
    // ============================================================
    case "CreateWorkItem": {
      const id = String(intent.payload.id)
      const workItem = workItemLogic.createWorkItem(id, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "WORK_ITEM_CREATED", payload: { workItem } }] }
    }

    case "StartWorkItem": {
      const id = String(intent.payload.id)
      const existing = state.workItems[id]
      if (!existing) {
        return { events: [{ type: "WORK_ITEM_STARTED", payload: { id, status: "active" } }] }
      }
      const updated = workItemLogic.startWorkItem(existing, ctx)
      return { events: [{ type: "WORK_ITEM_STARTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CompleteWorkItem": {
      const id = String(intent.payload.id)
      const existing = state.workItems[id]
      if (!existing) {
        return { events: [{ type: "WORK_ITEM_COMPLETED", payload: { id, status: "complete" } }] }
      }
      const updated = workItemLogic.completeWorkItem(existing, ctx)
      return { events: [{ type: "WORK_ITEM_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "BlockWorkItem": {
      const id = String(intent.payload.id)
      const existing = state.workItems[id]
      const reason = String(intent.payload.reason || "")
      if (!existing) {
        return { events: [{ type: "WORK_ITEM_BLOCKED", payload: { id, status: "blocked", reason } }] }
      }
      const updated = workItemLogic.blockWorkItem(existing, reason, ctx)
      return { events: [{ type: "WORK_ITEM_BLOCKED", payload: { id: updated.id, status: updated.status, reason } }] }
    }

    // ============================================================
    // Plan capabilities
    // ============================================================
    case "CreatePlan": {
      const id = String(intent.payload.id)
      const name = String(intent.payload.name)
      const plan = planLogic.createPlan(id, name, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "PLAN_CREATED", payload: { plan } }] }
    }

    case "ActivatePlan": {
      const id = String(intent.payload.id)
      const existing = state.plans[id]
      if (!existing) {
        return { events: [{ type: "PLAN_ACTIVATED", payload: { id, status: "active" } }] }
      }
      const updated = planLogic.activatePlan(existing, ctx)
      return { events: [{ type: "PLAN_ACTIVATED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CompletePlan": {
      const id = String(intent.payload.id)
      const existing = state.plans[id]
      if (!existing) {
        return { events: [{ type: "PLAN_COMPLETED", payload: { id, status: "completed" } }] }
      }
      const updated = planLogic.completePlan(existing, ctx)
      return { events: [{ type: "PLAN_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    // ============================================================
    // Milestone capabilities
    // ============================================================
    case "CreateMilestone": {
      const id = String(intent.payload.id)
      const planId = String(intent.payload.planId)
      const name = String(intent.payload.name)
      const ms = milestoneLogic.createMilestone(id, planId, name, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "MILESTONE_CREATED", payload: { milestone: ms } }] }
    }

    case "StartMilestone": {
      const id = String(intent.payload.id)
      const existing = state.milestones[id]
      if (!existing) {
        return { events: [{ type: "MILESTONE_STARTED", payload: { id, status: "in_progress" } }] }
      }
      const updated = milestoneLogic.startMilestone(existing, ctx)
      return { events: [{ type: "MILESTONE_STARTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CompleteMilestone": {
      const id = String(intent.payload.id)
      const existing = state.milestones[id]
      if (!existing) {
        return { events: [{ type: "MILESTONE_COMPLETED", payload: { id, status: "completed" } }] }
      }
      const updated = milestoneLogic.completeMilestone(existing, ctx)
      return { events: [{ type: "MILESTONE_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    // ============================================================
    // Project capabilities
    // ============================================================
    case "CreateProject": {
      const id = String(intent.payload.id)
      const name = String(intent.payload.name)
      const goal = String(intent.payload.goal)
      const project = projectLogic.createProject(id, name, goal, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "PROJECT_CREATED", payload: { project } }] }
    }

    case "InitializeProject": {
      const projectId = String(intent.payload.projectId)
      const name = String(intent.payload.name)
      const governanceVersion = String(intent.payload.governanceVersion)
      return {
        events: [{
          type: "PROJECT_INITIALIZED",
          payload: { projectId, name, governanceVersion },
        }],
      }
    }

    // ============================================================
    // Planning capabilities (PCE)
    // ============================================================
    case "CreateMission": {
      const id = String(intent.payload.id)
      const name = String(intent.payload.name)
      const purpose = String(intent.payload.purpose || "")
      const mission = planningLogic.createMission(id, name, purpose, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "MISSION_CREATED", payload: { mission } }] }
    }

    case "ApproveMission": {
      const id = String(intent.payload.id)
      const existing = state.missions[id]
      if (!existing) {
        return { events: [{ type: "MISSION_APPROVED", payload: { id, status: "active" } }] }
      }
      const updated = planningLogic.approveMission(existing, ctx)
      return { events: [{ type: "MISSION_APPROVED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CompleteMission": {
      const id = String(intent.payload.id)
      const existing = state.missions[id]
      if (!existing) {
        return { events: [{ type: "MISSION_COMPLETED", payload: { id, status: "completed" } }] }
      }
      const updated = planningLogic.completeMission(existing, ctx)
      return { events: [{ type: "MISSION_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "ArchiveMission": {
      const id = String(intent.payload.id)
      const existing = state.missions[id]
      if (!existing) {
        return { events: [{ type: "MISSION_ARCHIVED", payload: { id, status: "archived" } }] }
      }
      const updated = planningLogic.archiveMission(existing, ctx)
      return { events: [{ type: "MISSION_ARCHIVED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CreateExpedition": {
      const id = String(intent.payload.id)
      const missionId = String(intent.payload.missionId)
      const name = String(intent.payload.name)
      const goal = String(intent.payload.goal || "")
      const dependsOn = Array.isArray(intent.payload.dependsOn)
        ? intent.payload.dependsOn.map(String)
        : []
      const expedition = planningLogic.createExpedition(id, missionId, name, goal, ctx, {
        ...(intent.payload as Record<string, unknown>),
        dependsOn,
      })
      return { events: [{ type: "EXPEDITION_CREATED", payload: { expedition } }] }
    }

    case "ApproveExpedition": {
      const id = String(intent.payload.id)
      const existing = state.expeditions[id]
      if (!existing) {
        return { events: [{ type: "EXPEDITION_APPROVED", payload: { id, status: "approved" } }] }
      }
      const updated = planningLogic.approveExpedition(existing, ctx)
      return { events: [{ type: "EXPEDITION_APPROVED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CommitExpedition": {
      const id = String(intent.payload.id)
      const existing = state.expeditions[id]
      if (!existing) {
        return { events: [{ type: "EXPEDITION_COMMITTED", payload: { id, status: "committed" } }] }
      }
      const updated = planningLogic.commitExpedition(existing, ctx)
      return { events: [{ type: "EXPEDITION_COMMITTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "StartExpedition": {
      const id = String(intent.payload.id)
      if (isBlockedByUpstreamGate(state, id)) {
        throw new Error(`UPSTREAM_GATE_BLOCKED: Expedition ${id} cannot start while an upstream gate is unresolved`)
      }
      const existing = state.expeditions[id]
      if (!existing) {
        return { events: [{ type: "EXPEDITION_STARTED", payload: { id, status: "executing" } }] }
      }
      const updated = planningLogic.startExpedition(existing, ctx)
      return { events: [{ type: "EXPEDITION_STARTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "CompleteExpedition": {
      const id = String(intent.payload.id)
      const existing = state.expeditions[id]
      if (!existing) {
        return { events: [{ type: "EXPEDITION_COMPLETED", payload: { id, status: "completed" } }] }
      }
      const updated = planningLogic.completeExpedition(existing, ctx)
      return { events: [{ type: "EXPEDITION_COMPLETED", payload: { id: updated.id, status: updated.status } }] }
    }

    // Review gate capabilities (EXP-PROGRAM-035)
    case "ApproveRefinedIntent": {
      const expeditionId = String(intent.payload.expeditionId)
      const refinedIntentInput = intent.payload.refinedIntent as Record<string, unknown>
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const policy = intent.payload.policy as Record<string, unknown>
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineApproveRefinedIntent(
        current,
        expeditionId,
        refinedIntentInput as Parameters<typeof engineApproveRefinedIntent>[2],
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string },
        policy as GatePolicy
      )
      return { events: result.events }
    }

    case "OpenReviewGate": {
      const expeditionId = String(intent.payload.expeditionId)
      const implementationReference = String(intent.payload.implementationReference)
      const policy = intent.payload.policy as Record<string, unknown>
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineOpenReviewGate(current, expeditionId, implementationReference, policy as GatePolicy)
      return { events: result.events }
    }

    case "ResolveReviewGate": {
      const expeditionId = String(intent.payload.expeditionId)
      const decision = String(intent.payload.decision) as ReviewDecisionType
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const reason = String(intent.payload.reason)
      const evidence = Array.isArray(intent.payload.evidence) ? intent.payload.evidence.map(String) : []
      const affectedAssets = Array.isArray(intent.payload.affectedAssets) ? intent.payload.affectedAssets.map(String) : []
      const requiredChanges = Array.isArray(intent.payload.requiredChanges) ? intent.payload.requiredChanges.map(String) : []
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineResolveReviewGate(
        current,
        decision,
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string },
        reason,
        evidence,
        affectedAssets,
        requiredChanges
      )
      return { events: result.events }
    }

    case "RequestRevision": {
      const expeditionId = String(intent.payload.expeditionId)
      const gateId = String(intent.payload.gateId)
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const reason = String(intent.payload.reason)
      const evidence = Array.isArray(intent.payload.evidence) ? intent.payload.evidence.map(String) : []
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineRequestRevision(
        current,
        gateId,
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string },
        reason,
        evidence
      )
      return { events: result.events }
    }

    case "OpenAcceptanceGate": {
      const expeditionId = String(intent.payload.expeditionId)
      const policy = intent.payload.policy as Record<string, unknown>
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineOpenAcceptanceGate(current, policy as GatePolicy)
      return { events: result.events }
    }

    case "ResolveAcceptanceGate": {
      const expeditionId = String(intent.payload.expeditionId)
      const decision = String(intent.payload.decision) as "accepted" | "rejected"
      const reviewer = intent.payload.reviewer as { kind: string; id: string }
      const reason = String(intent.payload.reason)
      const evidence = Array.isArray(intent.payload.evidence) ? intent.payload.evidence.map(String) : []
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineResolveAcceptanceGate(
        current,
        decision,
        reviewer as { kind: "human" | "ai" | "council" | "engine" | "asset_owner"; id: string },
        reason,
        evidence
      )
      return { events: result.events }
    }

    case "CloseExpedition": {
      const expeditionId = String(intent.payload.expeditionId)
      const current = ensureReviewGateExpedition(state, expeditionId)
      const result = engineCloseExpedition(current)
      return { events: result.events }
    }

    case "AddObjective": {
      const id = String(intent.payload.id)
      const expeditionId = String(intent.payload.expeditionId)
      const title = String(intent.payload.title)
      const purpose = String(intent.payload.purpose || "")
      const objective = planningLogic.createObjective(id, expeditionId, title, purpose, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "OBJECTIVE_ADDED", payload: { objective } }] }
    }

    case "RecordDiscovery": {
      const id = String(intent.payload.id)
      const expeditionId = String(intent.payload.expeditionId)
      const description = String(intent.payload.description)
      const discoveryContext = String(intent.payload.context || "")
      const impact = String(intent.payload.impact || "medium") as Discovery["impact"]
      const discovery = planningLogic.createDiscovery(id, expeditionId, description, discoveryContext, impact, ctx, intent.payload as Record<string, unknown>)
      return { events: [{ type: "DISCOVERY_RECORDED", payload: { discovery } }] }
    }

    case "AcceptDecision": {
      const id = String(intent.payload.id)
      const existing = state.decisions[id]
      if (!existing) {
        return { events: [{ type: "DECISION_ACCEPTED", payload: { id, status: "accepted" } }] }
      }
      const updated = planningLogic.acceptDecision(existing, ctx)
      return { events: [{ type: "DECISION_ACCEPTED", payload: { id: updated.id, status: updated.status } }] }
    }

    case "RejectDecision": {
      const id = String(intent.payload.id)
      const existing = state.decisions[id]
      if (!existing) {
        return { events: [{ type: "DECISION_REJECTED", payload: { id, status: "rejected" } }] }
      }
      const updated = planningLogic.rejectDecision(existing, ctx)
      return { events: [{ type: "DECISION_REJECTED", payload: { id: updated.id, status: updated.status } }] }
    }

    // ============================================================
    // Repository governance capabilities (EXP-PROGRAM-028)
    // ============================================================
    case "InitializeRepository": {
      const repositoryId = String(intent.payload.repositoryId)
      const defaultBranch = String(intent.payload.defaultBranch)
      const forgeProvider = String(intent.payload.forgeProvider)
      const versionStrategy = String(intent.payload.versionStrategy)
      return {
        events: [{
          type: "REPOSITORY_INITIALIZED",
          payload: { repositoryId, defaultBranch, forgeProvider, versionStrategy },
        }],
      }
    }

    case "CreateBranch": {
      const branchName = String(intent.payload.branchName)
      const branchType = String(intent.payload.branchType)
      const baseBranch = typeof intent.payload.baseBranch === "string" ? intent.payload.baseBranch : undefined
      const missionId = typeof intent.payload.missionId === "string" ? intent.payload.missionId : undefined
      const expeditionId = typeof intent.payload.expeditionId === "string" ? intent.payload.expeditionId : undefined
      return {
        events: [{
          type: "BRANCH_CREATED",
          payload: { branchName, branchType, baseBranch, missionId, expeditionId },
        }],
      }
    }

    case "OpenPullRequest": {
      const pullRequestId = String(intent.payload.pullRequestId)
      const forgeId = String(intent.payload.forgeId)
      const url = String(intent.payload.url)
      const number = Number(intent.payload.number)
      const headBranch = String(intent.payload.headBranch)
      const baseBranch = String(intent.payload.baseBranch)
      const title = String(intent.payload.title || "")
      const missionId = typeof intent.payload.missionId === "string" ? intent.payload.missionId : undefined
      const expeditionId = typeof intent.payload.expeditionId === "string" ? intent.payload.expeditionId : undefined
      return {
        events: [{
          type: "PULL_REQUEST_OPENED",
          payload: { pullRequestId, forgeId, url, number, headBranch, baseBranch, title, missionId, expeditionId },
        }],
      }
    }

    case "ApprovePromotion": {
      const promotionId = String(intent.payload.promotionId)
      const approver = String(intent.payload.approver || "operator")
      return {
        events: [{ type: "PROMOTION_APPROVED", payload: { promotionId, approver } }],
      }
    }

    case "MergePullRequest": {
      const pullRequestId = String(intent.payload.pullRequestId)
      const commit = String(intent.payload.commit)
      const strategy = String(intent.payload.strategy || "merge")
      return {
        events: [{ type: "PULL_REQUEST_MERGED", payload: { pullRequestId, commit, strategy } }],
      }
    }

    case "CreateRelease": {
      const releaseId = String(intent.payload.releaseId)
      const tag = String(intent.payload.tag)
      const targetCommit = String(intent.payload.targetCommit)
      const evidenceReference = typeof intent.payload.evidenceReference === "string" ? intent.payload.evidenceReference : undefined
      return {
        events: [{ type: "RELEASE_CREATED", payload: { releaseId, tag, targetCommit, evidenceReference } }],
      }
    }

    default:
      return { events: [] }
  }
}

/** Convert a domain result into canonical events with transaction metadata */
export function toEvents(
  result: CapabilityResult,
  ctx: ExecutionContext
): Array<{
  id: string
  type: string
  timestamp: number
  transactionId: string
  capability: string
  actor: string
  payload: Record<string, unknown>
  eventHash: string
  previousHash: string
}> {
  return result.events.map((event, index) => {
    const base = {
      id: `${ctx.commandId}-${index}`,
      type: event.type,
      timestamp: ctx.timestamp,
      transactionId: ctx.commandId,
      capability: ctx.capability,
      actor: ctx.actor,
      payload: event.payload,
      previousHash: ctx.previousHash,
    }
    return {
      ...base,
      eventHash: computeEventHash(base),
    }
  })
}
