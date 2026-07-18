// ============================================================
// DISCOVERY CAPABILITY: Filesystem Observation
// ============================================================
// Bundles the filesystem observation adapter, its observation
// contract, and its correlation rules into a single ObservationCapability.
//
// This capability produces immutable facts about a filesystem directory.
// It never interprets those facts into project semantics.
// ============================================================

import type { ObservationCapability } from "../types.js"
import {
  createFilesystemDiscoveryAdapter,
  createFilesystemDiscoveryAdapterWithProvider,
  FILESYSTEM_ADAPTER_ID,
  FILESYSTEM_ADAPTER_VERSION,
} from "../adapters/filesystem-adapter.js"
import { createFilesystemCorrelationCapability } from "./filesystem-correlation.js"

export const FILESYSTEM_CAPABILITY_ID = "discovery:filesystem"
export const FILESYSTEM_CAPABILITY_VERSION = "1.0.0"

export const FILESYSTEM_OBSERVATION_CONTRACT = {
  produces: [
    "directory exists",
    "file exists",
    "manifest detected",
    "file extension observed",
    "top-level entries observed",
    "filesystem path does not exist",
    "filesystem path is not a directory",
  ],
  neverProduces: [
    "Node.js project",
    "React application",
    "specification repository",
    "implementation phase",
    "healthy repository",
  ],
}

/**
 * Create the filesystem observation capability backed by a custom provider.
 *
 * Useful for testing.
 */
export function createFilesystemObservationCapabilityWithProvider(
  provider: import("../../environment/filesystem-capability.js").FilesystemProvider,
): ObservationCapability {
  return {
    id: FILESYSTEM_CAPABILITY_ID,
    version: FILESYSTEM_CAPABILITY_VERSION,
    adapter: createFilesystemDiscoveryAdapterWithProvider(provider),
    correlation: createFilesystemCorrelationCapability(),
    observationContract: FILESYSTEM_OBSERVATION_CONTRACT,
  }
}

/**
 * Create the default filesystem observation capability.
 *
 * This is the primary way the Discovery engine acquires filesystem
 * observations. It is deterministic and read-only.
 */
export function createFilesystemObservationCapability(): ObservationCapability {
  return {
    id: FILESYSTEM_CAPABILITY_ID,
    version: FILESYSTEM_CAPABILITY_VERSION,
    adapter: createFilesystemDiscoveryAdapter(),
    correlation: createFilesystemCorrelationCapability(),
    observationContract: FILESYSTEM_OBSERVATION_CONTRACT,
  }
}
