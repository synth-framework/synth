// ============================================================
// ADAPTER TESTS — TDD Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createTddAdapter } from "../dist/adapters/tdd/adapter.js"
import { createAdapterRegistry } from "../dist/adapters/registry.js"
import fs from "fs"
import path from "path"

const TEST_DIR = path.join(process.cwd(), "tests")

function cleanupGeneratedTests() {
  const files = fs.readdirSync(TEST_DIR).filter((f) => f.startsWith("tdd-") && f.endsWith(".test.js"))
  for (const file of files) {
    fs.rmSync(path.join(TEST_DIR, file))
  }
}

test("AdapterRegistry lists tdd adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("tdd"))
})

test("TddAdapter starts in discovered state", () => {
  const adapter = createTddAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "methodology")
  assert.strictEqual(adapter.metadata.kind, "tdd")
})

test("TddAdapter transitions through lifecycle", async () => {
  const adapter = createTddAdapter()
  await adapter.configure({ testDirectory: TEST_DIR, sourceDirectory: path.join(process.cwd(), "src"), coverageEnabled: false })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("TddAdapter generates a failing test skeleton", async () => {
  cleanupGeneratedTests()
  const adapter = createTddAdapter()
  await adapter.enable()
  const result = await adapter.generateTest("work item starts active", "domain/workitem.js", "startWorkItem")
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.generatedFiles.length, 1)
  const generated = fs.readFileSync(result.generatedFiles[0], "utf-8")
  assert.ok(generated.includes("startWorkItem"))
  assert.ok(generated.includes("work item starts active"))
  cleanupGeneratedTests()
})

test("TddAdapter verifies failure when generated tests exist", async () => {
  cleanupGeneratedTests()
  const adapter = createTddAdapter()
  await adapter.enable()
  await adapter.generateTest("always failing requirement", "domain/execution.js", "nonExistentFunction")
  const result = await adapter.verifyFailure()
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.failingTests.length, 1)
  cleanupGeneratedTests()
})

test("TddAdapter generates evidence with timeline", async () => {
  cleanupGeneratedTests()
  const adapter = createTddAdapter()
  await adapter.enable()
  await adapter.generateTest("work item starts active", "domain/workitem.js", "startWorkItem")
  await adapter.verifyFailure()
  const result = await adapter.generateEvidence("work item starts active")
  assert.strictEqual(result.success, true)
  assert.ok(result.evidence)
  assert.strictEqual(result.evidence.requirement, "work item starts active")
  assert.ok(result.evidence.timeline.length >= 3)
  cleanupGeneratedTests()
})

test("TddAdapter health check passes when directories exist", async () => {
  const adapter = createTddAdapter()
  await adapter.enable()
  const health = await adapter.checkHealth()
  assert.strictEqual(health.healthy, true)
})
