// ============================================================
// DISCOVERY ADAPTERS: Index
// ============================================================

export {
  createFilesystemDiscoveryAdapter,
  createFilesystemDiscoveryAdapterWithProvider,
  FILESYSTEM_ADAPTER_ID,
  FILESYSTEM_ADAPTER_VERSION,
} from "./filesystem-adapter.js"

export {
  createGitDiscoveryAdapter,
  createGitDiscoveryAdapterWithProvider,
  GIT_ADAPTER_ID,
  GIT_ADAPTER_VERSION,
} from "./git-adapter.js"

export {
  createOperationalArtifactDiscoveryAdapter,
  createOperationalArtifactDiscoveryAdapterWithProvider,
  OPERATIONAL_ARTIFACT_ADAPTER_ID,
  OPERATIONAL_ARTIFACT_ADAPTER_VERSION,
} from "./operational-artifact-adapter.js"
