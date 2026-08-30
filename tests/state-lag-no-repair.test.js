import { makeTempDir } from "./helpers/workspace.js"
// ============================================================
// EXP-STATE-LAG-002 — Dirty-tree completion needs no repair
// ============================================================
// Regression test for the EXP-STATE-LAG-001 fix: completing an
// expedition while the working tree has uncommitted source changes
// used to leave canonical-state.json lagging the event log, which
// forced `synth repair state --approve` before replay would report
// consistent. The fix rebuilds and re-saves canonical state after
// appending snapshot events (src/control/execution-gate.ts), so
// replay must be consistent immediately after completion with NO
// repair step.
//
// The historical force-complete test (tests/governance-complete-
// force.test.js) only proved "consistent after repair". This test
// proves the stronger invariant: consistent without any repair.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { runSynth, parseJson, CLI_PATH, readEventLog } from "./helpers/cli-harness.js"
import { assert } from "./helpers/assert.js"
import { bootstrapProject, createAndApproveMission, createExecutingExpedition } from "./helpers/mission-lifecycle.js"




/** Leave a genuine non-derived, non-governance file uncommitted in the tree. */
async function leaveUncommittedSourceChange(projectDir) {
  await fs.writeFile(path.join(projectDir, "notes.txt"), "uncommitted source note", "utf-8")
}

async function main() {
  console.log("Running state-lag no-repair regression test...")
  const projectDir = await bootstrapProject(await makeTempDir("synth-state-lag-no-repair-"))
  try {
    const missionId = await createAndApproveMission(projectDir, {
      subject: "No Repair Host",
      purpose: "Host no-repair regression test",
    })
    const expeditionId = await createExecutingExpedition(projectDir, missionId, {
      subject: "No Repair Expedition",
      goal: "Exercise dirty-tree completion without repair",
      attachEvidence: true,
    })
    await leaveUncommittedSourceChange(projectDir)

    // --force is required because the pre-completion dirty-tree gate blocks
    // while real source changes are uncommitted. That is the exact scenario
    // EXP-STATE-LAG-002 targets: completion succeeds, but the post-completion
    // git snapshot cannot anchor the dirty tree.
    const completeResult = runSynth(
      ["expedition", "complete", "--id", expeditionId, "--force", "--reason", "Intentionally leave source uncommitted to exercise the snapshot guard (EXP-STATE-LAG-002)"],
      projectDir,
    )
    assert(completeResult.status === 0, `expedition complete --force must exit 0:\n${completeResult.stdout}\n${completeResult.stderr}`)
    const completeOutput = parseJson(completeResult.stdout)
    assert(completeOutput.status === "ok", `complete should report ok, got ${completeOutput.status}`)

    // Prove the residual class was genuinely exercised: the snapshot adapter
    // must have refused to anchor the dirty tree.
    const events = await readEventLog(projectDir)
    const snapshotFailed = events.some((e) => e.type === "GOVERNANCE_SNAPSHOT_FAILED")
    assert(snapshotFailed, "expected a GOVERNANCE_SNAPSHOT_FAILED event while the tree has uncommitted source changes")

    // THE regression assertion: replay must be consistent with NO repair step.
    const explainResult = runSynth(["explain", "replay"], projectDir)
    assert(explainResult.status === 0, `explain replay must exit 0:\n${explainResult.stderr}`)
    const explainOutput = parseJson(explainResult.stdout)
    assert(explainOutput.consistent === true, `replay should be consistent WITHOUT repair, got ${JSON.stringify(explainOutput)}`)

    console.log("[PASS] dirty-tree completion leaves replay consistent with no repair needed")
    console.log("\nAll state-lag no-repair tests passed.")
  } finally {
    await fs.rm(projectDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})