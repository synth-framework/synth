// ============================================================
// Bootstrap Output Tests
// ============================================================
// Regression guards for EXP-BOOTSTRAP-001:
//   1. Bootstrap emits a JSON result with named stages.
//   2. Diagnostic logs do not appear on stdout.
//   3. Stages have stable identifiers and durations.
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

function parseJson(stdout) {
  try {
    return JSON.parse(stdout.trim())
  } catch (err) {
    throw new Error(`Failed to parse CLI output as JSON: ${stdout}\nError: ${err.message}`)
  }
}

async function tempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

async function testBootstrapDryRunHasStages() {
  const root = await tempDir("synth-bootstrap-dryrun-")
  const { stdout, stderr, status } = runSynth(["bootstrap", root, "--dry-run"])
  assert.equal(status, 0, `bootstrap --dry-run should exit 0, stderr: ${stderr}`)

  // stdout must be valid JSON.
  const output = parseJson(stdout)
  assert.equal(output.status, "pending-approval", "dry-run status should be pending-approval")
  assert.equal(output.kind, "BootstrapPlan", "dry-run kind should be BootstrapPlan")
  assert.ok(Array.isArray(output.stages), "dry-run should have stages array")

  const stageNames = output.stages.map((s) => s.stage)
  assert.ok(stageNames.includes("analyze"), "stages should include analyze")
  assert.ok(stageNames.includes("propose"), "stages should include propose")

  for (const stage of output.stages) {
    assert.ok(stage.stage, "each stage should have a stage identifier")
    assert.ok(stage.description, "each stage should have a description")
    assert.ok(stage.status, "each stage should have a status")
  }

  // stdout should not contain log lines.
  assert.ok(!stdout.includes('"level":"INFO"'), "stdout should not contain INFO logs")
  assert.ok(!stdout.includes('"level":"WARN"'), "stdout should not contain WARN logs")

  console.log("[PASS] bootstrap --dry-run emits structured stages")
}

async function testBootstrapApproveHasStagesAndNextSteps() {
  const root = await tempDir("synth-bootstrap-approve-")
  const { stdout, stderr, status } = runSynth(["bootstrap", root, "--approve"])
  assert.equal(status, 0, `bootstrap --approve should exit 0, stderr: ${stderr}`)

  const output = parseJson(stdout)
  assert.equal(output.status, "ok", "approve status should be ok")
  assert.equal(output.kind, "BootstrapResult", "approve kind should be BootstrapResult")
  assert.ok(Array.isArray(output.stages), "approve should have stages array")
  assert.ok(Array.isArray(output.nextSteps), "approve should have nextSteps array")
  assert.ok(output.nextSteps.length > 0, "nextSteps should not be empty")

  const stageNames = output.stages.map((s) => s.stage)
  assert.ok(stageNames.includes("init"), "stages should include init")

  // Skipped stages should still be reported.
  assert.ok(stageNames.includes("website"), "stages should include website")
  assert.ok(stageNames.includes("example"), "stages should include example")
  assert.ok(stageNames.includes("govern"), "stages should include govern")

  console.log("[PASS] bootstrap --approve emits stages and nextSteps")
}

async function testBootstrapStreamStagesToStderr() {
  const root = await tempDir("synth-bootstrap-stream-")
  const { stdout, stderr, status } = runSynth(["bootstrap", root, "--approve", "--stream-stages"])
  assert.equal(status, 0, `bootstrap --stream-stages should exit 0`)

  const output = parseJson(stdout)
  assert.equal(output.status, "ok", "stream status should be ok")

  // Stage stream events should be on stderr.
  const streamLines = stderr
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .filter((line) => line.includes('"kind":"BootstrapStage"'))
  assert.ok(streamLines.length > 0, "stderr should contain BootstrapStage stream events")

  const firstStage = JSON.parse(streamLines[0])
  assert.equal(firstStage.kind, "BootstrapStage", "stream event kind should be BootstrapStage")
  assert.ok(firstStage.stage, "stream event should have stage")
  assert.ok(firstStage.description, "stream event should have description")

  console.log("[PASS] bootstrap --stream-stages emits stage events to stderr")
}

async function testBootstrapLogsToStderr() {
  const root = await tempDir("synth-bootstrap-logs-")
  const { stdout, stderr } = runSynth(["bootstrap", root, "--approve"])

  // stdout must be a single JSON object.
  parseJson(stdout)

  // stderr should contain bootstrap diagnostic logs.
  assert.ok(stderr.includes("bootstrap"), "stderr should contain bootstrap logs")

  console.log("[PASS] bootstrap diagnostic logs go to stderr")
}

async function main() {
  await testBootstrapDryRunHasStages()
  await testBootstrapApproveHasStagesAndNextSteps()
  await testBootstrapStreamStagesToStderr()
  await testBootstrapLogsToStderr()
  console.log("\nAll bootstrap output tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
