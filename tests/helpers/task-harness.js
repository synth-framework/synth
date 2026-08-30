// ============================================================
// TEST HELPERS — Task CLI/test harness
// ============================================================
// Shared harness for the TASK-003 / TASK-007 test suites
// (task-cli, task-execution, task-ci-adapter). Replaces the
// per-file copies of `run`, `makeTask`, `setupProject`, `teardown`
// and `CLI_PATH` (see dedupe follow-up: task-* clone group).
//
// Usage:
//   import { run, makeTask, setupProject, teardown, CLI_PATH } from "./helpers/task-harness.js"
// ============================================================

import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const CLI_PATH = path.resolve(__dirname, "..", "..", "dist", "cli", "synth.js")

/** Spawn the built SYNTH CLI and resolve { code, stdout, stderr }. */
export function run(args, cwd) {
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

/** Build a canonical task fixture, overridable per test. */
export function makeTask(overrides = {}) {
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

/** Create a tasks fixture project under tests/fixtures and return its dir. */
export async function setupProject(tasks, prefix = "task-harness-") {
  const tmpDir = path.join("tests", "fixtures", `${prefix}${Date.now()}`)
  const tasksDir = path.join(tmpDir, "data", "tasks")
  await fs.mkdir(tasksDir, { recursive: true })
  for (const [filename, task] of Object.entries(tasks)) {
    await fs.writeFile(path.join(tasksDir, filename), JSON.stringify(task, null, 2))
  }
  return tmpDir
}

/** Remove a project created by setupProject. */
export async function teardown(tmpDir) {
  await fs.rm(tmpDir, { recursive: true, force: true })
}
