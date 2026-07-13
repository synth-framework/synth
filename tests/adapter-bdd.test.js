// ============================================================
// ADAPTER TESTS — BDD Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createBddAdapter } from "../dist/adapters/bdd/adapter.js"
import { createAdapterRegistry } from "../dist/adapters/registry.js"
import fs from "fs"
import path from "path"

const TEST_DIR = path.join(process.cwd(), "tests")
const BDD_DIR = path.join(process.cwd(), "bdd")

function cleanup() {
  const testFiles = fs.readdirSync(TEST_DIR).filter((f) => f.startsWith("bdd-") && f.endsWith(".test.js"))
  for (const file of testFiles) {
    fs.rmSync(path.join(TEST_DIR, file))
  }
  if (fs.existsSync(BDD_DIR)) {
    const featureFiles = fs.readdirSync(BDD_DIR).filter((f) => f.endsWith(".json"))
    for (const file of featureFiles) {
      fs.rmSync(path.join(BDD_DIR, file))
    }
  }
}

test("AdapterRegistry lists bdd adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("bdd"))
})

test("BddAdapter starts in discovered state", () => {
  const adapter = createBddAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "methodology")
  assert.strictEqual(adapter.metadata.kind, "bdd")
})

test("BddAdapter transitions through lifecycle", async () => {
  cleanup()
  const adapter = createBddAdapter()
  await adapter.configure({ featuresDirectory: BDD_DIR, testsDirectory: TEST_DIR, sourceDirectory: path.join(process.cwd(), "src") })
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("BddAdapter creates a feature", async () => {
  cleanup()
  const adapter = createBddAdapter()
  await adapter.enable()
  const result = await adapter.createFeature("mission-1", "User login", "Users can log into the system")
  assert.strictEqual(result.success, true)
  assert.ok(result.feature)
  assert.strictEqual(result.feature.name, "User login")
  assert.strictEqual(result.feature.missionId, "mission-1")
  cleanup()
})

test("BddAdapter creates a scenario for a feature", async () => {
  cleanup()
  const adapter = createBddAdapter()
  await adapter.enable()
  const featureResult = await adapter.createFeature("mission-2", "Add work item", "Users can add work items")
  const featureId = featureResult.feature.id
  const result = await adapter.createScenario(featureId, "Valid work item", ["user is authenticated"], "user submits a valid work item", ["work item is created"])
  assert.strictEqual(result.success, true)
  assert.ok(result.scenario)
  assert.strictEqual(result.scenario.name, "Valid work item")
  cleanup()
})

test("BddAdapter generates acceptance test skeletons", async () => {
  cleanup()
  const adapter = createBddAdapter()
  await adapter.enable()
  const featureResult = await adapter.createFeature("mission-3", "Complete work item", "Users can complete work items")
  const featureId = featureResult.feature.id
  await adapter.createScenario(featureId, "Complete active work item", ["work item is active"], "user completes the work item", ["work item status is completed"])
  const result = await adapter.generateAcceptanceTests(featureId)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.generatedFiles.length, 1)
  const generated = fs.readFileSync(result.generatedFiles[0], "utf-8")
  assert.ok(generated.includes("Complete work item"))
  assert.ok(generated.includes("Complete active work item"))
  cleanup()
})

test("BddAdapter generates behavior evidence with traceability matrix", async () => {
  cleanup()
  const adapter = createBddAdapter()
  await adapter.enable()
  const featureResult = await adapter.createFeature("mission-4", "Archive work item", "Users can archive work items")
  const featureId = featureResult.feature.id
  await adapter.createScenario(featureId, "Archive completed work item", ["work item is completed"], "user archives the work item", ["work item is archived"])
  await adapter.generateAcceptanceTests(featureId)
  const result = await adapter.generateBehaviorEvidence()
  assert.strictEqual(result.success, true)
  assert.ok(result.evidence)
  assert.ok(result.evidence.traceabilityMatrix.length >= 1)
  assert.strictEqual(result.evidence.coverage.features, 1)
  assert.strictEqual(result.evidence.coverage.scenarios, 1)
  cleanup()
})

test("BddAdapter health check passes when directories exist", async () => {
  const adapter = createBddAdapter()
  await adapter.enable()
  const health = await adapter.checkHealth()
  assert.strictEqual(health.healthy, true)
})
