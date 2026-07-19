// ============================================================
// CAPABILITY: Registry System
// ============================================================

import type { Capability, CapabilityInvocation, CapabilityResult, CanonicalState, DomainContext } from "../types/index.js"
import {
  createWorkItem, startWorkItem, completeWorkItem, blockWorkItem,
  createPlan, activatePlan, completePlan,
  createMilestone, startMilestone, completeMilestone,
  createProject,
  createMission, approveMission, completeMission, archiveMission,
  createExpedition, approveExpedition, commitExpedition, startExpedition, completeExpedition,
  createObjective, completeObjective,
  createDiscovery,
  createDecision, acceptDecision, rejectDecision,
  createGeneratedWorkItem, completeGeneratedWorkItem,
} from "../domain/index.js"

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
    ctx: { intent: CapabilityInvocation; state: CanonicalState; executionCtx: DomainContext },
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
        return { events: [{ type: "PROJECT_CREATED", payload: { project } }], result: project }
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
      handler: ({ intent }) => {
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
        return { events: [{ type: "MISSION_CREATED", payload: { mission } }], result: mission }
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
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.missions[id]
        if (!existing) return { events: [{ type: "MISSION_APPROVED", payload: { id, status: "active" } }] }
        const updated = approveMission(existing, executionCtx)
        return { events: [{ type: "MISSION_APPROVED", payload: { id: updated.id, status: updated.status } }], result: updated }
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
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.missions[id]
        if (!existing) return { events: [{ type: "MISSION_COMPLETED", payload: { id, status: "completed" } }] }
        const updated = completeMission(existing, executionCtx)
        return { events: [{ type: "MISSION_COMPLETED", payload: { id: updated.id, status: updated.status } }], result: updated }
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
        if (!existing) return { events: [{ type: "MISSION_ARCHIVED", payload: { id, status: "archived" } }] }
        const updated = archiveMission(existing, executionCtx)
        return { events: [{ type: "MISSION_ARCHIVED", payload: { id: updated.id, status: updated.status } }], result: updated }
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
        return { events: [{ type: "EXPEDITION_CREATED", payload: { expedition } }], result: expedition }
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
        if (!existing) return { events: [{ type: "EXPEDITION_APPROVED", payload: { id, status: "approved" } }] }
        const updated = approveExpedition(existing, executionCtx)
        return { events: [{ type: "EXPEDITION_APPROVED", payload: { id: updated.id, status: updated.status } }], result: updated }
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
        if (!existing) return { events: [{ type: "EXPEDITION_COMMITTED", payload: { id, status: "committed" } }] }
        const updated = commitExpedition(existing, executionCtx)
        return { events: [{ type: "EXPEDITION_COMMITTED", payload: { id: updated.id, status: updated.status } }], result: updated }
      },
    },
    {
      name: "StartExpedition",
      description: "Start an expedition",
      inputSchema: { required: ["id"], types: { id: "string" } },
      outputSchema: { events: ["EXPEDITION_STARTED"], resultType: "Expedition" },
      preconditions: [
        {
          name: "expedition_exists_committed",
          evaluate: (intent, state) => { const id = String(intent.payload.id); return state.expeditions[id]?.status === "committed" },
        },
      ],
      postconditions: [],
      invariantsChecked: [],
      sideEffects: false,
      executionClass: "sync",
      handler: ({ intent, state, executionCtx }) => {
        const id = String(intent.payload.id)
        const existing = state.expeditions[id]
        if (!existing) return { events: [{ type: "EXPEDITION_STARTED", payload: { id, status: "executing" } }] }
        const updated = startExpedition(existing, executionCtx)
        return { events: [{ type: "EXPEDITION_STARTED", payload: { id: updated.id, status: updated.status } }], result: updated }
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
        if (!existing) return { events: [{ type: "EXPEDITION_COMPLETED", payload: { id, status: "completed" } }] }
        const updated = completeExpedition(existing, executionCtx)
        return { events: [{ type: "EXPEDITION_COMPLETED", payload: { id: updated.id, status: updated.status } }], result: updated }
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
  ]
}
