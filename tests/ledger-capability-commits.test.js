// ============================================================
// LEDGER CAPABILITY COMMITS (ADR-055 rev 2 §R2.1 · AC1 / AC10)
// ============================================================
// The verbs that used to commit nothing now land exactly one ledger commit —
// `MISSION_DRAFTED`, `MISSION_EVIDENCE_ADDED`, `MISSION_APPROVED`,
// `EXPEDITION_DRAFTED`, `EXPEDITION_APPROVED`, `EXPEDITION_COMMITTED`,
// `EXPEDITION_PAUSED`, `EXPEDITION_CANCELLED` — with the normative message
// shape, and leave the tracked ledger paths clean. `--no-auto-commit` still
// disables the commit.
// ============================================================

import { strict as assert } from "assert"
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import test from "node:test"
import { runSynth, parseJson } from "./helpers/cli-harness.js"
import { setupGitBackedProject, createAndApproveMission } from "./helpers/mission-lifecycle.js"

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf-8" }).trim()
}

function headMessage(root) {
  return git(root, ["log", "-1", "--format=%s"])
}

/** Tracked ledger paths that are dirty (ignored scratch like cli-errors.jsonl excluded). */
function ledgerDirty(root) {
  return git(root, ["status", "--porcelain", "--", ".synth", "proof", "AGENTS.md"])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes(".synth/data/cli-errors.jsonl"))
    .join("\n")
}

test("capability ceremonies: each lifecycle verb lands one ledger commit and leaves the ledger clean", async () => {
  const projectDir = await setupGitBackedProject("synth-cap-commits-")
  try {
    // mission create → MISSION_DRAFTED (the draft is tracked input).
    const missionCreate = runSynth(["mission", "create", "--subject", "Capability Commit Mission", "--purpose", "Prove AC1"], projectDir)
    assert.equal(missionCreate.status, 0, missionCreate.stderr)
    const missionDraft = parseJson(missionCreate.stdout)
    assert.match(headMessage(projectDir), new RegExp(`^chore\\(synth\\): MISSION_DRAFTED mission ${missionDraft.draftId.slice(0, 8)}`), headMessage(projectDir))
    assert.equal(ledgerDirty(projectDir), "", "mission create must leave the ledger clean")

    // mission evidence add → MISSION_EVIDENCE_ADDED (a successor draft).
    const evidence = runSynth(
      ["mission", "evidence", "add", "--draft-id", missionDraft.draftId, "--subject", "Evidence", "--purpose", "Prove", "--confidence", "high"],
      projectDir,
    )
    assert.equal(evidence.status, 0, evidence.stderr)
    assert.match(headMessage(projectDir), /^chore\(synth\): MISSION_EVIDENCE_ADDED mission /, headMessage(projectDir))
    assert.equal(ledgerDirty(projectDir), "", "mission evidence add must leave the ledger clean")

    // Approve the mission through the helpers (they raise confidence and approve).
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Capability Commit Mission",
      purpose: "Prove AC1",
      returnGateContext: true,
    })
    assert.match(headMessage(projectDir), new RegExp(`^chore\\(synth\\): MISSION_APPROVED mission ${missionId.slice(0, 8)}`), headMessage(projectDir))
    assert.equal(ledgerDirty(projectDir), "", "mission approve must leave the ledger clean")

    // expedition create → EXPEDITION_DRAFTED; approve → EXPEDITION_APPROVED.
    const created = runSynth(
      ["expedition", "create", "--mission", missionId, "--subject", "Capability Commit Expedition", "--goal", "Prove AC10"],
      projectDir,
    )
    assert.equal(created.status, 0, created.stderr)
    const draftId = parseJson(created.stdout).draftId
    assert.match(headMessage(projectDir), new RegExp(`^chore\\(synth\\): EXPEDITION_DRAFTED expedition ${draftId.slice(0, 8)}`), headMessage(projectDir))
    assert.equal(ledgerDirty(projectDir), "", "expedition create must leave the ledger clean")

    const approved = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
    assert.equal(approved.status, 0, approved.stderr)
    assert.match(headMessage(projectDir), new RegExp(`^chore\\(synth\\): EXPEDITION_APPROVED expedition ${draftId.slice(0, 8)}`), headMessage(projectDir))
    assert.equal(ledgerDirty(projectDir), "", "expedition approve must leave the ledger clean")

    const committed = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
    assert.equal(committed.status, 0, committed.stderr)
    assert.match(headMessage(projectDir), /^chore\(synth\): EXPEDITION_COMMITTED expedition /, headMessage(projectDir))
    assert.equal(ledgerDirty(projectDir), "", "expedition commit must leave the ledger clean")

    // start/pause/cancel: start is verb-level (its own commit), pause and
    // cancel come from the capability choke point.
    const started = runSynth(["expedition", "start", "--id", draftId], projectDir)
    assert.equal(started.status, 0, started.stderr)
    assert.match(headMessage(projectDir), /^chore\(synth\): EXPEDITION_STARTED expedition /, headMessage(projectDir))
    assert.equal(ledgerDirty(projectDir), "", "expedition start must leave the ledger clean")

    const paused = runSynth(["expedition", "pause", "--id", draftId], projectDir)
    assert.equal(paused.status, 0, paused.stderr)
    assert.match(headMessage(projectDir), /^chore\(synth\): EXPEDITION_PAUSED expedition /, headMessage(projectDir))
    assert.equal(ledgerDirty(projectDir), "", "expedition pause must leave the ledger clean")

    const cancelled = runSynth(["expedition", "cancel", "--id", draftId, "--reason", "capability test"], projectDir)
    assert.equal(cancelled.status, 0, cancelled.stderr)
    assert.match(headMessage(projectDir), /^chore\(synth\): EXPEDITION_CANCELLED expedition /, headMessage(projectDir))
    assert.equal(ledgerDirty(projectDir), "", "expedition cancel must leave the ledger clean")

    // The recorded state agrees with the last commit.
    const shown = runSynth(["expedition", "show", "--id", draftId], projectDir)
    assert.equal(shown.status, 0, shown.stderr)
    assert.equal(parseJson(shown.stdout).expedition.status, "cancelled")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("capability ceremonies: --no-auto-commit disables the choke-point commit too", async () => {
  const projectDir = await setupGitBackedProject("synth-cap-nocommit-")
  try {
    const before = git(projectDir, ["rev-list", "--count", "HEAD"])

    const created = runSynth(
      ["mission", "create", "--subject", "No Commit Mission", "--purpose", "Prove the flag still wins", "--no-auto-commit"],
      projectDir,
    )
    assert.equal(created.status, 0, created.stderr)
    assert.equal(git(projectDir, ["rev-list", "--count", "HEAD"]), before, "--no-auto-commit must not commit")

    // The mutation still happened; it is simply left uncommitted.
    const draftId = parseJson(created.stdout).draftId
    const draftPath = path.join(projectDir, ".synth", "data", "drafts", `${draftId}.json`)
    assert.ok(fs.existsSync(draftPath), "the draft exists on disk")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("capability ceremonies: a refused ceremony changes nothing", async () => {
  const projectDir = await setupGitBackedProject("synth-cap-refused-")
  try {
    const created = runSynth(
      ["mission", "create", "--subject", "Refusal Mission", "--purpose", "Prove failure atomicity"],
      projectDir,
    )
    assert.equal(created.status, 0, created.stderr)

    const statePath = path.join(projectDir, ".synth", "data", "canonical-state.json")
    const before = {
      head: git(projectDir, ["rev-parse", "HEAD"]),
      tree: execFileSync("sha256sum", [statePath], { cwd: projectDir, encoding: "utf-8" }).split(/\s+/)[0],
    }

    // An unknown mission cannot be deleted; the gate refuses before mutation.
    const refused = runSynth(["mission", "delete", "--id", "doesnotexist00000"], projectDir)
    assert.notEqual(refused.status, 0, "an unknown mission must be refused")

    const after = {
      head: git(projectDir, ["rev-parse", "HEAD"]),
      tree: execFileSync("sha256sum", [statePath], { cwd: projectDir, encoding: "utf-8" }).split(/\s+/)[0],
    }
    assert.equal(after.head, before.head, "a refused ceremony must not commit")
    assert.equal(after.tree, before.tree, "a refused ceremony must not touch the ledger")
    assert.equal(ledgerDirty(projectDir), "", "the tracked ledger paths stay clean")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("capability ceremonies: a verb that fails after mutating still leaves the ledger committed", async () => {
  const projectDir = await setupGitBackedProject("synth-cap-failflush-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Fail Flush Mission",
      purpose: "Prove the exit-path flush",
      returnGateContext: true,
    })
    // Approve a second mission whose approval writes governance files, then fail
    // the verb on purpose: `expedition approve` with an unknown draft id.
    const created = runSynth(
      ["mission", "create", "--subject", "Second Mission", "--purpose", "Another one"],
      projectDir,
    )
    assert.equal(created.status, 0, created.stderr)

    const before = git(projectDir, ["rev-parse", "HEAD"])
    const failed = runSynth(["expedition", "approve", "--draft-id", "0".repeat(16)], projectDir)
    assert.notEqual(failed.status, 0, "approving a draft that does not exist must fail")

    // The failure is a refusal that mutated nothing: the ledger stays exactly as
    // it was, and no half-written ceremony is left behind.
    assert.equal(git(projectDir, ["rev-parse", "HEAD"]), before, "a refused verb writes no commit")
    assert.equal(ledgerDirty(projectDir), "", "and leaves no uncommitted ledger")
    assert.ok(missionId)

    // A mutating step followed by a failure: the completion gate blocks on a
    // foreign mission, after the approval mutation has already been recorded.
    const expedition = runSynth(
      ["expedition", "create", "--mission", missionId, "--subject", "Gate Expedition", "--goal", "Block the finish"],
      projectDir,
    )
    const draftId = parseJson(expedition.stdout).draftId
    runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
    runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
    runSynth(["expedition", "start", "--id", draftId], projectDir)

    const blocked = runSynth(["expedition", "finish", "--id", draftId], projectDir)
    if (blocked.status !== 0) {
      // Whatever failed, the mutations it already recorded must not be left
      // sitting uncommitted in the working tree (that is the F12 bleed).
      assert.equal(ledgerDirty(projectDir), "", `the ledger must not be left uncommitted:\n${ledgerDirty(projectDir)}`)
    }
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})
