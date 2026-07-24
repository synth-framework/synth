import type { EvidenceTrace, RuleResult, ProposalEvaluationRuleSet } from "./types.js"

export function buildEvidenceTrace(
  ruleResults: RuleResult[],
  ruleSet: ProposalEvaluationRuleSet
): EvidenceTrace {
  const violatedRules = ruleResults.filter((r) => r.outcome === "fail")
  const matchedRules = ruleResults.filter((r) => r.outcome === "pass")

  const matchedDriftClasses = new Set<string>()
  for (const adapter of ruleSet.driftClassAdapters) {
    const adapterViolations = violatedRules.filter((r) => adapter.ruleIds.includes(r.ruleId))
    if (adapterViolations.length > 0) {
      matchedDriftClasses.add(adapter.driftClassId)
    }
  }

  const violatedContractFields = Array.from(
    new Set(violatedRules.map((r) => r.contractClauses.field))
  )

  const violatedIntentClauses = Array.from(
    new Set(
      violatedRules.flatMap((r) =>
        r.contractClauses.values.map((v) => `${r.contractClauses.field}: ${v}`)
      )
    )
  )

  const summary = violatedRules.length > 0
    ? `Proposal violates ${violatedRules.length} rule(s) across ${violatedContractFields.length} contract field(s).`
    : matchedRules.length > 0
      ? `Proposal satisfies ${matchedRules.length} rule(s).`
      : "No rules matched the proposal."

  return {
    summary,
    ruleResults,
    matchedDriftClasses: Array.from(matchedDriftClasses),
    violatedContractFields,
    violatedIntentClauses,
  }
}

export function buildReasoning(evidence: EvidenceTrace): string[] {
  const lines: string[] = [evidence.summary]

  if (evidence.violatedIntentClauses.length > 0) {
    lines.push("Violated intent/contract clauses:")
    for (const clause of evidence.violatedIntentClauses) {
      lines.push(`  - ${clause}`)
    }
  }

  if (evidence.matchedDriftClasses.length > 0) {
    lines.push("Matched drift classes:")
    for (const driftClass of evidence.matchedDriftClasses) {
      lines.push(`  - ${driftClass}`)
    }
  }

  for (const result of evidence.ruleResults) {
    lines.push(`[${result.outcome.toUpperCase()}] ${result.ruleName}: ${result.rationale}`)
  }

  return lines
}
