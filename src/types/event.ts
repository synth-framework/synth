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
  // Review gate lifecycle (EXP-PROGRAM-035)
  | { type: "REVIEW_GATE_OPENED"; expeditionId: string; gateId: string; reviewPackageId: string; policy: unknown }
  | { type: "REVIEW_GATE_RESOLVED"; expeditionId: string; gateId: string; decisionId: string; decision: string }
  | { type: "REVISION_REQUESTED"; expeditionId: string; gateId: string; revisionRequestId: string; reason: string }
  | { type: "ACCEPTANCE_GATE_OPENED"; expeditionId: string; gateId: string; acceptancePackageId: string; policy: unknown }
  | { type: "ACCEPTANCE_GATE_RESOLVED"; expeditionId: string; gateId: string; decisionId: string; recordId: string; decision: string }
  | { type: "EXPEDITION_CLOSED"; expeditionId: string }
  | { type: "REFINED_INTENT_APPROVED"; expeditionId: string; refinedIntentId: string; refinedIntent: unknown }
  // Intent refinement lifecycle (EXP-PROGRAM-036)
  | { type: "INTENT_MODEL_CREATED"; intentModelId: string; intentModel: unknown }
  | { type: "INTENT_MODEL_REVISED"; intentModelId: string; intentModel: unknown }
  | { type: "INTENT_MODEL_SUBMITTED"; intentModelId: string }
  | { type: "INTENT_MODEL_SUPERSEDED"; intentModelId: string }
  | { type: "REFINEMENT_SESSION_STARTED"; sessionId: string; intentModelId: string; questions: unknown[] }
  | { type: "REFINEMENT_QUESTION_ANSWERED"; sessionId: string; questionId: string; answer: string }
  | { type: "REFINEMENT_REPORT_CREATED"; reportId: string; report: unknown }
  | { type: "REFINEMENT_REPORT_APPROVED"; reportId: string; intentModelId: string; approvedBy: unknown; reason: string }
  | { type: "REFINEMENT_REPORT_REJECTED"; reportId: string; intentModelId: string; rejectedBy: unknown; reason: string }
  // Alignment and divergence lifecycle (EXP-PROGRAM-036 Phase 2)
  | { type: "ALIGNMENT_CONTRACT_CREATED"; contractId: string; contract: unknown }
  | { type: "ALIGNMENT_CONTRACT_SUBMITTED"; contractId: string }
  | { type: "ALIGNMENT_CONTRACT_APPROVED"; contractId: string; approvedBy: unknown }
  | { type: "ALIGNMENT_CONTRACT_REJECTED"; contractId: string; reason: string }
  | { type: "ALIGNMENT_CONTRACT_SUPERSEDED"; contractId: string }
  | { type: "REFERENCE_EVIDENCE_CREATED"; evidenceId: string; evidence: unknown }
  | { type: "REFERENCE_EVIDENCE_BOUND"; contractId: string; evidenceId: string }
  | { type: "DIVERGENCE_GATE_OPENED"; gateId: string; contractId: string; intentModelId: string }
  | { type: "DIVERGENCE_GATE_RESOLVED"; gateId: string; contractId: string; decision: string; reportId: string }
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
  // Repository governance lifecycle (EXP-PROGRAM-028)
  | { type: "REPOSITORY_INITIALIZED"; repositoryId: string; defaultBranch: string; forgeProvider: string; versionStrategy: string }
  | { type: "BRANCH_CREATED"; branchName: string; branchType: string; baseBranch?: string; missionId?: string; expeditionId?: string }
  | { type: "PULL_REQUEST_OPENED"; pullRequestId: string; forgeId: string; url: string; number: number; headBranch: string; baseBranch: string; missionId?: string; expeditionId?: string }
  | { type: "PULL_REQUEST_UPDATED"; pullRequestId: string; state: "open" | "closed" | "merged"; title?: string }
  | { type: "PULL_REQUEST_MERGED"; pullRequestId: string; commit: string; strategy: string }
  | { type: "PROMOTION_PROPOSED"; promotionId: string; pullRequestId: string; from: string; to: string; evidenceReference?: string }
  | { type: "PROMOTION_APPROVED"; promotionId: string; approver: string }
  | { type: "RELEASE_CREATED"; releaseId: string; tag: string; targetCommit: string; evidenceReference?: string }

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
