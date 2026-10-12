// ============================================================
// LEDGER ABANDONMENT (ADR-055 §2.7 / rev 2 · AC5, record half)
// ============================================================
// Nothing is wiped by default:
//   abandon   → EXPEDITION_ABANDONED on the ledger, tip preserved under
//               refs/synth/abandoned/<id8>, handoff block in the record.
//   --discard → the only deletion path, and deleting is its own recorded
//               ceremony (EXPEDITION_DISCARDED) that may only claim deletions
//               that actually happened.
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

function gitQuiet(root, args) {
  try {
    return { ok: true, out: git(root, args) }
  } catch {
    return { ok: false, out: "" }
  }
}

function ledgerHeadMessage(root) {
  const branch = JSON.parse(fs.readFileSync(path.join(root, ".synth", "data", "ledger.json"), "utf-8")).branch
  return git(root, ["log", "-1", "--format=%s", branch])
}

// `status` prints bootstrap log lines before its pretty JSON briefing.
function parseBriefing(stdout) {
  return JSON.parse(stdout.slice(stdout.indexOf('{\n  "status"')))
}

async function runningExpedition(projectDir, missionId, subject = "Abandonment Expedition") {
  const created = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", subject, "--goal", "Prove abandonment"],
    projectDir,
  )
  assert.equal(created.status, 0, created.stderr)
  const draftId = parseJson(created.stdout).draftId
  for (const cmd of [
    ["expedition", "approve", "--draft-id", draftId],
    ["expedition", "commit", "--proposal-id", draftId],
    ["expedition", "start", "--id", draftId],
  ]) {
    const result = runSynth(cmd, projectDir)
    assert.equal(result.status, 0, `${cmd.join(" ")}: ${result.stdout}`)
  }
  return draftId
}

test("abandon: records the handoff, preserves the tip under the recovery ref, deletes nothing", async () => {
  const projectDir = await setupGitBackedProject("synth-abandon-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Abandonment Mission",
      purpose: "Host abandonment",
      returnGateContext: true,
    })
    const expeditionId = await runningExpedition(projectDir, missionId)
    const branch = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"])

    fs.writeFileSync(path.join(projectDir, "WIP.md"), "half-finished work\n")
    git(projectDir, ["add", "WIP.md"])
    git(projectDir, ["commit", "-m", "wip: half-finished"])
    const tip = git(projectDir, ["rev-parse", "HEAD"])

    const abandoned = runSynth(
      ["expedition", "abandon", "--id", expeditionId, "--reason", "superseded by the new plan", "--branch", branch],
      projectDir,
    )
    assert.equal(abandoned.status, 0, abandoned.stderr)
    const abandonedJson = parseJson(abandoned.stdout)
    assert.equal(abandonedJson.kind, "ExpeditionAbandoned")
    assert.equal(abandonedJson.tipCommit, tip)
    assert.ok(
      ledgerHeadMessage(projectDir).startsWith(`chore(synth): EXPEDITION_ABANDONED expedition ${expeditionId.slice(0, 8)}`),
      ledgerHeadMessage(projectDir),
    )

    // 1. The recovery ref exists and points at the abandoned tip.
    const ref = `refs/synth/abandoned/${expeditionId.slice(0, 8)}`
    const refValue = gitQuiet(projectDir, ["rev-parse", ref])
    assert.ok(refValue.ok, `the recovery ref ${ref} must exist`)
    const tagObject = git(projectDir, ["cat-file", "-t", refValue.out])
    assert.equal(tagObject, "tag", "the recovery ref points at an annotated tag object carrying the reason")
    assert.match(git(projectDir, ["cat-file", "-p", refValue.out]), /superseded by the new plan/)
    // peeling it yields the abandoned tip
    assert.equal(git(projectDir, ["rev-parse", `${ref}^{commit}`]), tip)

    // 2. Nothing was deleted: branch and working tree are intact.
    assert.ok(gitQuiet(projectDir, ["rev-parse", "--verify", `refs/heads/${branch}`]).ok, "the branch survives")
    assert.ok(fs.existsSync(path.join(projectDir, "WIP.md")), "the work survives")

    // 3. The handoff block is in the record and printed by show.
    const show = parseJson(runSynth(["expedition", "show", "--id", expeditionId], projectDir).stdout)
    assert.equal(show.expedition.status, "cancelled", "abandonment lands the terminal state")
    assert.equal(show.handoff.reason, "superseded by the new plan")
    assert.equal(show.handoff.tipCommit, tip)
    assert.equal(show.handoff.delivered, false)
    assert.equal(show.handoff.merged, false)
    assert.equal(show.handoff.discarded, undefined, "nothing was discarded")

    // 4. Abandoning again is refused — the record is already there.
    const again = runSynth(
      ["expedition", "abandon", "--id", expeditionId, "--reason", "again", "--branch", branch],
      projectDir,
    )
    assert.notEqual(again.status, 0, "a second abandonment must be refused")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("abandon --discard: deleting is recorded, and the record only claims deletions that happened", async () => {
  const projectDir = await setupGitBackedProject("synth-abandon-discard-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Discard Mission",
      purpose: "Host discard",
      returnGateContext: true,
    })
    const expeditionId = await runningExpedition(projectDir, missionId, "Discard Expedition")
    const currentBranch = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"])

    // A throwaway branch we can afford to lose — the branch we are standing on
    // must never be deleted.
    git(projectDir, ["checkout", "-q", "-b", "throwaway/wip"])
    fs.writeFileSync(path.join(projectDir, "WIP.md"), "doomed work\n")
    git(projectDir, ["add", "WIP.md"])
    git(projectDir, ["commit", "-m", "wip: doomed"])
    const tip = git(projectDir, ["rev-parse", "HEAD"])
    git(projectDir, ["checkout", "-q", currentBranch])

    const ref = `refs/synth/abandoned/${expeditionId.slice(0, 8)}`

    const abandoned = runSynth(
      ["expedition", "abandon", "--id", expeditionId, "--reason", "walking away", "--branch", "throwaway/wip"],
      projectDir,
    )
    assert.equal(abandoned.status, 0, abandoned.stderr)
    assert.ok(gitQuiet(projectDir, ["rev-parse", ref]).ok, "the tip is preserved before any discard")

    // Nothing deleted yet, and the record says so.
    let record = JSON.parse(
      fs.readFileSync(path.join(projectDir, ".synth", "data", "expeditions", `${expeditionId}.json`), "utf-8"),
    )
    assert.equal(record.metadata.abandonment.discarded, undefined, "no discard is recorded until one happens")
    assert.equal(record.metadata.abandonment.tipCommit, tip)
    assert.ok(gitQuiet(projectDir, ["rev-parse", "--verify", "refs/heads/throwaway/wip"]).ok, "the branch is still there")

    // Now the deletion, as the second half of the same verb: an already
    // abandoned expedition may still be discarded, and the deletion is its own
    // recorded ceremony.
    const discarded = runSynth(
      ["expedition", "abandon", "--id", expeditionId, "--reason", "walking away", "--branch", "throwaway/wip", "--discard"],
      projectDir,
    )
    assert.equal(discarded.status, 0, discarded.stdout)
    const discardedJson = parseJson(discarded.stdout)
    assert.equal(discardedJson.kind, "ExpeditionDiscarded")
    assert.deepEqual(discardedJson.discarded, ["branch throwaway/wip", ref])
    assert.ok(
      ledgerHeadMessage(projectDir).startsWith(`chore(synth): EXPEDITION_DISCARDED expedition ${expeditionId.slice(0, 8)}`),
      ledgerHeadMessage(projectDir),
    )

    assert.equal(gitQuiet(projectDir, ["rev-parse", "--verify", "refs/heads/throwaway/wip"]).ok, false, "the branch is gone")
    assert.equal(gitQuiet(projectDir, ["rev-parse", ref]).ok, false, "the recovery ref is gone")
    assert.equal(gitQuiet(projectDir, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]).ok, false)

    record = JSON.parse(
      fs.readFileSync(path.join(projectDir, ".synth", "data", "expeditions", `${expeditionId}.json`), "utf-8"),
    )
    assert.equal(record.metadata.abandonment.discarded, true, "the record says the deletion happened")
    assert.deepEqual(record.metadata.abandonment.deleted, ["branch throwaway/wip", ref])

    const show = parseJson(runSynth(["expedition", "show", "--id", expeditionId], projectDir).stdout)
    assert.equal(show.handoff.discarded, true)
    assert.equal(show.handoff.tipCommit, tip, "the handoff keeps the tip it recorded, deleted or not")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("abandon: a missing reason is refused, and the ledger is untouched", async () => {
  const projectDir = await setupGitBackedProject("synth-abandon-noreason-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "No Reason Mission",
      purpose: "Prove the reason requirement",
      returnGateContext: true,
    })
    const expeditionId = await runningExpedition(projectDir, missionId, "No Reason Expedition")
    const headBefore = git(projectDir, ["rev-parse", "HEAD"])

    const refused = runSynth(["expedition", "abandon", "--id", expeditionId], projectDir)
    assert.notEqual(refused.status, 0, "abandon without a reason must be refused")

    assert.equal(git(projectDir, ["rev-parse", "HEAD"]), headBefore, "a refused abandon writes no commit")
    const show = parseJson(runSynth(["expedition", "show", "--id", expeditionId], projectDir).stdout)
    assert.equal(show.handoff, undefined, "no handoff block is written")
    assert.notEqual(show.expedition.status, "cancelled")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("status: an abandoned expedition raises a warning until it is discarded, and status never writes", async () => {
  const projectDir = await setupGitBackedProject("synth-abandon-status-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Status Warning Mission",
      purpose: "Surface abandoned work",
      returnGateContext: true,
    })
    const draftId = await runningExpedition(projectDir, missionId, "Warned Expedition")
    const home = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"])

    // The abandoned work lives on its own branch; we stand on `home`.
    git(projectDir, ["checkout", "-q", "-b", "status/wip"])
    fs.writeFileSync(path.join(projectDir, "WIP2.md"), "unfinished\n")
    git(projectDir, ["add", "WIP2.md"])
    git(projectDir, ["commit", "-m", "wip: unfinished"])
    git(projectDir, ["checkout", "-q", home])

    const abandoned = runSynth(
      ["expedition", "abandon", "--id", draftId, "--reason", "scope moved on", "--branch", "status/wip"],
      projectDir,
    )
    assert.equal(abandoned.status, 0, abandoned.stderr)

    const treeBefore = gitQuiet(projectDir, ["status", "--porcelain", "--untracked-files=all"]).out
    const status = runSynth(["status"], projectDir)
    assert.equal(status.status, 0, status.stderr)
    const warned = parseBriefing(status.stdout).warnings.filter((w) => w.kind === "abandoned-expedition")
    assert.equal(warned.length, 1, "exactly one abandonment warning")
    assert.ok(warned[0].description.includes(draftId.slice(0, 8)), "the warning names the expedition")
    assert.ok(warned[0].description.includes("scope moved on"), "the warning carries the reason")
    assert.ok(
      warned[0].description.includes(`refs/synth/abandoned/${draftId.slice(0, 8)}`),
      "the warning says where the work is recoverable",
    )

    // AC7: status is a pure read.
    assert.equal(
      gitQuiet(projectDir, ["status", "--porcelain", "--untracked-files=all"]).out,
      treeBefore,
      "status must not change the working tree",
    )

    const discarded = runSynth(
      ["expedition", "abandon", "--id", draftId, "--reason", "scope moved on", "--branch", "status/wip", "--discard"],
      projectDir,
    )
    assert.equal(discarded.status, 0, discarded.stderr)
    const after = parseBriefing(runSynth(["status"], projectDir).stdout).warnings
    assert.equal(
      after.filter((w) => w.kind === "abandoned-expedition").length,
      0,
      "a discarded expedition has nothing left to act on, so no warning",
    )
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("status: a discard that keeps the branch keeps the warning, because the work is still on it", async () => {
  const projectDir = await setupGitBackedProject("synth-abandon-kept-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Kept Branch Mission",
      purpose: "Keep the warning honest",
      returnGateContext: true,
    })
    const draftId = await runningExpedition(projectDir, missionId, "Kept Expedition")
    const home = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"])
    fs.writeFileSync(path.join(projectDir, "KEEP.md"), "still needed\n")
    git(projectDir, ["add", "KEEP.md"])
    git(projectDir, ["commit", "-m", "wip: still needed"])

    // The branch we stand on: discard refuses to delete it, so the work stays.
    const abandoned = runSynth(
      ["expedition", "abandon", "--id", draftId, "--reason", "park it", "--branch", home],
      projectDir,
    )
    assert.equal(abandoned.status, 0, abandoned.stderr)
    const discarded = runSynth(
      ["expedition", "abandon", "--id", draftId, "--reason", "park it", "--branch", home, "--discard"],
      projectDir,
    )
    assert.equal(discarded.status, 0, discarded.stderr)

    const warned = parseBriefing(runSynth(["status"], projectDir).stdout).warnings.filter(
      (w) => w.kind === "abandoned-expedition",
    )
    assert.equal(warned.length, 1, "the work is still on the branch, so the warning stays")
    assert.ok(warned[0].description.includes(`discard kept branch ${home}`), warned[0].description)
    assert.equal(git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"]), home, "the branch was never deleted")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})
