// ============================================================
// SYNTH v2 — STATE TYPES
// ============================================================
// State is a derived, materialized projection of the Event Store.
// It is NOT primary data — it is a cached interpretation of truth.
// ============================================================

/** WorkItem — the canonical execution entity; smallest unit of intentional work */
export type WorkItem = {
  id: string
  status: "idle" | "active" | "blocked" | "complete"
  dependencies: string[]
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** Plan — structured decomposition of project objective */
export type Plan = {
  id: string
  name: string
  status: "draft" | "active" | "completed" | "deprecated"
  milestones: string[]
  dependencies: string[]
  metadata: Record<string, unknown>
}

/** Milestone — logically grouped set of work items */
export type Milestone = {
  id: string
  name: string
  planId: string
  workItems: string[]
  completionCriteria: string
  status: "pending" | "in_progress" | "completed"
}

/** Project — top-level container of all work */
export type Project = {
  id: string
  name: string
  goal: string
  plans: string[]
  status: "active" | "archived" | "terminated"
}

/** Mission — long-term strategic direction */
export type Mission = {
  id: string
  name: string
  purpose: string
  status: "draft" | "active" | "completed" | "archived"
  expeditions: string[]
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** Expedition — bounded engineering objective */
export type Expedition = {
  id: string
  missionId: string
  name: string
  goal: string
  status: "draft" | "approved" | "executing" | "completed" | "cancelled"
  objectives: string[]
  discoveries: string[]
  decisions: string[]
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** Objective — specific measurable outcome within an expedition */
export type Objective = {
  id: string
  expeditionId: string
  title: string
  purpose: string
  status: "draft" | "completed"
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** Discovery — newly learned architectural knowledge */
export type Discovery = {
  id: string
  expeditionId: string
  description: string
  context: string
  impact: "low" | "medium" | "high" | "critical"
  status: "recorded"
  metadata: Record<string, unknown>
  createdAt: number
}

/** Decision — chosen architectural direction */
export type Decision = {
  id: string
  expeditionId: string
  title: string
  alternatives: string[]
  chosenAlternative: number
  status: "proposed" | "accepted" | "rejected"
  consequences: {
    positive: string[]
    negative: string[]
  }
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** GeneratedWorkItem — work item produced by planning layer */
export type GeneratedWorkItem = {
  id: string
  expeditionId: string
  objectiveId: string
  title: string
  status: "generated" | "completed"
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt?: number
  completedAt?: number
}

/** Execution record — record of capability invocation */
export type Execution = {
  id: string
  capability: string
  intent: unknown
  txId: string
  startedAt: number
  finishedAt?: number
  status: "success" | "failed" | "rolledback"
}

/** Canonical state — the single authoritative materialized projection */
export type CanonicalState = {
  version: number
  stateHash: string
  workItems: Record<string, WorkItem>
  plans: Record<string, Plan>
  milestones: Record<string, Milestone>
  projects: Record<string, Project>
  missions: Record<string, Mission>
  expeditions: Record<string, Expedition>
  objectives: Record<string, Objective>
  discoveries: Record<string, Discovery>
  decisions: Record<string, Decision>
  generatedWorkItems: Record<string, GeneratedWorkItem>
  executions: Record<string, Execution>
  lastEventOffset: number
}

/** Projection — derived view constructed from replaying events */
export type Projection<T = unknown> = {
  version: number
  data: T
  sourceStateHash: string
  computedAt: number
}

/** Consumer checkpoint — Kafka-like offset tracking */
export type ConsumerCheckpoint = {
  consumerGroup: string
  partition: number
  lastCommittedOffset: number
  inFlightOffset?: number
  updatedAt: number
}

/** State update — result of applying events to state */
export type StateUpdate = {
  previousHash: string
  newHash: string
  eventsApplied: number
  workItemsChanged: string[]
  plansChanged: string[]
  milestonesChanged: string[]
  projectsChanged: string[]
}
