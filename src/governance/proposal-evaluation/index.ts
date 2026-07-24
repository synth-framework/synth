// ============================================================
// GOVERNANCE: Proposal Evaluation Capability
// ============================================================

import type {
  Proposal,
  FeatureListProposal,
  ArtifactReferenceProposal,
  ProposalEvaluationRuleSet,
  EvaluationResult,
  AlignmentDecision,
  ProposalExtractor,
} from "./types.js"
import type { AlignmentContract } from "../alignment-contract.js"
import { buildEvidenceTrace, buildReasoning } from "./explainability.js"

export * from "./types.js"
export * from "./explainability.js"
export * from "./rules/program-027.js"

const DEFAULT_EXTRACTORS: ProposalExtractor[] = []

function getBoolean(features: Array<{ kind: string; name: string; value: unknown }>, name: string): boolean {
  const feature = features.find((f) => f.name === name && f.kind === "boolean")
  return feature?.value === true
}

function extractFeatures(
  proposal: Proposal,
  extractors: ProposalExtractor[] = DEFAULT_EXTRACTORS
): FeatureListProposal {
  if (proposal.kind === "feature-list") {
    return proposal
  }

  const extractor = extractors.find((e) => e.supports(proposal))
  if (!extractor) {
    throw new Error(`PROPOSAL_EXTRACTOR_NOT_FOUND: no extractor for ${proposal.extractorId}`)
  }

  return extractor.extract(proposal as ArtifactReferenceProposal)
}

function computeDecision(
  violatedBlocking: number,
  violatedWarning: number,
  matchedRules: number
): AlignmentDecision {
  if (violatedBlocking > 0) return "rejected"
  if (violatedWarning > 0) return "revision_required"
  if (matchedRules === 0) return "revision_required"
  return "aligned"
}

function computeConfidence(
  violatedBlocking: number,
  violatedWarning: number,
  matchedRules: number,
  totalRules: number
): number {
  if (totalRules === 0) return 0
  if (violatedBlocking > 0) return 0

  const base = matchedRules / totalRules
  const warningPenalty = violatedWarning > 0 ? 0.2 * violatedWarning : 0
  return Math.max(0, Math.min(1, base - warningPenalty))
}

/**
 * Evaluate a proposal against an Alignment Contract using a deterministic rule set.
 *
 * This is a pure function: the same inputs always produce the same output.
 */
export function evaluateProposal(
  proposal: Proposal,
  contract: AlignmentContract,
  ruleSet: ProposalEvaluationRuleSet,
  extractors?: ProposalExtractor[]
): EvaluationResult {
  const featureList = extractFeatures(proposal, extractors)

  const ruleResults = ruleSet.rules.map((rule) => {
    const outcome = rule.evaluate(featureList.features)
    const observedFeatures = featureList.features.filter((f) => rule.featureNames.includes(f.name))

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      outcome,
      severity: rule.severity,
      contractClauses: rule.contractClauses,
      observedFeatures,
      rationale: outcome === "fail"
        ? `Proposal violates ${rule.contractClauses.field}: ${rule.contractClauses.values.join(", ")}`
        : `Proposal satisfies ${rule.contractClauses.field}: ${rule.contractClauses.values.join(", ")}`,
    }
  })

  const violatedRules = ruleResults.filter((r) => r.outcome === "fail")
  const matchedRules = ruleResults.filter((r) => r.outcome === "pass")

  const violatedBlocking = violatedRules.filter((r) => r.severity === "blocking").length
  const violatedWarning = violatedRules.filter((r) => r.severity === "warning").length

  const decision = computeDecision(violatedBlocking, violatedWarning, matchedRules.length)
  const confidence = computeConfidence(violatedBlocking, violatedWarning, matchedRules.length, ruleSet.rules.length)

  const evidence = buildEvidenceTrace(ruleResults, ruleSet)
  const reasoning = buildReasoning(evidence)

  // Determine drift classes that actually matched (only when rule failed)
  const matchedDriftClasses = Array.from(
    new Set(
      ruleSet.driftClassAdapters
        .filter((adapter) =>
          adapter.ruleIds.some((ruleId) =>
            violatedRules.some((r) => r.ruleId === ruleId)
          )
        )
        .map((adapter) => adapter.driftClassId)
    )
  )

  return {
    decision,
    confidence,
    matchedRules,
    violatedRules,
    matchedDriftClasses,
    evidence,
    reasoning,
    deterministic: true,
  }
}
