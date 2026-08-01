#!/usr/bin/env node
// ============================================================
// npm SCRIPT ADAPTER CONVERTER (EXP-TASK-005)
// ============================================================
// Rewrites package.json scripts so each one delegates to the canonical
// SYNTH task engine. Scripts that bootstrap the CLI (build) are left
// untouched to avoid a chicken-and-egg problem.
// ============================================================

import fs from "fs/promises"
import path from "path"

const packagePath = path.resolve(process.cwd(), "package.json")

// Scripts that must keep their original command because they bootstrap
// the toolchain or the CLI itself.
const KEEP_ORIGINAL = new Set(["build"])

async function main() {
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
  const scripts = packageJson.scripts || {}

  const converted = []
  const kept = []

  for (const [name, command] of Object.entries(scripts)) {
    if (KEEP_ORIGINAL.has(name)) {
      kept.push(name)
      continue
    }
    scripts[name] = `node scripts/task-adapter-shim.js ${name}`
    converted.push(name)
  }

  await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2) + "\n", "utf-8")

  console.log(JSON.stringify({
    status: "ok",
    kind: "NpmAdapterConversion",
    converted,
    kept,
    total: Object.keys(scripts).length,
  }, null, 2))
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", error: err.message }, null, 2))
  process.exit(1)
})
