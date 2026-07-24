// ============================================================
// SYNTH v2 — DERIVED STATE TYPES
// ============================================================
// Derived state is recomputed from the event log. It is NOT
// primary data and does not belong in CanonicalState.
// ============================================================

import type {
  ReviewGateExpeditionState,
  IntentModelState,
  RefinementSessionState,
  RefinementReportState,
  AlignmentContractState,
  DivergenceGateState,
  GeneratedWorkItem,
  Execution,
  ReferenceEvidenceState,
  ConvergenceCertificationState,
} from "./state.js"
import type { ExecutionIntentState, ExecutionGraphState } from "./execution-intent.js"

/** All workflow, governance, execution, and audit state derived from events. */
export type DerivedState = {
  reviewGateExpeditions: Record<string, ReviewGateExpeditionState>
  intentModels: Record<string, IntentModelState>
  refinementSessions: Record<string, RefinementSessionState>
  refinementReports: Record<string, RefinementReportState>
  alignmentContracts: Record<string, AlignmentContractState>
  referenceEvidence: Record<string, import("./state.js").ReferenceEvidenceState>
  divergenceGates: Record<string, DivergenceGateState>
  convergenceCertifications: Record<string, ConvergenceCertificationState>
  generatedWorkItems: Record<string, GeneratedWorkItem>
  executions: Record<string, Execution>
  executionIntents: Record<string, ExecutionIntentState>
  executionGraphs: Record<string, ExecutionGraphState>
}

/** Projection wrapper for cached derived state. */
export type DerivedStateProjection = {
  version: number
  data: DerivedState
  sourceStateHash: string
  computedAt: number
}
