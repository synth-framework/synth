// ============================================================
// CAPABILITY: Registry System
// ============================================================

import path from "node:path"
import type { Capability, CapabilityInvocation, CapabilityResult, CanonicalState, DerivedState, DomainContext } from "../types/index.js"
import type { AgentIdentity } from "../identity/types.js"
import { applyDomain } from "../domain/execution.js"
import { identityPayloadMetadata } from "../identity/index.js"
import { assessExpeditionMissionAlignment } from "../governance/scope-alignment.js"
import * as sdk from "../sdk/index.js"
import { sha256 } from "../sdk/hashing/index.js"
import {
  createWorkItem, startWorkItem, completeWorkItem, blockWorkItem,
  createPlan, activatePlan, completePlan,
  createMilestone, startMilestone, completeMilestone,
  createProject,
  createMission, approveMission, completeMission, archiveMission, deleteMission,
  createExpedition, approveExpedition, commitExpedition, startExpedition, pauseExpedition, completeExpedition, cancelExpedition, archiveExpedition, refineExpedition, deleteExpedition, moveExpedition,
  createObjective, completeObjective,
  createDiscovery,
  createDecision, acceptDecision, rejectDecision,
  createGeneratedWorkItem, completeGeneratedWorkItem,
} from "../domain/index.js"

/** Recursively freeze a value and all its nested objects/arrays/maps/sets. */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value
  if (Object.isFrozen(value)) return value

  if (value instanceof Map) {
    for (const [k, v] of value.entries()) {
      deepFreeze(k)
      deepFreeze(v)
    }
    return Object.freeze(value)
  }

  if (value instanceof Set) {
    for (const v of value.values()) {
      deepFreeze(v)
    }
    return Object.freeze(value)
  }

  Object.freeze(value)
  for (const key of Reflect.ownKeys(value as Record<string | symbol, unknown>)) {
    deepFreeze((value as Record<string | symbol, unknown>)[key])
  }
  return value
}

export class Registry {
  private capabilities = new Map<string, Capability>()
  private _frozen = false

  register(cap: Capability): void {
    if (this._frozen) {
      throw new Error("INVARIANT_VIOLATION: registry is frozen")
    }
    this.capabilities.set(cap.name, cap)
  }

  resolve(name: string): Capability | undefined {
    return this.capabilities.get(name)
  }

  has(name: string): boolean {
    return this.capabilities.has(name)
  }

  list(): string[] {
    return Array.from(this.capabilities.keys())
  }

  execute(
    name: string,
    ctx: { intent: CapabilityInvocation; state: CanonicalState; derivedState: DerivedState; executionCtx: DomainContext },
  ): CapabilityResult {
    const cap = this.resolve(name)
    if (!cap) throw new Error(`UNKNOWN_CAPABILITY: ${name}`)
    for (const precondition of cap.preconditions) {
      if (!precondition.evaluate(ctx.intent, ctx.state)) {
        throw new Error(`PRECONDITION_FAILED: ${precondition.name}`)
      }
    }
    return cap.handler(ctx)
  }

  size(): number {
    return this.capabilities.size
  }

  freeze(): void {
    this._frozen = true
    for (const [, value] of this.capabilities) {
      deepFreeze(value)
    }
    Object.freeze(this.capabilities)
  }

  isFrozen(): boolean {
    return this._frozen
  }
}

/** Legacy Ticket capability names → canonical WorkItem names (ASC-001) */
export const CAPABILITY_ALIASES: Record<string, string> = {
  CreateTicket: "CreateWorkItem",
  StartTicket: "StartWorkItem",
  CompleteTicket: "CompleteWorkItem",
  BlockTicket: "BlockWorkItem",
}

/** Translate legacy capability names at API boundary */
export function translateCapability(capability: string): string {
  return CAPABILITY_ALIASES[capability] || capability
}

export function createCapabilityRegistry(): Registry {
  const registry = new Registry()
  for (const cap of createDefaultCapabilities()) {
    registry.register(cap)
  }
  return registry
}

export function createDefaultCapabilities(): Capability[] {
  return [
    // Canonical WorkItem capabilities
    {
      name: "CreateWorkItem",
      description: "Create a new work item",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["WORK_ITEM_CREATED"], resultType: "WorkItem" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: ["workitem_id_unique"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const id = String(intent.payload.id)
        const workItem = createWorkItem(id, executionCtx, intent.payload as Record<string, unknown>)
        return { events: [{ type: "WORK_ITEM_CREATED", payload: { workItem } }], result: workItem }
      },
    },
    {
      name: "StartWorkItem",
      description: "Start work on a work item",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["WORK_ITEM_STARTED"], resultType: "WorkItem" },
      preconditions: [
        {
          name: "workitem_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.workItems },
        },
        {
          name: "workitem_not_complete",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.workItems[id]?.status !== "complete" },
        },
      ],
      postconditions: [],
      invariantsChecked: ["single_active_execution"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.workItems[id]
        if (!existing) return { events: [{ type: "WORK_ITEM_STARTED", payload: { id, status: "active" } }] }
        const updated = startWorkItem(existing, executionCtx)
        return { events: [{ type: "WORK_ITEM_STARTED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },
    {
      name: "CompleteWorkItem",
      description: "Complete a work item",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["WORK_ITEM_COMPLETED"], resultType: "WorkItem" },
      preconditions: [
        {
          name: "workitem_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.workItems },
        },
        {
          name: "workitem_active",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.workItems[id]?.status === "active" },
        },
      ],
      postconditions: [],
      invariantsChecked: ["verified_before_complete"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.workItems[id]
        if (!existing) return { events: [{ type: "WORK_ITEM_COMPLETED", payload: { id, status: "complete" } }] }
        const updated = completeWorkItem(existing, executionCtx)
        return { events: [{ type: "WORK_ITEM_COMPLETED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },
    {
      name: "BlockWorkItem",
      description: "Block a work item",
      inputSchema: { required: ["id"], types: { id: "string", reason: "string" } },
      outputSchema: { events: ["WORK_ITEM_BLOCKED"], resultType: "WorkItem" },
      preconditions: [
        {
          name: "workitem_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.workItems },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.workItems[id]
        const reason = String(intent.payload.reason || "")
        if (!existing) return { events: [{ type: "WORK_ITEM_BLOCKED", payload: { id, status: "blocked", reason } }] }
        const updated = blockWorkItem(existing, reason, executionCtx)
        return { events: [{ type: "WORK_ITEM_BLOCKED", payload: { id: updated.id, status: updated.status, reason } }], result: updated }
      },
    },

    // Plan capabilities
    {
      name: "CreatePlan",
      description: "Create a new plan",
      inputSchema: { required: ["id", "name"], types: { id: "string", name: "string" } },
      outputSchema: { events: ["PLAN_CREATED"], resultType: "Plan" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: ["plan_id_unique"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const id = String(intent.payload.id)
        const name = String(intent.payload.name)
        const plan = createPlan(id, name, executionCtx, intent.payload as Record<string, unknown>)
        return { events: [{ type: "PLAN_CREATED", payload: { plan } }], result: plan }
      },
    },
    {
      name: "ActivatePlan",
      description: "Activate a plan",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["PLAN_ACTIVATED"], resultType: "Plan" },
      preconditions: [
        {
          name: "plan_exists_draft",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.plans[id]?.status === "draft" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.plans[id]
        if (!existing) return { events: [{ type: "PLAN_ACTIVATED", payload: { id, status: "active" } }] }
        const updated = activatePlan(existing, executionCtx)
        return { events: [{ type: "PLAN_ACTIVATED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },
    {
      name: "CompletePlan",
      description: "Complete a plan",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["PLAN_COMPLETED"], resultType: "Plan" },
      preconditions: [
        {
          name: "plan_exists_active",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.plans[id]?.status === "active" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.plans[id]
        if (!existing) return { events: [{ type: "PLAN_COMPLETED", payload: { id, status: "completed" } }] }
        const updated = completePlan(existing, executionCtx)
        return { events: [{ type: "PLAN_COMPLETED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },

    // Milestone capabilities
    {
      name: "CreateMilestone",
      description: "Create a new milestone",
      inputSchema: { required: ["id", "planId", "name"], types: { id: "string", planId: "string", name: "string" } },
      outputSchema: { events: ["MILESTONE_CREATED"], resultType: "Milestone" },
      preconditions: [
        {
          name: "plan_exists",
          evaluate: (intent, state) => { const planId = String(intent.payload.planId); return planId in state.plans },
        },
      ],
      postconditions: [],
      invariantsChecked: ["milestone_id_unique"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const id = String(intent.payload.id)
        const planId = String(intent.payload.planId)
        const name = String(intent.payload.name)
        const ms = createMilestone(id, planId, name, executionCtx, intent.payload as Record<string, unknown>)
        return { events: [{ type: "MILESTONE_CREATED", payload: { milestone: ms } }], result: ms }
      },
    },
    {
      name: "StartMilestone",
      description: "Start a milestone",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["MILESTONE_STARTED"], resultType: "Milestone" },
      preconditions: [
        {
          name: "milestone_exists_pending",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.milestones[id]?.status === "pending" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.milestones[id]
        if (!existing) return { events: [{ type: "MILESTONE_STARTED", payload: { id, status: "in_progress" } }] }
        const updated = startMilestone(existing, executionCtx)
        return { events: [{ type: "MILESTONE_STARTED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },
    {
      name: "CompleteMilestone",
      description: "Complete a milestone",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["MILESTONE_COMPLETED"], resultType: "Milestone" },
      preconditions: [
        {
          name: "milestone_exists_in_progress",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.milestones[id]?.status === "in_progress" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.milestones[id]
        if (!existing) return { events: [{ type: "MILESTONE_COMPLETED", payload: { id, status: "completed" } }] }
        const updated = completeMilestone(existing, executionCtx)
        return { events: [{ type: "MILESTONE_COMPLETED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },

    // Project capabilities
    {
      name: "CreateProject",
      description: "Create a new project",
      inputSchema: { required: ["id", "name", "goal"], types: { id: "string", name: "string", goal: "string" } },
      outputSchema: { events: ["PROJECT_CREATED"], resultType: "Project" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: ["project_id_unique"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const id = String(intent.payload.id)
        const name = String(intent.payload.name)
        const goal = String(intent.payload.goal)
        const project = createProject(id, name, goal, executionCtx, intent.payload as Record<string, unknown>)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { project }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "PROJECT_CREATED", payload }], result: project }
      },
    },
    {
      name: "InitializeProject",
      description: "Initialize the current directory as a SYNTH project",
      inputSchema: {
        required: ["projectId", "name", "governanceVersion"],
        types: {
          projectId: "string",
          name: "string",
          governanceVersion: "string",
          sourceType: "string",
          sourceLocation: "string",
          declaredIntent: "string",
          adapterId: "string",
          adapterVersion: "string",
          evidenceReference: "string",
        },
      },
      outputSchema: { events: ["PROJECT_INITIALIZED"], resultType: "ProjectInitialization" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: ["project_not_initialized"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const projectId = String(intent.payload.projectId)
        const name = String(intent.payload.name)
        const governanceVersion = String(intent.payload.governanceVersion)

        const optionalString = (value: unknown): string | undefined =>
          typeof value === "string" && value.length > 0 ? value : undefined

        const payload: Record<string, unknown> = { projectId, name, governanceVersion }
        const sourceType = optionalString(intent.payload.sourceType)
        const sourceLocation = optionalString(intent.payload.sourceLocation)
        const declaredIntent = optionalString(intent.payload.declaredIntent)
        const adapterId = optionalString(intent.payload.adapterId)
        const adapterVersion = optionalString(intent.payload.adapterVersion)
        const evidenceReference = optionalString(intent.payload.evidenceReference)
        const projectModel = intent.payload.projectModel as Record<string, unknown> | undefined

        if (sourceType) payload.sourceType = sourceType
        if (sourceLocation) payload.sourceLocation = sourceLocation
        if (declaredIntent) payload.declaredIntent = declaredIntent
        if (adapterId) payload.adapterId = adapterId
        if (adapterVersion) payload.adapterVersion = adapterVersion
        if (evidenceReference) payload.evidenceReference = evidenceReference
        if (projectModel) payload.projectModel = projectModel

        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        if (metadata) payload.metadata = metadata

        return {
          events: [{
            type: "PROJECT_INITIALIZED",
            payload,
          }],
          result: { projectId, name, governanceVersion, sourceType, adapterId, evidenceReference },
        }
      },
    },

    // Planning capabilities (PCE)
    {
      name: "CreateMission",
      description: "Create a new mission",
      inputSchema: { required: ["id", "name"], types: { id: "string", name: "string", purpose: "string" } },
      outputSchema: { events: ["MISSION_CREATED"], resultType: "Mission" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: ["mission_id_unique"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const id = String(intent.payload.id)
        const name = String(intent.payload.name)
        const purpose = String(intent.payload.purpose || "")
        const mission = createMission(id, name, purpose, executionCtx, intent.payload as Record<string, unknown>)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { mission }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "MISSION_CREATED", payload }], result: mission }
      },
    },
    {
      name: "ApproveMission",
      description: "Approve a mission",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["MISSION_APPROVED"], resultType: "Mission" },
      preconditions: [
        {
          name: "mission_exists_draft",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.missions[id]?.status === "draft" },
        },
      ],
      postconditions: [],
      invariantsChecked: ["alignment_contract_aligned"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, derivedState, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.missions[id]
        if (!existing) return { events: [{ type: "MISSION_APPROVED", payload: { id, status: "active" } }] }
        const alignmentContractId = String(intent.payload.alignmentContractId || existing.alignmentContractId || "")
        if (!alignmentContractId || alignmentContractId === "undefined") {
          throw new Error("ALIGNMENT_CONTRACT_REQUIRED: ApproveMission requires an alignment contract")
        }
        const contract = derivedState.alignmentContracts[alignmentContractId]
        if (!contract) {
          throw new Error(`ALIGNMENT_CONTRACT_NOT_FOUND: ${alignmentContractId}`)
        }
        const alignedGate = Object.values(derivedState.divergenceGates).find(
          (g) => g.contractId === alignmentContractId && g.status === "aligned"
        )
        if (!alignedGate) {
          throw new Error(`DIVERGENCE_GATE_NOT_ALIGNED: Mission cannot be approved without an aligned divergence gate for contract ${alignmentContractId}`)
        }
        const updated = approveMission(existing, executionCtx)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id: updated.id, status: updated.status, alignmentContractId }
        if (metadata) payload.metadata = metadata
        return {
          events: [{ type: "MISSION_APPROVED", payload }],
          result: { ...updated, alignmentContractId },
        }
      },
    },
    {
      name: "CompleteMission",
      description: "Complete a mission",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["MISSION_COMPLETED"], resultType: "Mission" },
      preconditions: [
        {
          name: "mission_exists_active",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.missions[id]?.status === "active" },
        },
      ],
      postconditions: [],
      invariantsChecked: ["convergence_certification_required"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, derivedState, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.missions[id]
        if (!existing) return { events: [{ type: "MISSION_COMPLETED", payload: { id, status: "completed" } }] }
        const hasValidCertification = Object.values(derivedState.convergenceCertifications).some(
          (c) => c.missionId === id && c.decision === "converged"
        )
        if (!hasValidCertification) {
          throw new Error(`CONVERGENCE_CERTIFICATION_REQUIRED: Mission ${id} cannot be completed without a converged certification`)
        }
        const updated = completeMission(existing, executionCtx)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id: updated.id, status: updated.status }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "MISSION_COMPLETED", payload }], result: updated }
      },
    },
    {
      name: "CertifyConvergence",
      description: "Certify that a mission outcome remains converged with approved intent",
      inputSchema: {
        required: ["missionId", "expeditionId", "alignmentContractId", "observedFeatures"],
        types: {
          missionId: "string",
          expeditionId: "string",
          alignmentContractId: "string",
          observedFeatures: "object",
          artifacts: "array",
          runtimeEvidence: "array",
          executionEvidence: "array",
          ruleSetId: "string",
          certifier: "object",
        },
      },
      outputSchema: { events: ["CONVERGENCE_CERTIFIED", "CONVERGENCE_DIVERGED"], resultType: "ConvergenceResult" },
      preconditions: [
        {
          name: "mission_exists",
          evaluate: (intent, state) => { const missionId = String(intent.payload.missionId); return missionId in state.missions },
        },
      ],
      postconditions: [],
      invariantsChecked: ["deterministic_convergence_evaluation"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, derivedState, executionCtx }) => {
        return applyDomain(
          {
            capability: "CertifyConvergence",
            payload: intent.payload as Record<string, unknown>,
            actor: intent.actor ?? "synth-cli-operator",
          },
          state,
          derivedState,
          executionCtx
        )
      },
    },
    {
      name: "ArchiveMission",
      description: "Archive a mission",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["MISSION_ARCHIVED"], resultType: "Mission" },
      preconditions: [
        {
          name: "mission_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.missions },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.missions[id]
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { id, status: "archived" }
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "MISSION_ARCHIVED", payload }] }
        }
        const updated = archiveMission(existing, executionCtx)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id: updated.id, status: updated.status }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "MISSION_ARCHIVED", payload }], result: updated }
      },
    },
    {
      name: "DeleteMission",
      description: "Delete an empty mission that hosts no expeditions",
      inputSchema: { required: ["id"], types: { id: "string", reason: "string" } },
      outputSchema: { events: ["MISSION_DELETED"], resultType: "Mission" },
      preconditions: [
        {
          name: "mission_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.missions },
        },
        {
          name: "mission_empty",
          evaluate: (intent, state) => {
            const id = String(intent.payload.id)
            const mission = state.missions[id]
            return !!mission && mission.expeditions.length === 0
          },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const reason = typeof intent.payload.reason === "string" ? intent.payload.reason : undefined
        const existing = state.missions[id]
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id }
        if (reason) payload.reason = reason
        if (metadata) payload.metadata = metadata
        if (!existing) return { events: [{ type: "MISSION_DELETED", payload }] }
        const updated = deleteMission(existing, executionCtx)
        return { events: [{ type: "MISSION_DELETED", payload }], result: updated }
      },
    },
    {
      name: "CreateExpedition",
      description: "Create a new expedition",
      inputSchema: { required: ["id", "missionId", "name"], types: { id: "string", missionId: "string", name: "string", goal: "string" } },
      outputSchema: { events: ["EXPEDITION_CREATED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "mission_exists",
          evaluate: (intent, state) => { const missionId = String(intent.payload.missionId); return missionId in state.missions },
        },
      ],
      postconditions: [],
      invariantsChecked: ["expedition_id_unique"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const id = String(intent.payload.id)
        const missionId = String(intent.payload.missionId)
        const name = String(intent.payload.name)
        const goal = String(intent.payload.goal || "")
        const expedition = createExpedition(id, missionId, name, goal, executionCtx, intent.payload as Record<string, unknown>)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { expedition }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "EXPEDITION_CREATED", payload }], result: expedition }
      },
    },
    {
      name: "ApproveExpedition",
      description: "Approve an expedition",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["EXPEDITION_APPROVED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists_draft",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.expeditions[id]?.status === "draft" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.expeditions[id]
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { id, status: "approved" }
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "EXPEDITION_APPROVED", payload }] }
        }
        const updated = approveExpedition(existing, executionCtx)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id: updated.id, status: updated.status }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "EXPEDITION_APPROVED", payload }], result: updated }
      },
    },
    {
      name: "CommitExpedition",
      description: "Commit an approved expedition to runtime",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["EXPEDITION_COMMITTED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists_approved",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.expeditions[id]?.status === "approved" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.expeditions[id]
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { id, status: "committed" }
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "EXPEDITION_COMMITTED", payload }] }
        }
        const updated = commitExpedition(existing, executionCtx)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id: updated.id, status: updated.status }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "EXPEDITION_COMMITTED", payload }], result: updated }
      },
    },
    {
      name: "StartExpedition",
      description: "Start, resume, or unarchive an expedition",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["EXPEDITION_STARTED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists_startable",
          evaluate: (intent, state) => {
            const id = String(intent.payload.id)
            const status = state.expeditions[id]?.status
            return status === "committed" || status === "archived" || status === "paused" || status === "cancelled"
          },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.expeditions[id]
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { id, status: "executing" }
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "EXPEDITION_STARTED", payload }] }
        }
        const updated = startExpedition(existing, executionCtx)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id: updated.id, status: updated.status }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "EXPEDITION_STARTED", payload }], result: updated }
      },
    },
    {
      name: "PauseExpedition",
      description: "Pause an executing expedition",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["EXPEDITION_PAUSED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists_executing",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.expeditions[id]?.status === "executing" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.expeditions[id]
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { id, status: "paused" }
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "EXPEDITION_PAUSED", payload }] }
        }
        const updated = pauseExpedition(existing, executionCtx)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id: updated.id, status: updated.status }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "EXPEDITION_PAUSED", payload }], result: updated }
      },
    },
    {
      name: "CompleteExpedition",
      description: "Complete an expedition",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["EXPEDITION_COMPLETED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists_executing",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.expeditions[id]?.status === "executing" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.expeditions[id]
        const force = intent.payload.force === true || intent.payload.force === "true"
        const forceReason = typeof intent.payload.forceReason === "string" ? intent.payload.forceReason : undefined
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { id, status: "completed" }
          if (force) {
            payload.force = true
            if (forceReason) payload.forceReason = forceReason
          }
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "EXPEDITION_COMPLETED", payload }] }
        }
        const updated = completeExpedition(existing, executionCtx, force, forceReason)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id: updated.id, status: updated.status }
        if (force) {
          payload.force = true
          if (forceReason) payload.forceReason = forceReason
        }
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "EXPEDITION_COMPLETED", payload }], result: updated }
      },
    },
    {
      name: "ArchiveExpedition",
      description: "Archive an expedition as a safe fallback when a required capability is unavailable",
      inputSchema: { required: ["id"], types: { id: "string", reason: "string" } },
      outputSchema: { events: ["EXPEDITION_ARCHIVED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.expeditions },
        },
        {
          name: "expedition_not_terminal",
          evaluate: (intent, state) => {
            const id = String(intent.payload.id)
            const status = state.expeditions[id]?.status
            return status !== "completed" && status !== "cancelled" && status !== "archived"
          },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const reason = typeof intent.payload.reason === "string" ? intent.payload.reason : undefined
        const existing = state.expeditions[id]
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { expeditionId: id, status: "archived", reason }
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "EXPEDITION_ARCHIVED", payload }] }
        }
        const updated = archiveExpedition(existing, executionCtx)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { expeditionId: id, id: updated.id, status: updated.status, reason, archivedAt: executionCtx.timestamp }
        if (metadata) payload.metadata = metadata
        return {
          events: [{ type: "EXPEDITION_ARCHIVED", payload }],
          result: updated,
        }
      },
    },
    {
      name: "CancelExpedition",
      description: "Cancel a non-terminal expedition",
      inputSchema: { required: ["id"], types: { id: "string", reason: "string" } },
      outputSchema: { events: ["EXPEDITION_CANCELLED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.expeditions },
        },
        {
          name: "expedition_not_terminal",
          evaluate: (intent, state) => {
            const id = String(intent.payload.id)
            const status = state.expeditions[id]?.status
            return status !== "completed" && status !== "cancelled" && status !== "archived"
          },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const reason = typeof intent.payload.reason === "string" ? intent.payload.reason : undefined
        const existing = state.expeditions[id]
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { expeditionId: id, status: "cancelled", reason }
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "EXPEDITION_CANCELLED", payload }] }
        }
        const updated = cancelExpedition(existing, executionCtx)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { expeditionId: id, id: updated.id, status: updated.status, reason, cancelledAt: executionCtx.timestamp }
        if (metadata) payload.metadata = metadata
        return {
          events: [{ type: "EXPEDITION_CANCELLED", payload }],
          result: updated,
        }
      },
    },
    {
      name: "RefineExpedition",
      description: "Record a charter refinement on a committed or executing expedition",
      inputSchema: { required: ["id", "note"], types: { id: "string", note: "string", refinementId: "string" } },
      outputSchema: { events: ["EXPEDITION_REFINED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.expeditions },
        },
        {
          name: "expedition_not_terminal",
          evaluate: (intent, state) => {
            const id = String(intent.payload.id)
            const status = state.expeditions[id]?.status
            return status !== "completed" && status !== "cancelled" && status !== "archived"
          },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const note = typeof intent.payload.note === "string" ? intent.payload.note : ""
        const refinementId = typeof intent.payload.refinementId === "string" ? intent.payload.refinementId : sha256(`${id}:${executionCtx.timestamp}:${note}`).slice(0, 16)
        const existing = state.expeditions[id]
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { expeditionId: id, note, refinementId }
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "EXPEDITION_REFINED", payload }] }
        }
        const updated = refineExpedition(existing, executionCtx, note, refinementId)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { expeditionId: id, id: updated.id, status: updated.status, note, refinementId, refinedAt: executionCtx.timestamp }
        if (metadata) payload.metadata = metadata
        return {
          events: [{ type: "EXPEDITION_REFINED", payload }],
          result: updated,
        }
      },
    },
    {
      name: "DeleteExpedition",
      description: "Delete an empty expedition that has no objectives",
      inputSchema: { required: ["id"], types: { id: "string", reason: "string" } },
      outputSchema: { events: ["EXPEDITION_DELETED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.expeditions },
        },
        {
          name: "expedition_empty",
          evaluate: (intent, state) => {
            const id = String(intent.payload.id)
            const expedition = state.expeditions[id]
            if (!expedition) return false
            if (expedition.objectives.length > 0) return false
            return !Object.values(state.objectives || {}).some((o) => o.expeditionId === id)
          },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const reason = typeof intent.payload.reason === "string" ? intent.payload.reason : undefined
        const existing = state.expeditions[id]
        const missionId = existing?.missionId || String(intent.payload.missionId || "")
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { id, expeditionId: id, missionId }
        if (reason) payload.reason = reason
        if (metadata) payload.metadata = metadata
        if (!existing) return { events: [{ type: "EXPEDITION_DELETED", payload }] }
        const updated = deleteExpedition(existing, executionCtx)
        return { events: [{ type: "EXPEDITION_DELETED", payload }], result: updated }
      },
    },
    {
      name: "MoveExpedition",
      description: "Re-parent an expedition to a different mission under scope-and-intent verification or explicit operator approval",
      inputSchema: { required: ["id", "toMissionId"], types: { id: "string", toMissionId: "string", reason: "string", approved: "boolean" } },
      outputSchema: { events: ["EXPEDITION_MOVED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.expeditions },
        },
        {
          name: "target_mission_exists",
          evaluate: (intent, state) => { const toMissionId = String(intent.payload.toMissionId); return toMissionId in state.missions },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const toMissionId = String(intent.payload.toMissionId)
        const reason = typeof intent.payload.reason === "string" ? intent.payload.reason : undefined
        const approved = intent.payload.approved === true || intent.payload.approved === "true"
        const existing = state.expeditions[id]
        const fromMissionId = existing?.missionId || String(intent.payload.fromMissionId || "")
        if (!existing) {
          const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
          const payload: Record<string, unknown> = { id, expeditionId: id, fromMissionId, toMissionId, verification: "scope_aligned" }
          if (reason) payload.reason = reason
          if (metadata) payload.metadata = metadata
          return { events: [{ type: "EXPEDITION_MOVED", payload }] }
        }
        const targetMission = state.missions[toMissionId]
        const alignment = assessExpeditionMissionAlignment(existing, targetMission)
        const verification = alignment.aligned ? "scope_aligned" : "operator_approved"
        if (!alignment.aligned && !approved) {
          throw new Error(
            `SCOPE_ALIGNMENT_REQUIRED: expedition ${id} scope is not aligned with mission ${toMissionId} ` +
              `(alignment ${Math.round(alignment.score * 100)}%). Provide operator approval to proceed.`,
          )
        }
        const updated = moveExpedition(existing, toMissionId, executionCtx, {
          metadata: {
            moveVerification: verification,
            ...(reason ? { moveReason: reason } : {}),
          },
        })
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = {
          id: updated.id,
          expeditionId: updated.id,
          fromMissionId,
          toMissionId,
          verification,
        }
        if (reason) payload.reason = reason
        if (metadata) payload.metadata = metadata
        return { events: [{ type: "EXPEDITION_MOVED", payload }], result: updated }
      },
    },
    {
      name: "AttachEvidence",
      description: "Attach evidence artifacts to an expedition",
      inputSchema: { required: ["id", "attachments"], types: { id: "string", attachments: "array", note: "string" } },
      outputSchema: { events: ["EVIDENCE_ATTACHED"], resultType: "EvidenceAttachment" },
      preconditions: [
        {
          name: "expedition_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.expeditions },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: true,
      executionClass: "sync",
      handler: ({ intent }) => {
        const id = String(intent.payload.id)
        const attachments = Array.isArray(intent.payload.attachments) ? intent.payload.attachments : []
        const note = typeof intent.payload.note === "string" ? intent.payload.note : undefined
        return {
          events: [{ type: "EVIDENCE_ATTACHED", payload: { expeditionId: id, attachments, note } }],
          result: { expeditionId: id, attachments, note },
        }
      },
    },
    {
      name: "AddObjective",
      description: "Add an objective to an expedition",
      inputSchema: { required: ["id", "expeditionId", "title"], types: { id: "string", expeditionId: "string", title: "string", purpose: "string" } },
      outputSchema: { events: ["OBJECTIVE_ADDED"], resultType: "Objective" },
      preconditions: [
        {
          name: "expedition_exists",
          evaluate: (intent, state) => { const expeditionId = String(intent.payload.expeditionId); return expeditionId in state.expeditions },
        },
      ],
      postconditions: [],
      invariantsChecked: ["objective_id_unique"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const id = String(intent.payload.id)
        const expeditionId = String(intent.payload.expeditionId)
        const title = String(intent.payload.title)
        const purpose = String(intent.payload.purpose || "")
        const objective = createObjective(id, expeditionId, title, purpose, executionCtx, intent.payload as Record<string, unknown>)
        return { events: [{ type: "OBJECTIVE_ADDED", payload: { objective } }], result: objective }
      },
    },
    {
      name: "CompleteObjective",
      description: "Complete an objective",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["OBJECTIVE_COMPLETED"], resultType: "Objective" },
      preconditions: [
        {
          name: "objective_exists",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return id in state.objectives },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.objectives[id]
        if (!existing) return { events: [{ type: "OBJECTIVE_COMPLETED", payload: { id, status: "completed" } }] }
        const updated = completeObjective(existing, executionCtx)
        return { events: [{ type: "OBJECTIVE_COMPLETED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },
    {
      name: "RecordDiscovery",
      description: "Record a discovery",
      inputSchema: { required: ["id", "expeditionId", "description"], types: { id: "string", expeditionId: "string", description: "string", context: "string", impact: "string" } },
      outputSchema: { events: ["DISCOVERY_RECORDED"], resultType: "Discovery" },
      preconditions: [
        {
          name: "expedition_exists",
          evaluate: (intent, state) => { const expeditionId = String(intent.payload.expeditionId); return expeditionId in state.expeditions },
        },
      ],
      postconditions: [],
      invariantsChecked: ["discovery_id_unique"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const id = String(intent.payload.id)
        const expeditionId = String(intent.payload.expeditionId)
        const description = String(intent.payload.description)
        const context = String(intent.payload.context || "")
        const impact = String(intent.payload.impact || "medium") as "low" | "medium" | "high" | "critical"
        const discovery = createDiscovery(id, expeditionId, description, context, impact, executionCtx, intent.payload as Record<string, unknown>)
        return { events: [{ type: "DISCOVERY_RECORDED", payload: { discovery } }], result: discovery }
      },
    },
    {
      name: "RecordDecision",
      description: "Record and accept a new architectural decision",
      inputSchema: { required: ["id", "expeditionId", "title", "chosenAlternative"], types: { id: "string", expeditionId: "string", title: "string", chosenAlternative: "number" } },
      outputSchema: { events: ["DECISION_ACCEPTED"], resultType: "Decision" },
      preconditions: [
        {
          name: "expedition_exists",
          evaluate: (intent, state) => { const expeditionId = String(intent.payload.expeditionId); return expeditionId in state.expeditions },
        },
      ],
      postconditions: [],
      invariantsChecked: ["decision_id_unique"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const id = String(intent.payload.id)
        const expeditionId = String(intent.payload.expeditionId)
        const title = String(intent.payload.title)
        const chosenAlternative = Number(intent.payload.chosenAlternative)
        const alternatives = (intent.payload.alternatives as string[]) || []
        const consequences = (intent.payload.consequences as { positive?: string[]; negative?: string[] }) || { positive: [], negative: [] }
        const decision = createDecision(id, expeditionId, title, chosenAlternative, alternatives, executionCtx, intent.payload as Record<string, unknown>)
        decision.consequences = {
          positive: consequences.positive || [],
          negative: consequences.negative || [],
        }
        const accepted = acceptDecision(decision, executionCtx)
        return { events: [{ type: "DECISION_ACCEPTED", payload: { decision: accepted } }], result: accepted }
      },
    },
    {
      name: "AcceptDecision",
      description: "Accept a proposed decision",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["DECISION_ACCEPTED"], resultType: "Decision" },
      preconditions: [
        {
          name: "decision_exists_proposed",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.decisions[id]?.status === "proposed" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.decisions[id]
        if (!existing) return { events: [{ type: "DECISION_ACCEPTED", payload: { id, status: "accepted" } }] }
        const updated = acceptDecision(existing, executionCtx)
        return { events: [{ type: "DECISION_ACCEPTED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },
    {
      name: "RejectDecision",
      description: "Reject a decision",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["DECISION_REJECTED"], resultType: "Decision" },
      preconditions: [
        {
          name: "decision_exists_proposed",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.decisions[id]?.status === "proposed" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.decisions[id]
        if (!existing) return { events: [{ type: "DECISION_REJECTED", payload: { id, status: "rejected" } }] }
        const updated = rejectDecision(existing, executionCtx)
        return { events: [{ type: "DECISION_REJECTED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },
    {
      name: "RecordRepair",
      description: "Record that a replay repair was accepted and applied",
      inputSchema: { required: ["repairPlan"], types: { repairPlan: "object", appliedActions: "array" } },
      outputSchema: { events: ["REPAIR_ACCEPTED"], resultType: "RepairRecord" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const repairId = executionCtx.commandId
        const repairPlan = intent.payload.repairPlan ?? {}
        const appliedActions = Array.isArray(intent.payload.appliedActions) ? intent.payload.appliedActions : []
        return {
          events: [{
            type: "REPAIR_ACCEPTED",
            payload: { repairId, repairPlan, appliedActions, timestamp: executionCtx.timestamp },
          }],
          result: { repairId, appliedActions },
        }
      },
    },

    // Repository governance capabilities (EXP-PROGRAM-028)
    {
      name: "InitializeRepository",
      description: "Initialize repository governance state",
      inputSchema: {
        required: ["repositoryId", "defaultBranch", "forgeProvider", "versionStrategy"],
        types: {
          repositoryId: "string",
          defaultBranch: "string",
          forgeProvider: "string",
          versionStrategy: "string",
        },
      },
      outputSchema: { events: ["REPOSITORY_INITIALIZED"], resultType: "Repository" },
      preconditions: [
        {
          name: "repository_not_initialized",
          evaluate: (_intent, state) => state.repository === undefined,
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent }) => {
        const repositoryId = String(intent.payload.repositoryId)
        const defaultBranch = String(intent.payload.defaultBranch)
        const forgeProvider = String(intent.payload.forgeProvider)
        const versionStrategy = String(intent.payload.versionStrategy)
        return {
          events: [{
            type: "REPOSITORY_INITIALIZED",
            payload: { repositoryId, defaultBranch, forgeProvider, versionStrategy },
          }],
          result: { repositoryId, defaultBranch, forgeProvider, versionStrategy },
        }
      },
    },
    {
      name: "CreateBranch",
      description: "Create a governed branch",
      inputSchema: {
        required: ["branchName", "branchType"],
        types: {
          branchName: "string",
          branchType: "string",
          baseBranch: "string",
          missionId: "string",
          expeditionId: "string",
        },
      },
      outputSchema: { events: ["BRANCH_CREATED"], resultType: "RepositoryBranch" },
      preconditions: [
        {
          name: "repository_initialized",
          evaluate: (_intent, state) => state.repository !== undefined,
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent }) => {
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
          result: { branchName, branchType, baseBranch, missionId, expeditionId },
        }
      },
    },
    {
      name: "CreateExpeditionBranch",
      description: "Create the canonical expedition execution branch",
      inputSchema: {
        required: ["expeditionId", "branch", "baseCommit"],
        types: {
          expeditionId: "string",
          branch: "string",
          baseCommit: "string",
        },
      },
      outputSchema: { events: ["EXPEDITION_BRANCH_CREATED"], resultType: "ExpeditionBranch" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent }) => {
        const expeditionId = String(intent.payload.expeditionId)
        const branch = String(intent.payload.branch)
        const baseCommit = String(intent.payload.baseCommit || "")
        return {
          events: [{
            type: "EXPEDITION_BRANCH_CREATED",
            payload: { expeditionId, branch, baseCommit },
          }],
          result: { expeditionId, branch, baseCommit },
        }
      },
    },
    {
      name: "OpenPullRequest",
      description: "Open a pull request as a promotion proposal",
      inputSchema: {
        required: ["pullRequestId", "forgeId", "url", "number", "headBranch", "baseBranch"],
        types: {
          pullRequestId: "string",
          forgeId: "string",
          url: "string",
          number: "number",
          headBranch: "string",
          baseBranch: "string",
          title: "string",
          missionId: "string",
          expeditionId: "string",
        },
      },
      outputSchema: { events: ["PULL_REQUEST_OPENED"], resultType: "PullRequest" },
      preconditions: [
        {
          name: "repository_initialized",
          evaluate: (_intent, state) => state.repository !== undefined,
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent }) => {
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
          result: { pullRequestId, forgeId, url, number, headBranch, baseBranch, title, missionId, expeditionId },
        }
      },
    },
    {
      name: "ApprovePromotion",
      description: "Approve a proposed promotion",
      inputSchema: { required: ["promotionId"], types: { promotionId: "string", approver: "string" } },
      outputSchema: { events: ["PROMOTION_APPROVED"], resultType: "Promotion" },
      preconditions: [
        {
          name: "promotion_exists",
          evaluate: (intent, state) => {
            const id = String(intent.payload.promotionId)
            return Object.values(state.repository?.pullRequests ?? {}).some((pr) => pr.id === id)
          },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent }) => {
        const promotionId = String(intent.payload.promotionId)
        const approver = String(intent.payload.approver || "operator")
        return {
          events: [{ type: "PROMOTION_APPROVED", payload: { promotionId, approver } }],
          result: { promotionId, approver },
        }
      },
    },
    {
      name: "MergePullRequest",
      description: "Merge an approved pull request",
      inputSchema: { required: ["pullRequestId", "commit"], types: { pullRequestId: "string", commit: "string", strategy: "string" } },
      outputSchema: { events: ["PULL_REQUEST_MERGED"], resultType: "MergeResult" },
      preconditions: [
        {
          name: "pull_request_open",
          evaluate: (intent, state) => {
            const id = String(intent.payload.pullRequestId)
            return state.repository?.pullRequests[id]?.state === "open"
          },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent }) => {
        const pullRequestId = String(intent.payload.pullRequestId)
        const commit = String(intent.payload.commit)
        const strategy = String(intent.payload.strategy || "merge")
        return {
          events: [{ type: "PULL_REQUEST_MERGED", payload: { pullRequestId, commit, strategy } }],
          result: { pullRequestId, commit, strategy },
        }
      },
    },
    {
      name: "CreateRelease",
      description: "Create a governed release",
      inputSchema: {
        required: ["releaseId", "tag", "targetCommit"],
        types: { releaseId: "string", tag: "string", targetCommit: "string", evidenceReference: "string" },
      },
      outputSchema: { events: ["RELEASE_CREATED"], resultType: "Release" },
      preconditions: [
        {
          name: "repository_initialized",
          evaluate: (_intent, state) => state.repository !== undefined,
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent }) => {
        const releaseId = String(intent.payload.releaseId)
        const tag = String(intent.payload.tag)
        const targetCommit = String(intent.payload.targetCommit)
        const evidenceReference = typeof intent.payload.evidenceReference === "string" ? intent.payload.evidenceReference : undefined
        return {
          events: [{ type: "RELEASE_CREATED", payload: { releaseId, tag, targetCommit, evidenceReference } }],
          result: { releaseId, tag, targetCommit, evidenceReference },
        }
      },
    },

    // Condition fulfillment capability (EXP-GOV-015)
    {
      name: "FulfillCondition",
      description: "Fulfill a condition on a review gate",
      inputSchema: {
        required: ["expeditionId", "gateId", "conditionId"],
        types: {
          expeditionId: "string",
          gateId: "string",
          conditionId: "string",
          fulfilledBy: "string",
        },
      },
      outputSchema: { events: ["CONDITION_FULFILLED"], resultType: "void" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, derivedState, executionCtx }) => {
        return applyDomain(
          {
            capability: "FulfillCondition",
            payload: intent.payload as Record<string, unknown>,
            actor: intent.actor ?? "synth-cli-operator",
          },
          state,
          derivedState,
          executionCtx
        )
      },
    },

    // Filesystem mutation capability (EXP-CAPABILITY-BOUNDARY-001)
    {
      name: "FilesystemWrite",
      description: "Write a file through the ExecutionGate mutation boundary",
      inputSchema: {
        required: ["path", "content"],
        types: { path: "string", content: "string" },
      },
      outputSchema: { events: [], resultType: "MutationResult" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: true,
      executionClass: "sync",
      handler: ({ intent }) => {
        const target = String(intent.payload.path)
        const content = String(intent.payload.content)
        return {
          events: [],
          mutations: [
            {
              capability: "filesystem",
              operation: "write",
              target,
              payload: { content },
            },
          ],
          result: { target },
        }
      },
    },

    // Legacy state migration capabilities (EXP-MIGRATE-001)
    {
      name: "MigrateArchive",
      description: "Record that legacy Synth state was archived",
      inputSchema: {
        required: ["archiveId", "sourcePath", "archivePath"],
        types: {
          archiveId: "string",
          sourcePath: "string",
          archivePath: "string",
          reason: "string",
        },
      },
      outputSchema: { events: ["ARCHIVE_CREATED"], resultType: "ArchiveRecord" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const archiveId = String(intent.payload.archiveId)
        const sourcePath = String(intent.payload.sourcePath)
        const archivePath = String(intent.payload.archivePath)
        const reason = typeof intent.payload.reason === "string" ? intent.payload.reason : undefined
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const payload: Record<string, unknown> = { archiveId, sourcePath, archivePath }
        if (reason) payload.reason = reason
        if (metadata) payload.metadata = metadata
        return {
          events: [{ type: "ARCHIVE_CREATED", payload }],
          result: { archiveId, sourcePath, archivePath, reason },
        }
      },
    },
    {
      name: "MigrateImport",
      description: "Import a legacy Synth event log and re-chain it to the current log",
      inputSchema: {
        required: ["importId", "sourcePath"],
        types: {
          importId: "string",
          sourcePath: "string",
          sourceKind: "string",
        },
      },
      outputSchema: { events: ["MIGRATION_IMPORTED"], resultType: "MigrationImportResult" },
      preconditions: [
        {
          name: "source_path_provided",
          evaluate: (intent) => typeof intent.payload.sourcePath === "string" && intent.payload.sourcePath.length > 0,
        },
      ],
      postconditions: [],
      invariantsChecked: ["event_chain_integrity"],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, executionCtx }) => {
        const importId = String(intent.payload.importId)
        const sourcePath = String(intent.payload.sourcePath)
        const sourceKind = String(intent.payload.sourceKind || "auto")

        const eventLogPath = sourceKind === "ungoverned-event-log"
          ? sourcePath
          : path.join(sourcePath, "data", "event-log.jsonl")

        let raw: string
        try {
          raw = sdk.files.readFileSync(eventLogPath)
        } catch (err) {
          throw new Error(`MIGRATION_SOURCE_UNREADABLE: ${eventLogPath} — ${err instanceof Error ? err.message : String(err)}`)
        }

        const lines = raw.split("\n").filter((line) => line.trim().length > 0)
        const imported: Array<{ type: string; payload: Record<string, unknown> }> = []
        const mappings: Array<{ originalType: string; canonicalType: string }> = []
        const errors: string[] = []

        for (let i = 0; i < lines.length; i++) {
          let event: Record<string, unknown>
          try {
            event = JSON.parse(lines[i]) as Record<string, unknown>
          } catch {
            errors.push(`Line ${i + 1}: invalid JSON`)
            continue
          }

          const required = ["id", "type", "timestamp", "transactionId", "capability", "actor", "payload", "eventHash", "previousHash"]
          let lineHasError = false
          for (const key of required) {
            if (!(key in event)) {
              errors.push(`Line ${i + 1}: missing ${key}`)
              lineHasError = true
            }
          }
          if (lineHasError) continue

          const originalType = String(event.type)
          const payload = (event.payload ?? {}) as Record<string, unknown>
          let canonicalType = originalType
          let canonicalPayload: Record<string, unknown> = { ...payload }

          // Map legacy event types and payloads to canonical equivalents.
          const legacyToCanonical: Record<string, string> = {
            TICKET_CREATED: "WORK_ITEM_CREATED",
            TICKET_STARTED: "WORK_ITEM_STARTED",
            TICKET_COMPLETED: "WORK_ITEM_COMPLETED",
            TICKET_BLOCKED: "WORK_ITEM_BLOCKED",
          }
          if (legacyToCanonical[originalType]) {
            canonicalType = legacyToCanonical[originalType]
            mappings.push({ originalType, canonicalType })
            if (originalType === "TICKET_CREATED" && payload.ticket) {
              canonicalPayload = { workItem: payload.ticket }
            } else if (originalType === "TICKET_STARTED" && payload.ticketId) {
              canonicalPayload = { id: payload.ticketId }
            } else if (originalType === "TICKET_COMPLETED" && payload.ticketId) {
              canonicalPayload = { id: payload.ticketId }
            } else if (originalType === "TICKET_BLOCKED" && payload.ticketId) {
              canonicalPayload = { id: payload.ticketId, reason: payload.reason }
            }
          }

          imported.push({ type: canonicalType, payload: canonicalPayload })
        }

        if (errors.length > 0) {
          throw new Error(`MIGRATION_VALIDATION_FAILED: ${errors.slice(0, 10).join("; ")}${errors.length > 10 ? ` (and ${errors.length - 10} more)` : ""}`)
        }

        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const importedPayload: Record<string, unknown> = {
          importId,
          sourcePath,
          sourceKind,
          importedEventCount: imported.length,
          mappings,
        }
        if (metadata) importedPayload.metadata = metadata

        return {
          events: [
            ...imported,
            { type: "MIGRATION_IMPORTED", payload: importedPayload },
          ],
          result: { importId, sourcePath, importedEventCount: imported.length, mappings },
        }
      },
    },

    // Two-party approval capability (EXP-APPROVAL-001)
    {
      name: "Approval",
      description: "Request, grant, deny, list, and show two-party approvals",
      inputSchema: {
        required: ["operation"],
        types: {
          operation: "string",
          approvalOperation: "string",
          filterOperation: "string",
          requestId: "string",
          status: "string",
        },
      },
      outputSchema: { events: ["APPROVAL_REQUESTED", "APPROVAL_GRANTED", "APPROVAL_DENIED"], resultType: "ApprovalResult" },
      preconditions: [],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const op = String(intent.payload.operation)
        const metadata = identityPayloadMetadata(executionCtx.identity, executionCtx.timestamp)
        const basePayload = metadata ? { metadata } : {}

        switch (op) {
          case "request": {
            const approvalOperation = String(intent.payload.approvalOperation)
            if (!approvalOperation) {
              throw new Error("APPROVAL_OPERATION_REQUIRED: payload.approvalOperation is required")
            }
            const payload: Record<string, unknown> = {
              ...basePayload,
              requestId: intent.payload.requestId,
              operation: approvalOperation,
              operationFingerprint: intent.payload.operationFingerprint,
              requestedBy: intent.payload.requestedBy,
              requestedAt: intent.payload.requestedAt,
              reason: intent.payload.reason,
              expiresAt: intent.payload.expiresAt,
            }
            return { events: [{ type: "APPROVAL_REQUESTED", payload }] }
          }
          case "grant": {
            const requestId = String(intent.payload.requestId)
            const existing = state.approvals?.[requestId] as Record<string, unknown> | undefined
            if (!existing) throw new Error(`APPROVAL_REQUEST_NOT_FOUND: ${requestId}`)
            const requestedBy = existing.requestedBy as AgentIdentity | undefined
            const grantedBy = intent.payload.grantedBy as AgentIdentity | undefined
            if (requestedBy?.agentId && grantedBy?.agentId && requestedBy.agentId === grantedBy.agentId) {
              throw new Error("APPROVAL_SELF_GRANT: requester cannot grant their own request")
            }
            if (existing.status !== "pending" && existing.status !== "granted") {
              throw new Error(`APPROVAL_NOT_PENDING: current status is ${existing.status}`)
            }
            if (new Date(String(existing.expiresAt)).getTime() < Date.now()) {
              throw new Error("APPROVAL_EXPIRED: request has expired")
            }
            const payload: Record<string, unknown> = {
              ...basePayload,
              requestId: intent.payload.requestId,
              grantedBy: intent.payload.grantedBy,
              grantedAt: intent.payload.grantedAt,
              reason: intent.payload.reason,
            }
            return { events: [{ type: "APPROVAL_GRANTED", payload }] }
          }
          case "deny": {
            const payload: Record<string, unknown> = {
              ...basePayload,
              requestId: intent.payload.requestId,
              deniedBy: intent.payload.deniedBy,
              deniedAt: intent.payload.deniedAt,
              reason: intent.payload.reason,
            }
            return { events: [{ type: "APPROVAL_DENIED", payload }] }
          }
          case "list": {
            const requests = Object.values(state.approvals ?? {})
            const filterOperation = intent.payload.filterOperation
            const status = intent.payload.status
            const filtered = requests.filter((r) => {
              const req = r as Record<string, unknown>
              if (filterOperation && req.operation !== filterOperation) return false
              if (status && req.status !== status) return false
              return true
            })
            return { events: [], result: { requests: filtered } }
          }
          case "show": {
            const requestId = String(intent.payload.requestId)
            const request = state.approvals?.[requestId]
            if (!request) throw new Error(`APPROVAL_REQUEST_NOT_FOUND: ${requestId}`)
            return { events: [], result: { request } }
          }
          default:
            throw new Error(`UNKNOWN_APPROVAL_OPERATION: ${op}`)
        }
      },
    },
  ]
}
