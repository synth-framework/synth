// ============================================================
// DISCOVERY: Public API
// ============================================================
// Re-exports the contracts, engine, and default adapters needed to
// use the Discovery Capability.
// ============================================================

export type { DiscoveryCapability } from "../capabilities/discovery.js"
export { createDefaultDiscoveryEngine } from "./engine.js"
export {
  createDefaultDiscoverySessionProvider,
  DEFAULT_DISCOVERY_SESSION_PROVIDER_ID,
  DEFAULT_DISCOVERY_SESSION_PROVIDER_VERSION,
  type DiscoveryProviderContext,
  type DiscoverySessionProvider,
} from "./session-provider.js"
export { createAdapterRegistry } from "./adapter-registry.js"
export { executeProjectionCapabilities } from "./projection-capability-executor.js"
export {
  createFilesystemDiscoveryAdapter,
  createFilesystemDiscoveryAdapterWithProvider,
  FILESYSTEM_ADAPTER_ID,
  FILESYSTEM_ADAPTER_VERSION,
} from "./adapters/filesystem-adapter.js"
export {
  createFilesystemObservationCapability,
  createFilesystemObservationCapabilityWithProvider,
  FILESYSTEM_CAPABILITY_ID,
  FILESYSTEM_CAPABILITY_VERSION,
  FILESYSTEM_OBSERVATION_CONTRACT,
} from "./capabilities/filesystem-capability.js"
export { createFilesystemCorrelationCapability } from "./capabilities/filesystem-correlation.js"
export {
  createGitObservationCapability,
  createGitObservationCapabilityWithProvider,
  GIT_CAPABILITY_ID,
  GIT_CAPABILITY_VERSION,
  GIT_OBSERVATION_CONTRACT,
} from "./capabilities/git-capability.js"
export {
  createOperationalArtifactObservationCapability,
  createOperationalArtifactObservationCapabilityWithProvider,
  createOperationalArtifactCorrelationCapability,
  OPERATIONAL_ARTIFACT_CAPABILITY_ID,
  OPERATIONAL_ARTIFACT_CAPABILITY_VERSION,
  OPERATIONAL_ARTIFACT_OBSERVATION_CONTRACT,
} from "./capabilities/operational-artifact-capability.js"
export {
  createGitDiscoveryAdapter,
  createGitDiscoveryAdapterWithProvider,
  GIT_ADAPTER_ID,
  GIT_ADAPTER_VERSION,
} from "./adapters/git-adapter.js"
export {
  createOperationalArtifactDiscoveryAdapter,
  createOperationalArtifactDiscoveryAdapterWithProvider,
  OPERATIONAL_ARTIFACT_ADAPTER_ID,
  OPERATIONAL_ARTIFACT_ADAPTER_VERSION,
} from "./adapters/operational-artifact-adapter.js"
export {
  createInMemoryGitProvider,
  type GitProvider,
} from "./providers/git-provider.js"
export { createProcessGitProvider } from "./providers/process-git-provider.js"
export { normalizeObservations } from "./normalize.js"
export { correlateEvidence } from "./correlate.js"
export {
  createFindingsProjectionCapability,
  projectFindings,
} from "./projections/findings.js"
export {
  createProjectModelProjectionCapability,
  createDefaultProjectModelRules,
  createDefaultConfidenceRules,
  projectProjectModel,
  validateProjectModel,
  PROJECT_MODEL_CAPABILITY_ID,
  PROJECT_MODEL_CAPABILITY_VERSION,
  PROJECT_MODEL_PROJECTION_TYPE,
} from "./projections/project-model-capability.js"
export { canonicalize, serializeCanonical, hashCanonical } from "./canonical.js"
export { verifyDiscoveryReplay } from "./replay.js"
export { createConsumerRegistry } from "./consumer-registry.js"
export {
  createJsonConsumer,
  JSON_CONSUMER_ID,
  JSON_CONSUMER_VERSION,
} from "./consumers/json-consumer.js"
export {
  createCliConsumer,
  CLI_CONSUMER_ID,
  CLI_CONSUMER_VERSION,
  type CliConsumerOutput,
  type CliConsumerContext,
  type RepositoryType,
  canonicalLanguages,
  classifyRepository,
  buildObservations,
} from "./consumers/cli-consumer.js"
export {
  createReplayConsumer,
  REPLAY_CONSUMER_ID,
  REPLAY_CONSUMER_VERSION,
} from "./consumers/replay-consumer.js"
export {
  createDriftConsumer,
  DRIFT_CONSUMER_ID,
  DRIFT_CONSUMER_VERSION,
  type DriftReport,
  type DriftFinding,
  type DriftConsumerContext,
} from "./consumers/drift-consumer.js"
export * from "./types.js"
