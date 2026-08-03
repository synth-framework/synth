// ============================================================
// Bootstrap Human-Readable Output Tests
// ============================================================
// Regression guards for EXP-BOOTSTRAP-001:
//   1. synth bootstrap --human prints prose progress.
//   2. Final status and next steps are visible.
// ============================================================

import { strict as assert } from "assert"
import { promises as fs } from "fs"
import os from "os"
import path from "path"
import { spawnSync } from "child_process"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd = process.cwd()) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 60000,
  })
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  }
}

async function tempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

async function testBootstrapHumanOutput() {
  const root = await tempDir("synth-bootstrap-human-")
  const { stdout, stderr, status } = runSynth(["bootstrap", root, "--approve", "--human"])
  assert.equal(status, 0, `bootstrap --human should exit 0, stderr: ${stderr}`)

  assert.ok(stdout.includes("Bootstrapping"), "human output should mention bootstrapping")
  assert.ok(stdout.includes("Status:"), "human output should include status line")
  assert.ok(stdout.includes("Next steps:"), "human output should include next steps")
  assert.ok(stdout.includes("synth status"), "human output should suggest synth status")

  // stdout should not be JSON.
  let parsed
  try {
    parsed = JSON.parse(stdout.trim())
  } catch {
    parsed = undefined
  }
  assert.equal(parsed, undefined, "human output should not be valid JSON")

  console.log("[PASS] bootstrap --human prints prose progress and next steps")
}

async function testBootstrapHumanDryRun() {
  const root = await tempDir("synth-bootstrap-human-dryrun-")
  const { stdout, stderr, status } = runSynth(["bootstrap", root, "--dry-run", "--human"])
  assert.equal(status, 0, `bootstrap --dry-run --human should exit 0, stderr: ${stderr}`)

  assert.ok(stdout.includes("Bootstrapping"), "human dry-run output should mention bootstrapping")
  assert.ok(stdout.includes("Inspect repository structure and history"), "human dry-run output should mention analyze stage description")
  assert.ok(stdout.includes("Generate mission and expedition proposals"), "human dry-run output should mention propose stage description")

  console.log("[PASS] bootstrap --dry-run --human prints prose plan")
}

async function main() {
  await testBootstrapHumanOutput()
  await testBootstrapHumanDryRun()
  console.log("\nAll bootstrap human output tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
