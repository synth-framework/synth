// ============================================================
// DISCOVERY CONSUMER: Replay
// ============================================================
// Analytical consumer that produces a ReplayReport for a
// DiscoverySession using the engine's replay verifier.
// ============================================================

import type {
  CorrelationCapability,
  DiscoveryConsumer,
  DiscoverySession,
  ProjectionCapability,
  ReplayReport,
} from "../types.js"
import { verifyDiscoveryReplay } from "../replay.js"
import { createFilesystemObservationCapability } from "../capabilities/filesystem-capability.js"
import { createGitObservationCapability } from "../capabilities/git-capability.js"
import { createFindingsProjectionCapability } from "../projections/findings.js"
import { createProjectModelProjectionCapability } from "../projections/project-model-capability.js"

export const REPLAY_CONSUMER_ID = "discovery:replay-consumer"
export const REPLAY_CONSUMER_VERSION = "1.0.0"

function defaultObservationCapabilities() {
  return [
    createFilesystemObservationCapability(),
    createGitObservationCapability(),
  ]
}

function correlationCapabilitiesFromCapabilities(
  capabilities: ReturnType<typeof defaultObservationCapabilities>,
): CorrelationCapability[] {
  const rules: CorrelationCapability[] = []
  for (const capability of capabilities) {
    if (capability.correlation) {
      rules.push(capability.correlation)
    }
  }
  return rules
}

function defaultProjectionCapabilities(): ProjectionCapability[] {
  return [
    createFindingsProjectionCapability(),
    createProjectModelProjectionCapability(),
  ]
}

/**
 * Create a replay verification consumer.
 *
 * Re-runs the Discovery compiler's correlation and projection stages
 * against the stored observations and returns a structured ReplayReport.
 */
export function createReplayConsumer(): DiscoveryConsumer<unknown, ReplayReport> {
  return {
    id: REPLAY_CONSUMER_ID,
    version: REPLAY_CONSUMER_VERSION,
    kind: "analytical",
    description: "Verifies that a DiscoverySession can be replayed exactly.",

    consume(session: DiscoverySession): ReplayReport {
      const observationCapabilities = defaultObservationCapabilities()
      const correlationCapabilities = correlationCapabilitiesFromCapabilities(observationCapabilities)
      const projectionCapabilities = defaultProjectionCapabilities()
      return verifyDiscoveryReplay(session, correlationCapabilities, projectionCapabilities)
    },
  }
}
