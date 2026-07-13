// ============================================================
// SYNTH v2 — TRANSACTION TYPES
// ============================================================

import type { SynthEvent } from "./event.js"

/** Transaction — atomic execution boundary */
export type Transaction = {
  id: string
  intent: CapabilityInvocation
  status: "pending" | "committed" | "rolledback" | "failed"
  startedAt: number
  finishedAt?: number
  events: SynthEvent[]
  beforeStateHash: string
  afterStateHash?: string
}

/** Capability invocation — the only way to trigger execution */
export type CapabilityInvocation = {
  actor: string
  capability: string
  payload: Record<string, unknown>
  context?: Record<string, unknown>
}

/** Execution result — output of the runtime engine */
export type ExecutionResult = {
  success: boolean
  output: unknown
  transaction: Transaction
  events: SynthEvent[]
}

/** Intent request — external entry into the system */
export type IntentRequest = {
  actor: string
  capability: string
  payload: Record<string, unknown>
  context?: Record<string, unknown>
}

/** Intent response — system output to external callers */
export type IntentResponse = {
  status: "ok" | "error"
  result?: unknown
  error?: string
  traceId: string
  meta?: Record<string, unknown>
}

/** Validation result for capability invocations */
export type ValidationResult = {
  valid: boolean
  errors: Array<{ field: string; message: string; severity: "error" | "warning" }>
}
