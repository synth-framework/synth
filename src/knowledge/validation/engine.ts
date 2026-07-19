// ============================================================
// KNOWLEDGE: Prototype-First Validation Engine
// ============================================================
// Entry point for validating a Canonical Knowledge Graph before
// implementation (EXP-KNOWLEDGE-002).
// ============================================================

import type { ValidationAdapter, ValidationOptions, ValidationReport } from "./types.js"
import { RuleBasedValidationAdapter } from "./adapters/rule-based-adapter.js"

export type { ValidationAdapter, ValidationOptions, ValidationReport }

const defaultAdapter = new RuleBasedValidationAdapter()

/**
 * Validate a Canonical Knowledge Graph before implementation.
 */
export function validateKnowledge(
  options: ValidationOptions,
  adapter: ValidationAdapter = defaultAdapter,
): ValidationReport {
  return adapter.validate(options)
}
