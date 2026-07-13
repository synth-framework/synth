// ============================================================
// ADAPTER TESTS — Knowledge Extraction Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createKnowledgeExtractionAdapter } from "../dist/adapters/knowledge/adapter.js"
import { createAdapterRegistry } from "../dist/adapters/registry.js"

function makeObservation(category, subject, confidence = "high") {
  return {
    id: `obs-${category}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    source: { adapter: "test", locator: "test" },
    category,
    subject,
    evidence: [{ description: "test evidence", fingerprint: "abc123" }],
    confidence,
    timestamp: Date.now(),
  }
}

test("AdapterRegistry lists knowledge-extraction adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("knowledge-extraction"))
})

test("KnowledgeExtractionAdapter starts in discovered state", () => {
  const adapter = createKnowledgeExtractionAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "intelligence")
  assert.strictEqual(adapter.metadata.kind, "knowledge-extraction")
})

test("KnowledgeExtractionAdapter transitions through lifecycle", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  await adapter.configure({ observations: [] })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("KnowledgeExtractionAdapter extracts mission from intent", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  const result = await adapter.extractFrom([makeObservation("intent", "CRM", "high")])
  const mission = result.observations.find((o) => o.category === "mission")
  assert.ok(mission, "Expected mission observation")
  assert.strictEqual(mission.subject, "CRM")
  assert.strictEqual(mission.confidence, "medium")
})

test("KnowledgeExtractionAdapter extracts capability from capability observation", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  const result = await adapter.extractFrom([makeObservation("capability", "listUsers", "high")])
  const capability = result.observations.find((o) => o.category === "capability")
  assert.ok(capability, "Expected capability observation")
  assert.strictEqual(capability.subject, "listUsers")
})

test("KnowledgeExtractionAdapter extracts component from language", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  const result = await adapter.extractFrom([makeObservation("language", "TypeScript", "high")])
  const component = result.observations.find((o) => o.category === "component")
  assert.ok(component, "Expected component observation")
  assert.strictEqual(component.subject, "TypeScript runtime component")
})

test("KnowledgeExtractionAdapter extracts component from dependency", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  const result = await adapter.extractFrom([makeObservation("dependency", "express", "high")])
  const component = result.observations.find((o) => o.category === "component")
  assert.ok(component, "Expected component observation")
  assert.strictEqual(component.subject, "express integration")
})

test("KnowledgeExtractionAdapter preserves constraints", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  const result = await adapter.extractFrom([makeObservation("constraint", "Users must log in", "medium")])
  const constraint = result.observations.find((o) => o.category === "constraint")
  assert.ok(constraint, "Expected constraint observation")
  assert.strictEqual(constraint.subject, "Users must log in")
  assert.strictEqual(constraint.confidence, "medium")
})

test("KnowledgeExtractionAdapter generates risk for unknown observations", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  const result = await adapter.extractFrom([makeObservation("unknown", "Purple elephants", "low")])
  const risk = result.observations.find((o) => o.category === "risk")
  assert.ok(risk, "Expected risk observation")
  assert.ok(risk.subject.includes("Purple elephants"))
})

test("KnowledgeExtractionAdapter detects multiple mission risk", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  const result = await adapter.extractFrom([
    makeObservation("intent", "CRM", "high"),
    makeObservation("intent", "ERP", "high"),
  ])
  const risk = result.observations.find((o) => o.category === "risk" && o.subject === "Multiple mission candidates detected")
  assert.ok(risk, "Expected multiple mission risk")
})

test("KnowledgeExtractionAdapter ignores evidence categories", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  const result = await adapter.extractFrom([makeObservation("evidence", "README content", "high")])
  assert.strictEqual(result.observations.length, 0)
})

test("KnowledgeExtractionAdapter health check passes when enabled", async () => {
  const adapter = createKnowledgeExtractionAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
