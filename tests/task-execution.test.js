// ============================================================
// TASK EXECUTION TESTS (EXP-PROGRAM-034 / TASK-003)
// ============================================================
// Verifies the task runner and execution CLI: run, dry-run,
// affected, and generate.
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
  const tmpDir = path.join("tests", "fixtures", `task-exec-${Date.now()}`)
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

async function testTaskRunExecutesCommand() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a", command: "echo hello-a" }),
  })
  try {
    const { code, stdout } = await run(["task", "run", "a"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskRunReport")
    assert.equal(output.status, "ok")
    assert.equal(output.dryRun, false)
    assert.equal(output.target, "a")
    assert.equal(output.isGroup, false)
    assert.equal(output.results.length, 1)
    assert.equal(output.results[0].taskId, "a")
    assert.equal(output.results[0].status, 0)
    console.log("  [PASS] task run: executes task command")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskRunWithDependencies() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a", command: "echo a" }),
    "b.task.json": makeTask({ id: "b", command: "echo b", dependsOn: ["a"] }),
  })
  try {
    const { code, stdout } = await run(["task", "run", "b"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.results.length, 2)
    assert.equal(output.results[0].taskId, "a")
    assert.equal(output.results[1].taskId, "b")
    console.log("  [PASS] task run: executes dependencies in order")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskRunDryRun() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a" }),
    "b.task.json": makeTask({ id: "b", dependsOn: ["a"] }),
  })
  try {
    const { code, stdout } = await run(["task", "run", "b", "--dry-run"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.dryRun, true)
    assert.equal(output.results.length, 2)
    assert.ok(output.results.every((r) => r.durationMs === 0))
    console.log("  [PASS] task run --dry-run: plans without executing")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskRunFailureStops() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a", command: "exit 0" }),
    "b.task.json": makeTask({ id: "b", command: "exit 1", dependsOn: ["a"] }),
  })
  try {
    const { code, stdout } = await run(["task", "run", "b"], tmpDir)
    assert.notEqual(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.status, "error")
    assert.equal(output.failedTaskId, "b")
    assert.equal(output.results.length, 2)
    console.log("  [PASS] task run: stops on failure")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskRunGroup() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a", group: "runtime", command: "echo a" }),
    "b.task.json": makeTask({ id: "b", group: "runtime", command: "echo b" }),
    "c.task.json": makeTask({ id: "c", group: "build", command: "echo c" }),
  })
  try {
    const { code, stdout } = await run(["task", "run", "runtime", "--dry-run"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.isGroup, true)
    assert.equal(output.results.length, 2)
    console.log("  [PASS] task run <group>: runs group tasks")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskRunUnknownTarget() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a" }),
  })
  try {
    const { code, stdout } = await run(["task", "run", "missing"], tmpDir)
    assert.notEqual(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.status, "error")
    console.log("  [PASS] task run: errors on unknown target")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskRunPrefersTaskOverGroup() {
  const tmpDir = await setupProject({
    "build.task.json": makeTask({ id: "build", group: "build", command: "echo build-task" }),
  })
  try {
    const { code, stdout } = await run(["task", "run", "build", "--dry-run"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.isGroup, false)
    assert.equal(output.results.length, 1)
    console.log("  [PASS] task run: prefers task id over group name")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskAffected() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a" }),
    "b.task.json": makeTask({ id: "b", dependsOn: ["a"] }),
    "c.task.json": makeTask({ id: "c", dependsOn: ["b"] }),
    "d.task.json": makeTask({ id: "d" }),
  })
  try {
    const { code, stdout } = await run(["task", "affected", "--task", "a"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskAffectedList")
    assert.deepEqual(output.changed, ["a"])
    const ids = output.tasks.map((t) => t.id).sort()
    assert.deepEqual(ids, ["a", "b", "c"])
    console.log("  [PASS] task affected: returns transitive downstream tasks")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskAffectedMultiple() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a" }),
    "b.task.json": makeTask({ id: "b", dependsOn: ["a"] }),
    "c.task.json": makeTask({ id: "c", dependsOn: ["a"] }),
  })
  try {
    const { code, stdout } = await run(["task", "affected", "--task", "a", "--task", "b"], tmpDir)
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.deepEqual(output.changed, ["a", "b"])
    const ids = output.tasks.map((t) => t.id).sort()
    assert.deepEqual(ids, ["a", "b", "c"])
    console.log("  [PASS] task affected: accepts multiple --task flags")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskAffectedRequiresTask() {
  const tmpDir = await setupProject({
    "a.task.json": makeTask({ id: "a" }),
  })
  try {
    const { code, stdout } = await run(["task", "affected"], tmpDir)
    assert.notEqual(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.status, "error")
    console.log("  [PASS] task affected: requires --task")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskGenerate() {
  const tmpDir = await setupProject({})
  try {
    const { code, stdout } = await run(
      ["task", "generate", "new-task", "--group", "runtime", "--command", "echo new"],
      tmpDir,
    )
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskGenerated")
    assert.equal(output.id, "new-task")

    const filePath = path.join(tmpDir, "data", "tasks", "new-task.task.json")
    const content = JSON.parse(await fs.readFile(filePath, "utf-8"))
    assert.equal(content.id, "new-task")
    assert.equal(content.group, "runtime")
    assert.equal(content.command, "echo new")
    assert.equal(content.lifecycle, "proposed")
    console.log("  [PASS] task generate: creates task file")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskGenerateRefusesOverwrite() {
  const tmpDir = await setupProject({
    "existing.task.json": makeTask({ id: "existing" }),
  })
  try {
    const { code, stdout } = await run(
      ["task", "generate", "existing", "--group", "runtime"],
      tmpDir,
    )
    assert.notEqual(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.status, "error")
    assert.equal(output.kind, "TaskAlreadyExists")
    console.log("  [PASS] task generate: refuses overwrite without --force")
  } finally {
    await teardown(tmpDir)
  }
}

async function testTaskGenerateForceOverwrite() {
  const tmpDir = await setupProject({
    "existing.task.json": makeTask({ id: "existing", command: "echo old" }),
  })
  try {
    const { code, stdout } = await run(
      ["task", "generate", "existing", "--group", "runtime", "--command", "echo new", "--force"],
      tmpDir,
    )
    assert.equal(code, 0)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskGenerated")

    const filePath = path.join(tmpDir, "data", "tasks", "existing.task.json")
    const content = JSON.parse(await fs.readFile(filePath, "utf-8"))
    assert.equal(content.command, "echo new")
    console.log("  [PASS] task generate: overwrites with --force")
  } finally {
    await teardown(tmpDir)
  }
}

console.log("\n=== Task Execution Tests ===\n")

await testTaskRunExecutesCommand()
await testTaskRunWithDependencies()
await testTaskRunDryRun()
await testTaskRunFailureStops()
await testTaskRunGroup()
await testTaskRunUnknownTarget()
await testTaskRunPrefersTaskOverGroup()
await testTaskAffected()
await testTaskAffectedMultiple()
await testTaskAffectedRequiresTask()
await testTaskGenerate()
await testTaskGenerateRefusesOverwrite()
await testTaskGenerateForceOverwrite()

console.log("\n=== All task execution tests passed ===\n")
