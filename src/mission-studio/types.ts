// ============================================================
// MISSION STUDIO: Canonical Planning Types
// ============================================================
// Immutable, adapter-agnostic types for the Mission Studio runtime.
// No runtime/execution concepts leak into this layer.
// ============================================================

import type { PlanningObservation } from "../planning/observation.js"

// ============================================================
// Evidence
// ============================================================

export type Evidence = {
  /** Stable unique identifier */
  id: string

  /** Observation that produced this evidence */
  observationId: string

  /** Adapter that supplied the source observation */
  source: string

  /** Human-readable evidence description */
  description: string

  /** Optional raw snippet or summary */
  snippet?: string

  /** Optional checksum or fingerprint */
  fingerprint?: string

  /** Evidence is immutable once collected */
  immutable: true
}

export type EvidenceCollection = {
  evidence: Evidence[]
  byObservationId: Map<string, Evidence>
}

// ============================================================
// Unknowns
// ============================================================

export type Unknown = {
  /** Stable unique identifier */
  id: string

  /** Clarification question */
  question: string

  /** Why this unknown exists */
  reason: string

  /** IDs of planning artifacts blocked by this unknown */
  requiredFor?: string[]

  /** Whether this unknown blocks approval */
  blocking: boolean

  /** Estimated impact on overall confidence (0-1) */
  confidenceImpact: number

  /** Source observation IDs, if any */
  observationIds?: string[]
}

// ============================================================
// Confidence
// ============================================================

export type ConfidenceResult = {
  /** Overall confidence score (0-1) */
  overall: number

  /** Fraction of expected observations present (0-1) */
  observationCoverage: number

  /** Quality of backing evidence (0-1) */
  evidenceQuality: number

  /** Internal consistency of the world model (0-1) */
  consistency: number

  /** Fraction of required fields populated (0-1) */
  completeness: number

  /** Depth of inferred knowledge (0-1) */
  inferenceDepth: number

  /** Negative impact of unknowns (0-1) */
  unknownImpact: number

  /** Number of contradictions detected */
  contradictionCount: number
}

// ============================================================
// World Model Nodes
// ============================================================

export type WorldModelNodeKind =
  | "mission"
  | "expedition"
  | "objective"
  | "component"
  | "capability"
  | "actor"
  | "constraint"
  | "risk"
  | "assumption"
  | "unknown"

export type WorldModelNodeBase = {
  id: string
  kind: WorldModelNodeKind
  name: string
  description?: string
  observationIds: string[]
  evidenceRefs: string[]
  confidence: number
  metadata?: Record<string, unknown>
}

export type MissionNode = WorldModelNodeBase & {
  kind: "mission"
  purpose: string
  expeditionIds: string[]
}

export type ExpeditionNode = WorldModelNodeBase & {
  kind: "expedition"
  missionId: string
  goal: string
  objectiveIds: string[]
}

export type ObjectiveNode = WorldModelNodeBase & {
  kind: "objective"
  expeditionId: string
  title: string
}

export type ComponentNode = WorldModelNodeBase & {
  kind: "component"
}

export type CapabilityNode = WorldModelNodeBase & {
  kind: "capability"
}

export type ActorNode = WorldModelNodeBase & {
  kind: "actor"
}

export type ConstraintNode = WorldModelNodeBase & {
  kind: "constraint"
}

export type RiskNode = WorldModelNodeBase & {
  kind: "risk"
  severity?: "low" | "medium" | "high" | "critical"
}

export type AssumptionNode = WorldModelNodeBase & {
  kind: "assumption"
}

export type UnknownNode = WorldModelNodeBase & {
  kind: "unknown"
}

export type WorldModelNode =
  | MissionNode
  | ExpeditionNode
  | ObjectiveNode
  | ComponentNode
  | CapabilityNode
  | ActorNode
  | ConstraintNode
  | RiskNode
  | AssumptionNode
  | UnknownNode

// ============================================================
// World Model Edges
// ============================================================

export type WorldModelRelation =
  | "depends_on"
  | "discovered_by"
  | "blocks"
  | "supports"
  | "parent_of"
  | "references"

export type WorldModelEdge = {
  id: string
  source: string
  target: string
  relation: WorldModelRelation
  observationIds: string[]
}

// ============================================================
// Planning Decision
// ============================================================

export type PlanningDecision = {
  id: string
  type: string
  rationale: string
  evidenceRefs: string[]
  observationIds: string[]
  timestamp: number
  metadata?: Record<string, unknown>
}

// ============================================================
// World Model
// ============================================================

export type WorldModel = {
  version: number
  nodes: Map<string, WorldModelNode>
  edges: WorldModelEdge[]
  evidence: EvidenceCollection
  unknowns: Unknown[]
  confidence: ConfidenceResult
  planningDecisions: PlanningDecision[]
}

// ============================================================
// Proposals
// ============================================================

export type ProposalBase = {
  id: string
  name: string
  description?: string
  evidenceRefs: string[]
  observationIds: string[]
  confidence: number
  rationale?: string
}

export type MissionProposal = ProposalBase & {
  kind: "mission"
  purpose: string
}

export type ExpeditionProposal = ProposalBase & {
  kind: "expedition"
  missionId: string
  goal: string
}

export type ObjectiveProposal = ProposalBase & {
  kind: "objective"
  expeditionId: string
  title: string
}

export type DiscoveryProposal = ProposalBase & {
  kind: "discovery"
  expeditionId: string
  context: string
  impact: "low" | "medium" | "high" | "critical"
}

export type DecisionProposal = ProposalBase & {
  kind: "decision"
  expeditionId: string
  alternatives: string[]
  chosenAlternative: number
}

export type Proposal =
  | MissionProposal
  | ExpeditionProposal
  | ObjectiveProposal
  | DiscoveryProposal
  | DecisionProposal

// ============================================================
// Planning Operations (Wizard / Planner)
// ============================================================

export type PlanningOperation =
  | { kind: "ApproveProposal"; proposalId: string }
  | { kind: "RejectProposal"; proposalId: string }
  | { kind: "MergeObjectives"; sourceIds: string[]; targetName: string }
  | { kind: "SplitObjective"; sourceId: string; targets: Array<{ name: string; description?: string }> }
  | { kind: "RenameComponent"; nodeId: string; newName: string }
  | { kind: "AcceptObservation"; observationId: string }
  | { kind: "RejectObservation"; observationId: string }
  | { kind: "AddConstraint"; name: string; description: string; observationIds: string[] }
  | { kind: "RemoveAssumption"; nodeId: string }
  | { kind: "RequestEvidence"; question: string; reason: string }
  | { kind: "GenerateClarificationQuestions" }
  | { kind: "PrioritizeExpeditions"; expeditionIds: string[] }
  | { kind: "PrioritizeObjectives"; objectiveIds: string[] }
  | { kind: "EstimateRisk"; nodeId: string; severity: "low" | "medium" | "high" | "critical" }
  | { kind: "RecordDecision"; type: string; rationale: string; evidenceRefs: string[] }

// ============================================================
// Planning Session
// ============================================================

export type PlanningQuestion = {
  id: string
  text: string
  reason: string
  unknownId?: string
  observationIds?: string[]
  answered: boolean
  answer?: string
}

export type PlanningSessionApprovalState =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"

export type PlanningSession = {
  id: string
  createdAt: number
  observations: PlanningObservation[]
  evidence: EvidenceCollection
  questions: PlanningQuestion[]
  unknowns: Unknown[]
  confidence: ConfidenceResult
  worldModel: WorldModel
  planningDecisions: PlanningDecision[]
  approvalState: PlanningSessionApprovalState
}

// ============================================================
// Snapshot Lineage
// ============================================================

export type SnapshotLineage = {
  /** Stable identifier for the entire snapshot lineage */
  lineageId: string

  /** Monotonic version within the lineage */
  version: number

  /** Previous snapshot in the lineage, if any */
  parentId?: string

  /** When this snapshot was approved */
  approvedAt: number

  /** Actor that approved this snapshot */
  approvedBy?: string
}

// ============================================================
// Approved Mission Model Snapshot
// ============================================================

export type ApprovedMissionModelSnapshot = {
  id: string
  version: string
  signature: string
  sessionId: string
  worldModel: WorldModel
  proposals: Proposal[]
  timestamp: number
  lineage?: SnapshotLineage
}

// ============================================================
// Stored Snapshot (snapshot + the session that produced it)
// ============================================================

export type StoredSnapshot = {
  snapshot: ApprovedMissionModelSnapshot
  session: PlanningSession
}

// ============================================================
// Mission Studio Configuration and Results
// ============================================================

export type MissionStudioConfig = {
  /** Minimum confidence required for auto-approval */
  approvalThreshold?: number

  /** Whether unknowns block approval by default */
  unknownsBlockApproval?: boolean
}

export type MissionStudioResult<T> = {
  success: boolean
  session: PlanningSession
  data?: T
  error?: string
}
