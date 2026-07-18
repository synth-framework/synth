// ============================================================
// EXECUTION: Work Item Runtime
// ============================================================
// Executes an ExecutionIntentGraph by dispatching each intent to
// a registered capability handler. Emits lifecycle events for
// every state transition. Handles failure, rollback, and halt.
// ============================================================

import type {
  ExecutionIntent,
  ExecutionIntentGraph,
  ExecutionVerification,
  SynthEvent,
} from "../types/index.js"

/** Result of executing a single intent */
export type IntentExecutionResult = {
  success: boolean
  result?: unknown
  error?: string
}

/** Descriptor returned by a versioning handler for branch operations */
export type VersioningBranchResult = {
  commit: string
}

/** Capability handler injected by the caller */
export type CapabilityHandler = (intent: ExecutionIntent) => Promise<IntentExecutionResult>

/** Runtime options */
export type ExecutionRuntimeOptions = {
  handlers: Record<string, CapabilityHandler>
  actor: string
  transactionId: string
  timestamp?: number
}

/** Runtime error indicating execution should halt */
export class ExecutionHaltedError extends Error {
  constructor(
    public readonly intentId: string,
    public readonly reason: string
  ) {
    super(`Execution halted at intent ${intentId}: ${reason}`)
    this.name = "ExecutionHaltedError"
  }
}

function makeEvent(
  type: string,
  payload: Record<string, unknown>,
  options: ExecutionRuntimeOptions
): Omit<SynthEvent, "id" | "eventHash" | "previousHash"> {
  return {
    type,
    timestamp: options.timestamp ?? Date.now(),
    transactionId: options.transactionId,
    capability: "execution",
    actor: options.actor,
    payload,
  }
}

async function verify(
  verification: ExecutionVerification,
  result: IntentExecutionResult,
  handlers: Record<string, CapabilityHandler>
): Promise<boolean> {
  switch (verification.kind) {
    case "none":
      return true
    case "command_exit":
      return result.success && (result.result as { exitCode?: number })?.exitCode === verification.expectation
    case "path_exists":
      try {
        const check = await handlers["filesystem"]?.({
          id: "verify",
          expeditionId: "verify",
          objectiveId: "verify",
          workItemId: "verify",
          sequence: 0,
          capability: "filesystem",
          operation: "pathExists",
          target: verification.target,
          payload: { path: verification.target },
          dependencies: [],
          verification: { kind: "none", target: "" },
        })
        return check?.success ?? false
      } catch {
        return false
      }
    case "path_content":
      return result.success
    case "revision_exists":
      return result.success
    default:
      return true
  }
}

/**
 * Execute an ExecutionIntentGraph.
 *
 * Returns all events that should be appended to the event log.
 * The caller is responsible for routing these events through the
 * ExecutionGate and persisting them.
 */
export async function executeGraph(
  graph: ExecutionIntentGraph,
  options: ExecutionRuntimeOptions
): Promise<Array<Omit<SynthEvent, "id" | "eventHash" | "previousHash">>> {
  const events: Array<Omit<SynthEvent, "id" | "eventHash" | "previousHash">> = []

  events.push(
    makeEvent(
      "EXECUTION_INTENT_GRAPH_CREATED",
      {
        expeditionId: graph.expeditionId,
        branch: graph.branch,
        intentIds: graph.ordered,
        edgeCount: graph.edges.length,
      },
      options
    )
  )

  // Create an isolated expedition branch before executing any intents.
  // The branch is derived from the expedition identity and switched to
  // through the registered versioning capability.
  if (graph.branch && options.handlers.versioning) {
    const branchIntent: ExecutionIntent = {
      id: `${graph.expeditionId}/branch`,
      expeditionId: graph.expeditionId,
      objectiveId: "",
      workItemId: "",
      sequence: -1,
      capability: "versioning",
      operation: "switchRevision",
      target: graph.branch,
      payload: { branch: graph.branch, createBranch: true },
      dependencies: [],
      verification: { kind: "none", target: "" },
    }

    events.push(
      makeEvent(
        "EXECUTION_INTENT_CREATED",
        {
          intentId: branchIntent.id,
          expeditionId: branchIntent.expeditionId,
          objectiveId: branchIntent.objectiveId,
          workItemId: branchIntent.workItemId,
          sequence: branchIntent.sequence,
          capability: branchIntent.capability,
          operation: branchIntent.operation,
          target: branchIntent.target,
          dependencies: branchIntent.dependencies,
        },
        options
      )
    )

    events.push(
      makeEvent(
        "EXECUTION_INTENT_STARTED",
        { intentId: branchIntent.id, expeditionId: branchIntent.expeditionId },
        options
      )
    )

    let branchResult: IntentExecutionResult
    try {
      branchResult = await options.handlers.versioning(branchIntent)
    } catch (err) {
      branchResult = { success: false, error: err instanceof Error ? err.message : String(err) }
    }

    if (!branchResult.success) {
      const reason = branchResult.error ?? "Branch creation failed"
      events.push(
        makeEvent(
          "EXECUTION_INTENT_FAILED",
          { intentId: branchIntent.id, expeditionId: branchIntent.expeditionId, reason },
          options
        )
      )
      return events
    }

    const baseCommit = (branchResult.result as VersioningBranchResult | undefined)?.commit ?? ""
    events.push(
      makeEvent(
        "EXPEDITION_BRANCH_CREATED",
        { expeditionId: graph.expeditionId, branch: graph.branch, baseCommit },
        options
      )
    )
  }

  for (const intentId of graph.ordered) {
    const intent = graph.intents.find((i) => i.id === intentId)
    if (!intent) continue

    events.push(
      makeEvent(
        "EXECUTION_INTENT_CREATED",
        {
          intentId: intent.id,
          expeditionId: intent.expeditionId,
          objectiveId: intent.objectiveId,
          workItemId: intent.workItemId,
          sequence: intent.sequence,
          capability: intent.capability,
          operation: intent.operation,
          target: intent.target,
          dependencies: intent.dependencies,
        },
        options
      )
    )
  }

  for (const intentId of graph.ordered) {
    const intent = graph.intents.find((i) => i.id === intentId)
    if (!intent) continue

    events.push(
      makeEvent(
        "EXECUTION_INTENT_STARTED",
        { intentId: intent.id, expeditionId: intent.expeditionId },
        options
      )
    )

    const handler = options.handlers[intent.capability]
    if (!handler) {
      events.push(
        makeEvent(
          "EXECUTION_INTENT_FAILED",
          {
            intentId: intent.id,
            expeditionId: intent.expeditionId,
            reason: `No handler registered for capability: ${intent.capability}`,
          },
          options
        )
      )
      return events
    }

    let result: IntentExecutionResult
    try {
      result = await handler(intent)
    } catch (err) {
      result = { success: false, error: err instanceof Error ? err.message : String(err) }
    }

    const verified = await verify(intent.verification, result, options.handlers)

    if (!result.success || !verified) {
      const reason = result.error ?? `Verification failed: ${intent.verification.kind}`
      events.push(
        makeEvent(
          "EXECUTION_INTENT_FAILED",
          { intentId: intent.id, expeditionId: intent.expeditionId, reason },
          options
        )
      )

      if (intent.rollback) {
        try {
          await options.handlers[intent.rollback.capability]?.(intent.rollback)
        } catch {
          // Rollback failure is recorded silently; the primary failure already halts.
        }
        events.push(
          makeEvent(
            "EXECUTION_INTENT_ROLLEDBACK",
            { intentId: intent.id, expeditionId: intent.expeditionId },
            options
          )
        )
      }

      return events
    }

    events.push(
      makeEvent(
        "EXECUTION_INTENT_COMPLETED",
        {
          intentId: intent.id,
          expeditionId: intent.expeditionId,
          resultSummary: result.error ? undefined : String(result.result ?? "ok"),
        },
        options
      )
    )
  }

  // Commit the expedition's changes as a VersioningCapability revision.
  // The commit message correlates the revision with the expedition and its
  // objectives so that repository history reflects Expedition structure.
  if (options.handlers.versioning) {
    const objectiveIds = [...new Set(graph.intents.map((i) => i.objectiveId).filter(Boolean))]
    const commitMessage = objectiveIds.length > 0
      ? `expedition(${graph.expeditionId}): ${objectiveIds.join(", ")}`
      : `expedition(${graph.expeditionId})`

    const commitIntent: ExecutionIntent = {
      id: `${graph.expeditionId}/commit`,
      expeditionId: graph.expeditionId,
      objectiveId: "",
      workItemId: "",
      sequence: -2,
      capability: "versioning",
      operation: "createRevision",
      target: graph.branch ?? "",
      payload: { message: commitMessage, branch: graph.branch, includeUntracked: true },
      dependencies: [],
      verification: { kind: "none", target: "" },
    }

    events.push(
      makeEvent(
        "EXECUTION_INTENT_CREATED",
        {
          intentId: commitIntent.id,
          expeditionId: commitIntent.expeditionId,
          objectiveId: commitIntent.objectiveId,
          workItemId: commitIntent.workItemId,
          sequence: commitIntent.sequence,
          capability: commitIntent.capability,
          operation: commitIntent.operation,
          target: commitIntent.target,
          dependencies: commitIntent.dependencies,
        },
        options
      )
    )

    events.push(
      makeEvent(
        "EXECUTION_INTENT_STARTED",
        { intentId: commitIntent.id, expeditionId: commitIntent.expeditionId },
        options
      )
    )

    let commitResult: IntentExecutionResult
    try {
      commitResult = await options.handlers.versioning(commitIntent)
    } catch (err) {
      commitResult = { success: false, error: err instanceof Error ? err.message : String(err) }
    }

    if (!commitResult.success) {
      const reason = commitResult.error ?? "Commit failed"
      events.push(
        makeEvent(
          "EXECUTION_INTENT_FAILED",
          { intentId: commitIntent.id, expeditionId: commitIntent.expeditionId, reason },
          options
        )
      )
      return events
    }

    const commitHash = (commitResult.result as VersioningBranchResult | undefined)?.commit ?? ""
    events.push(
      makeEvent(
        "EXPEDITION_EXECUTION_COMMITTED",
        { expeditionId: graph.expeditionId, commit: commitHash },
        options
      )
    )
  }

  return events
}
