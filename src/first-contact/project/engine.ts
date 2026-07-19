// ============================================================
// FIRST CONTACT: Architecture Projection Engine
// ============================================================
// Entry point for turning a Discovery Artifact into architecture
// candidates (EXP-AIFC-005).
// ============================================================

import type { ArchitectureProjectionAdapter, ArchitectureProjectionResult } from "./types.js"
import { RuleBasedArchitectureProjectionAdapter } from "./adapters/rule-based-adapter.js"
import type { IntentExtractionResult } from "../extract/types.js"

export type { ArchitectureProjectionAdapter, ArchitectureProjectionResult }

const defaultAdapter = new RuleBasedArchitectureProjectionAdapter()

/**
 * Project architecture candidates from an approved-clarification Discovery Artifact.
 *
 * @param artifact Discovery artifact with intent, audience, environment, capabilities, and constraints.
 * @param adapter Optional projection adapter; defaults to rule-based.
 */
export function projectArchitecture(
  artifact: IntentExtractionResult,
  adapter: ArchitectureProjectionAdapter = defaultAdapter,
): ArchitectureProjectionResult {
  return adapter.project({
    intent: artifact.intent,
    audience: artifact.audience,
    environment: artifact.environment,
    capabilities: artifact.capabilities,
    constraints: artifact.constraints,
  })
}
