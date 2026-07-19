// ============================================================
// FIRST CONTACT: Intent Extraction Engine
// ============================================================
// Entry point for turning plain-language operator input into a
// structured Discovery Artifact draft.
//
// The engine is adapter-agnostic. A default rule-based adapter is
// provided; callers may supply a different implementation of the
// IntentExtractionAdapter interface.
// ============================================================

import type {
  IntentExtractionAdapter,
  IntentExtractionContext,
  IntentExtractionResult,
} from "./types.js"
import { RuleBasedIntentExtractionAdapter } from "./adapters/rule-based-adapter.js"

export type { IntentExtractionAdapter, IntentExtractionContext, IntentExtractionResult }

const defaultAdapter = new RuleBasedIntentExtractionAdapter()

/**
 * Extract structured intent from operator input.
 *
 * @param input Plain-language operator idea.
 * @param context Optional session context and prior transcript.
 * @param adapter Optional extraction adapter; defaults to rule-based.
 */
export function extractIntent(
  input: string,
  context?: IntentExtractionContext,
  adapter: IntentExtractionAdapter = defaultAdapter,
): IntentExtractionResult {
  if (!input || input.trim().length === 0) {
    throw new Error("Intent extraction requires a non-empty input.")
  }
  return adapter.extract(input.trim(), context)
}
