// ============================================================
// VERIFICATION ENGINE: Types
// ============================================================
// Shared types for `synth verify` checks and reports.
// ============================================================

import type { ReplayCheckResult } from "../core/replay-verifier.js"
import type { EventStore, EventLogLayout } from "../infra/event-store.js"
import type { IStateStore } from "../infra/state-store.js"
import type { ICheckpointStore } from "../infra/checkpoint-store.js"

export type Severity = "error" | "warning" | "info"

/**
 * Outcome of a verification check.
 *
 * "skipped" means the check could not run because its subject does not exist
 * (no event log to replay). It is deliberately NOT a pass: a check that never
 * examined anything certifies nothing, and folding that into `pass` is how an
 * unverified project came to look verified.
 */
export type CheckStatus = "pass" | "fail" | "warn" | "skipped"

export type VerificationViolation = {
  message: string
  severity?: Severity
  nextStep?: string
  ids?: string[]
  code?: string
  fixCommand?: string
}

export type VerificationCheckResult = {
  name: string
  status: CheckStatus
  message: string
  violations: VerificationViolation[]
  /** Present when status is "skipped": why the check could not run. */
  skippedReason?: string
}

export type VerificationSummary = {
  total: number
  pass: number
  fail: number
  warn: number
  /** Checks that did not run. Never counted as pass. */
  skipped: number
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
  /** Which on-disk event-log layout the project uses, per locateEventLog. */
  eventLogLayout?: EventLogLayout
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
