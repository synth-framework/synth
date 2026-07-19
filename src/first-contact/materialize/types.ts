// ============================================================
// FIRST CONTACT: Mission Materialization Types
// ============================================================
// Shared types for the Mission Materialization Pipeline (EXP-AIFC-007).
// ============================================================

import type { ArchitectureCandidate } from "../project/types.js"
import type { CapabilityVerificationReport } from "../verify/types.js"
import type { IntentExtractionResult } from "../extract/types.js"

export interface MissionProposal {
  id: string
  subject: string
  purpose: string
  derivedFrom: {
    discoveryArtifactId: string
    selectedArchitectureId: string
  }
}

export interface ExpeditionProposal {
  id: string
  missionId: string
  subject: string
  goal: string
}

export interface MaterializationResult {
  projectRoot: string
  manifestPath: string
  eventLogPath: string
  statePath: string
  artifactPath: string
  transcriptPath: string
  missionProposalPath: string
  expeditionProposalsPath: string
  mission: MissionProposal
  expeditions: ExpeditionProposal[]
}

export interface MaterializationOptions {
  projectRoot: string
  projectName?: string
  approvedArtifact: IntentExtractionResult
  selectedArchitecture: ArchitectureCandidate
  verificationReport: CapabilityVerificationReport
}
