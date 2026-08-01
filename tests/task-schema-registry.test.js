// ============================================================
// TASK SCHEMA AND REGISTRY TESTS (EXP-PROGRAM-034 / TASK-001, TASK-002)
// ============================================================
// Verifies the canonical task schema validation and the task registry
// discovery/validation logic.
// ============================================================

import { strict as assert } from "assert"
import { validateTask, assertTask } from "../dist/task/task-schema.js"
import { loadTaskRegistry, getTasksByGroup, getTasksByTag } from "../dist/task/task-registry.js"

function makeTask(overrides = {}) {
  return {
    id: "task",
    description: "A task",
    command: "echo ok",
    group: "test",
    dependsOn: [],
    tags: [],
    estimatedDurationMs: 1000,
    capabilities: [],
    ...overrides,
  }
}

function testValidateValidTask() {
  const result = validateTask(makeTask())
  assert.equal(result.ok, true)
  console.log("  [PASS] validateTask: accepts valid task")
}

function testValidateMissingFields() {
  const result = validateTask({ id: "task" })
  assert.equal(result.ok, false)
  assert.ok(result.errors.length > 0)
  console.log("  [PASS] validateTask: rejects missing fields")
}

function testValidateInvalidTypes() {
  const result = validateTask(makeTask({ estimatedDurationMs: "fast" }))
  assert.equal(result.ok, false)
  assert.ok(result.errors.some((e) => e.path === "estimatedDurationMs"))
  console.log("  [PASS] validateTask: rejects invalid types")
}

function testValidateLifecycle() {
  const valid = validateTask(makeTask({ lifecycle: "deprecated" }))
  assert.equal(valid.ok, true)

  const invalid = validateTask(makeTask({ lifecycle: "broken" }))
  assert.equal(invalid.ok, false)
  console.log("  [PASS] validateTask: validates lifecycle")
}

function testAssertTaskThrows() {
  assert.throws(() => assertTask({ id: "task" }), /Invalid task/)
  console.log("  [PASS] assertTask: throws on invalid task")
}

async function testLoadRegistryFromDisk() {
  const registry = await loadTaskRegistry({ dirs: ["data/tasks"] })
  assert.ok(registry.ids.length >= 3)
  assert.ok(registry.ids.includes("build"))
  assert.ok(registry.ids.includes("govern"))
  console.log("  [PASS] loadTaskRegistry: loads fixture task files")
}

async function testLoadRegistryRejectsUnknownDependency() {
  const tempDir = "tests/fixtures/task-registry-unknown-dep"
  await fs.mkdir(tempDir, { recursive: true })
  await fs.writeFile(
    path.join(tempDir, "orphan.task.json"),
    JSON.stringify(makeTask({ id: "orphan", dependsOn: ["missing"] })),
  )

  try {
    await assert.rejects(() => loadTaskRegistry({ dirs: [tempDir] }), /unknown task/)
    console.log("  [PASS] loadTaskRegistry: rejects unknown dependency")
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function testLoadRegistryRejectsDuplicate() {
  const tempDir = "tests/fixtures/task-registry-duplicate"
  await fs.mkdir(tempDir, { recursive: true })
  await fs.writeFile(path.join(tempDir, "a.task.json"), JSON.stringify(makeTask({ id: "dup" })))
  await fs.writeFile(path.join(tempDir, "b.task.json"), JSON.stringify(makeTask({ id: "dup" })))

  try {
    await assert.rejects(() => loadTaskRegistry({ dirs: [tempDir] }), /Duplicate task id/)
    console.log("  [PASS] loadTaskRegistry: rejects duplicate ids")
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

async function testLoadRegistryRejectsInvalidTask() {
  const tempDir = "tests/fixtures/task-registry-invalid"
  await fs.mkdir(tempDir, { recursive: true })
  await fs.writeFile(path.join(tempDir, "bad.task.json"), JSON.stringify({ id: "bad" }))

  try {
    await assert.rejects(() => loadTaskRegistry({ dirs: [tempDir] }), /Invalid task/)
    console.log("  [PASS] loadTaskRegistry: rejects invalid task file")
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}

function testGetTasksByGroup() {
  const registry = {
    tasks: new Map([
      ["a", makeTask({ id: "a", group: "runtime" })],
      ["b", makeTask({ id: "b", group: "runtime" })],
      ["c", makeTask({ id: "c", group: "build" })],
    ]),
    ids: ["a", "b", "c"],
    groups: new Map([
      ["runtime", ["a", "b"]],
      ["build", ["c"]],
    ]),
    tags: new Map(),
  }
  const runtime = getTasksByGroup(registry, "runtime")
  assert.equal(runtime.length, 2)
  console.log("  [PASS] getTasksByGroup")
}

function testGetTasksByTag() {
  const registry = {
    tasks: new Map([
      ["a", makeTask({ id: "a", tags: ["slow"] })],
      ["b", makeTask({ id: "b", tags: ["slow"] })],
      ["c", makeTask({ id: "c", tags: ["fast"] })],
    ]),
    ids: ["a", "b", "c"],
    groups: new Map(),
    tags: new Map([
      ["slow", ["a", "b"]],
      ["fast", ["c"]],
    ]),
  }
  const slow = getTasksByTag(registry, "slow")
  assert.equal(slow.length, 2)
  console.log("  [PASS] getTasksByTag")
}

import fs from "fs/promises"
import path from "path"

console.log("\n=== Task Schema and Registry Tests ===\n")

testValidateValidTask()
testValidateMissingFields()
testValidateInvalidTypes()
testValidateLifecycle()
testAssertTaskThrows()
await testLoadRegistryFromDisk()
await testLoadRegistryRejectsUnknownDependency()
await testLoadRegistryRejectsDuplicate()
await testLoadRegistryRejectsInvalidTask()
testGetTasksByGroup()
testGetTasksByTag()

console.log("\n=== All task schema and registry tests passed ===\n")
