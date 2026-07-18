// ============================================================
// RUNTIME: Canonical State Builder
// ============================================================
// Fourth stage of the governance resolver pipeline.
//
// Orchestrates historical normalization, identity resolution, and
// reference resolution, then replays the derived event stream to produce
// the canonical state.
//
// This is the only runtime component that may combine these stages.
// Downstream consumers receive exactly one deterministic state or a
// structured failure report.
// ============================================================

import type { SynthEvent, CanonicalState } from "../types/index.js"
import { rebuildState, createEmptyState } from "./replay.js"
import { normalizeHistoricalEvents, type NormalizationNotice } from "./historical-normalizer.js"
import { resolveIdentities, type IdentityRegistry } from "./identity-resolver.js"
import { resolveReferences, type ReferenceResolutionNotice } from "./reference-resolver.js"
import type { HistoricalAliasRegistry } from "./historical-aliases.js"
import { createEmptyHistoricalAliasRegistry } from "./historical-aliases.js"

export type CanonicalStateBuildReport = {
  /** Events after normalization and reference resolution */
  normalizedEvents: SynthEvent[]
  /** Identity registry used for reference resolution */
  identityRegistry: IdentityRegistry
  /** All normalization notices */
  normalizationNotices: NormalizationNotice[]
  /** All reference-resolution notices */
  referenceNotices: ReferenceResolutionNotice[]
  /** Unresolved reference errors that prevent canonical state derivation */
  unresolvedReferences: ReferenceResolutionNotice[]
}

export type CanonicalStateBuildResult =
  | {
      success: true
      state: CanonicalState
      report: CanonicalStateBuildReport
    }
  | {
      success: false
      state: CanonicalState
      report: CanonicalStateBuildReport
      diagnostic: string
    }

/**
 * Build canonical state from a raw event stream.
 *
 * The pipeline is deterministic and side-effect free:
 *   1. Normalize historical duplicates.
 *   2. Resolve canonical identities.
 *   3. Resolve parent references (with recovery heuristics).
 *   4. Replay the derived stream into canonical state.
 *
 * An optional historical alias registry lets the pipeline interpret known
 * legacy duplicate identities and parent-reference aliases without mutating
 * the event log.
 */
export function buildCanonicalState(
  events: SynthEvent[],
  aliasRegistry?: HistoricalAliasRegistry,
): CanonicalStateBuildResult {
  const aliases = aliasRegistry ?? createEmptyHistoricalAliasRegistry()
  const { events: normalizedEvents, notices: normalizationNotices } = normalizeHistoricalEvents(events, aliases)
  const { registry: identityRegistry, notices: identityNotices } = resolveIdentities(normalizedEvents)
  const { events: resolvedEvents, notices: referenceNotices, unresolved: unresolvedReferences } =
    resolveReferences(normalizedEvents, identityRegistry, aliases)

  const state = resolvedEvents.length > 0 ? rebuildState(resolvedEvents) : createEmptyState()

  const report: CanonicalStateBuildReport = {
    normalizedEvents: resolvedEvents,
    identityRegistry,
    normalizationNotices: [...normalizationNotices, ...identityNotices],
    referenceNotices,
    unresolvedReferences,
  }

  if (unresolvedReferences.length > 0) {
    return {
      success: false,
      state,
      report,
      diagnostic: `Canonical state cannot be safely reconstructed: ${unresolvedReferences.length} unresolved reference(s).`,
    }
  }

  return { success: true, state, report }
}
