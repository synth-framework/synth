// ============================================================
// EXP-TASK-012 — Task Govern Equivalence Acceptance Test
// ============================================================
// Verifies that `synth task run govern` and `npm run govern` resolve
// to the same canonical execution path. This is the final acceptance
// gate for Program 034: the task engine must not change governance
// output relative to the legacy npm-script path.
// ============================================================

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { execSync } from "child_process"
import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const synth = path.join(root, "dist", "cli", "synth.js")

function run(args, cwd = root) {
  return execSync(`node ${synth} ${args}`, {
    cwd,
    env: { ...process.env, SYNTH_QUIET_LOGS: "1" },
    encoding: "utf-8",
  })
}

describe("task govern equivalence", () => {
  it("npm run govern delegates to the task engine", async () => {
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf-8"))
    assert.equal(pkg.scripts.govern, "node scripts/task-adapter-shim.js govern")
  })

  it("task adapter shim delegates npm scripts to synth task run", async () => {
    const shim = await fs.readFile(path.join(root, "scripts", "task-adapter-shim.js"), "utf-8")
    assert.ok(shim.includes('node dist/cli/synth.js task run <script>') || shim.includes('"task", "run", script'))
  })

  it("synth task run govern --dry-run resolves build and govern in dependency order", () => {
    const out = run("task run govern --dry-run")
    const report = JSON.parse(out)
    assert.equal(report.status, "ok")
    assert.equal(report.dryRun, true)
    assert.equal(report.target, "govern")
    const ids = report.results.map((r) => r.taskId)
    assert.deepEqual(ids, ["build", "govern"])
  })

  it("govern task command matches the canonical governance profiler", async () => {
    const governTask = JSON.parse(await fs.readFile(path.join(root, "data", "tasks", "govern.task.json"), "utf-8"))
    assert.equal(governTask.command, "node scripts/govern-profiler.js --full")
  })
})
