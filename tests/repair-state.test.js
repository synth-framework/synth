// ============================================================
// Repair State Tests — EXP-GOV-025
// ============================================================
// Certifies that `synth repair state` diagnoses canonical-state
// divergences and that `--approve` regenerates derived state by
// recording a REPAIR_ACCEPTED audit event, without hand-editing JSON.
// ============================================================

import fs from "node:fs/promises"
import path from "node:path"
import { runSynth, parseJson, withTempDir } from "./helpers/cli-harness.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

async function readJson(dir, ...segments) {
  const text = await fs.readFile(path.join(dir, ...segments), "utf-8")
  return JSON.parse(text)
}

async function readEventLog(dir) {
  const file = path.join(dir, ".synth", "data", "event-log.jsonl")
  const text = await fs.readFile(file, "utf-8")
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

async function initProject(dir) {
  const { status, stdout } = runSynth(["init", "--name", "Repair State Test"], dir)
  assert(status === 0, `init should succeed: ${stdout}`)
  return parseJson(stdout)
}

async function testNoDivergenceOnHealthyProject() {
  await withTempDir("synth-repair-healthy-", async (dir) => {
    await initProject(dir)

    const { status, stdout } = runSynth(["repair", "state", "--format", "json"], dir)
    assert(status === 0, `dry-run should exit 0: ${stdout}`)
    const report = parseJson(stdout)
    assert(report.kind === "RepairReport", "report kind should be RepairReport")
    assert(report.mode === "dry-run", "mode should be dry-run")
    assert(Array.isArray(report.repairs), "repairs should be an array")
    assert(report.repairs.length === 0, "healthy project should have no repairs")
    assert(report.note && report.note.includes("No canonical-state divergences"), "note should report no divergences")

    console.log("[PASS] repair state reports no divergences on a healthy project")
  })
}

async function testStaleCanonicalStateRepair() {
  await withTempDir("synth-repair-stale-", async (dir) => {
    await initProject(dir)

    const statePath = path.join(dir, ".synth", "data", "canonical-state.json")
    const state = JSON.parse(await fs.readFile(statePath, "utf-8"))
    state.lastEventOffset = Math.max(0, (state.lastEventOffset ?? 1) - 1)
    state.stateHash = "stale-hash"
    await fs.writeFile(statePath, JSON.stringify(state, null, 2))

    const { status, stdout } = runSynth(["repair", "state", "--format", "json"], dir)
    assert(status === 0, `dry-run should exit 0: ${stdout}`)
    const report = parseJson(stdout)
    assert(report.kind === "RepairReport", "report kind should be RepairReport")
    assert(report.repairs.length >= 1, "should propose at least one repair")
    assert(report.repairs.some((r) => r.kind === "state-lags-events"), "should detect state-lags-events")

    const apply = runSynth(["repair", "state", "--approve", "--format", "json"], dir)
    assert(apply.status === 0, `approve should exit 0: ${apply.stdout}`)
    const applyReport = parseJson(apply.stdout)
    assert(applyReport.kind === "RepairReport", "apply report kind should be RepairReport")
    assert(applyReport.mode === "apply", "apply mode should be apply")
    assert(
      applyReport.repairs.every((r) => r.status === "repaired"),
      "every proposed repair should be marked repaired",
    )
    assert(applyReport.remainingDivergences.length === 0, "no divergences should remain after repair")

    const events = await readEventLog(dir)
    assert(events.some((e) => e.type === "REPAIR_ACCEPTED"), "REPAIR_ACCEPTED event should be recorded")

    const afterState = await readJson(dir, ".synth", "data", "canonical-state.json")
    assert(afterState.lastEventOffset === events.length, "repaired state offset should match event count")

    const rerun = runSynth(["repair", "state", "--format", "json"], dir)
    assert(rerun.status === 0, `rerun should exit 0: ${rerun.stdout}`)
    const rerunReport = parseJson(rerun.stdout)
    assert(rerunReport.repairs.length === 0, "rerun should report no further repairs")

    console.log("[PASS] repair state detects and repairs stale canonical-state")
  })
}

async function testHashMismatchRepair() {
  await withTempDir("synth-repair-hash-", async (dir) => {
    await initProject(dir)

    const events = await readEventLog(dir)
    const statePath = path.join(dir, ".synth", "data", "canonical-state.json")
    const state = JSON.parse(await fs.readFile(statePath, "utf-8"))
    state.lastEventOffset = events.length
    state.stateHash = "mismatched-deadbeef"
    await fs.writeFile(statePath, JSON.stringify(state, null, 2))

    const { status, stdout } = runSynth(["repair", "state", "--format", "json"], dir)
    assert(status === 0, `dry-run should exit 0: ${stdout}`)
    const report = parseJson(stdout)
    assert(report.repairs.some((r) => r.kind === "replayed-state-mismatch"), "should detect replayed-state-mismatch")

    const apply = runSynth(["repair", "state", "--approve", "--format", "json"], dir)
    assert(apply.status === 0, `approve should exit 0: ${apply.stdout}`)
    const applyReport = parseJson(apply.stdout)
    assert(applyReport.repairs.every((r) => r.status === "repaired"), "repair should be applied")
    assert(applyReport.remainingDivergences.length === 0, "no divergences should remain")

    const afterState = await readJson(dir, ".synth", "data", "canonical-state.json")
    const afterEvents = await readEventLog(dir)
    assert(afterState.lastEventOffset === afterEvents.length, "state offset should match event count after repair")

    console.log("[PASS] repair state detects and repairs replayed-state-mismatch")
  })
}

async function testUnrepairableDivergenceReportedAsError() {
  await withTempDir("synth-repair-unrepairable-", async (dir) => {
    await initProject(dir)

    // Manufacture a broken decision chain: two genesis records make the
    // decision log unrecoverable through canonical-state regeneration.
    const dataDir = path.join(dir, ".synth", "data")
    const decisions = [
      { schema: "synth-decision-v1", id: "decision-a", type: "MISSION_APPROVAL_REJECTED", draftId: "draft-a", previousHash: "genesis", timestamp: 1 },
      { schema: "synth-decision-v1", id: "decision-b", type: "MISSION_APPROVAL_REJECTED", draftId: "draft-b", previousHash: "genesis", timestamp: 2 },
    ]
    await fs.writeFile(path.join(dataDir, "decisions.jsonl"), decisions.map((d) => JSON.stringify(d)).join("\n") + "\n")

    const { status, stdout } = runSynth(["repair", "state", "--format", "json"], dir)
    assert(status !== 0, "dry-run should exit non-zero when unrepairable divergences exist")
    const report = parseJson(stdout)
    assert(report.kind === "RepairReport", "report kind should be RepairReport")
    assert(report.status === "error", "report status should be error")
    assert(Array.isArray(report.unrepairable), "report should list unrepairable divergences")
    assert(
      report.unrepairable.some((u) => u.kind === "decision-chain-broken"),
      "should report decision-chain-broken as unrepairable",
    )

    console.log("[PASS] repair state reports unrepairable divergences as errors")
  })
}

async function main() {
  await testNoDivergenceOnHealthyProject()
  await testStaleCanonicalStateRepair()
  await testHashMismatchRepair()
  await testUnrepairableDivergenceReportedAsError()
  console.log("\nAll repair-state tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
