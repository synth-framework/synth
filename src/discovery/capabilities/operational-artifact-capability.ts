// ============================================================
// DISCOVERY CAPABILITY: Operational Artifact Observation
// ============================================================
// Bundles the operational artifact adapter, observation contract,
// and correlation rules into a single ObservationCapability.
//
// This capability produces immutable facts about operational
// configuration artifacts. It never interprets those facts into
// runtime health or deployment status.
// ============================================================

import type { ObservationCapability, ConfidenceScore, CorrelationCapability, CorrelationRule } from "../types.js"
import {
  createOperationalArtifactDiscoveryAdapter,
  createOperationalArtifactDiscoveryAdapterWithProvider,
  OPERATIONAL_ARTIFACT_ADAPTER_ID,
  OPERATIONAL_ARTIFACT_ADAPTER_VERSION,
} from "../adapters/operational-artifact-adapter.js"

export const OPERATIONAL_ARTIFACT_CAPABILITY_ID = "discovery:operational-artifacts"
export const OPERATIONAL_ARTIFACT_CAPABILITY_VERSION = "1.0.0"

export const OPERATIONAL_ARTIFACT_OBSERVATION_CONTRACT = {
  produces: [
    "operational artifact scan completed",
    "operational artifact detected",
    "operational artifact family observed",
    "operational artifact scan path does not exist",
    "operational artifact scan path is not a directory",
  ],
  neverProduces: [
    "service is healthy",
    "deployment is active",
    "database is reachable",
    "infrastructure is provisioned",
    "production environment",
  ],
}

function deterministicConfidence(value: number, reason: string): ConfidenceScore {
  let label: ConfidenceScore["label"] = "none"
  if (value >= 0.95) label = "certain"
  else if (value >= 0.8) label = "high"
  else if (value >= 0.5) label = "medium"
  else if (value >= 0.2) label = "low"

  return {
    value,
    label,
    kind: "deterministic",
    reason,
  }
}

export function createOperationalArtifactCorrelationCapability(): CorrelationCapability {
  return {
    id: "discovery:operational-artifacts-correlation",
    version: "1.0.0",

    registerRules(): CorrelationRule[] {
      return [
        {
          id: "operational:container-configuration",
          priority: 90,
          requiredFacts: ["operational artifact detected"],
          payloadConstraints: { "operational artifact detected": { artifactType: "container" } },
          assertion: "Container configuration present",
          confidence: deterministicConfidence(0.95, "Container artifact detected"),
        },
        {
          id: "operational:deployment-configuration",
          priority: 90,
          requiredFacts: ["operational artifact detected"],
          payloadConstraints: { "operational artifact detected": { artifactType: "deployment" } },
          assertion: "Deployment configuration present",
          confidence: deterministicConfidence(0.95, "Deployment artifact detected"),
        },
        {
          id: "operational:database-configuration",
          priority: 90,
          requiredFacts: ["operational artifact detected"],
          payloadConstraints: { "operational artifact detected": { artifactType: "database" } },
          assertion: "Database configuration present",
          confidence: deterministicConfidence(0.95, "Database artifact detected"),
        },
        {
          id: "operational:cicd-configuration",
          priority: 90,
          requiredFacts: ["operational artifact detected"],
          payloadConstraints: { "operational artifact detected": { artifactType: "cicd" } },
          assertion: "CI/CD configuration present",
          confidence: deterministicConfidence(0.95, "CI/CD artifact detected"),
        },
        {
          id: "operational:infrastructure-configuration",
          priority: 90,
          requiredFacts: ["operational artifact detected"],
          payloadConstraints: {
            "operational artifact detected": { artifactType: "infrastructure" },
          },
          assertion: "Infrastructure-as-code present",
          confidence: deterministicConfidence(0.95, "Infrastructure artifact detected"),
        },
      ]
    },
  }
}

/**
 * Create the operational artifact observation capability backed by a custom
 * FilesystemProvider.
 */
export function createOperationalArtifactObservationCapabilityWithProvider(
  provider: import("../../environment/filesystem-capability.js").FilesystemProvider,
): ObservationCapability {
  return {
    id: OPERATIONAL_ARTIFACT_CAPABILITY_ID,
    version: OPERATIONAL_ARTIFACT_CAPABILITY_VERSION,
    adapter: createOperationalArtifactDiscoveryAdapterWithProvider(provider),
    correlation: createOperationalArtifactCorrelationCapability(),
    observationContract: OPERATIONAL_ARTIFACT_OBSERVATION_CONTRACT,
  }
}

/**
 * Create the default operational artifact observation capability.
 */
export function createOperationalArtifactObservationCapability(): ObservationCapability {
  return {
    id: OPERATIONAL_ARTIFACT_CAPABILITY_ID,
    version: OPERATIONAL_ARTIFACT_CAPABILITY_VERSION,
    adapter: createOperationalArtifactDiscoveryAdapter(),
    correlation: createOperationalArtifactCorrelationCapability(),
    observationContract: OPERATIONAL_ARTIFACT_OBSERVATION_CONTRACT,
  }
}
