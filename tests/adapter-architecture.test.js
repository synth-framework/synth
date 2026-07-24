// ============================================================
// ADAPTER TESTS — Architecture Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createArchitectureAdapter } from "../dist/adapters/architecture/adapter.js"
import { createAdapterRegistry } from "../dist/mission-studio/adapter-registry.js"

function makeObservation(category, subject, snippet = "", path = "") {
  return {
    id: `obs-${category}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    source: { adapter: "test", locator: path || "test" },
    category,
    subject,
    evidence: [{ description: "test evidence", snippet, fingerprint: "abc" }],
    confidence: "high",
    timestamp: Date.now(),
    metadata: path ? { path } : undefined,
  }
}

test("AdapterRegistry lists architecture adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("architecture"))
})

test("ArchitectureAdapter starts in discovered state", () => {
  const adapter = createArchitectureAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "intelligence")
  assert.strictEqual(adapter.metadata.kind, "architecture")
})

test("ArchitectureAdapter transitions through lifecycle", async () => {
  const adapter = createArchitectureAdapter()
  await adapter.configure({ observations: [] })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("ArchitectureAdapter infers hexagonal architecture", async () => {
  const adapter = createArchitectureAdapter()
  const result = await adapter.inferFrom([
    makeObservation("evidence", "ports", "The system exposes ports and adapters", "src/ports/UserPort.ts"),
    makeObservation("component", "adapter", "Driven adapter implementation"),
  ])
  const arch = result.observations.find((o) => o.metadata.style === "hexagonal")
  assert.ok(arch, "Expected hexagonal architecture observation")
  assert.strictEqual(arch.category, "architecture")
  assert.ok(arch.confidence === "high" || arch.confidence === "medium")
})

test("ArchitectureAdapter infers DDD", async () => {
  const adapter = createArchitectureAdapter()
  const result = await adapter.inferFrom([
    makeObservation("component", "aggregate", "Order aggregate root"),
    makeObservation("component", "entity", "Customer entity"),
  ])
  const arch = result.observations.find((o) => o.metadata.style === "ddd")
  assert.ok(arch, "Expected DDD observation")
})

test("ArchitectureAdapter infers MVC", async () => {
  const adapter = createArchitectureAdapter()
  const result = await adapter.inferFrom([
    makeObservation("evidence", "controller", "HomeController handles requests"),
  ])
  const arch = result.observations.find((o) => o.metadata.style === "mvc")
  assert.ok(arch, "Expected MVC observation")
})

test("ArchitectureAdapter infers layered architecture from paths", async () => {
  const adapter = createArchitectureAdapter()
  const result = await adapter.inferFrom([
    makeObservation("evidence", "domain", "", "src/domain/User.ts"),
    makeObservation("evidence", "infrastructure", "", "src/infrastructure/Persistence.ts"),
  ])
  const arch = result.observations.find((o) => o.metadata.style === "layered")
  assert.ok(arch, "Expected layered architecture observation")
})

test("ArchitectureAdapter infers microservices", async () => {
  const adapter = createArchitectureAdapter()
  const result = await adapter.inferFrom([
    makeObservation("component", "user-service", "User service API"),
    makeObservation("component", "order-service", "Order service API"),
    makeObservation("capability", "gateway", "API gateway routes requests"),
  ])
  const arch = result.observations.find((o) => o.metadata.style === "microservices")
  assert.ok(arch, "Expected microservices observation")
})

test("ArchitectureAdapter returns no observations without signals", async () => {
  const adapter = createArchitectureAdapter()
  const result = await adapter.inferFrom([
    makeObservation("intent", "CRM"),
  ])
  assert.strictEqual(result.observations.length, 0)
})

test("ArchitectureAdapter health check passes when enabled", async () => {
  const adapter = createArchitectureAdapter()
  await adapter.enable()
  await adapter.healthCheck()
  assert.strictEqual(adapter.health.state, "healthy")
})
