// ============================================================
// CI ORCHESTRATION ADAPTER TESTS (EXP-PROGRAM-034 / TASK-007)
// ============================================================
// Verifies that GitHub Actions workflows invoke the canonical SYNTH
// task engine directly instead of going through npm script shims.
// ============================================================

import { strict as assert } from "assert"
import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKFLOWS_DIR = path.resolve(__dirname, "..", ".github", "workflows")
const CLI_PATH = path.resolve(__dirname, "..", "dist", "cli", "synth.js")

const ALLOWED_NPM_SCRIPTS = new Set(["build", "ci"])

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

async function loadWorkflowFiles() {
  const entries = await fs.readdir(WORKFLOWS_DIR)
  const ymlFiles = entries.filter((e) => e.endsWith(".yml"))
  const files = {}
  for (const file of ymlFiles) {
    files[file] = await fs.readFile(path.join(WORKFLOWS_DIR, file), "utf-8")
  }
  return files
}

function extractRunCommands(content) {
  const commands = []
  const lines = content.split("\n")
  for (const line of lines) {
    const match = line.match(/^\s*run:\s*(.+)$/)
    if (match) {
      commands.push(match[1].trim())
    }
  }
  return commands
}

async function testWorkflowsDoNotUseNpmScripts() {
  const workflows = await loadWorkflowFiles()
  const violations = []

  for (const [file, content] of Object.entries(workflows)) {
    const commands = extractRunCommands(content)
    for (const command of commands) {
      const npmMatch = command.match(/^npm run\s+(\S+)/)
      if (npmMatch) {
        const script = npmMatch[1]
        if (!ALLOWED_NPM_SCRIPTS.has(script)) {
          violations.push({ file, command, script })
        }
      }
    }
  }

  assert.deepEqual(violations, [], "CI workflows must invoke synth task directly; only npm run build is allowed as a bootstrap")
  console.log(`  [PASS] ci adapter: no non-bootstrap npm run scripts in ${Object.keys(workflows).length} workflow files`)
}

async function testWorkflowsInvokeExistingTasks() {
  const workflows = await loadWorkflowFiles()
  const invokedTasks = new Set()

  for (const content of Object.values(workflows)) {
    const commands = extractRunCommands(content)
    for (const command of commands) {
      const taskMatch = command.match(/node\s+dist\/cli\/synth\.js\s+task\s+run\s+(\S+)/)
      if (taskMatch) {
        invokedTasks.add(taskMatch[1])
      }
    }
  }

  assert.ok(invokedTasks.size > 0, "at least one workflow should invoke synth task run")

  const { code, stdout } = await run(["task", "list", "--format", "json"])
  assert.equal(code, 0, `task list failed: ${stdout}`)
  const output = JSON.parse(stdout)
  assert.equal(output.kind, "TaskList")
  const registeredIds = new Set(output.tasks.map((t) => t.id))

  const missing = []
  for (const id of invokedTasks) {
    if (!registeredIds.has(id)) {
      missing.push(id)
    }
  }

  assert.deepEqual(missing, [], "every task invoked by CI must exist in the task registry")
  console.log(`  [PASS] ci adapter: all ${invokedTasks.size} CI-invoked tasks exist in registry`)
}

async function testRepresentativeCiTasksAreExplainable() {
  const representative = ["govern", "docs:generate", "docs:validate-projections", "docs:check-links", "docs:verify-website-sync"]

  for (const id of representative) {
    const { code, stdout } = await run(["task", "explain", id])
    assert.equal(code, 0, `task explain ${id} failed: ${stdout}`)
    const output = JSON.parse(stdout)
    assert.equal(output.kind, "TaskExplanation")
    assert.equal(output.task.id, id)
  }

  console.log(`  [PASS] ci adapter: ${representative.length} representative CI tasks are explainable via synth task`)
}

console.log("\n=== CI Orchestration Adapter Tests ===\n")

await testWorkflowsDoNotUseNpmScripts()
await testWorkflowsInvokeExistingTasks()
await testRepresentativeCiTasksAreExplainable()

console.log("\n=== All CI adapter tests passed ===\n")
