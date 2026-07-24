// ============================================================
// ADAPTER TESTS — Dependency Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createDependencyAdapter } from "../dist/adapters/dependency/adapter.js"
import { createAdapterRegistry } from "../dist/mission-studio/adapter-registry.js"

function makeObservation(category, subject, locator = "test") {
  return {
    id: `obs-${category}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    source: { adapter: "test", locator },
    category,
    subject,
    evidence: [{ description: "test evidence", fingerprint: "abc" }],
    confidence: "high",
    timestamp: Date.now(),
  }
}

test("AdapterRegistry lists dependency adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("dependency"))
})

test("DependencyAdapter starts in discovered state", () => {
  const adapter = createDependencyAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "intelligence")
  assert.strictEqual(adapter.metadata.kind, "dependency")
})

test("DependencyAdapter transitions through lifecycle", async () => {
  const adapter = createDependencyAdapter()
  await adapter.configure({ observations: [] })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("DependencyAdapter builds dependency graph", async () => {
  const adapter = createDependencyAdapter()
  const result = await adapter.buildFrom([
    makeObservation("dependency", "express", "package.json"),
    makeObservation("dependency", "typescript", "package.json"),
    makeObservation("dependency", "jest", "other-package.json"),
  ])
  const graphObs = result.observations.find((o) => o.subject === "Dependency Graph")
  assert.ok(graphObs, "Expected dependency graph observation")
  const graph = graphObs.metadata.graph
  assert.strictEqual(graph.nodes.length, 3)
  assert.ok(graph.edges.length > 0, "Expected edges between shared-source dependencies")
  const expressNode = graph.nodes.find((n) => n.label === "express")
  assert.ok(expressNode)
})

test("DependencyAdapter builds component graph", async () => {
  const adapter = createDependencyAdapter()
  const result = await adapter.buildFrom([
    makeObservation("language", "TypeScript", "src"),
    makeObservation("component", "express integration", "src"),
  ])
  const graphObs = result.observations.find((o) => o.subject === "Component Graph")
  assert.ok(graphObs, "Expected component graph observation")
  const graph = graphObs.metadata.graph
  assert.strictEqual(graph.nodes.length, 2)
})

test("DependencyAdapter builds capability graph", async () => {
  const adapter = createDependencyAdapter()
  const result = await adapter.buildFrom([
    makeObservation("capability", "listUsers", "api.openapi.json"),
    makeObservation("capability", "createUser", "api.openapi.json"),
  ])
  const graphObs = result.observations.find((o) => o.subject === "Capability Graph")
  assert.ok(graphObs, "Expected capability graph observation")
  const graph = graphObs.metadata.graph
  assert.strictEqual(graph.nodes.length, 2)
  assert.strictEqual(graph.edges.length, 1)
})

test("DependencyAdapter omits empty graphs", async () => {
  const adapter = createDependencyAdapter()
  const result = await adapter.buildFrom([makeObservation("intent", "CRM")])
  assert.strictEqual(result.observations.length, 0)
})

test("DependencyAdapter health check passes when enabled", async () => {
  const adapter = createDependencyAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
