// ============================================================
// TASK GRAPH TESTS (EXP-PROGRAM-034 / TASK-004)
// ============================================================
// Verifies that task dependency graphs are built and queried using
// the shared dependency-graph primitive.
// ============================================================

import { strict as assert } from "assert"
import {
  loadTasks,
  buildTaskGraph,
  detectTaskCycles,
  taskExecutionOrder,
  findAffectedTasks,
} from "../dist/task/task-graph.js"

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

async function testLoadTasksFromDisk() {
  const tasks = await loadTasks(["data/tasks"])
  assert.ok(tasks.length >= 3, "should load at least the fixture tasks")
  const ids = tasks.map((t) => t.id).sort()
  assert.ok(ids.includes("build"), "should load build task")
  assert.ok(ids.includes("govern"), "should load govern task")
  console.log("  [PASS] loadTasks: loads fixture task files")
}

function testBuildTaskGraph() {
  const tasks = [
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c" }),
  ]
  const graph = buildTaskGraph(tasks)
  assert.equal(graph.nodes.size, 3)
  assert.equal(graph.edges.length, 2)
  assert.ok(graph.edges.some((e) => e.from === "a" && e.to === "b" && e.type === "depends_on"))
  assert.ok(graph.edges.some((e) => e.from === "b" && e.to === "c" && e.type === "depends_on"))
  console.log("  [PASS] buildTaskGraph")
}

function testBuildTaskGraphRejectsUnknownDependency() {
  const tasks = [makeTask({ id: "a", dependsOn: ["missing"] })]
  assert.throws(() => buildTaskGraph(tasks), /unknown task/)
  console.log("  [PASS] buildTaskGraph: rejects unknown dependency")
}

function testDetectTaskCyclesNoCycles() {
  const tasks = [
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c" }),
  ]
  const cycles = detectTaskCycles(tasks)
  assert.deepEqual(cycles, [])
  console.log("  [PASS] detectTaskCycles: no cycles")
}

function testDetectTaskCyclesWithCycle() {
  const tasks = [
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c", dependsOn: ["a"] }),
  ]
  const cycles = detectTaskCycles(tasks)
  assert.equal(cycles.length, 1)
  assert.deepEqual(cycles[0], ["a", "b", "c"])
  console.log("  [PASS] detectTaskCycles: detects cycle")
}

function testTaskExecutionOrder() {
  const tasks = [
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c" }),
  ]
  const result = taskExecutionOrder(tasks)
  assert.equal(result.ok, true)
  assert.deepEqual(
    result.order.map((t) => t.id),
    ["c", "b", "a"],
  )
  console.log("  [PASS] taskExecutionOrder: topological order")
}

function testTaskExecutionOrderReportsCycle() {
  const tasks = [
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["a"] }),
  ]
  const result = taskExecutionOrder(tasks)
  assert.equal(result.ok, false)
  assert.ok(result.cycle.length > 0)
  console.log("  [PASS] taskExecutionOrder: reports cycle")
}

function testFindAffectedTasks() {
  const tasks = [
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c" }),
    makeTask({ id: "x" }),
  ]
  const affected = findAffectedTasks(tasks, ["c"])
  const ids = affected.map((t) => t.id).sort()
  assert.deepEqual(ids, ["a", "b", "c"])
  console.log("  [PASS] findAffectedTasks")
}

console.log("\n=== Task Graph Tests ===\n")

await testLoadTasksFromDisk()
testBuildTaskGraph()
testBuildTaskGraphRejectsUnknownDependency()
testDetectTaskCyclesNoCycles()
testDetectTaskCyclesWithCycle()
testTaskExecutionOrder()
testTaskExecutionOrderReportsCycle()
testFindAffectedTasks()

console.log("\n=== All task graph tests passed ===\n")
