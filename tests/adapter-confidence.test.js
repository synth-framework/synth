// ============================================================
// ADAPTER TESTS — Confidence Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createConfidenceAdapter } from "../dist/adapters/confidence/adapter.js"
import { createAdapterRegistry } from "../dist/mission-studio/adapter-registry.js"

function makeObservation(category, subject, confidence = "high", evidence = [{ description: "evidence", fingerprint: "abc" }]) {
  return {
    id: `obs-${category}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    source: { adapter: "test", locator: "test" },
    category,
    subject,
    evidence,
    confidence,
    timestamp: Date.now(),
  }
}

test("AdapterRegistry lists confidence adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("confidence"))
})

test("ConfidenceAdapter starts in discovered state", () => {
  const adapter = createConfidenceAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "intelligence")
  assert.strictEqual(adapter.metadata.kind, "confidence")
})

test("ConfidenceAdapter transitions through lifecycle", async () => {
  const adapter = createConfidenceAdapter()
  await adapter.configure({ observations: [] })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("ConfidenceAdapter computes overall score", async () => {
  const adapter = createConfidenceAdapter()
  const result = await adapter.evaluateFrom([
    makeObservation("intent", "CRM", "high"),
    makeObservation("language", "TypeScript", "high"),
  ])
  assert.strictEqual(result.observations.length, 1)
  const report = result.observations[0].metadata
  assert.strictEqual(report.score, 0.8)
  assert.strictEqual(report.level, "high")
  assert.strictEqual(report.observationCount, 2)
})

test("ConfidenceAdapter reports missing evidence for low confidence", async () => {
  const adapter = createConfidenceAdapter()
  const result = await adapter.evaluateFrom([
    makeObservation("unknown", "something", "low"),
  ])
  const report = result.observations[0].metadata
  assert.ok(report.missingEvidence.length > 0)
})

test("ConfidenceAdapter reports missing evidence when evidence is empty", async () => {
  const adapter = createConfidenceAdapter()
  const result = await adapter.evaluateFrom([
    makeObservation("intent", "CRM", "high", []),
  ])
  const report = result.observations[0].metadata
  assert.ok(report.missingEvidence.some((m) => m.includes("no evidence")))
})

test("ConfidenceAdapter detects ambiguities from same subject in multiple categories", async () => {
  const adapter = createConfidenceAdapter()
  const result = await adapter.evaluateFrom([
    makeObservation("intent", "CRM", "high"),
    makeObservation("mission", "CRM", "high"),
  ])
  const report = result.observations[0].metadata
  assert.ok(report.ambiguities.length > 0)
  assert.ok(report.ambiguities[0].includes("CRM"))
})

test("ConfidenceAdapter detects conflicts between constraints", async () => {
  const adapter = createConfidenceAdapter()
  const result = await adapter.evaluateFrom([
    makeObservation("constraint", "Must use PostgreSQL", "high"),
    makeObservation("constraint", "Must use MySQL", "high"),
  ])
  const report = result.observations[0].metadata
  assert.ok(report.conflicts.length > 0)
})

test("ConfidenceAdapter reports unknown level for empty observations", async () => {
  const adapter = createConfidenceAdapter()
  const result = await adapter.evaluateFrom([])
  const report = result.observations[0].metadata
  assert.strictEqual(report.score, 0)
  assert.strictEqual(report.level, "unknown")
})

test("ConfidenceAdapter health check passes when enabled", async () => {
  const adapter = createConfidenceAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
