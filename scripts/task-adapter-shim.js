#!/usr/bin/env node
// ============================================================
// TASK ADAPTER SHIM (EXP-TASK-005)
// ============================================================
// Bootstraps the SYNTH CLI if dist/ is missing, then delegates to
// 'node dist/cli/synth.js task run <script>'. This lets CI run
// 'npm run govern' after a fresh 'npm ci' without a chicken-and-egg
// problem.
// ============================================================

import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cliPath = path.resolve(__dirname, "..", "dist", "cli", "synth.js")

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32",
    })
    child.on("close", (code) => resolve(code ?? 1))
  })
}

async function main() {
  const script = process.argv[2]
  if (!script) {
    console.error("Usage: node scripts/task-adapter-shim.js <npm-script-name>")
    process.exit(1)
  }

  let hasCli = false
  try {
    await fs.access(cliPath)
    hasCli = true
  } catch {
    hasCli = false
  }

  if (!hasCli) {
    const buildCode = await run("npm", ["run", "build"])
    if (buildCode !== 0) {
      process.exit(buildCode)
    }
  }

  const code = await run("node", [cliPath, "task", "run", script])
  process.exit(code)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
