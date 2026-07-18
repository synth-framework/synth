// ============================================================
// First Contact Experiment Tests
// ============================================================
// Regression guards for EXP-FIRSTCONTACT-010 Phase 1:
//  - CLI telemetry flags merge agent session and reasoning state into output.
//  - The experiment runner produces valid session artifacts.
//  - Canonical scenarios execute without errors and produce scores.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")
const RUNNER_PATH = path.resolve(process.cwd(), "scripts", "first-contact-experiment.js")

function runSynth(args, cwd = process.cwd()) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
  })
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

// ------------------------------------------------------------
// Fixture: CLI includes telemetry when agent flags are provided
// ------------------------------------------------------------
async function testCliTelemetryFlags() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-telemetry-"))
  try {
    runSynth(["init", "--name", "Telemetry Test"], tmpDir)

    const reasoning = JSON.stringify({
      understoodAs: "test repository",
      confidence: 0.9,
      unknowns: [],
    })
    const result = runSynth(
      [
        "status",
        "--agent-session",
        "session-telemetry-1",
        "--agent-reasoning-state",
        reasoning,
      ],
      tmpDir,
    )
    assert(result.status === 0, `status should succeed: ${result.stderr}`)

    const output = JSON.parse(result.stdout)
    assert(output.agentSession === "session-telemetry-1", `expected agentSession, got ${output.agentSession}`)
    assert(typeof output.agentReasoningState === "object", "agentReasoningState should be an object")
    assert(output.agentReasoningState.understoodAs === "test repository", "reasoning state should be parsed")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
  console.log("[PASS] CLI includes telemetry when agent flags are provided")
}

// ------------------------------------------------------------
// Fixture: runner produces a session artifact for one scenario
// ------------------------------------------------------------
async function testRunnerProducesSessionArtifact() {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-first-contact-output-"))
  try {
    const result = spawnSync(
      "node",
      [RUNNER_PATH, "--scenario", "repository-introduction", "--output", outputDir],
      {
        cwd: process.cwd(),
        encoding: "utf-8",
        timeout: 60000,
      },
    )
    assert(result.status === 0, `runner should succeed: ${result.stderr}`)

    const summary = JSON.parse(result.stdout)
    assert(summary.status === "ok", `summary status should be ok: ${result.stdout}`)
    assert(summary.results.length === 1, `expected one result, got ${summary.results.length}`)

    const artifactPath = summary.results[0].artifactPath
    assert(typeof artifactPath === "string", "artifactPath should be a string")
    const artifact = JSON.parse(await fs.readFile(artifactPath, "utf-8"))
    assert(artifact.schemaVersion === "1.0.0", `expected schemaVersion 1.0.0, got ${artifact.schemaVersion}`)
    assert(artifact.scenarioId === "repository-introduction", `expected scenarioId repository-introduction, got ${artifact.scenarioId}`)
    assert(artifact.turns.length === 3, `expected 3 turns, got ${artifact.turns.length}`)

    const firstTurn = artifact.turns[0]
    assert(firstTurn.command[0] === "status", `expected first command status, got ${firstTurn.command[0]}`)
    assert(typeof firstTurn.outputs.agentSession === "string", "first turn output should include agentSession")
    assert(typeof firstTurn.outputs.agentReasoningState === "object", "first turn output should include agentReasoningState")
    assert(typeof firstTurn.stateChange === "object", "turn should include stateChange")

    const score = summary.results[0].score
    assert(typeof score.overall === "number", "score should include overall")
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true })
  }
  console.log("[PASS] runner produces a session artifact for repository-introduction")
}

// ------------------------------------------------------------
// Fixture: all canonical scenarios run without error
// ------------------------------------------------------------
async function testAllScenariosRun() {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-first-contact-all-"))
  try {
    const result = spawnSync("node", [RUNNER_PATH, "--all", "--output", outputDir], {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 120000,
    })
    assert(result.status === 0, `runner --all should succeed: ${result.stderr}`)

    const summary = JSON.parse(result.stdout)
    assert(summary.status === "ok", `summary status should be ok`)
    assert(summary.results.length === 4, `expected 4 scenarios, got ${summary.results.length}`)

    for (const item of summary.results) {
      assert(typeof item.score.overall === "number", `scenario ${item.scenarioId} should have a score`)
    }
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true })
  }
  console.log("[PASS] all canonical scenarios run without error")
}

async function main() {
  await testCliTelemetryFlags()
  await testRunnerProducesSessionArtifact()
  await testAllScenariosRun()
  console.log("\n[FIRST CONTACT EXPERIMENT] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
