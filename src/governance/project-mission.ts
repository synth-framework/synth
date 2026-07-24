// ============================================================
// GOVERNANCE: Mission Projection Capability
// ============================================================
// Deterministic projection of a Mission from an approved Alignment
// Contract. This is the reference implementation of EXP-REFINE-013.
// No consumer may implement its own projection logic.
// ============================================================

import crypto from "crypto"
import type { AlignmentContract, AlignmentDimension, ObjectiveCoverage } from "./alignment-contract.js"
import type { IntentModel } from "./intent-model.js"
import type { RefinementReport } from "./refinement-report.js"

/** Error thrown when a projection invariant is violated. */
export class ProjectionInvariantError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ProjectionInvariantError"
  }
}

/** Error thrown when projection completeness checks fail. */
export class ProjectionCompletenessError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ProjectionCompletenessError"
  }
}

/** Lineage recorded on every projected Mission. */
export type MissionLineage = {
  alignmentContractId: string
  intentModelId: string
  refinementReportId: string
}

/** Canonical Mission enriched with projection metadata. */
export type ProjectedMission = {
  id: string
  name: string
  purpose: string
  status: "projected" | "draft" | "active" | "completed" | "archived"
  projectionStatus: "projected" | "certified" | "failed"
  objectives: string[]
  constraints: string[]
  nonGoals: string[]
  allowedVariation: string[]
  forbiddenDrift: string[]
  referenceEvidence: string[]
  lineage: MissionLineage
  fingerprint: string
  projectionId: string
  createdAt: number
  updatedAt: number
}

/** Mapping from a Mission field back to its source. */
export type ProvenanceEntry = {
  field: string
  source: string
  rule: string
}

/** Certification check result. */
export type CertificationCheck = {
  name: string
  passed: boolean
  reason: string
}

/** Projection certification result. */
export type ProjectionCertification = {
  certificationId: string
  projectionId: string
  result: "passed" | "failed"
  checks: CertificationCheck[]
  certifiedAt: number
}

/** The complete Mission Projection Package. */
export type MissionProjectionPackage = {
  projectionId: string
  alignmentContractId: string
  alignmentContract: AlignmentContract
  mission: ProjectedMission
  provenance: ProvenanceEntry[]
  coverageMatrix: CoverageEntry[]
  lineage: MissionLineage
  fingerprint: string
  certification: ProjectionCertification
  createdAt: number
}

/** Coverage of an objective against its evidence. */
export type CoverageEntry = {
  objective: string
  evidenceIds: string[]
  aligned: boolean
}

/** Inputs required for Mission Projection. */
export type MissionProjectionInput = {
  alignmentContract: AlignmentContract
  intentModel: IntentModel
  refinementReport: RefinementReport
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Compute deterministic fingerprint from projection inputs. */
export function computeMissionFingerprint(input: MissionProjectionInput): string {
  const canonical = JSON.stringify({
    alignmentContract: input.alignmentContract.id,
    intentModel: input.intentModel.id,
    refinementReport: input.refinementReport.id,
    alignmentVersion: input.alignmentContract.version,
    alignmentApprovedAt: input.alignmentContract.approvedAt,
  })
  return crypto.createHash("sha256").update(canonical).digest("hex")
}

/** Validate every field has provenance and every invariant holds. */
function enforceInvariants(
  mission: ProjectedMission,
  contract: AlignmentContract,
  provenance: ProvenanceEntry[],
): void {
  // I1: Authorized Objectives Only
  const alignedObjectives = new Set(contract.objectiveCoverage?.filter((o) => o.aligned).map((o) => o.objective) ?? [])
  for (const objective of mission.objectives) {
    if (!alignedObjectives.has(objective)) {
      throw new ProjectionInvariantError("unauthorized_objective", `Objective not authorized: ${objective}`)
    }
  }

  // I2: Constraints Preserved
  const required = new Set([
    ...contract.requiredProperties,
    ...contract.technicalConstraints,
  ])
  for (const constraint of required) {
    if (!mission.constraints.includes(constraint)) {
      throw new ProjectionInvariantError("constraints_not_preserved", `Constraint missing: ${constraint}`)
    }
  }

  // I3: Forbidden Interpretations Preserved
  const forbidden = new Set([
    ...contract.explicitNonRequirements,
    ...contract.forbiddenInterpretation,
    ...(contract.forbiddenInterpretations?.map((f) => f.interpretation) ?? []),
  ])
  for (const f of forbidden) {
    if (!mission.nonGoals.includes(f)) {
      throw new ProjectionInvariantError("forbidden_not_preserved", `Forbidden interpretation missing: ${f}`)
    }
  }

  // I4: No New Requirements
  for (const objective of mission.objectives) {
    if (!alignedObjectives.has(objective)) {
      throw new ProjectionInvariantError("invented_requirement", `Objective invented by projection: ${objective}`)
    }
  }

  // I5: Lineage Complete
  if (!mission.lineage.alignmentContractId || !mission.lineage.intentModelId || !mission.lineage.refinementReportId) {
    throw new ProjectionInvariantError("incomplete_lineage", "Mission lineage is incomplete")
  }

  // I8: Provenance Completeness
  const expectedFields = [
    "id",
    "name",
    "purpose",
    "objectives",
    "constraints",
    "nonGoals",
    "allowedVariation",
    "forbiddenDrift",
    "referenceEvidence",
    "lineage",
    "fingerprint",
  ]
  const provenanceFields = new Set(provenance.map((p) => p.field))
  for (const field of expectedFields) {
    if (!provenanceFields.has(field)) {
      throw new ProjectionInvariantError("missing_provenance", `Mission field lacks provenance: ${field}`)
    }
  }
}

/** Validate projection completeness. */
function enforceCompleteness(
  mission: ProjectedMission,
  contract: AlignmentContract,
): CertificationCheck[] {
  const checks: CertificationCheck[] = []

  // C1: Objective Completeness
  const alignedObjectives = contract.objectiveCoverage?.filter((o) => o.aligned) ?? []
  const objectiveMatch =
    alignedObjectives.length === mission.objectives.length &&
    alignedObjectives.every((o) => mission.objectives.includes(o.objective))
  checks.push({
    name: "objective_completeness",
    passed: objectiveMatch,
    reason: objectiveMatch
      ? "Every aligned objective appears exactly once"
      : `Expected ${alignedObjectives.map((o) => o.objective).join(", ")}; got ${mission.objectives.join(", ")}`,
  })

  // C2: Constraint Completeness
  const expectedConstraints = [...contract.requiredProperties, ...contract.technicalConstraints]
  const constraintMatch =
    expectedConstraints.length === mission.constraints.length &&
    expectedConstraints.every((c) => mission.constraints.includes(c))
  checks.push({
    name: "constraint_completeness",
    passed: constraintMatch,
    reason: constraintMatch
      ? "Every constraint appears exactly once"
      : `Expected ${expectedConstraints.join(", ")}; got ${mission.constraints.join(", ")}`,
  })

  // C3: Forbidden Interpretation Completeness
  const expectedForbidden = [
    ...contract.explicitNonRequirements,
    ...contract.forbiddenInterpretation,
    ...(contract.forbiddenInterpretations?.map((f) => f.interpretation) ?? []),
  ]
  const forbiddenMatch =
    expectedForbidden.length === mission.nonGoals.length &&
    expectedForbidden.every((f) => mission.nonGoals.includes(f))
  checks.push({
    name: "forbidden_completeness",
    passed: forbiddenMatch,
    reason: forbiddenMatch
      ? "Every forbidden interpretation appears exactly once"
      : `Expected ${expectedForbidden.join(", ")}; got ${mission.nonGoals.join(", ")}`,
  })

  // C4: Evidence Reachability
  const evidenceMatch =
    contract.referenceEvidenceIds.length === mission.referenceEvidence.length &&
    contract.referenceEvidenceIds.every((id) => mission.referenceEvidence.includes(id))
  checks.push({
    name: "evidence_reachability",
    passed: evidenceMatch,
    reason: evidenceMatch
      ? "Every reference evidence ID remains reachable"
      : `Expected ${contract.referenceEvidenceIds.join(", ")}; got ${mission.referenceEvidence.join(", ")}`,
  })

  // C5 & C6: Provenance and Lineage Completeness handled during invariant enforcement
  checks.push({
    name: "lineage_completeness",
    passed:
      !!mission.lineage.alignmentContractId &&
      !!mission.lineage.intentModelId &&
      !!mission.lineage.refinementReportId,
    reason: "Lineage records all three parent IDs",
  })

  return checks
}

/** Project a Mission from an approved Alignment Contract. */
export function projectMission(input: MissionProjectionInput): MissionProjectionPackage {
  const { alignmentContract: contract, intentModel, refinementReport } = input

  if (contract.status !== "approved") {
    throw new ProjectionInvariantError("contract_not_approved", "Alignment Contract must be approved before Mission Projection")
  }

  const projectionId = makeId("mission-projection")
  const missionId = makeId("mission")
  const now = Date.now()
  const fingerprint = computeMissionFingerprint(input)

  const alignedObjectives = contract.objectiveCoverage?.filter((o) => o.aligned) ?? []
  const objectives = alignedObjectives.map((o) => o.objective)
  const coverageMatrix: CoverageEntry[] = alignedObjectives.map((o) => ({
    objective: o.objective,
    evidenceIds: o.evidenceIds,
    aligned: o.aligned,
  }))

  const constraints = [...contract.requiredProperties, ...contract.technicalConstraints]

  const nonGoals = [
    ...contract.explicitNonRequirements,
    ...contract.forbiddenInterpretation,
    ...(contract.forbiddenInterpretations?.map((f) => f.interpretation) ?? []),
  ]

  const lineage: MissionLineage = {
    alignmentContractId: contract.id,
    intentModelId: contract.intentModelId,
    refinementReportId: refinementReport.id,
  }

  const mission: ProjectedMission = {
    id: missionId,
    name: contract.intentSummary.split(";")[0].trim(),
    purpose: contract.expectedExperience,
    status: "projected",
    projectionStatus: "projected",
    objectives,
    constraints,
    nonGoals,
    allowedVariation: contract.allowedVariation,
    forbiddenDrift: contract.forbiddenDrift,
    referenceEvidence: contract.referenceEvidenceIds,
    lineage,
    fingerprint,
    projectionId,
    createdAt: now,
    updatedAt: now,
  }

  const provenance: ProvenanceEntry[] = [
    { field: "id", source: "projection", rule: "makeId('mission')" },
    { field: "name", source: "IntentModel.title || AlignmentContract.intentSummary", rule: "First explicit objective or intent summary" },
    { field: "purpose", source: "AlignmentContract.expectedExperience", rule: "Direct copy" },
    { field: "objectives", source: "AlignmentContract.objectiveCoverage[aligned=true]", rule: "Map objective field" },
    { field: "constraints", source: "AlignmentContract.requiredProperties ∪ technicalConstraints", rule: "Set union" },
    { field: "nonGoals", source: "AlignmentContract.explicitNonRequirements ∪ forbiddenInterpretation ∪ forbiddenInterpretations", rule: "Set union" },
    { field: "allowedVariation", source: "AlignmentContract.allowedVariation", rule: "Direct copy" },
    { field: "forbiddenDrift", source: "AlignmentContract.forbiddenDrift", rule: "Direct copy" },
    { field: "referenceEvidence", source: "AlignmentContract.referenceEvidenceIds", rule: "Direct copy" },
    { field: "lineage", source: "AlignmentContract.id, intentModelId, RefinementReport.id", rule: "Parent ID binding" },
    { field: "fingerprint", source: "hash(AlignmentContract + IntentModel + RefinementReport)", rule: "SHA-256 of canonical inputs" },
  ]

  enforceInvariants(mission, contract, provenance)

  const completenessChecks = enforceCompleteness(mission, contract)
  const allPassed = completenessChecks.every((c) => c.passed)

  const certification: ProjectionCertification = {
    certificationId: makeId("projection-certification"),
    projectionId,
    result: allPassed ? "passed" : "failed",
    checks: completenessChecks,
    certifiedAt: now,
  }

  if (!allPassed) {
    mission.projectionStatus = "failed"
  }

  return {
    projectionId,
    alignmentContractId: contract.id,
    alignmentContract: contract,
    mission,
    provenance,
    coverageMatrix,
    lineage,
    fingerprint,
    certification,
    createdAt: now,
  }
}

/** Certify an already projected Mission, returning a new certification result.
 *  This is a pure re-evaluation; it does not mutate the package.
 */
export function certifyMissionProjection(pkg: MissionProjectionPackage): ProjectionCertification {
  const now = Date.now()
  const checks = enforceCompleteness(pkg.mission, pkg.alignmentContract)
  const allPassed = checks.every((c) => c.passed)
  return {
    certificationId: makeId("projection-certification"),
    projectionId: pkg.projectionId,
    result: allPassed ? "passed" : "failed",
    checks,
    certifiedAt: now,
  }
}
