// ============================================================
// ADAPTER TESTS — Wizard Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createWizardAdapter } from "../dist/adapters/wizard/adapter.js"
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

test("AdapterRegistry lists wizard adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("wizard"))
})

test("WizardAdapter starts in discovered state", () => {
  const adapter = createWizardAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "planning")
  assert.strictEqual(adapter.metadata.kind, "wizard")
})

test("WizardAdapter transitions through lifecycle", async () => {
  const adapter = createWizardAdapter()
  await adapter.configure({ observations: [] })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("WizardAdapter preserves existing wizard observations", async () => {
  const adapter = createWizardAdapter()
  const wizard = makeObservation("wizard", "Review objectives", "Wizard step")
  const result = await adapter.buildFrom([wizard])
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].category, "wizard")
  assert.strictEqual(result.observations[0].subject, "Review objectives")
})

test("WizardAdapter converts an objective into a wizard observation", async () => {
  const adapter = createWizardAdapter()
  const result = await adapter.buildFrom([
    makeObservation("objective", "Design CRM", "Design phase objective"),
  ])
  assert.strictEqual(result.observations.length, 1)
  assert.strictEqual(result.observations[0].category, "wizard")
  assert.strictEqual(result.observations[0].subject, "Review: Design CRM")
  assert.strictEqual(result.observations[0].confidence, "medium")
  assert.deepStrictEqual(result.observations[0].metadata.actions, ["approve", "reject", "merge", "split", "refine"])
})

test("WizardAdapter uses configured actions when provided", async () => {
  const adapter = createWizardAdapter()
  await adapter.configure({ observations: [], actions: ["approve", "refine"] })
  const result = await adapter.buildFrom([
    makeObservation("objective", "Implement API", "Implementation objective"),
  ])
  assert.strictEqual(result.observations.length, 1)
  assert.deepStrictEqual(result.observations[0].metadata.actions, ["approve", "refine"])
})

test("WizardAdapter returns empty batch when no objective sources exist", async () => {
  const adapter = createWizardAdapter()
  const result = await adapter.buildFrom([
    makeObservation("expedition", "CRM Expedition", "Expedition only"),
  ])
  assert.strictEqual(result.observations.length, 0)
})

test("WizardAdapter avoids duplicate wizard observations", async () => {
  const adapter = createWizardAdapter()
  const result = await adapter.buildFrom([
    makeObservation("objective", "Design CRM", "Design phase objective"),
    makeObservation("objective", "Design CRM", "Repeated objective"),
  ])
  assert.strictEqual(result.observations.length, 1)
})

test("WizardAdapter converts multiple objectives into distinct wizard observations", async () => {
  const adapter = createWizardAdapter()
  const result = await adapter.buildFrom([
    makeObservation("objective", "Design CRM", "Design objective"),
    makeObservation("objective", "Implement CRM", "Implement objective"),
  ])
  assert.strictEqual(result.observations.length, 2)
  const subjects = result.observations.map((o) => o.subject)
  assert.ok(subjects.includes("Review: Design CRM"))
  assert.ok(subjects.includes("Review: Implement CRM"))
})

test("WizardAdapter health check passes when enabled", async () => {
  const adapter = createWizardAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
