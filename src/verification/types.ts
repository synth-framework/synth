// ============================================================
// VERIFICATION ENGINE: Types
// ============================================================
// Shared types for `synth verify` checks and reports.
// ============================================================

import type { ReplayCheckResult } from "../core/replay-verifier.js"
import type { EventStore } from "../infra/event-store.js"
import type { IStateStore } from "../infra/state-store.js"
import type { ICheckpointStore } from "../infra/checkpoint-store.js"

export type Severity = "error" | "warning" | "info"

export type CheckStatus = "pass" | "fail" | "warn"

export type VerificationViolation = {
  message: string
  severity?: Severity
  nextStep?: string
  ids?: string[]
}

export type VerificationCheckResult = {
  name: string
  status: CheckStatus
  message: string
  violations: VerificationViolation[]
}

export type VerificationSummary = {
  total: number
  pass: number
  fail: number
  warn: number
}

export type VerificationReport = {
  status: "ok" | "error"
  kind: "VerificationReport"
  version: number
  summary: VerificationSummary
  checks: VerificationCheckResult[]
  nextStep: string | null
}

export type DecisionRecord = {
  type: string
  draftId: string
  timestamp: number
  reason?: string
  confidence?: number
  snapshotId?: string
}

export type VerificationContext = {
  cwd: string
  dataDir: string
  hasManifest: boolean
  hasEventLog: boolean
  eventStore: EventStore
  stateStore: IStateStore
  checkpointStore: ICheckpointStore
  verifier: { verify(): Promise<ReplayCheckResult> }
  replayResult?: ReplayCheckResult
  decisions: { records: DecisionRecord[]; chainValid: boolean }
  snapshotIds: string[]
  snapshotError?: string
  draftIds: string[]
}

export type VerificationCheck = (ctx: VerificationContext) => Promise<VerificationCheckResult>
