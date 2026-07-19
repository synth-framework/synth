// ============================================================
// CAPABILITY: Discovery
// ============================================================
// Public contract for the Discovery Capability.
//
// All consumers (CLI, Mission Studio, MCP, IDE, Web UI, REST API,
// automation) depend on this interface. The DefaultDiscoveryEngine in
// src/discovery/engine.ts is the canonical implementation.
//
// Discovery is a deterministic compiler: it acquires observations,
// correlates them into an immutable EvidenceGraph (canonical IR),
// executes registered projections over that IR, and verifies that the
// entire pipeline can be replayed.
// ============================================================

import type {
  DiscoveryInput,
  DiscoverySession,
  ReplayReport,
} from "../discovery/types.js"

export type { ReplayReport }

/** Public contract for SYNTH Discovery. */
export interface DiscoveryCapability {
  /**
   * Run discovery against the supplied input sources.
   *
   * Returns an immutable DiscoverySession containing normalized
   * observations, the canonical EvidenceGraph, registered projection
   * outputs, and full pipeline provenance.
   */
  discover(input: DiscoveryInput): Promise<DiscoverySession>

  /**
   * Verify that a stored session can be replayed from its evidence.
   *
   * The report distinguishes exact, equivalent, contextual, invalid,
   * and impossible replay and includes per-stage results.
   */
  replay(session: DiscoverySession): Promise<ReplayReport>
}

export type { DiscoveryInput, DiscoverySession }
