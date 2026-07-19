// ============================================================
// KNOWLEDGE: Prototype-First Validation Types
// ============================================================
// Shared types for EXP-KNOWLEDGE-002.
// ============================================================

import type { KnowledgeGraph } from "../types.js"

export type ValidationStatus = "passed" | "blocked" | "pending"

export interface AcceptanceScenario {
  id: string
  objectiveId: string
  given: string
  when: string
  then: string
  validationMethod: "manual" | "simulation" | "runtime-check"
  status: ValidationStatus
}

export interface MockApiEndpoint {
  id: string
  path: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  description: string
  requestSchema?: Record<string, unknown>
  responseSchema?: Record<string, unknown>
  derivedFromEventId: string
}

export interface SimulationTrace {
  id: string
  scenarioId: string
  events: string[]
  outcome: string
  deterministic: boolean
}

export interface RuntimeCheck {
  capability: string
  status: "AVAILABLE" | "DEGRADED" | "MISSING" | "UNAVAILABLE"
  message: string
}

export interface RuntimeVerificationReport {
  status: ValidationStatus
  checks: RuntimeCheck[]
  reportHash: string
}

export interface ValidationReport {
  schema: "synth-validation-report-v1"
  version: string
  status: ValidationStatus
  scenarios: AcceptanceScenario[]
  mockApi: MockApiEndpoint[]
  simulations: SimulationTrace[]
  runtimeVerification: RuntimeVerificationReport
  blockers: string[]
  reportHash: string
  generatedAt: string
}

export interface ValidationOptions {
  knowledgeGraph: KnowledgeGraph
}

export interface ValidationAdapter {
  readonly id: string
  readonly version: string
  validate(options: ValidationOptions): ValidationReport
}
