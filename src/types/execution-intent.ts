// ============================================================
// SYNTH v2 — EXECUTION INTENT TYPES
// ============================================================
// Types that bridge approved Expedition planning to governed
// repository execution. These types live in the Implementation
// layer and are consumed by the Runtime and VersioningCapability.
// ============================================================

/** Verification strategy for an executed intent */
export type ExecutionVerification = {
  kind: "path_exists" | "path_content" | "command_exit" | "revision_exists" | "none"
  target: string
  expectation?: string | number
}

/** A single unit of governed repository mutation */
export type ExecutionIntent = {
  /** Stable unique identifier */
  id: string

  /** Authorizing expedition */
  expeditionId: string

  /** Source objective */
  objectiveId: string

  /** Source work item */
  workItemId: string

  /** Order within the expedition (stable tie-breaker) */
  sequence: number

  /** Target capability: filesystem, versioning, forge, process, etc. */
  capability: string

  /** Capability-specific operation */
  operation: string

  /** Repository-relative path, branch, or resource locator */
  target: string

  /** Operation arguments */
  payload: Record<string, unknown>

  /** Intent IDs that must complete before this intent runs */
  dependencies: string[]

  /** How to verify the intent succeeded */
  verification: ExecutionVerification

  /** Optional rollback intent if this intent fails */
  rollback?: ExecutionIntent
}

/** Directed acyclic graph of intents for a single expedition */
export type ExecutionIntentGraph = {
  /** Authorizing expedition */
  expeditionId: string

  /** Isolated execution branch */
  branch: string

  /** Flat list of all intents */
  intents: ExecutionIntent[]

  /** Dependency edges as (from, to) pairs */
  edges: [string, string][]

  /** Topologically sorted intent IDs */
  ordered: string[]
}

/** Phase of an expedition's execution lifecycle */
export type ExecutionPhase =
  | "approved"
  | "branch-created"
  | "executing"
  | "committed"
  | "projected"
  | "failed"
  | "rolledback"

/** Projection of an execution intent in canonical state */
export type ExecutionIntentState = {
  id: string
  expeditionId: string
  objectiveId: string
  workItemId: string
  sequence: number
  capability: string
  operation: string
  target: string
  status: "pending" | "running" | "completed" | "failed" | "rolledback"
  dependencies: string[]
  startedAt?: number
  completedAt?: number
  failureReason?: string
}

/** Projection of an execution graph in canonical state */
export type ExecutionGraphState = {
  expeditionId: string
  branch: string
  phase: ExecutionPhase
  intentIds: string[]
  currentIntentId?: string
  baseCommit?: string
  resultCommit?: string
  projectionType?: "pull_request" | "patch" | "diff"
  projectionUrl?: string
}
