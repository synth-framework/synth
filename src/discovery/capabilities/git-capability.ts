// ============================================================
// DISCOVERY CAPABILITY: Git Observation
// ============================================================
// Bundles the Git observation adapter and its observation contract
// into a single ObservationCapability.
//
// This capability produces immutable facts about a Git repository.
// It never interprets those facts into project health or lifecycle.
// ============================================================

import type { ObservationCapability } from "../types.js"
import {
  createGitDiscoveryAdapter,
  createGitDiscoveryAdapterWithProvider,
  GIT_ADAPTER_ID,
  GIT_ADAPTER_VERSION,
} from "../adapters/git-adapter.js"

export const GIT_CAPABILITY_ID = "discovery:git"
export const GIT_CAPABILITY_VERSION = "1.0.0"

export const GIT_OBSERVATION_CONTRACT = {
  produces: [
    "git repository detected",
    "git repository not detected",
    "git repository state unavailable",
    "remote exists",
    "branch exists",
    "tag exists",
    "commit observed",
    "HEAD observed",
    "working tree state observed",
    "repository topology observed",
  ],
  neverProduces: [
    "healthy git repository",
    "repository is active",
    "repository is abandoned",
    "default branch",
    "production service",
    "maintenance mode",
  ],
}

/**
 * Create the Git observation capability backed by a custom GitProvider.
 *
 * Useful for testing.
 */
export function createGitObservationCapabilityWithProvider(
  provider: import("../providers/git-provider.js").GitProvider,
): ObservationCapability {
  return {
    id: GIT_CAPABILITY_ID,
    version: GIT_CAPABILITY_VERSION,
    adapter: createGitDiscoveryAdapterWithProvider(provider),
    observationContract: GIT_OBSERVATION_CONTRACT,
  }
}

/**
 * Create the default Git observation capability.
 *
 * This capability reads the local Git repository state without modifying
 * it or fetching from remotes.
 */
export function createGitObservationCapability(): ObservationCapability {
  return {
    id: GIT_CAPABILITY_ID,
    version: GIT_CAPABILITY_VERSION,
    adapter: createGitDiscoveryAdapter(),
    observationContract: GIT_OBSERVATION_CONTRACT,
  }
}
