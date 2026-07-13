// ============================================================
// WORKSPACE: Read-only state interface
// ============================================================
// Workspace depends ONLY on this interface. It never touches
// EventStore, RuntimeEngine, CommandBus, or ExecutionGate directly.
// ============================================================

import type { CanonicalState, SynthEvent } from "../types/index.js"

export type HealthStatus = "pass" | "warn" | "fail"


export type HealthReport = {
  status: "healthy" | "degraded" | "unhealthy"
  checks: HealthCheck[]
  summary: {
    pass: number
    warn: number
    fail: number
  }
}

export type HealthCheck = {
  name: string
  status: HealthStatus
  detail?: string
}

export interface StateReader {
  /** Load the current canonical state projection */
  loadState(): Promise<CanonicalState>

  /** Load all events from the event store */
  loadEvents(): Promise<SynthEvent[]>

  /** Run a basic health check on the state/read path */
  checkHealth(): Promise<HealthReport>

  /** Verify that replaying events produces a consistent state */
  verifyReplay(): Promise<{ consistent: boolean; eventCount: number }>
}
