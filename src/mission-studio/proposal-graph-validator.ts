// ============================================================
// MISSION STUDIO: Proposal Graph Validator
// ============================================================
// Validates the referential integrity of a proposal set before it
// is sealed into an ApprovedMissionModelSnapshot.
//
// Every expedition proposal must reference an existing mission
// proposal, every objective proposal must reference an existing
// expedition proposal, and no duplicate proposal identities may
// exist. Returns a list of violations; empty means valid.
// ============================================================

import type { Proposal } from "./types.js"

/**
 * Validate a proposal graph.
 *
 * Violations:
 *   - expedition proposal whose missionId does not resolve to a mission proposal
 *   - objective proposal whose expeditionId does not resolve to an expedition proposal
 *   - expedition or objective proposal with no parent reference
 *   - duplicate proposal ids
 */
export function validateProposalGraph(proposals: Proposal[]): string[] {
  const violations: string[] = []

  const ids = new Set<string>()
  for (const proposal of proposals) {
    if (ids.has(proposal.id)) {
      violations.push(`Duplicate proposal id: ${proposal.id}`)
    }
    ids.add(proposal.id)
  }

  const missionIds = new Set(proposals.filter((p) => p.kind === "mission").map((p) => p.id))
  const expeditionIds = new Set(proposals.filter((p) => p.kind === "expedition").map((p) => p.id))

  for (const proposal of proposals) {
    if (proposal.kind === "expedition") {
      if (!proposal.missionId) {
        violations.push(`Expedition proposal ${proposal.id} has no mission parent`)
      } else if (!missionIds.has(proposal.missionId)) {
        violations.push(`Expedition proposal ${proposal.id} references unknown mission proposal ${proposal.missionId}`)
      }
    }
    if (proposal.kind === "objective") {
      if (!proposal.expeditionId) {
        violations.push(`Objective proposal ${proposal.id} has no expedition parent`)
      } else if (!expeditionIds.has(proposal.expeditionId)) {
        violations.push(`Objective proposal ${proposal.id} references unknown expedition proposal ${proposal.expeditionId}`)
      }
    }
  }

  return violations
}
