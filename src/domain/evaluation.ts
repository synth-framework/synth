// ============================================================
// SYNTH v2 — Evaluation Result Validation
// ============================================================
// Validates Convergence EvaluationResult JSON files before they are
// consumed by the certification path. Produces structured, actionable
// errors so CLI operators can fix malformed files quickly.
// ============================================================

import type { AlignmentDecision, EvaluationResult, RuleResult } from "../governance/proposal-evaluation/types.js"

export type EvaluationValidationError = {
  path: string
  message: string
}

const VALID_DECISIONS: AlignmentDecision[] = ["aligned", "revision_required", "rejected", "superseded"]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function validateRuleResult(rule: unknown, index: number, errors: EvaluationValidationError[]) {
  const prefix = `matchedRules[${index}]`
  if (!isObject(rule)) {
    errors.push({ path: prefix, message: "Rule result must be an object" })
    return
  }
  if (typeof rule.ruleId !== "string" || rule.ruleId.length === 0) {
    errors.push({ path: `${prefix}.ruleId`, message: "ruleId is required and must be a non-empty string" })
  }
  if (typeof rule.ruleName !== "string" || rule.ruleName.length === 0) {
    errors.push({ path: `${prefix}.ruleName`, message: "ruleName is required and must be a non-empty string" })
  }
  if (rule.outcome !== "pass" && rule.outcome !== "fail") {
    errors.push({ path: `${prefix}.outcome`, message: "outcome must be 'pass' or 'fail'" })
  }
  if (rule.severity !== "blocking" && rule.severity !== "warning") {
    errors.push({ path: `${prefix}.severity`, message: "severity must be 'blocking' or 'warning'" })
  }
  if (!Array.isArray(rule.contractClauses)) {
    errors.push({ path: `${prefix}.contractClauses`, message: "contractClauses must be an array" })
  } else {
    for (let i = 0; i < rule.contractClauses.length; i++) {
      const clause = rule.contractClauses[i]
      if (!isObject(clause)) {
        errors.push({ path: `${prefix}.contractClauses[${i}]`, message: "contract clause must be an object" })
      } else {
        if (typeof clause.field !== "string" || clause.field.length === 0) {
          errors.push({ path: `${prefix}.contractClauses[${i}].field`, message: "field is required and must be a non-empty string" })
        }
        if (typeof clause.requirement !== "string" || clause.requirement.length === 0) {
          errors.push({ path: `${prefix}.contractClauses[${i}].requirement`, message: "requirement is required and must be a non-empty string" })
        }
      }
    }
  }
}

function validateEvidence(evidence: unknown, errors: EvaluationValidationError[]) {
  if (!isObject(evidence)) {
    errors.push({ path: "evidence", message: "evidence must be an object" })
    return
  }
  if (typeof evidence.summary !== "string" || evidence.summary.length === 0) {
    errors.push({ path: "evidence.summary", message: "evidence.summary is required and must be a non-empty string" })
  }
  if (!isStringArray(evidence.matchedDriftClasses)) {
    errors.push({ path: "evidence.matchedDriftClasses", message: "evidence.matchedDriftClasses must be an array of strings" })
  }
  if (!isStringArray(evidence.violatedContractFields)) {
    errors.push({ path: "evidence.violatedContractFields", message: "evidence.violatedContractFields must be an array of strings" })
  }
  if (!isStringArray(evidence.violatedIntentClauses)) {
    errors.push({ path: "evidence.violatedIntentClauses", message: "evidence.violatedIntentClauses must be an array of strings" })
  }
  if (!Array.isArray(evidence.ruleResults)) {
    errors.push({ path: "evidence.ruleResults", message: "evidence.ruleResults must be an array" })
  } else {
    for (let i = 0; i < evidence.ruleResults.length; i++) {
      validateRuleResult(evidence.ruleResults[i], i, errors)
    }
  }
}

export function validateEvaluationResult(value: unknown): { valid: true; result: EvaluationResult } | { valid: false; errors: EvaluationValidationError[] } {
  const errors: EvaluationValidationError[] = []

  if (!isObject(value)) {
    errors.push({ path: "", message: "Evaluation file must contain a JSON object" })
    return { valid: false, errors }
  }

  if (!VALID_DECISIONS.includes(value.decision as AlignmentDecision)) {
    errors.push({
      path: "decision",
      message: `decision is required and must be one of: ${VALID_DECISIONS.join(", ")}`,
    })
  }

  if (typeof value.confidence !== "number" || value.confidence < 0 || value.confidence > 1) {
    errors.push({ path: "confidence", message: "confidence is required and must be a number between 0 and 1" })
  }

  if (!Array.isArray(value.matchedRules)) {
    errors.push({ path: "matchedRules", message: "matchedRules must be an array" })
  } else {
    for (let i = 0; i < value.matchedRules.length; i++) {
      validateRuleResult(value.matchedRules[i], i, errors)
    }
  }

  if (!Array.isArray(value.violatedRules)) {
    errors.push({ path: "violatedRules", message: "violatedRules must be an array" })
  } else {
    for (let i = 0; i < value.violatedRules.length; i++) {
      validateRuleResult(value.violatedRules[i], i, errors)
    }
  }

  if (!isStringArray(value.matchedDriftClasses)) {
    errors.push({ path: "matchedDriftClasses", message: "matchedDriftClasses must be an array of strings" })
  }

  validateEvidence(value.evidence, errors)

  if (!isStringArray(value.reasoning)) {
    errors.push({ path: "reasoning", message: "reasoning is required and must be an array of strings" })
  }

  if (value.deterministic !== true) {
    errors.push({ path: "deterministic", message: "deterministic must be true" })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, result: value as EvaluationResult }
}

export function formatEvaluationErrors(errors: EvaluationValidationError[]): string {
  const lines = errors.map((e) => `  - ${e.path ? `${e.path}: ` : ""}${e.message}`)
  return `Evaluation file failed schema validation:\n${lines.join("\n")}`
}
