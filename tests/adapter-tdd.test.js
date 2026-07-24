// ============================================================
// ADAPTER TESTS — TDD Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createTddAdapter } from "../dist/adapters/tdd/adapter.js"
import fs from "fs"
import path from "path"
import {
  assertAdapterListed,
  assertAdapterLifecycle,
  assertAdapterHealth,
} from "./helpers/adapter-lifecycle.js"

const TEST_DIR = path.join(process.cwd(), "tests")

function cleanupGeneratedTests() {
  const files = fs.readdirSync(TEST_DIR).filter((f) => f.startsWith("tdd-") && f.endsWith(".test.js"))
  for (const file of files) {
    fs.rmSync(path.join(TEST_DIR, file))
  }
}

test("AdapterRegistry lists tdd adapter", () => {
  assertAdapterListed("tdd")
})

test("TddAdapter starts in discovered state and transitions through lifecycle", async () => {
  await assertAdapterLifecycle(
    () => createTddAdapter(),
    {
      testDirectory: TEST_DIR,
      sourceDirectory: path.join(process.cwd(), "src"),
      coverageEnabled: false,
    },
  )
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

test("TddAdapter detects assertion failure in generated test", async () => {
  cleanupGeneratedTests()
  const adapter = createTddAdapter()
  await adapter.enable()
  await adapter.generateTest("forced assertion failure", "domain/workitem.js", "createWorkItem")

  // Replace the generated skeleton with a test that fails via assertion so we
  // verify Red-phase detection for a normal test failure, not only module
  // resolution errors.
  const testFile = fs.readdirSync(TEST_DIR).find((f) => f.startsWith("tdd-createWorkItem") && f.endsWith(".test.js"))
  assert.ok(testFile, "Generated test file should exist")
  fs.writeFileSync(
    path.join(TEST_DIR, testFile),
    `import { test } from "node:test"\nimport assert from "node:assert"\n\ntest("forced assertion failure", () => {\n  assert.ok(false, "forced red phase failure")\n})\n`,
  )

  const result = await adapter.verifyFailure()
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.failingTests.length, 1)
  cleanupGeneratedTests()
})

test("TddAdapter detects module-resolution failure under non-spec reporter", async () => {
  cleanupGeneratedTests()
  const adapter = createTddAdapter()
  await adapter.enable()
  await adapter.generateTest("module resolution failure", "domain/execution.js", "nonExistentFunction")

  // Simulate CI/non-TTY conditions where Node defaults to TAP output. The
  // adapter must still detect the Red phase from the process exit code even
  // when stdout contains no spec-style ✖ markers.
  const previousNodeOptions = process.env.NODE_OPTIONS
  process.env.NODE_OPTIONS = "--test-reporter tap"
  try {
    const result = await adapter.verifyFailure()
    assert.strictEqual(result.success, true)
    assert.strictEqual(result.failingTests.length, 1)
  } finally {
    process.env.NODE_OPTIONS = previousNodeOptions
  }
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
  await assertAdapterHealth(() => createTddAdapter())
})
