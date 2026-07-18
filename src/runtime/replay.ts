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
    lifecycle: "uninitialized",
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
    executionIntents: {},
    executionGraphs: {},
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
    case "PROJECT_INITIALIZED": {
      state.lifecycle = "initialized"
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

    // Execution intent lifecycle (EXP-EXEC-001)
    case "EXECUTION_INTENT_CREATED": {
      const intentId = String(payload.intentId)
      state.executionIntents[intentId] = {
        id: intentId,
        expeditionId: String(payload.expeditionId),
        objectiveId: String(payload.objectiveId),
        workItemId: String(payload.workItemId),
        sequence: Number(payload.sequence ?? 0),
        capability: String(payload.capability),
        operation: String(payload.operation),
        target: String(payload.target ?? ""),
        status: "pending",
        dependencies: Array.isArray(payload.dependencies) ? payload.dependencies.map(String) : [],
      }
      break
    }
    case "EXECUTION_INTENT_GRAPH_CREATED": {
      const expeditionId = String(payload.expeditionId)
      state.executionGraphs[expeditionId] = {
        expeditionId,
        branch: String(payload.branch ?? ""),
        phase: "approved",
        intentIds: Array.isArray(payload.intentIds) ? payload.intentIds.map(String) : [],
      }
      break
    }
    case "EXPEDITION_BRANCH_CREATED": {
      const expeditionId = String(payload.expeditionId)
      const graph = state.executionGraphs[expeditionId]
      if (graph) {
        graph.branch = String(payload.branch)
        graph.baseCommit = String(payload.baseCommit)
        graph.phase = "branch-created"
      }
      break
    }
    case "EXECUTION_INTENT_STARTED": {
      const intentId = String(payload.intentId)
      const intent = state.executionIntents[intentId]
      if (intent) {
        intent.status = "running"
        intent.startedAt = event.timestamp
      }
      const graph = state.executionGraphs[String(payload.expeditionId)]
      if (graph) {
        graph.phase = "executing"
        graph.currentIntentId = intentId
      }
      break
    }
    case "EXECUTION_INTENT_COMPLETED": {
      const intentId = String(payload.intentId)
      const intent = state.executionIntents[intentId]
      if (intent) {
        intent.status = "completed"
        intent.completedAt = event.timestamp
      }
      break
    }
    case "EXECUTION_INTENT_FAILED": {
      const intentId = String(payload.intentId)
      const intent = state.executionIntents[intentId]
      if (intent) {
        intent.status = "failed"
        intent.failureReason = String(payload.reason)
        intent.completedAt = event.timestamp
      }
      const graph = state.executionGraphs[String(payload.expeditionId)]
      if (graph) graph.phase = "failed"
      break
    }
    case "EXECUTION_INTENT_ROLLEDBACK": {
      const intentId = String(payload.intentId)
      const intent = state.executionIntents[intentId]
      if (intent) {
        intent.status = "rolledback"
        intent.completedAt = event.timestamp
      }
      const graph = state.executionGraphs[String(payload.expeditionId)]
      if (graph) graph.phase = "rolledback"
      break
    }
    case "EXPEDITION_EXECUTION_COMMITTED": {
      const expeditionId = String(payload.expeditionId)
      const graph = state.executionGraphs[expeditionId]
      if (graph) {
        graph.phase = "committed"
        graph.resultCommit = String(payload.commit)
      }
      break
    }
    case "EXPEDITION_EXECUTION_PROJECTED": {
      const expeditionId = String(payload.expeditionId)
      const graph = state.executionGraphs[expeditionId]
      if (graph) {
        graph.phase = "projected"
        graph.projectionType = payload.projectionType as "pull_request" | "patch" | "diff"
        graph.projectionUrl = payload.projectionUrl ? String(payload.projectionUrl) : undefined
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
  const data: Record<string, unknown> = {
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
  // Backward-compatible hash: only include lifecycle once the project has
  // been initialized. Empty/uninitialized states preserve their legacy hash.
  if (state.lifecycle === "initialized") {
    data.lifecycle = state.lifecycle
  }
  // Backward-compatible hash: only include new collections when populated.
  // Logs recorded before EXP-EXEC-001 have empty execution collections.
  if (Object.keys(state.executionIntents).length > 0) {
    data.executionIntents = Object.keys(state.executionIntents).sort()
  }
  if (Object.keys(state.executionGraphs).length > 0) {
    data.executionGraphs = Object.keys(state.executionGraphs).sort()
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

// ============================================================
// Aggregate Graph Validation (EXP-HARDEN-004)
// ============================================================
// Replay proves determinism; these checks prove correctness of the
// mission/expedition/objective graph carried by an event log.
//
// The validator is pure and additive: it observes events and replayed
// state but never changes replay semantics, the event model, or event
// payload schemas. applyEvent and rebuildState are untouched.
//
// Invariants (docs/reference/replay-specification.md — Graph Invariants):
//   1. Every expedition references a mission created in the log.
//   2. Every objective references an expedition created in the log.
//   3. No aggregate identity is created more than once.
//   4. Parent chains are acyclic.
//   5. Every aggregate is reachable from a mission root (no orphans).
//   6. Post-replay navigation resolves: state.missions[expedition.missionId]
//      and state.expeditions[objective.expeditionId] exist.
//
// Parent references are validated against every creation in the log
// (order-insensitive), mirroring the Genesis seed-graph certifier
// (src/genesis/certification.ts) idioms.
// ============================================================

/** A single graph-integrity violation found in an event log or replayed state. */
export type AggregateGraphViolation = {
  kind:
    | "malformed-creation"
    | "duplicate-creation"
    | "missing-parent-reference"
    | "broken-parent-reference"
    | "cycle"
    | "orphan-aggregate"
    | "broken-navigation"
  message: string
  aggregateKind: "mission" | "expedition" | "objective"
  aggregateId: string
  parentId?: string
}

type AggregateGraphNode = {
  id: string
  kind: "mission" | "expedition" | "objective"
  parentId?: string
}

type CreationRecord = {
  node: AggregateGraphNode
  eventType: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function creationPayload(
  event: SynthEvent,
  key: string,
): { id?: unknown; missionId?: unknown; expeditionId?: unknown } | undefined {
  const payload = event.payload as Record<string, unknown> | undefined
  if (!payload || typeof payload !== "object") return undefined
  const value = payload[key]
  if (!value || typeof value !== "object") return undefined
  return value as { id?: unknown; missionId?: unknown; expeditionId?: unknown }
}

const CREATION_EVENTS: Array<{
  eventType: string
  payloadKey: string
  kind: AggregateGraphNode["kind"]
  parentKey?: "missionId" | "expeditionId"
  parentKind?: AggregateGraphNode["kind"]
}> = [
  { eventType: "MISSION_CREATED", payloadKey: "mission", kind: "mission" },
  { eventType: "EXPEDITION_CREATED", payloadKey: "expedition", kind: "expedition", parentKey: "missionId", parentKind: "mission" },
  { eventType: "OBJECTIVE_ADDED", payloadKey: "objective", kind: "objective", parentKey: "expeditionId", parentKind: "expedition" },
]

/**
 * Validate the aggregate graph carried by an event log, plus — when the
 * replayed state is provided — post-replay navigation invariants.
 * Returns every violation found; an empty list means the graph is fully
 * connected and navigable.
 */
export function validateAggregateGraph(
  events: SynthEvent[],
  state?: CanonicalState,
): AggregateGraphViolation[] {
  const violations: AggregateGraphViolation[] = []
  const nodes = new Map<string, AggregateGraphNode>()
  const creations: CreationRecord[] = []

  // Pass 1: index every creation event, flag malformed payloads and
  // duplicate identities. First registration wins for the node map, so
  // cycle and reachability checks see a single parent per identity.
  for (const event of events) {
    for (const spec of CREATION_EVENTS) {
      if (event.type !== spec.eventType) continue
      const entity = creationPayload(event, spec.payloadKey)
      const id = entity?.id
      if (!isNonEmptyString(id)) {
        violations.push({
          kind: "malformed-creation",
          message: `${spec.eventType} event is missing its ${spec.payloadKey} payload id`,
          aggregateKind: spec.kind,
          aggregateId: "",
        })
        break
      }
      const parentId = spec.parentKey && isNonEmptyString(entity?.[spec.parentKey])
        ? (entity?.[spec.parentKey] as string)
        : undefined
      const node: AggregateGraphNode = { id, kind: spec.kind, parentId }
      creations.push({ node, eventType: spec.eventType })

      const existing = nodes.get(id)
      if (existing) {
        violations.push({
          kind: "duplicate-creation",
          message:
            existing.kind === spec.kind
              ? `Duplicate ${spec.kind} identity in event log: ${id}`
              : `Event log identity ${id} is used as both ${existing.kind} and ${spec.kind}`,
          aggregateKind: spec.kind,
          aggregateId: id,
        })
      } else {
        nodes.set(id, node)
      }
      break
    }
  }

  // Pass 2: every creation's parent reference must resolve to an
  // aggregate of the expected kind somewhere in the log.
  for (const { node, eventType } of creations) {
    if (node.kind === "mission") continue
    const parentKind = node.kind === "expedition" ? "mission" : "expedition"
    if (!node.parentId) {
      violations.push({
        kind: "missing-parent-reference",
        message: `${eventType} ${node.id} has no ${parentKind} parent`,
        aggregateKind: node.kind,
        aggregateId: node.id,
      })
      continue
    }
    const parent = nodes.get(node.parentId)
    if (!parent) {
      violations.push({
        kind: "broken-parent-reference",
        message: `${eventType} ${node.id} references unknown ${parentKind} ${node.parentId}`,
        aggregateKind: node.kind,
        aggregateId: node.id,
        parentId: node.parentId,
      })
    } else if (parent.kind !== parentKind) {
      const article = (word: string) => (/^[aeiou]/.test(word) ? "an" : "a")
      violations.push({
        kind: "broken-parent-reference",
        message: `${eventType} ${node.id} parent ${node.parentId} is ${article(parent.kind)} ${parent.kind}, not ${article(parentKind)} ${parentKind}`,
        aggregateKind: node.kind,
        aggregateId: node.id,
        parentId: node.parentId,
      })
    }
  }

  // Pass 3: cycles — follow parent pointers with a seen-set.
  for (const node of nodes.values()) {
    const seen = new Set<string>([node.id])
    let current = node
    while (current.parentId) {
      const parent = nodes.get(current.parentId)
      if (!parent) break
      if (seen.has(parent.id)) {
        violations.push({
          kind: "cycle",
          message: `Event log contains a cycle reaching ${parent.id}`,
          aggregateKind: node.kind,
          aggregateId: node.id,
          parentId: parent.id,
        })
        break
      }
      seen.add(parent.id)
      current = parent
    }
  }

  // Pass 4: reachability — every node must reach a mission root.
  const children = new Map<string, string[]>()
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      const siblings = children.get(node.parentId) || []
      siblings.push(node.id)
      children.set(node.parentId, siblings)
    }
  }
  const reachable = new Set<string>()
  const queue = Array.from(nodes.values())
    .filter((node) => node.kind === "mission")
    .map((node) => node.id)
  while (queue.length > 0) {
    const current = queue.shift()!
    if (reachable.has(current)) continue
    reachable.add(current)
    for (const child of children.get(current) || []) {
      queue.push(child)
    }
  }
  for (const node of nodes.values()) {
    if (!reachable.has(node.id)) {
      violations.push({
        kind: "orphan-aggregate",
        message: `Event log node ${node.id} (${node.kind}) is not reachable from any mission root`,
        aggregateKind: node.kind,
        aggregateId: node.id,
      })
    }
  }

  // Pass 5: post-replay navigation — the materialized state must
  // resolve every parent reference it carries.
  if (state) {
    for (const expedition of Object.values(state.expeditions)) {
      if (!state.missions[expedition.missionId]) {
        violations.push({
          kind: "broken-navigation",
          message: `Replayed state navigation broken: expedition ${expedition.id} references mission ${expedition.missionId} missing from state.missions`,
          aggregateKind: "expedition",
          aggregateId: expedition.id,
          parentId: expedition.missionId,
        })
      }
    }
    for (const objective of Object.values(state.objectives)) {
      if (!state.expeditions[objective.expeditionId]) {
        violations.push({
          kind: "broken-navigation",
          message: `Replayed state navigation broken: objective ${objective.id} references expedition ${objective.expeditionId} missing from state.expeditions`,
          aggregateKind: "objective",
          aggregateId: objective.id,
          parentId: objective.expeditionId,
        })
      }
    }
  }

  return violations
}
