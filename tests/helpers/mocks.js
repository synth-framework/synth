// ============================================================
// TEST HELPERS — Mock adapters
// ============================================================
// Shared mock adapter factories (F8, minimal scope). Single home for the
// identical createMockAdapter / createEnrichingAdapter blocks previously
// copied across mission-studio-adapter-collector and api-adapter-integration
// tests (expedition 7a79e79b, round 14/140).
//
// Usage:
//   import { createMockAdapter, createEnrichingAdapter } from "./helpers/mocks.js"
// ============================================================

/** Shared mock-adapter shell (identity + lifecycle stubs). */
function mockAdapterBase(name, kind, category) {
  return {
    metadata: { name, version: "1.0.0", kind, category },
    state: "enabled",
    health: { state: "healthy", lastCheck: Date.now() },
    async discover() { return "discovered" },
    async configure() { return "configured" },
    async validate() { return "validated" },
    async enable() { return "enabled" },
    async disable() { return "disabled" },
    async healthCheck() { return "healthy" },
  }
}

/** Build a mock adapter returning canned observations from observe(). */
export function createMockAdapter(name, observations = []) {
  return {
    ...mockAdapterBase(name, "mock", "integration"),
    async observe() {
      return { observations, errors: [] }
    },
  }
}

/** Build a mock enriching adapter that suffixed-ids observations. */
export function createEnrichingAdapter(name, observations = []) {
  return {
    ...mockAdapterBase(name, "mock", "intelligence"),
    async buildFrom(inputObservations) {
      return {
        observations: observations.map((o) => ({ ...o, id: `${o.id}-enriched` })),
        errors: [],
      }
    },
  }
}

/**
 * Register the canned CRM observer + enricher pair (intent "Build CRM",
 * mission "CRM Mission") on a registry. Shared scenario wiring for
 * collector tests that need both adapters with identical observations.
 */
export function registerCrmObserverPair(registry) {
  registry.registerFactory("mock-observer", () =>
    createMockAdapter("mock-observer", [
      {
        id: "obs-1",
        source: { adapter: "mock-observer" },
        category: "intent",
        subject: "Build CRM",
        evidence: [{ description: "operator input" }],
        confidence: "high",
        timestamp: 1000,
      },
    ])
  )
  registry.registerFactory("mock-enricher", () =>
    createEnrichingAdapter("mock-enricher", [
      {
        id: "obs-enriched-1",
        source: { adapter: "mock-enricher" },
        category: "mission",
        subject: "CRM Mission",
        evidence: [{ description: "derived mission" }],
        confidence: "medium",
        timestamp: 1000,
      },
    ])
  )
}
