// ============================================================
// VERIFICATION ENGINE TESTS
// ============================================================
// Regression guards for `synth verify` (EXP-GOV-005).
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { rebuildState } from "../dist/runtime/replay.js"

const CLI_PATH = path.resolve(process.cwd(), "dist", "cli", "synth.js")

function runSynth(args, cwd = process.cwd()) {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 30000,
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

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function writeEventLog(cwd, events) {
  const dataDir = path.join(cwd, "data")
  await fs.mkdir(dataDir, { recursive: true })
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n"
  await fs.writeFile(path.join(dataDir, "event-log.jsonl"), lines, "utf-8")
  const state = rebuildState(events)
  await fs.writeFile(path.join(dataDir, "canonical-state.json"), JSON.stringify(state, null, 2), "utf-8")
}

async function testVerifyUninitializedProject() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-verify-uninitialized-"))
  try {
    const { stdout, status } = runSynth(["verify"], tmpDir)
    assert(status === 0, "verify on uninitialized project should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", `verify status should be ok, got ${output.status}`)
    assert(output.kind === "VerificationReport", "verify should return VerificationReport")
    assert(output.summary.pass === 6, `all six checks should pass on uninitialized project: ${JSON.stringify(output.summary)}`)
    console.log("[PASS] synth verify on uninitialized project")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testVerifyInitializedNoEvents() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-verify-init-noevents-"))
  try {
    const initResult = runSynth(["init", "--name", "Verify Test"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const { stdout, status } = runSynth(["verify"], tmpDir)
    assert(status === 0, "verify on initialized project with no events should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", `verify status should be ok, got ${output.status}`)
    assert(output.summary.pass === 6, `all six checks should pass: ${JSON.stringify(output.summary)}`)
    console.log("[PASS] synth verify on initialized project with no events")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testVerifyValidGraph() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-verify-valid-"))
  try {
    const initResult = runSynth(["init", "--name", "Verify Valid"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const events = [
      { type: "SYSTEM_GENESIS", timestamp: 1, payload: {} },
      {
        type: "MISSION_CREATED",
        timestamp: 2,
        payload: {
          mission: {
            id: "M1",
            name: "Valid Mission",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: 2,
            updatedAt: 2,
          },
        },
      },
      {
        type: "EXPEDITION_CREATED",
        timestamp: 3,
        payload: {
          expedition: {
            id: "E1",
            missionId: "M1",
            name: "Valid Expedition",
            goal: "",
            status: "draft",
            objectives: [],
            discoveries: [],
            decisions: [],
            metadata: {},
            createdAt: 3,
            updatedAt: 3,
          },
        },
      },
      {
        type: "OBJECTIVE_ADDED",
        timestamp: 4,
        payload: {
          objective: {
            id: "O1",
            expeditionId: "E1",
            title: "Valid Objective",
            purpose: "",
            status: "draft",
            metadata: {},
            createdAt: 4,
            updatedAt: 4,
          },
        },
      },
    ]
    await writeEventLog(tmpDir, events)

    const { stdout, status } = runSynth(["verify"], tmpDir)
    assert(status === 0, "verify on valid graph should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", `verify status should be ok, got ${output.status}`)
    assert(output.summary.fail === 0, `no checks should fail: ${JSON.stringify(output.summary)}`)
    const replayCheck = output.checks.find((c) => c.name === "ReplayIntegrity")
    assert(replayCheck && replayCheck.status === "pass", "ReplayIntegrity should pass")
    console.log("[PASS] synth verify on valid mission/expedition/objective graph")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testVerifyBrokenGraph() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-verify-broken-"))
  try {
    const initResult = runSynth(["init", "--name", "Verify Broken"], tmpDir)
    assert(initResult.status === 0, "init should succeed")

    const events = [
      { type: "SYSTEM_GENESIS", timestamp: 1, payload: {} },
      {
        type: "MISSION_CREATED",
        timestamp: 2,
        payload: {
          mission: {
            id: "M1",
            name: "Mission",
            status: "draft",
            expeditions: [],
            metadata: {},
            createdAt: 2,
            updatedAt: 2,
          },
        },
      },
      {
        type: "EXPEDITION_CREATED",
        timestamp: 3,
        payload: {
          expedition: {
            id: "E1",
            missionId: "MISSING",
            name: "Orphan Expedition",
            goal: "",
            status: "draft",
            objectives: [],
            discoveries: [],
            decisions: [],
            metadata: {},
            createdAt: 3,
            updatedAt: 3,
          },
        },
      },
    ]
    await writeEventLog(tmpDir, events)

    const { stdout, status } = runSynth(["verify"], tmpDir)
    assert(status !== 0, "verify on broken graph should exit non-zero")
    const output = parseJson(stdout)
    assert(output.status === "error", `verify status should be error, got ${output.status}`)
    const replayCheck = output.checks.find((c) => c.name === "ReplayIntegrity")
    assert(replayCheck && replayCheck.status === "fail", "ReplayIntegrity should fail for broken graph")
    assert(output.nextStep, "report should include a prescriptive nextStep")
    console.log("[PASS] synth verify detects broken aggregate graph")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testVerifyHelpListsVerify() {
  const { stdout, status } = runSynth(["--help"])
  assert(status === 0, "help should exit 0")
  const output = parseJson(stdout)
  assert(output.commands.some((c) => c.name === "verify"), "help should list verify command")
  console.log("[PASS] synth --help lists verify command")
}

async function main() {
  try {
    await fs.access(CLI_PATH)
  } catch {
    console.error("[SKIP] CLI not built. Run 'npm run build' first.")
    process.exit(0)
  }

  await testVerifyUninitializedProject()
  await testVerifyInitializedNoEvents()
  await testVerifyValidGraph()
  await testVerifyBrokenGraph()
  await testVerifyHelpListsVerify()

  console.log("\n[VERIFY ENGINE] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
