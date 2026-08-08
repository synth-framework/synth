// ============================================================
// EXP-ONBOARD-002 — Onboarding Task Discovery and DAG
// ============================================================
// Verifies that the framework-owned onboarding tasks are discovered
// by the task registry, reference known commands, and form a valid
// directed acyclic graph.
// ============================================================

import { loadTaskRegistry } from "../dist/task/task-registry.js"
import { detectTaskCycles, taskExecutionOrder } from "../dist/task/task-graph.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function testOnboardingTasksDiscovered() {
  const registry = await loadTaskRegistry()
  const onboardingIds = [
    "onboarding:detect",
    "onboarding:archive",
    "onboarding:init",
    "onboarding:bootstrap",
    "onboarding:mission",
    "onboarding:govern",
  ]

  for (const id of onboardingIds) {
    assert(registry.tasks.has(id), `onboarding task ${id} should be discovered`)
  }

  const detect = registry.tasks.get("onboarding:detect")
  assert(detect.group === "onboarding", "onboarding:detect should belong to onboarding group")
  assert(detect.command === "synth first-contact onboard:detect", "onboarding:detect command should dispatch to CLI")

  const govern = registry.tasks.get("onboarding:govern")
  assert(govern.command === "npm run govern", `onboarding:govern should delegate to project govern script, got: ${govern.command}`)

  console.log("[PASS] onboarding tasks are discovered from dist/tasks/")
}

async function testOnboardingTasksFormDag() {
  const registry = await loadTaskRegistry()
  const cycles = detectTaskCycles(registry)
  assert(cycles.length === 0, `onboarding tasks should not contain cycles: ${JSON.stringify(cycles)}`)

  const orderResult = taskExecutionOrder(registry)
  assert(orderResult.ok, "taskExecutionOrder should succeed for onboarding tasks")

  const orderIds = orderResult.order.map((t) => t.id)
  const detectIndex = orderIds.indexOf("onboarding:detect")
  const initIndex = orderIds.indexOf("onboarding:init")
  const missionIndex = orderIds.indexOf("onboarding:mission")
  const bootstrapIndex = orderIds.indexOf("onboarding:bootstrap")

  assert(detectIndex !== -1, "order should include onboarding:detect")
  assert(initIndex !== -1, "order should include onboarding:init")
  assert(missionIndex !== -1, "order should include onboarding:mission")
  assert(bootstrapIndex !== -1, "order should include onboarding:bootstrap")

  assert(detectIndex < initIndex, "onboarding:detect should run before onboarding:init")
  assert(detectIndex < bootstrapIndex, "onboarding:detect should run before onboarding:bootstrap")
  assert(initIndex < missionIndex, "onboarding:init should run before onboarding:mission")

  console.log("[PASS] onboarding tasks form a valid DAG")
}

async function testOnboardingGroupFilter() {
  const registry = await loadTaskRegistry()
  const groupTasks = registry.groups.get("onboarding") || []
  assert(groupTasks.length >= 6, `onboarding group should contain at least 6 tasks, got ${groupTasks.length}`)
  assert(groupTasks.includes("onboarding:init"), "onboarding group should include onboarding:init")
  assert(groupTasks.includes("onboarding:mission"), "onboarding group should include onboarding:mission")

  console.log("[PASS] onboarding group indexes all onboarding tasks")
}

async function main() {
  await testOnboardingTasksDiscovered()
  await testOnboardingTasksFormDag()
  await testOnboardingGroupFilter()
  console.log("\n[TASK-ONBOARDING] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
