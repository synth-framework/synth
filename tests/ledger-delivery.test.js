// ============================================================
// LEDGER DELIVERY (ADR-055 §2.6 / rev 2 §R2.1 · AC12)
// ============================================================
// deliver → push the execution branch, record EXPEDITION_DELIVERED.
// seal    → verify the delivered tip is an ancestor of the merge commit, record
//           EXPEDITION_INTEGRATED, clear deliveryPending.
// A seal that cannot be verified (tip outside the merge commit) is refused and
// records nothing — a ceremony is evidence, never an assertion.
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

/**
 * The ledger follows its own branch (ADR-055 §R2.1: one writer, one branch).
 * It is recorded at first inference, so every ceremony after the first lands
 * there — never on whatever branch the operator happens to be standing on.
 */
function ledgerBranch(root) {
  return JSON.parse(fs.readFileSync(path.join(root, ".synth", "data", "ledger.json"), "utf-8")).branch
}

function ledgerHeadMessage(root) {
  return git(root, ["log", "-1", "--format=%s", ledgerBranch(root)])
}

/** Create + approve + start an expedition, returning its id. */
// `status` prints bootstrap log lines before its pretty JSON briefing.
function parseBriefing(stdout) {
  return JSON.parse(stdout.slice(stdout.indexOf('{\n  "status"')))
}

async function runningExpedition(projectDir, missionId) {
  const created = runSynth(
    ["expedition", "create", "--mission", missionId, "--subject", "Delivery Expedition", "--goal", "Prove deliver/seal"],
    projectDir,
  )
  assert.equal(created.status, 0, created.stderr)
  const draftId = parseJson(created.stdout).draftId

  const approved = runSynth(["expedition", "approve", "--draft-id", draftId], projectDir)
  assert.equal(approved.status, 0, approved.stderr)
  const committed = runSynth(["expedition", "commit", "--proposal-id", draftId], projectDir)
  assert.equal(committed.status, 0, committed.stderr)
  const started = runSynth(["expedition", "start", "--id", draftId], projectDir)
  assert.equal(started.status, 0, started.stderr)
  return draftId
}

test("delivery: a completed expedition with no seal reports deliveryPending, then deliver + seal close it", async () => {
  const projectDir = await setupGitBackedProject("synth-delivery-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Delivery Mission",
      purpose: "Host a delivery chain",
      returnGateContext: true,
    })
    const expeditionId = await runningExpedition(projectDir, missionId)

    // Put a real commit on the execution branch so the tip is meaningful.
    const branch = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"])
    fs.writeFileSync(path.join(projectDir, "DELIVERY.md"), "delivery payload\n")
    git(projectDir, ["add", "DELIVERY.md"])
    git(projectDir, ["commit", "-m", "feat: delivery payload"])

    // Finish the expedition locally. It is now *pending* delivery.
    const finished = runSynth(
      ["expedition", "finish", "--id", expeditionId, "--note", "delivery test"],
      projectDir,
    )
    assert.equal(finished.status, 0, finished.stderr)
    const finishedJson = parseJson(finished.stdout)
    assert.equal(finishedJson.deliveryPending, true, "a finished expedition is delivery-pending until sealed")
    assert.match(String(finishedJson.nextStep ?? ""), /expedition deliver/, "the pending state carries the next step")

    const showPending = parseJson(runSynth(["expedition", "show", "--id", expeditionId], projectDir).stdout)
    assert.equal(showPending.delivery.deliveryPending, true)
    assert.equal(showPending.delivery.delivered, false)
    assert.equal(showPending.delivery.integrated, false)

    // Deliver: no remote in this fixture, so record the local delivery. The
    // recorded tip is the branch head *before* the ceremony commit lands.
    const tip = git(projectDir, ["rev-parse", "HEAD"])
    const delivered = runSynth(
      ["expedition", "deliver", "--id", expeditionId, "--no-push", "--branch", branch],
      projectDir,
    )
    assert.equal(delivered.status, 0, delivered.stderr)
    const deliveredJson = parseJson(delivered.stdout)
    assert.equal(deliveredJson.tipCommit, tip, "the delivered tip is the branch head at delivery time")
    assert.equal(deliveredJson.deliveryPending, true, "delivered but not integrated is still pending")
    assert.match(ledgerHeadMessage(projectDir), new RegExp(`^chore\\(synth\\): EXPEDITION_DELIVERED expedition ${expeditionId.slice(0, 8)}`), ledgerHeadMessage(projectDir))

    // Merge the branch the way a real delivery lands (onto a base branch).
    git(projectDir, ["checkout", "-q", "-b", "base"])
    git(projectDir, ["merge", "--no-ff", "-m", `Merge ${branch}`, branch])
    const mergeCommit = git(projectDir, ["rev-parse", "HEAD"])

    // Seal against the merge commit.
    const sealed = runSynth(
      ["expedition", "seal", "--id", expeditionId, "--merge-commit", mergeCommit],
      projectDir,
    )
    assert.equal(sealed.status, 0, sealed.stderr)
    const sealedJson = parseJson(sealed.stdout)
    assert.equal(sealedJson.mergeCommit, mergeCommit)
    assert.equal(sealedJson.deliveryPending, false, "the seal closes the delivery loop")
    assert.match(ledgerHeadMessage(projectDir), new RegExp(`^chore\\(synth\\): EXPEDITION_INTEGRATED expedition ${expeditionId.slice(0, 8)}`), ledgerHeadMessage(projectDir))

    const showSealed = parseJson(runSynth(["expedition", "show", "--id", expeditionId], projectDir).stdout)
    assert.equal(showSealed.delivery.integrated, true)
    assert.equal(showSealed.delivery.deliveryPending, false)
    assert.equal(showSealed.delivery.integration.mergeCommit, mergeCommit)
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("delivery: a seal that does not contain the delivered tip is refused and records nothing", async () => {
  const projectDir = await setupGitBackedProject("synth-delivery-refuse-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Refusal Mission",
      purpose: "Prove seal verification",
      returnGateContext: true,
    })
    const expeditionId = await runningExpedition(projectDir, missionId)

    const branch = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"])
    const payloadBase = git(projectDir, ["rev-parse", "HEAD"])
    fs.writeFileSync(path.join(projectDir, "PAYLOAD.md"), "one\n")
    git(projectDir, ["add", "PAYLOAD.md"])
    git(projectDir, ["commit", "-m", "feat: payload"])

    const delivered = runSynth(["expedition", "deliver", "--id", expeditionId, "--no-push", "--branch", branch], projectDir)
    assert.equal(delivered.status, 0, delivered.stderr)
    const tip = parseJson(delivered.stdout).tipCommit

    // A merge commit that does NOT contain the delivered tip. Built with
    // plumbing (commit-tree) so the operator's working tree — and therefore the
    // delivery record this seal reads — is exactly what a real run would see.
    const rootTree = git(projectDir, ["rev-parse", `${payloadBase}^{tree}`])
    const unrelatedMerge = execFileSync(
      "git",
      ["commit-tree", rootTree, "-p", payloadBase, "-m", "feat: unrelated"],
      { cwd: projectDir, encoding: "utf-8", input: "" },
    ).trim()
    assert.notEqual(unrelatedMerge, tip)
    const headBefore = git(projectDir, ["rev-parse", "HEAD"])

    const refused = runSynth(
      ["expedition", "seal", "--id", expeditionId, "--merge-commit", unrelatedMerge],
      projectDir,
    )
    assert.notEqual(refused.status, 0, "an unverifiable seal must fail")
    const refusal = parseJson(refused.stdout)
    assert.equal(refusal.kind, "ExpeditionSealRefused")
    assert.match(refusal.error, /does not contain the delivered tip/)
    assert.equal(git(projectDir, ["rev-parse", "HEAD"]), headBefore, "a refused seal must not move HEAD")

    const show = parseJson(runSynth(["expedition", "show", "--id", expeditionId], projectDir).stdout)
    assert.equal(show.delivery.integrated, false, "a refused seal records no integration")
    assert.equal(show.delivery.record.tipCommit, tip)

    // The delivered tip still records correctly when the merge really contains it.
    git(projectDir, ["checkout", "-q", "-b", "real-base", payloadBase])
    git(projectDir, ["merge", "--no-ff", "-q", "-m", "Merge payload", branch])
    const realMerge = git(projectDir, ["rev-parse", "HEAD"])
    const sealed = runSynth(["expedition", "seal", "--id", expeditionId, "--merge-commit", realMerge], projectDir)
    assert.equal(sealed.status, 0, sealed.stderr)
    assert.equal(parseJson(sealed.stdout).deliveryPending, false)
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("delivery: --dry-run previews the push without touching the ledger", async () => {
  const projectDir = await setupGitBackedProject("synth-delivery-dry-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Dry Mission",
      purpose: "Prove dry-run",
      returnGateContext: true,
    })
    const expeditionId = await runningExpedition(projectDir, missionId)
    const headBefore = git(projectDir, ["rev-parse", "HEAD"])

    const branch = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"])
    const preview = runSynth(["expedition", "deliver", "--id", expeditionId, "--dry-run", "--branch", branch], projectDir)
    assert.equal(preview.status, 0, preview.stderr)
    const previewJson = parseJson(preview.stdout)
    assert.equal(previewJson.kind, "ExpeditionDeliverDryRun")
    assert.equal(previewJson.expeditionId, expeditionId)
    assert.ok(previewJson.tipCommit, "the preview resolves the tip")
    assert.equal(git(projectDir, ["rev-parse", "HEAD"]), headBefore, "dry-run writes no commit")

    const show = parseJson(runSynth(["expedition", "show", "--id", expeditionId], projectDir).stdout)
    assert.equal(show.delivery.delivered, false, "dry-run records no delivery")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})

test("status: a finished expedition warns it is undelivered, then delivered-but-unsealed, and clears once sealed", async () => {
  const projectDir = await setupGitBackedProject("synth-delivery-status-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Delivery Status Mission",
      purpose: "Warn until sealed",
      returnGateContext: true,
    })
    const expeditionId = await runningExpedition(projectDir, missionId, "Status Delivery Expedition")
    const branch = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"])
    fs.writeFileSync(path.join(projectDir, "STATUS.md"), "status payload\n")
    git(projectDir, ["add", "STATUS.md"])
    git(projectDir, ["commit", "-m", "feat: status payload"])

    const deliveryWarnings = () =>
      parseBriefing(runSynth(["status"], projectDir).stdout).warnings.filter((w) => w.kind === "delivery-pending")

    const finished = runSynth(["expedition", "finish", "--id", expeditionId, "--note", "status test"], projectDir)
    assert.equal(finished.status, 0, finished.stderr)
    let warned = deliveryWarnings()
    assert.equal(warned.length, 1, "a finished, undelivered expedition warns")
    assert.ok(warned[0].description.includes("not delivered"), warned[0].description)
    assert.ok(warned[0].remediation.includes(`expedition deliver --id ${expeditionId}`), warned[0].remediation)

    const delivered = runSynth(["expedition", "deliver", "--id", expeditionId, "--no-push", "--branch", branch], projectDir)
    assert.equal(delivered.status, 0, delivered.stderr)
    warned = deliveryWarnings()
    assert.equal(warned.length, 1, "delivered but unmerged is still pending")
    assert.ok(warned[0].description.includes("delivered from"), warned[0].description)
    assert.ok(!warned[0].description.includes("not delivered"), "it is delivered, so the wording must say so")

    git(projectDir, ["checkout", "-q", "-b", "base"])
    git(projectDir, ["merge", "--no-ff", "-m", `Merge ${branch}`, branch])
    const mergeCommit = git(projectDir, ["rev-parse", "HEAD"])
    const sealed = runSynth(["expedition", "seal", "--id", expeditionId, "--merge-commit", mergeCommit], projectDir)
    assert.equal(sealed.status, 0, sealed.stderr)

    assert.equal(deliveryWarnings().length, 0, "a sealed expedition no longer warns")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})
