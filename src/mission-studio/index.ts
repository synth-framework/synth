// ============================================================
// MISSION STUDIO: Public Surface
// ============================================================

export { MissionStudio } from "./engine.js"
export { MissionIntake } from "./intake.js"
export {
  diffSnapshots
} from "./snapshot-lineage.js"
export {
  buildWeightedTokens,
  scoreWeightedJaccard,
  type SimilarityCandidate,
  type ComparableRecord,
  type SimilarMatch,
} from "./duplicate-detection.js"
export type {
  SnapshotDiff,
  NodeChange,
  EdgeChange,
  DecisionChange,
} from "./snapshot-lineage.js"
export type {
  Evidence,
  EvidenceCollection,
  Unknown,
  ConfidenceResult,
  WorldModel,
  WorldModelNode,
  WorldModelNodeKind,
  WorldModelEdge,
  WorldModelRelation,
  PlanningDecision,
  PlanningQuestion,
  PlanningSession,
  PlanningSessionApprovalState,
  PlanningOperation,
  Proposal,
  MissionProposal,
  ExpeditionProposal,
  ObjectiveProposal,
  DiscoveryProposal,
  DecisionProposal,
  ApprovedMissionModelSnapshot,
  SnapshotLineage,
  StoredSnapshot,
  MissionStudioConfig,
  MissionStudioResult,
} from "./types.js"
export type { SnapshotStore } from "./snapshot-store.js"
