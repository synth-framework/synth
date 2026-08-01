// ============================================================
// npm SCRIPT MIGRATION TESTS (EXP-PROGRAM-034 / TASK-011)
// ============================================================
// Verifies that every npm script in package.json has a matching
// canonical task definition in data/tasks/.
// ============================================================

import { strict as assert } from "assert"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { loadTaskRegistry } from "../dist/task/task-registry.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packagePath = path.resolve(__dirname, "..", "package.json")
const tasksDir = path.resolve(__dirname, "..", "data", "tasks")

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9:-]/g, "_")
}

async function testEveryNpmScriptHasTask() {
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
  const scripts = Object.keys(packageJson.scripts || {})
  const registry = await loadTaskRegistry({ dirs: [tasksDir] })

  const missing = []
  for (const name of scripts) {
    const fileName = `${sanitizeFileName(name)}.task.json`
    const filePath = path.join(tasksDir, fileName)
    let hasFile = false
    try {
      await fs.access(filePath)
      hasFile = true
    } catch {
      hasFile = false
    }
    if (!hasFile || !registry.tasks.has(name)) {
      missing.push(name)
    }
  }

  assert.deepEqual(missing, [], `Missing task definitions for npm scripts: ${missing.join(", ")}`)
  console.log(`  [PASS] npm migration: all ${scripts.length} npm scripts have task definitions`)
}

async function testAllTaskFilesAreValid() {
  const registry = await loadTaskRegistry({ dirs: [tasksDir] })
  assert.ok(registry.ids.length >= 139, `Expected at least 139 tasks, got ${registry.ids.length}`)
  console.log(`  [PASS] npm migration: ${registry.ids.length} tasks loaded and validated`)
}

console.log("\n=== npm Script Migration Tests ===\n")

await testEveryNpmScriptHasTask()
await testAllTaskFilesAreValid()

console.log("\n=== All npm migration tests passed ===\n")
