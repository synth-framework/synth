// ============================================================
// RUNTIME: Executor (Core Execution Engine)
// ============================================================
// Pure execution operator.
// Receives a pre-authorized invocation + current state, executes domain logic, returns events.
// NO validation, NO policy decisions, NO persistence.
// ============================================================

import type {
  CapabilityInvocation,
  ExecutionResult,
  CanonicalState,
  Capability,
  ExecutionContext as SystemExecutionContext,
} from "../types/index.js"
import { applyDomain, toEvents } from "../domain/index.js"
import { applyEvent, computeStateHash } from "./replay.js"

export type ExecutionContext = SystemExecutionContext & {
  currentState: CanonicalState
  capabilityRegistry?: Map<string, Capability>
}

export class ExecutionError extends Error {
  public readonly code: string
  public readonly context: Record<string, unknown>

  constructor(code: string, message: string, context: Record<string, unknown> = {}) {
    super(message)
    this.name = "ExecutionError"
    this.code = code
    this.context = context
  }
}

export async function execute(
  invocation: CapabilityInvocation,
  ctx: ExecutionContext
): Promise<ExecutionResult> {
  const txId = ctx.commandId
  const startedAt = ctx.timestamp

  // === STEP 1: RESOLVE CAPABILITY (registry override) ===
  let domainResult

  if (ctx.capabilityRegistry && ctx.capabilityRegistry.has(invocation.capability)) {
    const cap = ctx.capabilityRegistry.get(invocation.capability)!
    domainResult = cap.handler({
      intent: invocation,
      state: ctx.currentState,
      executionCtx: {
        timestamp: ctx.timestamp,
        commandId: ctx.commandId,
      },
    })
  } else {
    // Pure domain execution: applyDomain resolves by name
    domainResult = applyDomain(invocation, ctx.currentState, ctx)
  }

  // === STEP 2: GENERATE EVENTS ===
  const events = toEvents(domainResult, ctx)

  // === STEP 3: COMPUTE NEW STATE (pure fold) ===
  let newState = JSON.parse(JSON.stringify(ctx.currentState)) as CanonicalState
  for (const event of events) {
    newState = applyEvent(newState, event)
  }
  newState.stateHash = computeStateHash(newState)

  // === STEP 4: BUILD TRANSACTION ===
  const tx = {
    id: txId,
    intent: invocation,
    status: "committed" as const,
    startedAt,
    finishedAt: ctx.timestamp,
    events,
    beforeStateHash: ctx.currentState.stateHash,
    afterStateHash: newState.stateHash,
  }

  // === STEP 5: RETURN RESULT (NO PERSISTENCE) ===
  return {
    success: true,
    output: domainResult.result || { events: events.length },
    transaction: tx,
    events,
  }
}
