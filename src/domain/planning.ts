// ============================================================
// DOMAIN: Planning Logic (Pure)
// ============================================================
// Zero side effects. Zero IO. Pure deterministic state transitions.
// Planning layer operates on canonical engineering knowledge only.
// Forbidden: execution primitives, protocol vocabulary, tool names.
// ============================================================

import type {
  Mission,
  Expedition,
  Objective,
  Discovery,
  Decision,
  GeneratedWorkItem,
  DomainContext,
} from "../types/index.js"

// ============================================================
// Mission
// ============================================================

/** Create a new mission — long-term strategic direction */
export function createMission(
  id: string,
  name: string,
  purpose: string,
  ctx: DomainContext,
  overrides: Partial<Mission> = {}
): Mission {
  const now = ctx.timestamp
  return {
    id,
    name,
    purpose,
    status: "draft",
    expeditions: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Approve a mission — transitions to active */
export function approveMission(mission: Mission, ctx: DomainContext): Mission {
  if (mission.status !== "draft") {
    throw new Error("INVARIANT_VIOLATION: can only approve a draft mission")
  }
  return {
    ...mission,
    status: "active",
    updatedAt: ctx.timestamp,
  }
}

/** Complete a mission */
export function completeMission(mission: Mission, ctx: DomainContext): Mission {
  if (mission.status !== "active") {
    throw new Error("INVARIANT_VIOLATION: can only complete an active mission")
  }
  return {
    ...mission,
    status: "completed",
    updatedAt: ctx.timestamp,
  }
}

/** Archive a mission */
export function archiveMission(mission: Mission, ctx: DomainContext): Mission {
  if (mission.status === "archived") {
    throw new Error("INVARIANT_VIOLATION: mission already archived")
  }
  return {
    ...mission,
    status: "archived",
    updatedAt: ctx.timestamp,
  }
}

/** Add an expedition to a mission */
export function addExpeditionToMission(mission: Mission, expeditionId: string): Mission {
  if (mission.expeditions.includes(expeditionId)) return mission
  return {
    ...mission,
    expeditions: [...mission.expeditions, expeditionId],
  }
}

// ============================================================
// Expedition
// ============================================================

/** Create a new expedition — bounded engineering objective */
export function createExpedition(
  id: string,
  missionId: string,
  name: string,
  goal: string,
  ctx: DomainContext,
  overrides: Partial<Expedition> = {}
): Expedition {
  const now = ctx.timestamp
  return {
    id,
    missionId,
    name,
    goal,
    status: "draft",
    objectives: [],
    discoveries: [],
    decisions: [],
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Approve an expedition */
export function approveExpedition(expedition: Expedition, ctx: DomainContext): Expedition {
  if (expedition.status !== "draft") {
    throw new Error("INVARIANT_VIOLATION: can only approve a draft expedition")
  }
  return {
    ...expedition,
    status: "approved",
    updatedAt: ctx.timestamp,
  }
}

/** Start an expedition */
export function startExpedition(expedition: Expedition, ctx: DomainContext): Expedition {
  if (expedition.status !== "approved") {
    throw new Error("INVARIANT_VIOLATION: can only start an approved expedition")
  }
  return {
    ...expedition,
    status: "executing",
    updatedAt: ctx.timestamp,
  }
}

/** Complete an expedition */
export function completeExpedition(expedition: Expedition, ctx: DomainContext): Expedition {
  if (expedition.status !== "executing") {
    throw new Error("INVARIANT_VIOLATION: can only complete an executing expedition")
  }
  return {
    ...expedition,
    status: "completed",
    updatedAt: ctx.timestamp,
  }
}

/** Cancel an expedition */
export function cancelExpedition(expedition: Expedition, ctx: DomainContext): Expedition {
  if (expedition.status === "completed" || expedition.status === "cancelled") {
    throw new Error("INVARIANT_VIOLATION: cannot cancel a completed or already cancelled expedition")
  }
  return {
    ...expedition,
    status: "cancelled",
    updatedAt: ctx.timestamp,
  }
}

/** Add an objective to an expedition */
export function addObjectiveToExpedition(expedition: Expedition, objectiveId: string): Expedition {
  if (expedition.objectives.includes(objectiveId)) return expedition
  return {
    ...expedition,
    objectives: [...expedition.objectives, objectiveId],
  }
}

/** Add a discovery to an expedition */
export function addDiscoveryToExpedition(expedition: Expedition, discoveryId: string): Expedition {
  if (expedition.discoveries.includes(discoveryId)) return expedition
  return {
    ...expedition,
    discoveries: [...expedition.discoveries, discoveryId],
  }
}

/** Add a decision to an expedition */
export function addDecisionToExpedition(expedition: Expedition, decisionId: string): Expedition {
  if (expedition.decisions.includes(decisionId)) return expedition
  return {
    ...expedition,
    decisions: [...expedition.decisions, decisionId],
  }
}

// ============================================================
// Objective
// ============================================================

/** Create a new objective — specific measurable outcome */
export function createObjective(
  id: string,
  expeditionId: string,
  title: string,
  purpose: string,
  ctx: DomainContext,
  overrides: Partial<Objective> = {}
): Objective {
  const now = ctx.timestamp
  return {
    id,
    expeditionId,
    title,
    purpose,
    status: "draft",
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Complete an objective */
export function completeObjective(objective: Objective, ctx: DomainContext): Objective {
  if (objective.status === "completed") {
    throw new Error("INVARIANT_VIOLATION: objective already completed")
  }
  return {
    ...objective,
    status: "completed",
    updatedAt: ctx.timestamp,
  }
}

// ============================================================
// Discovery
// ============================================================

/** Create a new discovery — newly learned architectural knowledge */
export function createDiscovery(
  id: string,
  expeditionId: string,
  description: string,
  context: string,
  impact: "low" | "medium" | "high" | "critical",
  ctx: DomainContext,
  overrides: Partial<Discovery> = {}
): Discovery {
  return {
    id,
    expeditionId,
    description,
    context,
    impact,
    status: "recorded",
    metadata: {},
    createdAt: ctx.timestamp,
    ...overrides,
  }
}

// ============================================================
// Decision
// ============================================================

/** Create a new decision — chosen architectural direction */
export function createDecision(
  id: string,
  expeditionId: string,
  title: string,
  chosenAlternative: number,
  alternatives: string[],
  ctx: DomainContext,
  overrides: Partial<Decision> = {}
): Decision {
  const now = ctx.timestamp
  return {
    id,
    expeditionId,
    title,
    alternatives,
    chosenAlternative,
    status: "proposed",
    consequences: { positive: [], negative: [] },
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/** Accept a decision */
export function acceptDecision(decision: Decision, ctx: DomainContext): Decision {
  if (decision.status !== "proposed") {
    throw new Error("INVARIANT_VIOLATION: can only accept a proposed decision")
  }
  return {
    ...decision,
    status: "accepted",
    updatedAt: ctx.timestamp,
  }
}

/** Reject a decision */
export function rejectDecision(decision: Decision, ctx: DomainContext): Decision {
  if (decision.status !== "proposed") {
    throw new Error("INVARIANT_VIOLATION: can only reject a proposed decision")
  }
  return {
    ...decision,
    status: "rejected",
    updatedAt: ctx.timestamp,
  }
}

// ============================================================
// Generated WorkItem
// ============================================================

/** Create a generated work item from an objective */
export function createGeneratedWorkItem(
  id: string,
  expeditionId: string,
  objectiveId: string,
  title: string,
  ctx: DomainContext,
  overrides: Partial<GeneratedWorkItem> = {}
): GeneratedWorkItem {
  return {
    id,
    expeditionId,
    objectiveId,
    title,
    status: "generated",
    metadata: {},
    createdAt: ctx.timestamp,
    updatedAt: ctx.timestamp,
    ...overrides,
  }
}

/** Complete a generated work item */
export function completeGeneratedWorkItem(workItem: GeneratedWorkItem, ctx: DomainContext): GeneratedWorkItem {
  if (workItem.status === "completed") {
    throw new Error("INVARIANT_VIOLATION: generated work item already completed")
  }
  return {
    ...workItem,
    status: "completed",
    completedAt: ctx.timestamp,
    updatedAt: ctx.timestamp,
  }
}

// ============================================================
// Invariant validation
// ============================================================

export function validateMissionInvariants(mission: Mission): string[] {
  const violations: string[] = []
  if (!mission.id) violations.push("Mission must have an id")
  if (!mission.name) violations.push("Mission must have a name")
  if (!mission.purpose) violations.push("Mission must have a purpose")
  if (!["draft", "active", "completed", "archived"].includes(mission.status)) {
    violations.push(`Invalid mission status: ${mission.status}`)
  }
  return violations
}

export function validateExpeditionInvariants(expedition: Expedition): string[] {
  const violations: string[] = []
  if (!expedition.id) violations.push("Expedition must have an id")
  if (!expedition.missionId) violations.push("Expedition must belong to a mission")
  if (!expedition.name) violations.push("Expedition must have a name")
  if (!expedition.goal) violations.push("Expedition must have a goal")
  if (!["draft", "approved", "executing", "completed", "cancelled"].includes(expedition.status)) {
    violations.push(`Invalid expedition status: ${expedition.status}`)
  }
  return violations
}
