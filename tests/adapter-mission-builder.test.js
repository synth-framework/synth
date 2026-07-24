// ============================================================
// ADAPTER TESTS — Mission Builder Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createMissionBuilderAdapter } from "../dist/adapters/mission-builder/adapter.js"
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

test("AdapterRegistry lists mission-builder adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("mission-builder"))
})

test("MissionBuilderAdapter starts in discovered state", () => {
  const adapter = createMissionBuilderAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "planning")
  assert.strictEqual(adapter.metadata.kind, "mission-builder")
})

test("MissionBuilderAdapter transitions through lifecycle", async () => {
  const adapter = createMissionBuilderAdapter()
  await adapter.configure({ observations: [] })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("MissionBuilderAdapter preserves existing mission observations", async () => {
  const adapter = createMissionBuilderAdapter()
  const mission = makeObservation("mission", "Launch Satellite", "Primary mission objective")
  const result = await adapter.buildFrom([mission])
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].category, "mission")
  assert.strictEqual(result.observations[0].subject, "Launch Satellite")
})

test("MissionBuilderAdapter converts intent observations to missions", async () => {
  const adapter = createMissionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("intent", "Build a CRM", "User wants a CRM"),
  ])
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].category, "mission")
  assert.strictEqual(result.observations[0].subject, "Build a CRM")
  assert.strictEqual(result.observations[0].metadata.goal, "Build a CRM")
})

test("MissionBuilderAdapter converts multiple intents to separate missions", async () => {
  const adapter = createMissionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("intent", "Build a CRM", "User wants a CRM"),
    makeObservation("intent", "Create onboarding flow", "User wants onboarding"),
  ])
  assert.strictEqual(result.observations.length, 2)
  const subjects = result.observations.map((o) => o.subject)
  assert.ok(subjects.includes("Build a CRM"))
  assert.ok(subjects.includes("Create onboarding flow"))
})

test("MissionBuilderAdapter derives mission from capabilities when no intent exists", async () => {
  const adapter = createMissionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("capability", "Payments", "Process payments"),
    makeObservation("capability", "Invoicing", "Generate invoices"),
  ])
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].category, "mission")
  assert.strictEqual(result.observations[0].subject, "Enable Payments")
  assert.strictEqual(result.observations[0].confidence, "medium")
})

test("MissionBuilderAdapter returns empty batch when no sources exist", async () => {
  const adapter = createMissionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("component", "Widget", "A UI widget"),
  ])
  assert.strictEqual(result.observations.length, 0)
})

test("MissionBuilderAdapter avoids duplicate missions", async () => {
  const adapter = createMissionBuilderAdapter()
  const result = await adapter.buildFrom([
    makeObservation("intent", "Build a CRM", "User wants a CRM"),
    makeObservation("intent", "Build a CRM", "Repeated intent"),
  ])
  assert.strictEqual(result.observations.length, 1)
})

test("MissionBuilderAdapter health check passes when enabled", async () => {
  const adapter = createMissionBuilderAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
