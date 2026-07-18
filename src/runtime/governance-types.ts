// ============================================================
// RUNTIME: Governance Types
// ============================================================
// Shared types for the governance interpretation kernel.
// These types are the contract between the Governance Resolver,
// Governance Model, Transition Engine, and Status Projection.
// ============================================================

import type { SynthEvent, CanonicalState } from "../types/index.js"
import type { DecisionLogRead } from "../mission-studio/decision-log.js"
import type { StoredSnapshot } from "../mission-studio/types.js"

export type DraftSummary = {
  id: string
  confidence: number
  unknowns: number
  blockingUnknowns: number
  approvalState: string
  createdAt: number
}

export type GovernancePhase =
  | "uninitialized"
  | "initialized"
  | "planning"
  | "approved"
  | "executing"
  | "blocked"
  | "complete"

export type ValidTransition = {
  kind:
    | "InitializeProject"
    | "CreateMission"
    | "AddMissionEvidence"
    | "ApproveMission"
    | "CreateExpedition"
    | "InspectExecution"
    | "DiagnoseBlocker"
    | "ArchiveMission"
    | "NoOp"
  targetId?: string
  reason: string
}

export type GovernanceRule = {
  id: string
  priority: number
  when: (ctx: ResolvedGovernanceContext) => boolean
  transition: ValidTransition | ((ctx: ResolvedGovernanceContext) => ValidTransition)
}

export type StateDivergence = {
  kind: string
  severity: "warning" | "error"
  description: string
  artifact?: string
}

export type GovernanceConflict = {
  artifact: string
  issue: string
  expected?: string
  actual?: string
}

export type ResolvedGovernanceContext = {
  schemaVersion: 1
  authoritative: {
    manifestExists: boolean
    events: SynthEvent[]
    persistedState: CanonicalState | null
    replayedState: CanonicalState
    decisions: DecisionLogRead
    snapshots: StoredSnapshot[]
  }
  derived: {
    phase: GovernancePhase
    activeMission: import("../types/index.js").Mission | null
    activeExpedition: import("../types/index.js").Expedition | null
    latestDraft: DraftSummary | null
    divergences: StateDivergence[]
    graphViolations: import("./replay.js").AggregateGraphViolation[]
  }
}

export type GovernanceResolutionFailure = {
  status: "error"
  kind: "GovernanceResolutionFailure"
  severity: "fatal" | "recoverable"
  recoverable: boolean
  diagnostic: string
  recovery: string
  conflicts: GovernanceConflict[]
}

export type GovernanceResolutionResult =
  | ResolvedGovernanceContext
  | GovernanceResolutionFailure
