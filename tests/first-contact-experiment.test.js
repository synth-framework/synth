// ============================================================
// First Contact Experiment Tests
// ============================================================
// Regression guards for EXP-FIRSTCONTACT-010:
//  Phase 1:
//   - CLI telemetry flags merge agent session and reasoning state into output.
//   - The experiment runner produces valid session artifacts.
//   - Canonical scenarios execute without errors and produce scores.
//  Phase 2:
//   - Intent reconstruction log derives model changes from an artifact.
//   - Failure taxonomy classifies canonical misinterpretation patterns.
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import {
  reconstructIntent,
  classifySession,
  buildSessionReport,
} from "../dist/first-contact/experiment.js"
import { repositoryIntroductionScenario } from "../dist/first-contact/scenarios.js"

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

// ------------------------------------------------------------
// Fixture: intent reconstruction log captures model evolution
// ------------------------------------------------------------
function testReconstructIntent() {
  const artifact = {
    schemaVersion: "1.0.0",
    sessionId: "test-session",
    scenarioId: "repository-introduction",
    humanPrompt: "I want to understand this project before making any changes.",
    description: "test",
    cliPath: "node",
    repositoryRoot: "/tmp",
    startedAt: new Date().toISOString(),
    turns: [
      {
        turn: 1,
        command: ["status"],
        intent: "Determine state.",
        agentReasoningState: { understoodAs: "unknown repository", confidence: 0.1, unknowns: ["purpose"] },
        inputs: {},
        outputs: { status: "ok" },
        stateBefore: {},
        stateAfter: {},
        stateChange: {},
        evidenceGenerated: [],
      },
      {
        turn: 2,
        command: ["explain"],
        intent: "Read briefing.",
        agentReasoningState: { understoodAs: "governed project", confidence: 0.5, unknowns: [] },
        inputs: {},
        outputs: { explanation: "..." },
        stateBefore: {},
        stateAfter: {},
        stateChange: {},
        evidenceGenerated: [],
      },
    ],
  }

  const log = reconstructIntent(artifact)
  assert(log.length === 2, "reconstruction should have one entry per turn")
  assert(log[0].understoodAs === "unknown repository", "first entry should preserve initial model")
  assert(log[1].modelDelta?.from === "unknown repository", "second entry should record model delta")
  assert(log[1].modelDelta?.to === "governed project", "delta target should be current model")
  assert(log[1].evidenceConsumed.includes("explanation"), "evidence consumed should list output keys")
  console.log("[PASS] intent reconstruction log captures model evolution")
}

// ------------------------------------------------------------
// Fixture: failure taxonomy classifies canonical patterns
// ------------------------------------------------------------
function testFailureTaxonomy() {
  const ambiguousArtifact = {
    schemaVersion: "1.0.0",
    sessionId: "test-session",
    scenarioId: "ambiguous-request",
    humanPrompt: "Make the app better.",
    description: "test",
    cliPath: "node",
    repositoryRoot: "/tmp",
    startedAt: new Date().toISOString(),
    turns: [
      {
        turn: 1,
        command: ["status"],
        intent: "Check state.",
        agentReasoningState: {
          understoodAs: "ambiguous improvement request",
          confidence: 0.1,
          unknowns: ["target outcome", "user impact", "current limitations", "acceptance criteria"],
        },
        inputs: {},
        outputs: {},
        stateBefore: {},
        stateAfter: {},
        stateChange: {},
        evidenceGenerated: [],
      },
    ],
  }

  const taxonomy = classifySession(ambiguousArtifact)
  assert(taxonomy.some((t) => t.category === "missing-context"), "ambiguous request should be classified as missing-context")

  const wrongModelArtifact = {
    ...ambiguousArtifact,
    scenarioId: "recovering-from-wrong-model",
    turns: [
      {
        turn: 1,
        command: ["status"],
        intent: "Inspect.",
        agentReasoningState: { understoodAs: "existing React Native application", confidence: 0.8, unknowns: [] },
        inputs: {},
        outputs: {},
        stateBefore: {},
        stateAfter: {},
        stateChange: {},
        evidenceGenerated: [],
      },
    ],
  }
  const wrongTaxonomy = classifySession(wrongModelArtifact)
  assert(wrongTaxonomy.some((t) => t.category === "intent-confusion"), "React Native assumption should be intent-confusion")

  const report = buildSessionReport(ambiguousArtifact)
  assert(report.schemaVersion === "1.0.0", "report should have schema version")
  assert(Array.isArray(report.intentReconstruction), "report should include intent reconstruction")
  assert(Array.isArray(report.failureTaxonomy), "report should include failure taxonomy")
  console.log("[PASS] failure taxonomy classifies canonical patterns")
}

async function main() {
  await testCliTelemetryFlags()
  await testRunnerProducesSessionArtifact()
  await testAllScenariosRun()
  testReconstructIntent()
  testFailureTaxonomy()
  console.log("\n[FIRST CONTACT EXPERIMENT] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
