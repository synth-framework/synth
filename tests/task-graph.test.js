// ============================================================
// TASK GRAPH TESTS (EXP-PROGRAM-034 / TASK-004)
// ============================================================
// Verifies that task dependency graphs are built and queried using
// the shared dependency-graph primitive and the task registry.
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

function makeRegistry(tasks) {
  const taskMap = new Map()
  const groups = new Map()
  const tags = new Map()

  for (const task of tasks) {
    taskMap.set(task.id, task)
    const groupTasks = groups.get(task.group) ?? []
    groupTasks.push(task.id)
    groups.set(task.group, groupTasks)
    for (const tag of task.tags) {
      const tagTasks = tags.get(tag) ?? []
      tagTasks.push(task.id)
      tags.set(tag, tagTasks)
    }
  }

  return {
    tasks: taskMap,
    ids: tasks.map((t) => t.id).sort(),
    groups,
    tags,
  }
}

async function testLoadTasksFromDisk() {
  const registry = await loadTasks(["data/tasks"])
  assert.ok(registry.ids.length >= 3, "should load at least the fixture tasks")
  assert.ok(registry.ids.includes("build"), "should load build task")
  assert.ok(registry.ids.includes("govern"), "should load govern task")
  console.log("  [PASS] loadTasks: loads fixture task files")
}

function testBuildTaskGraph() {
  const registry = makeRegistry([
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c" }),
  ])
  const graph = buildTaskGraph(registry)
  assert.equal(graph.nodes.size, 3)
  assert.equal(graph.edges.length, 2)
  assert.ok(graph.edges.some((e) => e.from === "a" && e.to === "b" && e.type === "depends_on"))
  assert.ok(graph.edges.some((e) => e.from === "b" && e.to === "c" && e.type === "depends_on"))
  console.log("  [PASS] buildTaskGraph")
}

function testDetectTaskCyclesNoCycles() {
  const registry = makeRegistry([
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c" }),
  ])
  const cycles = detectTaskCycles(registry)
  assert.deepEqual(cycles, [])
  console.log("  [PASS] detectTaskCycles: no cycles")
}

function testDetectTaskCyclesWithCycle() {
  const registry = makeRegistry([
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c", dependsOn: ["a"] }),
  ])
  const cycles = detectTaskCycles(registry)
  assert.equal(cycles.length, 1)
  assert.deepEqual(cycles[0], ["a", "b", "c"])
  console.log("  [PASS] detectTaskCycles: detects cycle")
}

function testTaskExecutionOrder() {
  const registry = makeRegistry([
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c" }),
  ])
  const result = taskExecutionOrder(registry)
  assert.equal(result.ok, true)
  assert.deepEqual(
    result.order.map((t) => t.id),
    ["c", "b", "a"],
  )
  console.log("  [PASS] taskExecutionOrder: topological order")
}

function testTaskExecutionOrderReportsCycle() {
  const registry = makeRegistry([
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["a"] }),
  ])
  const result = taskExecutionOrder(registry)
  assert.equal(result.ok, false)
  assert.ok(result.cycle.length > 0)
  console.log("  [PASS] taskExecutionOrder: reports cycle")
}

function testFindAffectedTasks() {
  const registry = makeRegistry([
    makeTask({ id: "a", dependsOn: ["b"] }),
    makeTask({ id: "b", dependsOn: ["c"] }),
    makeTask({ id: "c" }),
    makeTask({ id: "x" }),
  ])
  const affected = findAffectedTasks(registry, ["c"])
  const ids = affected.map((t) => t.id).sort()
  assert.deepEqual(ids, ["a", "b", "c"])
  console.log("  [PASS] findAffectedTasks")
}

console.log("\n=== Task Graph Tests ===\n")

await testLoadTasksFromDisk()
testBuildTaskGraph()
testDetectTaskCyclesNoCycles()
testDetectTaskCyclesWithCycle()
testTaskExecutionOrder()
testTaskExecutionOrderReportsCycle()
testFindAffectedTasks()

console.log("\n=== All task graph tests passed ===\n")
