// ============================================================
// ADAPTER TESTS — Objective Builder Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createObjectiveBuilderAdapter } from "../dist/adapters/objective-builder/adapter.js"
import { createAdapterRegistry } from "../dist/adapters/registry.js"

function makeObservation(category, subject, snippet = "") {
  return {
    id: `obs-${category}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    source: { adapter: "test", locator: "test" },
    category,
    subject,
    evidence: [{ description: "test evidence", snippet, fingerprint: "abc" }],
    confidence: "high",
    timestamp: Date.now(),
  }
}

test("AdapterRegistry lists objective-builder adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("objective-builder"))
})

test("ObjectiveBuilderAdapter starts in discovered state", () => {
  const adapter = createObjectiveBuilderAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "planning")
  assert.strictEqual(adapter.metadata.kind, "objective-builder")
})

test("ObjectiveBuilderAdapter transitions through lifecycle", async () => {
  const adapter = createObjectiveBuilderAdapter()
  await adapter.configure({ observations: [] })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("ObjectiveBuilderAdapter preserves existing objective observations", async () => {
  const adapter = createObjectiveBuilderAdapter()
  const objective = makeObservation("objective", "Write docs", "Documentation objective")
  const result = await adapter.buildFrom([objective])
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].category, "objective")
  assert.strictEqual(result.observations[0].subject, "Write docs")
})

test("ObjectiveBuilderAdapter converts an expedition into design, implement, validate objectives", async () => {
  const adapter = createObjectiveBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("expedition", "CRM Expedition", "Customer relationship expedition"),
  ])
  assert.strictEqual(result.observations.length, 3)
  const subjects = result.observations.map((o) => o.subject)
  assert.ok(subjects.includes("Design CRM"))
  assert.ok(subjects.includes("Implement CRM"))
  assert.ok(subjects.includes("Validate CRM"))
  assert.strictEqual(result.observations[0].confidence, "medium")
})

test("ObjectiveBuilderAdapter handles expedition subjects without Expedition suffix", async () => {
  const adapter = createObjectiveBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("expedition", "Payments", "Payments expedition"),
  ])
  assert.strictEqual(result.observations.length, 3)
  const subjects = result.observations.map((o) => o.subject)
  assert.ok(subjects.includes("Design Payments"))
  assert.ok(subjects.includes("Implement Payments"))
  assert.ok(subjects.includes("Validate Payments"))
})

test("ObjectiveBuilderAdapter returns empty batch when no sources exist", async () => {
  const adapter = createObjectiveBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("mission", "Build a CRM", "Mission only"),
  ])
  assert.strictEqual(result.observations.length, 0)
})

test("ObjectiveBuilderAdapter avoids duplicate objectives", async () => {
  const adapter = createObjectiveBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("expedition", "CRM Expedition", "Customer relationship expedition"),
    makeObservation("expedition", "CRM Expedition", "Repeated expedition"),
  ])
  assert.strictEqual(result.observations.length, 3)
})

test("ObjectiveBuilderAdapter health check passes when enabled", async () => {
  const adapter = createObjectiveBuilderAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
