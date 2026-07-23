// ============================================================
// ENVIRONMENT: Compatibility Types
// ============================================================
// This module now re-exports the canonical capability taxonomy and
// evidence types from src/discovery/types.ts. Environment-specific
// orchestration types remain here.
// ============================================================

import type { ObservationContext } from "../discovery/types.js"

export type {
  CapabilityFamily,
  DiscoveryConfidence,
  DiscoveryObservation,
  EnvironmentalAssumption,
  ResolvedProvider,
  CompatibilityDecision,
  DiscoveryEvidence,
  CapabilityGraphNodeKind,
  CapabilityNode,
  ProviderNode,
  CapabilityGraphNode,
  CapabilityGraphEdgeKind,
  CapabilityGraphEdge,
  CapabilityGraph,
  ProviderPath,
  ResolutionFailure,
  ResolutionResult,
  ObservationContext,
} from "../discovery/types.js"

/** Provider capability advertisement */
export type ProviderCapability = {
  family: import("../discovery/types.js").CapabilityFamily
  priority: number
  confidence: import("../discovery/types.js").DiscoveryConfidence
}

/** A capability provider satisfies one or more capability families */
export type CapabilityProvider = {
  name: string
  version: string
  capabilities: ProviderCapability[]
  evaluate: (
    ctx: ObservationContext,
    evidence: import("../discovery/types.js").DiscoveryEvidence,
  ) => Promise<ProviderSuitability>
}

/** Suitability score for a provider against a capability family */
export type ProviderSuitability = {
  family: import("../discovery/types.js").CapabilityFamily
  providerName: string
  available: boolean
  confidence: import("../discovery/types.js").DiscoveryConfidence
  reason: string
  metadata?: Record<string, unknown>
}

/** A discovery rule observes the environment without mutating it */
export type DiscoveryRule = {
  id: string
  family: import("../discovery/types.js").CapabilityFamily
  description: string
  observe: (
    ctx: ObservationContext,
  ) => Promise<
    | import("../discovery/types.js").DiscoveryObservation
    | import("../discovery/types.js").DiscoveryObservation[]
  >
}

/** Configuration for the discovery orchestrator */
export type DiscoveryConfig = {
  rules?: DiscoveryRule[]
  providers?: CapabilityProvider[]
  overrides?: Array<{
    family: import("../discovery/types.js").CapabilityFamily
    providerName: string
  }>
}

/** Result of a discovery run */
export type DiscoveryResult = {
  evidence: import("../discovery/types.js").DiscoveryEvidence
  durationMs: number
}
