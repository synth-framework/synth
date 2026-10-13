import { makeTempDir } from "./helpers/workspace.js"
// ============================================================
// VERIFICATION ENGINE TESTS
// ============================================================
// Regression guards for `synth verify` (EXP-GOV-005).
// ============================================================

import { spawnSync } from "child_process"
import fs from "fs/promises"
import path from "path"
import os from "os"
import { seedEventLog } from "./helpers/seed-event-log.js"
import { rebuildState } from "../dist/runtime/replay.js"
import { runSynth, parseJson, CLI_PATH } from "./helpers/cli-harness.js"
import { assert } from "./helpers/assert.js"
import { fileURLToPath } from "url"
import { locateEventLog } from "../dist/infra/event-store.js"

async function writeEventLog(cwd, events) {
  // Governed projects created by `synth init` store runtime data under
  // `.synth/data/` (EXP-ENV-013).
  const dataDir = path.join(cwd, ".synth", "data")
  await fs.mkdir(dataDir, { recursive: true })
  // The fixture IS the log. Appending onto a stream that `init` already wrote
  // (a hashed PROJECT_INITIALIZED at timestamp 0) splices unhashed events after
  // a hash chain, and verify correctly reports a chain gap.
  await fs.rm(path.join(dataDir, "event-stream"), { recursive: true, force: true })
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n"
  const seededEvents = lines.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l))
  await seedEventLog(dataDir, seededEvents)
  const state = rebuildState(events)
  await fs.writeFile(path.join(dataDir, "canonical-state.json"), JSON.stringify(state, null, 2), "utf-8")
}

async function testVerifyUninitializedProject() {
  const tmpDir = await makeTempDir("synth-verify-uninitialized-")
  try {
    const { stdout, status } = runSynth(["verify"], tmpDir)
    assert(status === 0, "verify on uninitialized project should exit 0")
    const output = parseJson(stdout)
    assert(output.status === "ok", `verify status should be ok, got ${output.status}`)
    assert(output.kind === "VerificationReport", "verify should return VerificationReport")
    // EXP 2c9c6c62: a project with no event log has nothing to replay, so
    // ReplayIntegrity is skipped - NOT passed. The old behaviour reported
    // pass=6 with the message "replay integrity is vacuously satisfied",
    // which made an unexamined project indistinguishable from a verified one.
    assert(output.summary.pass === 5, `five checks should pass on uninitialized project: ${JSON.stringify(output.summary)}`)
    assert(output.summary.skipped === 1, `ReplayIntegrity should be counted as skipped, not passed: ${JSON.stringify(output.summary)}`)
    assert(output.summary.fail === 0, `nothing should fail: ${JSON.stringify(output.summary)}`)
    const replayCheck = output.checks.find((c) => c.name === "ReplayIntegrity")
    assert(replayCheck && replayCheck.status === "skipped", `ReplayIntegrity should be skipped with no log, got ${replayCheck && replayCheck.status}`)
    assert(replayCheck.skippedReason === "no-event-log", `skipped check must carry a structured reason, got ${replayCheck.skippedReason}`)
    console.log("[PASS] synth verify on uninitialized project reports a skipped replay check")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testVerifyInitializedNoEvents() {
  const tmpDir = await makeTempDir("synth-verify-init-noevents-")
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
  const tmpDir = await makeTempDir("synth-verify-valid-")
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
  const tmpDir = await makeTempDir("synth-verify-broken-")
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

// ============================================================
// Event-log visibility (EXP 2c9c6c62)
// ============================================================
// Three on-disk layouts exist:
//   segmented        <data>/event-stream/partition-<n>/segment-XXXX.jsonl  (current)
//   partitioned-flat <data>/event-stream/partition-<n>.jsonl               (PartitionStore)
//   legacy-file      <data>/event-log.jsonl                                (pre-chunking)
// `synth checkpoint`, `synth doctor` and `synth log` all tested only the
// legacy path, so on any chunked project they reported "No event log present"
// (checkpoint, ok:true - a vacuous green) or "No event log found ... run synth
// init" (log - telling the operator to re-bootstrap a healthy ledger).
// locateEventLog is now the single authority; these tests pin all three
// layouts and the two operator-visible regressions.

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

async function testLocateEventLogAcrossLayouts() {
  const tmpDir = await makeTempDir("synth-locate-layouts-")
  try {
    const data = path.join(tmpDir, ".synth", "data")
    const stream = path.join(data, "event-stream")

    // (4) no log at all
    await fs.mkdir(data, { recursive: true })
    let located = locateEventLog(tmpDir)
    assert(located.present === false, `empty project should not be present: ${JSON.stringify(located)}`)
    assert(located.layout === "none", `empty project layout should be none, got ${located.layout}`)
    assert(located.paths.length === 0, "empty project should report no paths")
    assert(located.legacyPath === path.join(data, "event-log.jsonl"), "legacy path must still be reported so callers can say what they looked for")

    // (3) legacy monolithic file
    await fs.writeFile(path.join(data, "event-log.jsonl"), '{"type":"X"}\n', "utf-8")
    located = locateEventLog(tmpDir)
    assert(located.present === true, "legacy file must count as present")
    assert(located.layout === "legacy-file", `expected legacy-file, got ${located.layout}`)
    assert(located.paths.length === 1 && located.paths[0].endsWith("event-log.jsonl"), `legacy paths: ${JSON.stringify(located.paths)}`)

    // (2) flat per-partition files
    await fs.mkdir(stream, { recursive: true })
    await fs.writeFile(path.join(stream, "partition-1.jsonl"), '{"type":"X"}\n', "utf-8")
    await fs.writeFile(path.join(stream, "partition-0.jsonl"), '{"type":"X"}\n', "utf-8")
    located = locateEventLog(tmpDir)
    assert(located.layout === "partitioned-flat", `expected partitioned-flat, got ${located.layout}`)
    assert(located.paths.length === 2, `expected both partitions, got ${JSON.stringify(located.paths)}`)
    assert(located.paths[0].endsWith("partition-0.jsonl"), "partition paths must be sorted for stable output")

    // (1) segmented partitions - and precedence over the older layouts, which
    // are still on disk here exactly as they are in a migrated project
    const partDir = path.join(stream, "partition-0")
    await fs.mkdir(partDir, { recursive: true })
    await fs.writeFile(path.join(partDir, "segment-0002.jsonl"), '{"type":"X"}\n', "utf-8")
    await fs.writeFile(path.join(partDir, "segment-0001.jsonl"), '{"type":"X"}\n', "utf-8")
    located = locateEventLog(tmpDir)
    assert(located.present === true, "segmented store must be present")
    assert(located.layout === "segmented", `a migrated project must report the layout it reads from, got ${located.layout}`)
    assert(located.paths.length === 2, `expected both segments, got ${JSON.stringify(located.paths)}`)
    assert(located.paths[0].endsWith("segment-0001.jsonl"), "segments must be sorted so offsets are stable")
    assert(located.streamDir === stream, `streamDir should be the chunked store, got ${located.streamDir}`)

    console.log("[PASS] locateEventLog resolves all three layouts, segmented wins precedence")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testLocateEventLogNeverThrows() {
  // A missing project root is a normal state (uninitialized cwd), not an error:
  // the answer is "no log", and the caller decides what that means.
  const located = locateEventLog(path.join(os.tmpdir(), "synth-does-not-exist-" + Date.now()))
  assert(located.present === false, "a nonexistent root must report absent, not throw")
  assert(located.layout === "none", `nonexistent root layout should be none, got ${located.layout}`)
  console.log("[PASS] locateEventLog reports none for an absent project instead of throwing")
}

async function testChunkedLedgerIsVisibleToOperatorVerbs() {
  // `synth init` writes the chunked (segmented) layout, so a freshly
  // initialized project is exactly the case the legacy-path guards got wrong.
  const tmpDir = await makeTempDir("synth-chunked-visible-")
  try {
    const initResult = runSynth(["init", "--name", "Chunked Visibility"], tmpDir)
    assert(initResult.status === 0, `init should succeed: ${initResult.stderr}`)

    const located = locateEventLog(tmpDir)
    assert(located.layout === "segmented", `init should produce the segmented layout, got ${located.layout}`)
    assert(located.present === true, "init should produce a present event log")
    assert(!located.paths.some((p) => p.endsWith("event-log.jsonl")), "the legacy file must not be what init writes")

    // REGRESSION: `synth log` used to answer "No event log found at
    // <legacy path>. Run 'synth init' or 'synth bootstrap' first." here.
    const logResult = runSynth(["log", "--limit", "5"], tmpDir)
    assert(logResult.status === 0, `synth log must succeed on a chunked ledger: ${logResult.stdout}`)
    const logOutput = parseJson(logResult.stdout)
    assert(logOutput.status === "ok", `synth log should find the chunked ledger, got ${logOutput.status}: ${logOutput.error || ""}`)
    assert(logOutput.kind === "EventLogQuery", `expected EventLogQuery, got ${logOutput.kind}`)
    assert(logOutput.layout === "segmented", `synth log must report which layout it read, got ${logOutput.layout}`)
    assert(logOutput.total >= 1, `init writes at least one event, got total=${logOutput.total}`)
    assert(Array.isArray(logOutput.events) && logOutput.events.length >= 1, "synth log must return the events it found")
    assert(logOutput.events[0].offset >= 1, `offsets must be real log positions, got ${logOutput.events[0].offset}`)

    // REGRESSION: `synth checkpoint` used to answer
    // {"ok":true,"detail":"No event log present; replay skipped"} here - a green
    // step that certified nothing.
    // checkpoint exits non-zero when no expedition is executing, which is
    // orthogonal to replay visibility - the report is still emitted, so assert
    // on the replay step rather than the exit code.
    const checkpointResult = runSynth(["checkpoint"], tmpDir)
    const checkpoint = parseJson(checkpointResult.stdout)
    assert(checkpoint.kind === "AgentCheckpoint", `expected an AgentCheckpoint report, got ${checkpoint.kind}`)
    const replayStep = checkpoint.steps && checkpoint.steps.replay
    assert(replayStep, `checkpoint must report a replay step: ${JSON.stringify(Object.keys(checkpoint.steps || {}))}`)
    assert(!/No event log present/i.test(replayStep.detail || ""), `checkpoint must not claim there is no log while ${logOutput.total} events exist: ${replayStep.detail}`)
    assert(/\d+ events/.test(replayStep.detail || ""), `checkpoint must report how many events it replayed: ${replayStep.detail}`)
    assert(replayStep.ok === true, `replay of a fresh ledger should be consistent: ${replayStep.detail}`)

    // REGRESSION: `synth doctor`'s chain check skipped for the same reason.
    const doctorResult = runSynth(["doctor"], tmpDir)
    assert(doctorResult.status === 0, `doctor should succeed: ${doctorResult.stderr}`)
    const doctor = parseJson(doctorResult.stdout)
    const health = doctor.projectHealth || {}
    assert(health.replay && health.replay.ok === true, `doctor replay should pass on a chunked ledger: ${JSON.stringify(health.replay)}`)
    assert(!/No event log present/i.test(health.replay.detail || ""), `doctor must not claim there is no log: ${health.replay.detail}`)
    assert(health.eventChain && health.eventChain.ok === true, `doctor chain check should pass: ${JSON.stringify(health.eventChain)}`)
    assert(/event\(s\) chained/.test(health.eventChain.detail || ""), `doctor must report a real chain count: ${health.eventChain.detail}`)

    // And verification still passes on real evidence, not a vacuous skip.
    const verifyOutput = parseJson(runSynth(["verify"], tmpDir).stdout)
    assert(verifyOutput.summary.skipped === 0, `a project with events must not skip replay: ${JSON.stringify(verifyOutput.summary)}`)
    const replayCheck = verifyOutput.checks.find((c) => c.name === "ReplayIntegrity")
    assert(replayCheck.status === "pass", `ReplayIntegrity should pass on a real ledger, got ${replayCheck.status}`)

    console.log(`[PASS] chunked ledger is visible to log (${logOutput.total} events), checkpoint and doctor`)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testLegacyLayoutStillReads() {
  // A pre-chunking project must keep working: locateEventLog reports it, and
  // `synth log` reads that layout line-by-line so offsets are unchanged.
  const tmpDir = await makeTempDir("synth-legacy-layout-")
  try {
    const data = path.join(tmpDir, ".synth", "data")
    await fs.mkdir(data, { recursive: true })
    const event = {
      type: "PROJECT_INITIALIZED",
      timestamp: 0,
      payload: { name: "Legacy Layout" },
      previousHash: "genesis",
      eventHash: "0".repeat(64),
    }
    await fs.writeFile(path.join(data, "event-log.jsonl"), JSON.stringify(event) + "\n", "utf-8")

    const located = locateEventLog(tmpDir)
    assert(located.layout === "legacy-file", `expected legacy-file, got ${located.layout}`)

    const logOutput = parseJson(runSynth(["log", "--limit", "5"], tmpDir).stdout)
    assert(logOutput.status === "ok", `legacy layout must still be queryable, got ${logOutput.status}: ${logOutput.error || ""}`)
    assert(logOutput.layout === "legacy-file", `synth log should report the legacy layout, got ${logOutput.layout}`)
    assert(logOutput.total === 1, `expected the one legacy event, got ${logOutput.total}`)
    assert(logOutput.events[0].offset === 1, "legacy offsets must be line positions, unchanged")
    console.log("[PASS] legacy single-file layout is still located and still queryable")
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function testNoLegacyOnlyPresenceGuardRemains() {
  // Source-level guard: the bug was a presence test against the legacy path.
  // If that pattern comes back, the operator-visible lies come back with it.
  const src = await fs.readFile(path.join(REPO_ROOT, "src", "cli", "synth.ts"), "utf-8")
  assert(/from "\.\.\/infra\/event-store\.js"/.test(src), "synth.ts must import the event-log authority from infra/event-store.js")
  assert(/locateEventLog\(/.test(src), "synth.ts must consult locateEventLog")
  assert(
    !/const logPath = sdk\.paths\.eventLogFile\(/.test(src),
    "no check may test the legacy monolithic path for existence to decide whether an event log is present (use locateEventLog)",
  )
  // Passing the legacy path INTO infra as a migration source is legitimate and
  // must stay; only presence tests are forbidden.
  assert(/eventLogPath: sdk\.paths\.eventLogFile\(/.test(src), "infra migration input should still name the legacy path")
  console.log("[PASS] no legacy-only event-log presence guard remains in the CLI")
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
  await testLocateEventLogAcrossLayouts()
  await testLocateEventLogNeverThrows()
  await testChunkedLedgerIsVisibleToOperatorVerbs()
  await testLegacyLayoutStillReads()
  await testNoLegacyOnlyPresenceGuardRemains()

  console.log("\n[VERIFY ENGINE] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  process.exit(1)
})
