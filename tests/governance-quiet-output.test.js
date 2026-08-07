// ============================================================
// EXP-QUIET-001 — Quiet and Summary Output Modes
// ============================================================
// Verifies that --quiet suppresses bootstrap diagnostic logs and
// --summary emits a condensed status/ID/next-step summary.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd) {
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

async function setupProject() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-quiet-output-"))
  await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test", version: "1.0.0" }), "utf-8")
  const bootstrapResult = runSynth(["bootstrap", tmpDir, "--approve"], process.cwd())
  if (bootstrapResult.status !== 0) {
    throw new Error(`bootstrap --approve must exit 0:\n${bootstrapResult.stderr}`)
  }
  return tmpDir
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function main() {
  console.log("Running quiet/summary output tests...")
  const projectDir = await setupProject()
  try {
    // Default status emits JSON with diagnostic INFO logs to stderr.
    const defaultResult = runSynth(["status"], projectDir)
    assert(defaultResult.status === 0, `default status must exit 0: ${defaultResult.stderr}`)
    assert(defaultResult.stdout.trim().startsWith("{"), "default status should emit JSON to stdout")
    assert(defaultResult.stderr.includes('"level":"INFO"'), "default status should emit INFO logs to stderr")

    // --quiet suppresses diagnostic INFO logs to stderr.
    const quietResult = runSynth(["status", "--quiet"], projectDir)
    assert(quietResult.status === 0, `quiet status must exit 0: ${quietResult.stderr}`)
    assert(quietResult.stdout.trim().startsWith("{"), "quiet status should still emit JSON to stdout")
    assert(!quietResult.stderr.includes('"level":"INFO"'), "quiet status should suppress INFO logs to stderr")

    // --summary emits a condensed summary.
    const summaryResult = runSynth(["status", "--summary"], projectDir)
    assert(summaryResult.status === 0, `summary status must exit 0: ${summaryResult.stderr}`)
    assert(!summaryResult.stdout.trim().startsWith("{"), "summary status should not emit JSON to stdout")
    assert(summaryResult.stdout.includes("status:"), "summary status should include status line")
    assert(summaryResult.stdout.includes("kind:"), "summary status should include kind line")

    // --quiet --summary together suppress logs and emit summary.
    const combinedResult = runSynth(["status", "--quiet", "--summary"], projectDir)
    assert(combinedResult.status === 0, `quiet+summary status must exit 0: ${combinedResult.stderr}`)
    assert(!combinedResult.stderr.includes('"level":"INFO"'), "quiet+summary should suppress INFO logs")
    assert(combinedResult.stdout.includes("status:"), "quiet+summary should include status line")

    console.log("[PASS] default status emits JSON and INFO logs")
    console.log("[PASS] --quiet suppresses INFO logs")
    console.log("[PASS] --summary emits condensed summary")
    console.log("[PASS] --quiet --summary work together")
    console.log("\nAll quiet/summary output tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
