// ============================================================
// ADAPTER TESTS — Expedition Builder Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createExpeditionBuilderAdapter } from "../dist/adapters/expedition-builder/adapter.js"
import { createAdapterRegistry } from "../dist/mission-studio/adapter-registry.js"

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

test("AdapterRegistry lists expedition-builder adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("expedition-builder"))
})

test("ExpeditionBuilderAdapter starts in discovered state", () => {
  const adapter = createExpeditionBuilderAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "planning")
  assert.strictEqual(adapter.metadata.kind, "expedition-builder")
})

test("ExpeditionBuilderAdapter transitions through lifecycle", async () => {
  const adapter = createExpeditionBuilderAdapter()
  await adapter.configure({ observations: [] })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("ExpeditionBuilderAdapter preserves existing expedition observations", async () => {
  const adapter = createExpeditionBuilderAdapter()
  const expedition = makeObservation("expedition", "Alpha", "First expedition")
  const result = await adapter.buildFrom([expedition])
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].category, "expedition")
  assert.strictEqual(result.observations[0].subject, "Alpha")
})

test("ExpeditionBuilderAdapter converts a mission to an expedition", async () => {
  const adapter = createExpeditionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("mission", "Build a CRM", "Customer relationship mission"),
  ])
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].category, "expedition")
  assert.strictEqual(result.observations[0].subject, "CRM Expedition")
  assert.strictEqual(result.observations[0].confidence, "high")
})

test("ExpeditionBuilderAdapter splits multi-theme missions", async () => {
  const adapter = createExpeditionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("mission", "Build Payments and Invoicing", "Financial mission"),
  ])
  assert.strictEqual(result.observations.length, 2)
  const subjects = result.observations.map((o) => o.subject)
  assert.ok(subjects.includes("Payments Expedition"))
  assert.ok(subjects.includes("Invoicing Expedition"))
  assert.strictEqual(result.observations[0].confidence, "medium")
})

test("ExpeditionBuilderAdapter uses Foundation theme when no theme detected", async () => {
  const adapter = createExpeditionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("mission", "Improve platform", "Generic mission"),
  ])
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].subject, "Foundation Expedition")
})

test("ExpeditionBuilderAdapter returns empty batch when no sources exist", async () => {
  const adapter = createExpeditionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("intent", "Build a CRM", "User wants a CRM"),
  ])
  assert.strictEqual(result.observations.length, 0)
})

test("ExpeditionBuilderAdapter avoids duplicate expeditions", async () => {
  const adapter = createExpeditionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("mission", "Build a CRM", "Customer relationship mission"),
    makeObservation("mission", "Build a CRM", "Repeated mission"),
  ])
  assert.strictEqual(result.observations.length, 1)
})

test("ExpeditionBuilderAdapter health check passes when enabled", async () => {
  const adapter = createExpeditionBuilderAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
