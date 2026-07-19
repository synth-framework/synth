// ============================================================
// SEMANTIC MODELING: Domain Modeling Engine
// ============================================================
// Entry point for deriving a canonical DomainModel from an IntentModel
// (EXP-SEMANTIC-002).
// ============================================================

import type { DomainModel, DomainModelingAdapter, DomainModelingOptions } from "./types.js"
import { RuleBasedDomainModelingAdapter } from "./adapters/rule-based-adapter.js"

export type { DomainModel, DomainModelingAdapter, DomainModelingOptions }

const defaultAdapter = new RuleBasedDomainModelingAdapter()

/**
 * Build a DomainModel from an IntentModel.
 *
 * @param options The intent model and optional adapter.
 * @returns A deterministic DomainModel.
 */
export function buildDomainModel(
  options: DomainModelingOptions,
  adapter: DomainModelingAdapter = defaultAdapter,
): DomainModel {
  return adapter.model(options)
}
