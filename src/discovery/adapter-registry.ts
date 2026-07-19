// ============================================================
// DISCOVERY: Adapter Registry
// ============================================================
// Resolves adapters for a given DiscoverySource and orders them
// deterministically. The registry itself is stateless and does not
// execute adapters.
// ============================================================

import type { DiscoveryAdapter, DiscoverySource } from "./types.js"

export type AdapterRegistry = {
  /**
   * Return all registered adapters that can handle the given source,
   * ordered deterministically by adapter id.
   */
  resolve(source: DiscoverySource): DiscoveryAdapter[]

  /** List all registered adapter ids. */
  list(): string[]
}

export type AdapterRegistryOptions = {
  adapters?: DiscoveryAdapter[]
}

/**
 * Create an adapter registry.
 *
 * When no adapters are supplied, the registry is empty. Consumers are
 * expected to register the adapters they need.
 */
export function createAdapterRegistry(
  options: AdapterRegistryOptions = {},
): AdapterRegistry {
  const adapters = options.adapters ?? []

  return {
    resolve(source: DiscoverySource): DiscoveryAdapter[] {
      return adapters
        .filter((adapter) => adapter.canHandle(source))
        .sort((a, b) => a.id.localeCompare(b.id))
    },

    list(): string[] {
      return adapters.map((a) => a.id).sort()
    },
  }
}
