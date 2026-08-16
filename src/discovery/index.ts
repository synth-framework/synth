// ============================================================
// DISCOVERY: Public API
// ============================================================
// Re-exports the contracts, engine, and default adapters needed to
// use the Discovery Capability.
// ============================================================

export type { DiscoveryCapability } from "../capabilities/discovery.js"
export {
  createDefaultDiscoverySessionProvider,
  type DiscoveryProviderContext,
  type DiscoverySessionProvider,
} from "./session-provider.js"
export {
  type DiscoveryAdapterRegistry,
  type DiscoveryAdapterRegistryOptions,
} from "./adapter-registry.js"
export {
  createFilesystemDiscoveryAdapterWithProvider
} from "./adapters/filesystem-adapter.js"
export {
  createFilesystemObservationCapabilityWithProvider
} from "./capabilities/filesystem-capability.js"
export {
  createOperationalArtifactObservationCapability,
  createOperationalArtifactObservationCapabilityWithProvider,
  createOperationalArtifactCorrelationCapability
} from "./capabilities/operational-artifact-capability.js"
export {
  createOperationalArtifactDiscoveryAdapterWithProvider
} from "./adapters/operational-artifact-adapter.js"
export {
  type GitProvider,
} from "./providers/git-provider.js"
export {
  type CapabilityReport,
  type CapabilityReportEntry,
} from "./projections/capability-report.js"
export { createConsumerRegistry } from "./consumer-registry.js"
export {
  createCliConsumer,
  CLI_CONSUMER_ID,
  type CliConsumerOutput,
  type CliConsumerContext,
  type RepositoryType
} from "./consumers/cli-consumer.js"
export {
  type DriftReport,
  type DriftFinding,
  type DriftConsumerContext,
} from "./consumers/drift-consumer.js"
export * from "./types.js"
