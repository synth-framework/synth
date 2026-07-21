// ============================================================
// SYNTH v2 — STATE TYPES
// ============================================================
// State is a derived, materialized projection of the Event Store.
// It is NOT primary data — it is a cached interpretation of truth.
// ============================================================

import type { ExecutionIntentState, ExecutionGraphState } from "./execution-intent.js"

/** WorkItem — the canonical execution entity; smallest unit of intentional work */
export type WorkItem = {
  id: string
  status: "idle" | "active" | "blocked" | "complete"
  dependencies: string[]
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** Plan — structured decomposition of project objective */
export type Plan = {
  id: string
  name: string
  status: "draft" | "active" | "completed" | "deprecated"
  milestones: string[]
  dependencies: string[]
  metadata: Record<string, unknown>
}

/** Milestone — logically grouped set of work items */
export type Milestone = {
  id: string
  name: string
  planId: string
  workItems: string[]
  completionCriteria: string
  status: "pending" | "in_progress" | "completed"
}

/** Project — top-level container of all work */
export type Project = {
  id: string
  name: string
  goal: string
  plans: string[]
  status: "active" | "archived" | "terminated"
}

/** Mission — long-term strategic direction */
export type Mission = {
  id: string
  name: string
  purpose: string
  status: "draft" | "active" | "completed" | "archived"
  expeditions: string[]
  alignmentContractId?: string
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** Expedition — bounded engineering objective */
export type Expedition = {
  id: string
  missionId: string
  name: string
  goal: string
  status: "draft" | "approved" | "committed" | "executing" | "completed" | "cancelled"
  objectives: string[]
  discoveries: string[]
  decisions: string[]
  dependsOn: string[]
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** Review gate expedition state — governed execution checkpoint */
export type ReviewGateExpeditionState = {
  expeditionId: string
  status: "proposed" | "executing" | "implementation_complete" | "awaiting_review" | "revision_requested" | "approved" | "awaiting_acceptance" | "accepted" | "closed" | "rejected"
  gates: ReviewGateState[]
  refinedIntentId?: string
  reviewPackageId?: string
  reviewDecisionId?: string
  acceptancePackageId?: string
  acceptanceRecordId?: string
  currentGateId?: string
}

/** Minimal gate policy stored in replay state */
export type ReviewGatePolicy = {
  reviewers: string[]
  quorum: "all" | "any" | number
  timeout?: number
  revisionLimit?: number
  autoAdvance?: boolean
}

/** Gate instance state */
export type ReviewGateState = {
  id: string
  gateType: "refinement" | "review" | "acceptance"
  expeditionId: string
  policy: ReviewGatePolicy
  status: "pending" | "awaiting_review" | "approved" | "revision_requested" | "rejected" | "accepted" | "closed"
  inputs: string[]
  outputs: string[]
  reviewer?: { kind: string; id: string }
  decisionId?: string
  parentGateId?: string
  blocking: boolean
  createdAt: number
  resolvedAt?: number
}

/** Intent Model — structured interpretation of raw human intent */
export type IntentModelState = {
  id: string
  rawIntentReference: string
  explicitObjectives: string[]
  implicitObjectives: string[]
  audience?: string
  problemStatement?: string
  desiredOutcome?: string
  nonGoals: string[]
  forbiddenInterpretations: string[]
  allowedInterpretations: string[]
  interpretations: Array<{
    kind: string
    text: string
    evidence?: string[]
  }>
  referenceEvidenceIds: string[]
  confidenceLevel: number
  unresolvedAmbiguity: string[]
  knownUnknowns: string[]
  status: string
  version: number
  createdAt: number
  updatedAt: number
}

/** Refinement Session — clarification loop for an Intent Model */
export type RefinementSessionState = {
  id: string
  intentModelId: string
  status: "active" | "clarifying" | "sufficient" | "insufficient" | "superseded"
  questions: Array<{
    id: string
    text: string
    category: string
    priority: string
  }>
  answers: Array<{ questionId: string; text: string }>
  version: number
  createdAt: number
  updatedAt: number
}

/** Refinement Report — captured outcome of a refinement session */
export type RefinementReportState = {
  id: string
  sessionId: string
  intentModelId: string
  createdAt: number
  reviewer: { kind: string; id: string }
  initialConfidence: number
  finalConfidence: number
  entries: Array<{
    question: {
      id: string
      text: string
      category: string
      priority: string
    }
    answer: string
  }>
  assumptionsRemoved: string[]
  forbiddenInterpretationsAdded: string[]
  allowedInterpretationsAdded: string[]
  evidenceLinked: string[]
  openQuestions: string[]
  recommendation: string
  reason: string
}

/** Alignment Contract — formal agreement before Mission creation */
export type AlignmentContractState = {
  id: string
  intentModelId: string
  refinedIntentId?: string
  intentSummary: string
  expectedExperience: string
  requiredProperties: string[]
  forbiddenProperties: string[]
  requiredBehaviors: string[]
  visualReferences: string[]
  behavioralReferences: string[]
  functionalExpectations: string[]
  technicalConstraints: string[]
  successCriteria: string[]
  explicitNonRequirements: string[]
  allowedInterpretation: string[]
  allowedVariation: string[]
  forbiddenInterpretation: string[]
  forbiddenDrift: string[]
  referenceEvidenceIds: string[]
  status: string
  approvedBy?: { kind: string; id: string }
  approvedAt?: number
  version: number
  createdAt: number
  updatedAt: number
}

/** Reference Evidence — bound artifact justifying a requirement */
export type ReferenceEvidenceState = {
  id: string
  kind: string
  uri: string
  hash?: string
  mimeType?: string
  description?: string
  capturedAt: number
}

/** Divergence Gate — pre-Mission alignment checkpoint */
export type DivergenceGateState = {
  id: string
  contractId: string
  intentModelId: string
  status: string
  reportId?: string
  createdAt: number
  resolvedAt?: number
}

/** Objective — specific measurable outcome within an expedition */
export type Objective = {
  id: string
  expeditionId: string
  title: string
  purpose: string
  status: "draft" | "completed"
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** Discovery — newly learned architectural knowledge */
export type Discovery = {
  id: string
  expeditionId: string
  description: string
  context: string
  impact: "low" | "medium" | "high" | "critical"
  status: "recorded"
  metadata: Record<string, unknown>
  createdAt: number
}

/** Decision — chosen architectural direction */
export type Decision = {
  id: string
  expeditionId: string
  title: string
  alternatives: string[]
  chosenAlternative: number
  status: "proposed" | "accepted" | "rejected"
  consequences: {
    positive: string[]
    negative: string[]
  }
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

/** GeneratedWorkItem — work item produced by planning layer */
export type GeneratedWorkItem = {
  id: string
  expeditionId: string
  objectiveId: string
  title: string
  status: "generated" | "completed"
  metadata: Record<string, unknown>
  createdAt: number
  updatedAt?: number
  completedAt?: number
}

/** Execution record — record of capability invocation */
export type Execution = {
  id: string
  capability: string
  intent: unknown
  txId: string
  startedAt: number
  finishedAt?: number
  status: "success" | "failed" | "rolledback"
}

/** Repository branch — governed line of development */
export type RepositoryBranch = {
  name: string
  type: "main" | "release" | "mission" | "expedition" | "hotfix"
  baseBranch?: string
  missionId?: string
  expeditionId?: string
  createdAt: number
}

/** Pull request — governance artifact for promotion */
export type PullRequest = {
  id: string
  forgeId: string
  url: string
  number: number
  title: string
  headBranch: string
  baseBranch: string
  state: "open" | "closed" | "merged"
  missionId?: string
  expeditionId?: string
  createdAt: number
  updatedAt: number
}

/** Release — governed publication event */
export type Release = {
  id: string
  tag: string
  name: string
  targetCommit: string
  url?: string
  evidenceReference?: string
  createdAt: number
}

/** Repository — governed container of project history */
export type Repository = {
  defaultBranch: string
  forgeProvider: string
  branches: Record<string, RepositoryBranch>
  pullRequests: Record<string, PullRequest>
  releases: Record<string, Release>
  lifecycle:
    | "uninitialized"
    | "initialized"
    | "branch-created"
    | "promotion-proposed"
    | "promotion-approved"
    | "merged"
    | "released"
  versionStrategy: "semver" | "calver" | "build" | "custom"
}

/** Canonical state — the single authoritative materialized projection */
export type CanonicalState = {
  version: number
  stateHash: string
  lifecycle: "uninitialized" | "initialized" | "materialized"
  workItems: Record<string, WorkItem>
  plans: Record<string, Plan>
  milestones: Record<string, Milestone>
  projects: Record<string, Project>
  missions: Record<string, Mission>
  expeditions: Record<string, Expedition>
  reviewGateExpeditions: Record<string, ReviewGateExpeditionState>
  objectives: Record<string, Objective>
  discoveries: Record<string, Discovery>
  decisions: Record<string, Decision>
  intentModels: Record<string, IntentModelState>
  refinementSessions: Record<string, RefinementSessionState>
  refinementReports: Record<string, RefinementReportState>
  alignmentContracts: Record<string, AlignmentContractState>
  referenceEvidence: Record<string, ReferenceEvidenceState>
  divergenceGates: Record<string, DivergenceGateState>
  generatedWorkItems: Record<string, GeneratedWorkItem>
  executions: Record<string, Execution>
  executionIntents: Record<string, ExecutionIntentState>
  executionGraphs: Record<string, ExecutionGraphState>
  repository?: Repository
  lastEventOffset: number
}

/** Projection — derived view constructed from replaying events */
export type Projection<T = unknown> = {
  version: number
  data: T
  sourceStateHash: string
  computedAt: number
}

/** Consumer checkpoint — Kafka-like offset tracking */
export type ConsumerCheckpoint = {
  consumerGroup: string
  partition: number
  lastCommittedOffset: number
  inFlightOffset?: number
  updatedAt: number
}

/** State update — result of applying events to state */
export type StateUpdate = {
  previousHash: string
  newHash: string
  eventsApplied: number
  workItemsChanged: string[]
  plansChanged: string[]
  milestonesChanged: string[]
  projectsChanged: string[]
}
