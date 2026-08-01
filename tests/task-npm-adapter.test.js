// ============================================================
// npm ADAPTER TESTS (EXP-PROGRAM-034 / TASK-006)
// ============================================================
// Verifies that package.json scripts delegate to the canonical SYNTH
// task engine after the adapter migration.
// ============================================================

import { strict as assert } from "assert"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packagePath = path.resolve(__dirname, "..", "package.json")

async function testScriptsDelegateToTaskEngine() {
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
  const scripts = packageJson.scripts || {}

  const exceptions = new Set(["build"])
  const nonDelegating = []

  for (const [name, command] of Object.entries(scripts)) {
    if (exceptions.has(name)) continue
    const expected = `node scripts/task-adapter-shim.js ${name}`
    if (command !== expected) {
      nonDelegating.push({ name, command })
    }
  }

  assert.deepEqual(nonDelegating, [], `Some npm scripts do not delegate to the task engine`)
  console.log(`  [PASS] npm adapter: all ${Object.keys(scripts).length - exceptions.size} scripts delegate to synth task run`)
}

async function testBuildScriptIsBootstrap() {
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
  const buildCommand = packageJson.scripts?.build
  assert.ok(buildCommand && buildCommand.includes("tsc"), "build script should bootstrap the TypeScript compiler")
  console.log("  [PASS] npm adapter: build script remains a bootstrap command")
}

console.log("\n=== npm Adapter Tests ===\n")

await testScriptsDelegateToTaskEngine()
await testBuildScriptIsBootstrap()

console.log("\n=== All npm adapter tests passed ===\n")
