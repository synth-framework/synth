// ============================================================
// TEST HELPERS — Adapter Lifecycle Assertions
// ============================================================
// Shared lifecycle assertions for SYNTH adapters.
//
// Replaces duplicated "starts in discovered state", "transitions through
// lifecycle", and "health check passes" tests across adapter-*.test.js files.
//
// Usage:
//   import { assertAdapterListed, assertAdapterLifecycle, assertAdapterHealth } from "./helpers/adapter-lifecycle.js"
// ============================================================

import assert from "node:assert"
import { createAdapterRegistry } from "../../dist/adapters/registry.js"

/** Assert that the adapter registry includes the named adapter. */
export function assertAdapterListed(name) {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes(name), `adapter registry should include "${name}"`)
}

/**
 * Assert the standard adapter lifecycle:
 *   discovered → configured → validated → enabled → disabled
 *
 * @param createAdapter - factory that returns an adapter instance
 * @param config - configuration object to pass to adapter.configure()
 */
export async function assertAdapterLifecycle(createAdapter, config = {}) {
  const adapter = createAdapter()
  assert.strictEqual(adapter.state, "discovered", "adapter should start in discovered state")

  await adapter.configure(config)
  assert.strictEqual(adapter.state, "configured", "adapter should reach configured state")

  await adapter.validate()
  assert.strictEqual(adapter.state, "validated", "adapter should reach validated state")

  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled", "adapter should reach enabled state")

  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled", "adapter should reach disabled state")
}

/** Assert that an enabled adapter reports healthy. */
export async function assertAdapterHealth(createAdapter) {
  const adapter = createAdapter()
  await adapter.enable()
  const health = await adapter.checkHealth()
  assert.strictEqual(health.healthy, true, "adapter health check should pass")
}
