// ============================================================
// RUNTIME: State Reconstruction (Replay Engine)
// ============================================================

import type {
  SynthEvent,
  CanonicalState,
  WorkItem,
  Plan,
  Milestone,
  Project,
  Mission,
  Expedition,
  Objective,
  Discovery,
  Decision,
  GeneratedWorkItem,
} from "../types/index.js"

export function createEmptyState(): CanonicalState {
  return {
    version: 0,
    stateHash: "0",
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
    lastEventOffset: 0,
  }
}

export function applyEvent(state: CanonicalState, event: SynthEvent): CanonicalState {
  const payload = event.payload as Record<string, unknown> | undefined
  if (!payload) return state

  switch (event.type) {
    // Canonical WorkItem events
    case "WORK_ITEM_CREATED": {
      const workItem = payload.workItem as WorkItem
      if (workItem) state.workItems[workItem.id] = workItem
      break
    }
    case "WORK_ITEM_STARTED": {
      const workItemId = String(payload.workItemId ?? payload.id)
      if (state.workItems[workItemId]) {
        state.workItems[workItemId] = {
          ...state.workItems[workItemId],
          status: "active",
          updatedAt: event.timestamp,
        }
      } else if (payload.status === "active") {
        state.workItems[workItemId] = {
          id: workItemId,
          status: "active",
          dependencies: [],
          metadata: {},
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        }
      }
      break
    }
    case "WORK_ITEM_COMPLETED": {
      const workItemId = String(payload.workItemId ?? payload.id)
      if (state.workItems[workItemId]) {
        state.workItems[workItemId] = {
          ...state.workItems[workItemId],
          status: "complete",
          updatedAt: event.timestamp,
        }
      } else if (payload.status === "complete") {
        state.workItems[workItemId] = {
          id: workItemId,
          status: "complete",
          dependencies: [],
          metadata: {},
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        }
      }
      break
    }
    case "WORK_ITEM_BLOCKED": {
      const workItemId = String(payload.workItemId ?? payload.id)
      const reason = String(payload.reason || "")
      if (state.workItems[workItemId]) {
        state.workItems[workItemId] = {
          ...state.workItems[workItemId],
          status: "blocked",
          metadata: { ...state.workItems[workItemId].metadata, blockReason: reason },
          updatedAt: event.timestamp,
        }
      } else {
        state.workItems[workItemId] = {
          id: workItemId,
          status: "blocked",
          dependencies: [],
          metadata: { blockReason: reason },
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        }
      }
      break
    }

    // Replay compatibility: TICKET_* → canonical WORK_ITEM_*
    case "TICKET_CREATED": {
      if (payload.ticket) {
        const ticket = payload.ticket as WorkItem
        state.workItems[ticket.id] = ticket
      }
      break
    }
    case "TICKET_STARTED": {
      const canonicalEvent: SynthEvent = {
        ...event,
        type: "WORK_ITEM_STARTED",
        payload: { id: payload.ticketId ?? payload.id },
      }
      applyEvent(state, canonicalEvent)
      break
    }
    case "TICKET_COMPLETED": {
      const canonicalEvent: SynthEvent = {
        ...event,
        type: "WORK_ITEM_COMPLETED",
        payload: { id: payload.ticketId ?? payload.id },
      }
      applyEvent(state, canonicalEvent)
      break
    }
    case "TICKET_BLOCKED": {
      const canonicalEvent: SynthEvent = {
        ...event,
        type: "WORK_ITEM_BLOCKED",
        payload: { id: payload.ticketId ?? payload.id, reason: payload.reason },
      }
      applyEvent(state, canonicalEvent)
      break
    }

    // Plan events
    case "PLAN_CREATED": {
      const plan = payload.plan as Plan
      if (plan) state.plans[plan.id] = plan
      break
    }
    case "PLAN_ACTIVATED": {
      const planId = String(payload.id)
      if (state.plans[planId]) state.plans[planId] = { ...state.plans[planId], status: "active" }
      break
    }
    case "PLAN_COMPLETED": {
      const planId = String(payload.id)
      if (state.plans[planId]) state.plans[planId] = { ...state.plans[planId], status: "completed" }
      break
    }

    // Milestone events
    case "MILESTONE_CREATED": {
      const milestone = payload.milestone as Milestone
      if (milestone) state.milestones[milestone.id] = milestone
      break
    }
    case "MILESTONE_STARTED": {
      const msId = String(payload.id)
      if (state.milestones[msId]) state.milestones[msId] = { ...state.milestones[msId], status: "in_progress" }
      break
    }
    case "MILESTONE_COMPLETED": {
      const msId = String(payload.id)
      if (state.milestones[msId]) state.milestones[msId] = { ...state.milestones[msId], status: "completed" }
      break
    }

    // Project events
    case "PROJECT_CREATED": {
      const project = payload.project as Project
      if (project) state.projects[project.id] = project
      break
    }

    // Planning events
    case "MISSION_CREATED": {
      const mission = payload.mission as Mission
      if (mission) state.missions[mission.id] = mission
      break
    }
    case "MISSION_APPROVED": {
      const missionId = String(payload.id)
      if (state.missions[missionId]) {
        state.missions[missionId] = { ...state.missions[missionId], status: "active", updatedAt: event.timestamp }
      }
      break
    }
    case "MISSION_COMPLETED": {
      const missionId = String(payload.id)
      if (state.missions[missionId]) {
        state.missions[missionId] = { ...state.missions[missionId], status: "completed", updatedAt: event.timestamp }
      }
      break
    }
    case "MISSION_ARCHIVED": {
      const missionId = String(payload.id)
      if (state.missions[missionId]) {
        state.missions[missionId] = { ...state.missions[missionId], status: "archived", updatedAt: event.timestamp }
      }
      break
    }
    case "EXPEDITION_CREATED": {
      const expedition = payload.expedition as Expedition
      if (expedition) state.expeditions[expedition.id] = expedition
      break
    }
    case "EXPEDITION_APPROVED": {
      const expeditionId = String(payload.id)
      if (state.expeditions[expeditionId]) {
        state.expeditions[expeditionId] = { ...state.expeditions[expeditionId], status: "approved", updatedAt: event.timestamp }
      }
      break
    }
    case "EXPEDITION_STARTED": {
      const expeditionId = String(payload.id)
      if (state.expeditions[expeditionId]) {
        state.expeditions[expeditionId] = { ...state.expeditions[expeditionId], status: "executing", updatedAt: event.timestamp }
      }
      break
    }
    case "EXPEDITION_COMPLETED": {
      const expeditionId = String(payload.id)
      if (state.expeditions[expeditionId]) {
        state.expeditions[expeditionId] = { ...state.expeditions[expeditionId], status: "completed", updatedAt: event.timestamp }
      }
      break
    }
    case "OBJECTIVE_ADDED": {
      const objective = payload.objective as Objective
      if (objective) state.objectives[objective.id] = objective
      break
    }
    case "OBJECTIVE_COMPLETED": {
      const objectiveId = String(payload.id)
      if (state.objectives[objectiveId]) {
        state.objectives[objectiveId] = { ...state.objectives[objectiveId], status: "completed", updatedAt: event.timestamp }
      }
      break
    }
    case "DISCOVERY_RECORDED": {
      const discovery = payload.discovery as Discovery
      if (discovery) state.discoveries[discovery.id] = discovery
      break
    }
    case "DECISION_ACCEPTED": {
      const decision = payload.decision as Decision
      if (decision) {
        state.decisions[decision.id] = decision
      } else {
        const decisionId = String(payload.id)
        if (state.decisions[decisionId]) {
          state.decisions[decisionId] = { ...state.decisions[decisionId], status: "accepted", updatedAt: event.timestamp }
        } else {
          state.decisions[decisionId] = {
            id: decisionId,
            expeditionId: "",
            title: "",
            alternatives: [],
            chosenAlternative: 0,
            status: "accepted",
            consequences: { positive: [], negative: [] },
            metadata: {},
            createdAt: event.timestamp,
            updatedAt: event.timestamp,
          }
        }
      }
      break
    }
    case "DECISION_REJECTED": {
      const decisionId = String(payload.id)
      if (state.decisions[decisionId]) {
        state.decisions[decisionId] = { ...state.decisions[decisionId], status: "rejected", updatedAt: event.timestamp }
      } else {
        state.decisions[decisionId] = {
          id: decisionId,
          expeditionId: "",
          title: "",
          alternatives: [],
          chosenAlternative: 0,
          status: "rejected",
          consequences: { positive: [], negative: [] },
          metadata: {},
          createdAt: event.timestamp,
          updatedAt: event.timestamp,
        }
      }
      break
    }
    case "WORK_ITEM_GENERATED": {
      const workItem = payload.workItem as GeneratedWorkItem
      if (workItem) state.generatedWorkItems[workItem.id] = workItem
      break
    }

    case "SYSTEM_GENESIS": {
      state.version = 1
      break
    }
    case "TRANSACTION_STARTED": {
      const txId = String(payload.txId)
      state.executions[txId] = {
        id: txId,
        capability: "",
        intent: {},
        txId,
        startedAt: event.timestamp,
        status: "success",
      }
      break
    }
    default:
      break
  }

  state.version += 1
  return state
}

export function rebuildState(events: SynthEvent[]): CanonicalState {
  let state = createEmptyState()
  for (const event of events) {
    state = applyEvent(state, event)
  }
  state.stateHash = computeStateHash(state)
  state.lastEventOffset = events.length
  return state
}

export function rebuildStateFromOffset(events: SynthEvent[], startOffset: number = 0): CanonicalState {
  let state = createEmptyState()
  for (let i = startOffset; i < events.length; i++) {
    state = applyEvent(state, events[i])
  }
  state.stateHash = computeStateHash(state)
  state.lastEventOffset = events.length
  return state
}

export function computeStateHash(state: CanonicalState): string {
  const data = {
    v: state.version,
    workItems: Object.keys(state.workItems).sort(),
    plans: Object.keys(state.plans).sort(),
    milestones: Object.keys(state.milestones).sort(),
    projects: Object.keys(state.projects).sort(),
    missions: Object.keys(state.missions).sort(),
    expeditions: Object.keys(state.expeditions).sort(),
    objectives: Object.keys(state.objectives).sort(),
    discoveries: Object.keys(state.discoveries).sort(),
    decisions: Object.keys(state.decisions).sort(),
  }
  const str = JSON.stringify(data)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash + char) | 0
  }
  return String(Math.abs(hash))
}

export function statesEqual(a: CanonicalState, b: CanonicalState): boolean {
  return a.stateHash === b.stateHash
}
