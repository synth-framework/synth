// ============================================================
// TASK CLI TESTS (EXP-PROGRAM-034 / TASK-003)
// ============================================================
// Verifies the read-only task CLI surface: list, explain, graph,
// and doctor. Spawns the compiled CLI to exercise the full path.
// ============================================================

import { strict as assert } from "assert"
import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI_PATH = path.resolve(__dirname, "..", "dist", "cli", "synth.js")

function run(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI_PATH, ...args], {
      cwd: cwd ?? process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (data) => {
      stdout += data
    })
    child.stderr.on("data", (data) => {
      stderr += data
    })
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr })
    })
    child.on("error", reject)
  })
}

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

async function setupProject(tasks) {
  const tmpDir = path.join("tests", "fixtures", `task-cli-${Date.now()}`)
  const tasksDir = path.join(tmpDir, "data", "tasks")
  await fs.mkdir(tasksDir, { recursive: true })
  for (const [filename, task] of Object.entries(tasks)) {
    await fs.writeFile(path.join(tasksDir, filename), JSON.stringify(task, null, 2))
  }
  return tmpDir
}

async function teardown(tmpDir) {
  await fs.rm(tmpDir, { recursive: true, force: true })
}

async function testTaskHelp() {
  const { code, stdout } = await run(["task", "--help"])
  assert.equal(code, 0)
  const output = JSON.parse(stdout)
  assert.equal(output.status, "ok")
  assert.equal(output.namespace, "task")
  assert.ok(output.subcommands.some((s) => s.name.includes("list")))
  assert.ok(output.subcommands.some((s) => s.name.includes("explain")))
  assert.ok(output.subcommands.some((s) => s.name.includes("graph")))
  assert.ok(output.subcommands.some((s) => s.name.includes("doctor")))
  console.log("  [PASS] task --help: returns namespace help")
}

async function testTaskList() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build", group: "build", tags: ["compile"] }),
    "test.task.json": makeTask({ id: "test", group: "runtime", tags: ["test"] }),
  })
  try {
    const { code, stdout } = await run(["task", "list"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskList")
    assert.equal(output.count, 2)
    assert.ok(output.tasks.some((t) => t.id === "build"))
    assert.ok(output.tasks.some((t) => t.id === "test"))
    console.log("  [PASS] task list: returns all tasks")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskListGroupFilter() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build", group: "build" }),
    "test.task.json": makeTask({ id: "test", group: "runtime" }),
  })
  try {
    const { code, stdout } = await run(["task", "list", "--group", "runtime"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.count, 1)
    assert.equal(output.tasks[0].id, "test")
    assert.equal(output.filters.group, "runtime")
    console.log("  [PASS] task list --group: filters by group")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskListTagFilter() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a", tags: ["slow"] }),
    "b.task.json": makeTask({ id: "b", tags: ["fast"] }),
  })
  try {
    const { code, stdout } = await run(["task", "list", "--tag", "slow"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.count, 1)
    assert.equal(output.tasks[0].id, "a")
    console.log("  [PASS] task list --tag: filters by tag")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskExplain() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build", group: "build" }),
    "govern.task.json": makeTask({ id: "govern", group: "governance", dependsOn: ["build"] }),
  })
  try {
    const { code, stdout } = await run(["task", "explain", "build"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskExplanation")
    assert.equal(output.task.id, "build")
    assert.deepEqual(output.context.consumers, ["govern"])
    assert.equal(output.context.transitiveDependencyCount, 0)
    assert.equal(output.context.hasCycles, false)
    console.log("  [PASS] task explain: returns task and context")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskExplainUnknown() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build" }),
  })
  try {
    const { code, stdout } = await run(["task", "explain", "missing"], tmpDir)
    assert.notEqual(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.status, "error")
    assert.equal(output.kind, "TaskNotFound")
    console.log("  [PASS] task explain: errors on unknown task")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskGraphJson() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build" }),
    "govern.task.json": makeTask({ id: "govern", dependsOn: ["build"] }),
  })
  try {
    const { code, stdout } = await run(["task", "graph", "--format", "json"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskGraph")
    assert.equal(output.format, "json")
    assert.equal(output.nodes.length, 2)
    assert.ok(output.edges.some((e) => e.from === "govern" && e.to === "build"))
    console.log("  [PASS] task graph --format json: returns nodes and edges")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskGraphDot() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build" }),
  })
  try {
    const { code, stdout } = await run(["task", "graph", "--format", "dot"], tmpDir)
    assert.equal(code, 0)
    assert.ok(stdout.includes("digraph tasks"))
    assert.ok(stdout.includes('"build"'))
    console.log("  [PASS] task graph --format dot: returns DOT output")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskGraphMermaid() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build" }),
  })
  try {
    const { code, stdout } = await run(["task", "graph", "--format", "mermaid"], tmpDir)
    assert.equal(code, 0)
    assert.ok(stdout.includes("flowchart TD"))
    assert.ok(stdout.includes("build"))
    console.log("  [PASS] task graph --format mermaid: returns Mermaid output")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskGraphUnknownFormat() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build" }),
  })
  try {
    const { code, stdout } = await run(["task", "graph", "--format", "xml"], tmpDir)
    assert.notEqual(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.status, "error")
    assert.equal(output.kind, "TaskGraphFormatUnknown")
    console.log("  [PASS] task graph --format xml: errors on unknown format")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskDoctorHealthy() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build", group: "build" }),
    "govern.task.json": makeTask({ id: "govern", group: "governance", dependsOn: ["build"] }),
  })
  try {
    const { code, stdout } = await run(["task", "doctor"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskDoctor")
    assert.equal(output.healthy, true)
    assert.ok(output.checks.some((c) => c.name === "registry-load" && c.ok))
    assert.ok(output.checks.some((c) => c.name === "cycle-detection" && c.ok))
    assert.ok(output.checks.some((c) => c.name === "orphan-tasks" && c.ok))
    console.log("  [PASS] task doctor: reports healthy graph")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskDoctorDetectsCycle() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a", dependsOn: ["b"] }),
    "b.task.json": makeTask({ id: "b", dependsOn: ["a"] }),
  })
  try {
    const { code, stdout } = await run(["task", "doctor"], tmpDir)
    assert.notEqual(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskDoctor")
    assert.equal(output.healthy, false)
    assert.ok(output.checks.some((c) => c.name === "cycle-detection" && !c.ok))
    console.log("  [PASS] task doctor: detects cycles")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskDoctorDetectsOrphan() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build", group: "build" }),
    "orphan.task.json": makeTask({ id: "orphan", group: "documentation" }),
  })
  try {
    const { code, stdout } = await run(["task", "doctor"], tmpDir)
    // Orphans are warnings, not critical failures.
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskDoctor")
    assert.equal(output.healthy, true)
    assert.ok(Array.isArray(output.warnings))
    const orphanCheck = output.checks.find((c) => c.name === "orphan-tasks")
    assert.ok(orphanCheck && !orphanCheck.ok)
    assert.ok(orphanCheck.detail.includes("orphan") || orphanCheck.detail.includes("Orphaned"))
    console.log("  [PASS] task doctor: reports orphaned tasks as warnings")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskDoctorReportsDeprecated() {
  const tmpDir = await setupProject({
    "old.task.json": makeTask({ id: "old", lifecycle: "deprecated" }),
  })
  try {
    const { code, stdout } = await run(["task", "doctor"], tmpDir)
    // Deprecated tasks are informational, not a failure.
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    const deprecatedCheck = output.checks.find((c) => c.name === "deprecated-tasks")
    assert.ok(deprecatedCheck && deprecatedCheck.detail.includes("Deprecated"))
    console.log("  [PASS] task doctor: reports deprecated tasks")
  } finally {
    await teardown(tmpDir)
  }
}

console.log("\n=== Task CLI Tests ===\n")

await testTaskHelp()
await testTaskList()
await testTaskListGroupFilter()
await testTaskListTagFilter()
await testTaskExplain()
await testTaskExplainUnknown()
await testTaskGraphJson()
await testTaskGraphDot()
await testTaskGraphMermaid()
await testTaskGraphUnknownFormat()
await testTaskDoctorHealthy()
await testTaskDoctorDetectsCycle()
await testTaskDoctorDetectsOrphan()
await testTaskDoctorReportsDeprecated()

console.log("\n=== All task CLI tests passed ===\n")
