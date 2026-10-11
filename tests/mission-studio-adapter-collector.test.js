// ============================================================
// MISSION STUDIO ADAPTER OBSERVATION COLLECTOR TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { collectPlanningObservations } from "../dist/mission-studio/adapter-observation-collector.js"
import { AdapterRegistry } from "../dist/mission-studio/adapter-registry.js"
import { createMockAdapter, createEnrichingAdapter, registerCrmObserverPair } from "./helpers/mocks.js"

test("collects PlanningObservations from observe() adapters", async () => {
  const registry = new AdapterRegistry()
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

  const result = await collectPlanningObservations(registry, { adapterNames: ["mock-observer"] })

  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].type, "intent")
  assert.strictEqual(result[0].sourceAdapter, "mock-observer")
  assert.strictEqual(result[0].payload.subject, "Build CRM")
})

test("runs enrichment adapters in a second pass", async () => {
  const registry = new AdapterRegistry()
  registerCrmObserverPair(registry)

  const result = await collectPlanningObservations(registry, {
    adapterNames: ["mock-observer", "mock-enricher"],
  })

  assert.ok(result.some((o) => o.type === "intent"))
  assert.ok(result.some((o) => o.type === "mission"))
})

test("returns empty array when no adapters produce observations", async () => {
  const registry = new AdapterRegistry()
  registry.registerFactory("silent", () => createMockAdapter("silent", []))

  const result = await collectPlanningObservations(registry, { adapterNames: ["silent"] })

  assert.strictEqual(result.length, 0)
})

test("deduplicates observations across adapters", async () => {
  const sharedObservation = {
    id: "obs-shared",
    source: { adapter: "first" },
    category: "intent",
    subject: "Build CRM",
    evidence: [{ description: "shared" }],
    confidence: "high",
    timestamp: 1000,
  }

  const registry = new AdapterRegistry()
  registry.registerFactory("first", () => createMockAdapter("first", [sharedObservation]))
  registry.registerFactory("second", () => createMockAdapter("second", [{ ...sharedObservation, source: { adapter: "second" } }]))

  const result = await collectPlanningObservations(registry, { adapterNames: ["first", "second"] })

  assert.strictEqual(result.length, 2)
})

test("skips enrichment when enrich option is false", async () => {
  const registry = new AdapterRegistry()
  registerCrmObserverPair(registry)

  const result = await collectPlanningObservations(registry, {
    adapterNames: ["mock-observer", "mock-enricher"],
    enrich: false,
  })

  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].type, "intent")
})
