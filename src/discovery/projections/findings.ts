// ============================================================
// DISCOVERY PROJECTION CAPABILITY: Findings
// ============================================================
// Projects a DiscoveryFindingSet from the EvidenceGraph.
//
// Contract:
//   Input:  EvidenceGraph
//   Output: DiscoveryFindingSet
//   Invariants: Findings reference only evidence claim ids; declarative only.
//   Failure: No evidence → empty findings.
// ============================================================

import type {
  ConfidenceScore,
  DiscoveryFindingSet,
  EvidenceGraph,
  Finding,
  FindingSeverity,
  ProjectionCapability,
  ProjectionContext,
} from "../types.js"
import { DISCOVERY_FINDINGS_SCHEMA_VERSION } from "../types.js"

export const FINDINGS_CAPABILITY_ID = "discovery:findings"
export const FINDINGS_CAPABILITY_VERSION = "1.0.0"
export const FINDINGS_PROJECTION_TYPE = "findings"

function generateFindingId(index: number): string {
  return `finding-${String(index).padStart(6, "0")}`
}

function deterministicConfidence(value: number, reason: string): ConfidenceScore {
  let label: ConfidenceScore["label"] = "none"
  if (value >= 0.95) label = "certain"
  else if (value >= 0.8) label = "high"
  else if (value >= 0.5) label = "medium"
  else if (value >= 0.2) label = "low"

  return {
    value,
    label,
    kind: "derived",
    reason,
  }
}

function hasClaim(evidenceGraph: EvidenceGraph, assertion: string): boolean {
  return evidenceGraph.claims.some((claim) => claim.assertion === assertion)
}

function findClaimIds(evidenceGraph: EvidenceGraph, assertion: string): string[] {
  return evidenceGraph.claims
    .filter((claim) => claim.assertion === assertion)
    .map((claim) => claim.id)
}

function createFinding(
  index: number,
  category: Finding["category"],
  description: string,
  severity: FindingSeverity,
  evidenceClaimIds: string[],
  confidence: ConfidenceScore,
): Finding {
  return {
    id: generateFindingId(index),
    category,
    description,
    severity,
    evidenceClaimIds,
    confidence,
  }
}

/**
 * Project findings from the EvidenceGraph.
 *
 * Detects missing README and missing architecture documentation when
 * implementation signals are present.
 */
export function projectFindings(evidenceGraph: EvidenceGraph): DiscoveryFindingSet {
  const findings: Finding[] = []

  const hasSourceDirectory = hasClaim(evidenceGraph, "Source directory observed")
  const hasReadme = hasClaim(evidenceGraph, "Documentation present")
  const hasNodeJsManifest = hasClaim(evidenceGraph, "Node.js project manifest present")
  const hasImplementation = hasClaim(evidenceGraph, "Implementation directory observed")
  const hasArchitectureDocs = hasClaim(evidenceGraph, "Architecture documentation present")

  if (hasSourceDirectory && !hasReadme) {
    findings.push(
      createFinding(
        findings.length,
        "missing-artifact",
        "Repository has source files but no README documentation",
        "medium",
        findClaimIds(evidenceGraph, "Source directory observed"),
        deterministicConfidence(0.9, "Source directory observed without README claim"),
      ),
    )
  }

  if ((hasNodeJsManifest || hasImplementation) && !hasArchitectureDocs) {
    const evidenceIds = [
      ...findClaimIds(evidenceGraph, "Node.js project manifest present"),
      ...findClaimIds(evidenceGraph, "Implementation directory observed"),
    ]
    findings.push(
      createFinding(
        findings.length,
        "incompleteness",
        "Implementation exists without architecture documentation",
        "medium",
        evidenceIds,
        deterministicConfidence(0.8, "Implementation signals present without architecture documentation claim"),
      ),
    )
  }

  return {
    schema: DISCOVERY_FINDINGS_SCHEMA_VERSION,
    items: findings,
  }
}

/**
 * Create the Findings projection capability.
 */
export function createFindingsProjectionCapability(): ProjectionCapability<DiscoveryFindingSet> {
  return {
    id: FINDINGS_CAPABILITY_ID,
    version: FINDINGS_CAPABILITY_VERSION,
    projectionType: FINDINGS_PROJECTION_TYPE,
    dependencies: [],

    project(context: ProjectionContext): DiscoveryFindingSet {
      return projectFindings(context.evidenceGraph)
    },
  }
}
