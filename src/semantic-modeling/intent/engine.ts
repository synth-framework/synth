// ============================================================
// SEMANTIC MODELING: Intent Modeling Engine
// ============================================================
// Entry point for deriving a canonical IntentModel from an approved
// Genesis artifact (EXP-SEMANTIC-001).
// ============================================================

import type { IntentModel, IntentModelingAdapter, IntentModelingOptions } from "./types.js"
import { RuleBasedIntentModelingAdapter } from "./adapters/rule-based-adapter.js"

export type { IntentModel, IntentModelingAdapter, IntentModelingOptions }

const defaultAdapter = new RuleBasedIntentModelingAdapter()

/**
 * Build an IntentModel from an approved Genesis artifact.
 *
 * @param options The approved artifact and optional adapter.
 * @returns A deterministic IntentModel.
 */
export function buildIntentModel(
  options: IntentModelingOptions,
  adapter: IntentModelingAdapter = defaultAdapter,
): IntentModel {
  return adapter.model(options)
}
