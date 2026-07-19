// ============================================================
// SYNTH v2 — EVENT TYPES (SOURCE OF TRUTH)
// ============================================================
// Events are the only durable record of change in the system.
// ============================================================

/** Core event type — immutable, append-only, tamper-evident record of a fact */
export type SynthEvent = {
  id: string
  type: string
  timestamp: number
  transactionId: string
  capability: string
  actor: string
  payload: unknown
  partitionKey?: string
  partition?: number
  offset?: number
  /** SHA-256 hash of this event's canonical content plus previousHash */
  eventHash: string
  /** SHA-256 hash of the previous event in the log; "genesis" for the first event */
  previousHash: string
}

/** Event type for partitioned event store */
export type PartitionedEvent = SynthEvent & {
  partitionKey: string
  partition: number
  offset: number
}

/** Event families in Synth */
export type EventFamily = "state" | "execution" | "policy"

/** State events — represent object-level changes */
export type StateEvent =
  | { type: "WORK_ITEM_CREATED"; workItemId: string; name: string }
  | { type: "WORK_ITEM_STARTED"; workItemId: string; status: "active" }
  | { type: "WORK_ITEM_COMPLETED"; workItemId: string; status: "complete" }
  | { type: "WORK_ITEM_BLOCKED"; workItemId: string; status: "blocked"; reason?: string }
  | { type: "PLAN_CREATED"; planId: string; name: string }
  | { type: "MILESTONE_CREATED"; milestoneId: string; planId: string; name: string }
  | { type: "PROJECT_CREATED"; projectId: string; name: string }
  | {
      type: "PROJECT_INITIALIZED"
      projectId: string
      name: string
      governanceVersion: string
      sourceType?: string
      sourceLocation?: string
      declaredIntent?: string
      adapterId?: string
      adapterVersion?: string
      evidenceReference?: string
      projectModel?: Record<string, unknown>
    }
  | { type: "MISSION_CREATED"; missionId: string; name: string }
  | { type: "MISSION_APPROVED"; missionId: string }
  | { type: "MISSION_COMPLETED"; missionId: string }
  | { type: "MISSION_ARCHIVED"; missionId: string }
  | { type: "EXPEDITION_CREATED"; expeditionId: string; missionId: string; name: string }
  | { type: "EXPEDITION_APPROVED"; expeditionId: string }
  | { type: "EXPEDITION_COMMITTED"; expeditionId: string }
  | { type: "EXPEDITION_STARTED"; expeditionId: string }
  | { type: "EXPEDITION_COMPLETED"; expeditionId: string }
  | { type: "OBJECTIVE_ADDED"; objectiveId: string; expeditionId: string; title: string }
  | { type: "DISCOVERY_RECORDED"; discoveryId: string; expeditionId: string }
  | { type: "DECISION_ACCEPTED"; decisionId: string }
  | { type: "DECISION_REJECTED"; decisionId: string }
  | { type: "REPAIR_ACCEPTED"; repairId: string; repairPlan: unknown; appliedActions: string[] }
  | { type: "SYSTEM_GENESIS"; payload: unknown }
  // First Contact greenfield onboarding lifecycle (EXP-AIFC-009)
  | { type: "FIRST_CONTACT_STARTED"; discoveryArtifactId: string; intent: string }
  | { type: "DISCOVERY_APPROVED"; discoveryArtifactId: string; artifactHash: string }
  | { type: "MISSION_MATERIALIZED"; missionId: string; subject: string }
  | { type: "EXPEDITIONS_PROPOSED"; missionId: string; expeditionIds: string[] }
  // Execution intent lifecycle (EXP-EXEC-001)
  | { type: "EXECUTION_INTENT_CREATED"; intentId: string; expeditionId: string; objectiveId: string; workItemId: string; capability: string; operation: string }
  | { type: "EXECUTION_INTENT_GRAPH_CREATED"; expeditionId: string; intentIds: string[]; edgeCount: number }
  | { type: "EXPEDITION_BRANCH_CREATED"; expeditionId: string; branch: string; baseCommit: string }
  | { type: "EXECUTION_INTENT_STARTED"; intentId: string; expeditionId: string }
  | { type: "EXECUTION_INTENT_COMPLETED"; intentId: string; expeditionId: string; resultSummary?: string }
  | { type: "EXECUTION_INTENT_FAILED"; intentId: string; expeditionId: string; reason: string }
  | { type: "EXECUTION_INTENT_ROLLEDBACK"; intentId: string; expeditionId: string }
  | { type: "EXPEDITION_EXECUTION_COMMITTED"; expeditionId: string; commit: string }
  | { type: "EXPEDITION_EXECUTION_PROJECTED"; expeditionId: string; projectionType: "pull_request" | "patch" | "diff"; projectionUrl?: string }

/** Execution events — represent transaction lifecycle */
export type ExecutionEvent =
  | { type: "TRANSACTION_STARTED"; txId: string }
  | { type: "TRANSACTION_COMMITTED"; txId: string }
  | { type: "TRANSACTION_ROLLEDBACK"; txId: string; reason: string }
  | { type: "CAPABILITY_EXECUTED"; capability: string; result: string }

/** Policy events — represent governance decisions */
export type PolicyEvent =
  | { type: "POLICY_EVALUATED"; policyId: string; result: "allow" | "deny" | "require_verification" }
  | { type: "POLICY_DENIED"; policyId: string; intent: unknown }
  | { type: "INVARIANT_VIOLATION"; invariant: string; context: unknown }

/** Union of all system event types */
export type SystemEvent = StateEvent | ExecutionEvent | PolicyEvent
