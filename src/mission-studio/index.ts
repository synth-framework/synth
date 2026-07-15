// ============================================================
// MISSION STUDIO: Public Surface
// ============================================================

export { MissionStudio, createMissionStudio } from "./engine.js"
export { MissionIntake, createMissionIntake } from "./intake.js"
export {
  mapObservationToPlanningObservation,
  mapObservationsToPlanningObservations,
} from "./adapter-mapper.js"
export { collectPlanningObservations } from "./adapter-observation-collector.js"
export {
  InMemorySnapshotStore,
  FileSystemSnapshotStore,
  createInMemorySnapshotStore,
  createFileSystemSnapshotStore,
} from "./snapshot-store.js"
export {
  buildSnapshotLineage,
  diffSnapshots,
  reconstructSessionFromSnapshot,
  getSnapshotLineage,
} from "./snapshot-lineage.js"
export { validateProposalGraph } from "./proposal-graph-validator.js"
export {
  SNAPSHOT_SCHEMA_VERSION,
  canonicalizeSnapshot,
  signSnapshot,
  certifySnapshot,
  migrateStoredSnapshot,
} from "./snapshot-integrity.js"
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
