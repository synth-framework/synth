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
import { makeTempDirSync } from "./helpers/workspace.js"
import {
  isShallowRepository,
  lastBranchCreatedBranch,
  resolveDeliveryBranch,
  resolveIntegrationCandidate,
  verifySeal,
} from "../dist/ledger/delivery.js"

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

// ============================================================
// THE DULL INBOX — `status` prints commands that work when pasted
// ============================================================
// A fresh clone must not need three queries (status, show, and a grep of the
// event stream for EXPEDITION_BRANCH_CREATED) to assemble two commands, and a
// shallow clone must not report a true ancestry as a false refusal. These tests
// pin the resolution order, the shallow hint, and the shape of the warning.
// ============================================================

/** A throwaway git repo on `main` with two commits, for the resolution tests. */
function makeDeliveryRepo(prefix = "synth-delivery-unit-") {
  const root = makeTempDirSync(prefix)
  fs.writeFileSync(path.join(root, "README.md"), "# fixture\n")
  execFileSync("git", ["init", "-b", "main", root], { stdio: "pipe" })
  git(root, ["config", "user.email", "delivery@test"])
  git(root, ["config", "user.name", "Delivery Test"])
  git(root, ["add", "-A"])
  git(root, ["commit", "-m", "c1"])
  const first = git(root, ["rev-parse", "HEAD"])
  fs.writeFileSync(path.join(root, "SECOND.md"), "second\n")
  git(root, ["add", "-A"])
  git(root, ["commit", "-m", "c2"])
  return { root, first, second: git(root, ["rev-parse", "HEAD"]) }
}

test("delivery: verifySeal names a shallow clone and the fetch that fixes it", () => {
  const { root, first, second } = makeDeliveryRepo()
  const parentDir = makeTempDirSync("synth-delivery-shallow-")
  const clone = path.join(parentDir, "clone")
  try {
    execFileSync("git", ["clone", "--depth", "1", `file://${root}`, clone], { stdio: "pipe" })
    assert.equal(isShallowRepository(clone), true, "the depth-1 clone is shallow")
    assert.equal(isShallowRepository(root), false, "the source repo is not")

    // The parent commit is absent from a depth-1 clone, so the proof cannot be
    // made — and the refusal must say that the clone, not history, is at fault.
    const refused = verifySeal(clone, { tipCommit: first, mergeCommit: second })
    assert.equal(refused.ok, false)
    assert.match(refused.detail, /shallow/i, refused.detail)
    assert.match(refused.hint, /git fetch origin main --unshallow/)

    // The same proof succeeds in the full clone.
    const full = verifySeal(root, { tipCommit: first, mergeCommit: second })
    assert.equal(full.ok, true, full.detail)
    assert.equal(full.hint, undefined)

    // The hint is the fix: deepen, and the shallow clone proves it too.
    execFileSync("git", ["fetch", "--deepen=1"], { cwd: clone, stdio: "pipe" })
    const deepened = verifySeal(clone, { tipCommit: first, mergeCommit: second })
    assert.equal(deepened.ok, true, deepened.detail)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
    fs.rmSync(parentDir, { recursive: true, force: true })
  }
})

test("delivery: resolveDeliveryBranch falls back from the record to the event to a remote ref", () => {
  const { root } = makeDeliveryRepo()
  const expeditionId = "abc12345deadbeef"
  const branchName = "expedition/m1/revisit-testing-abc12345"
  try {
    git(root, ["branch", branchName])
    const tip = git(root, ["rev-parse", branchName])
    const events = [
      { type: "EXPEDITION_BRANCH_CREATED", timestamp: 5, payload: { expeditionId, branch: "expedition/m1/older-abc12345" } },
      { type: "EXPEDITION_BRANCH_CREATED", timestamp: 9, payload: { expeditionId, branch: branchName } },
      { type: "EXPEDITION_CREATED", timestamp: 3, payload: { expedition: { id: expeditionId } } },
    ]

    // The newest branch-created event wins; other event types are ignored.
    assert.equal(lastBranchCreatedBranch(events, expeditionId), branchName)
    assert.equal(lastBranchCreatedBranch(events, "ffffffffffffffff"), undefined)

    // 1. A recorded binding beats the event.
    const bound = resolveDeliveryBranch(root, { expeditionId, executionBranch: "main", events })
    assert.equal(bound.branch, "main")
    assert.equal(bound.source, "executionBranch")

    // 2. No binding: the ledger's branch-created event supplies the name — the
    //    case that used to fail with NoExecutionBranch.
    const fromEvent = resolveDeliveryBranch(root, { expeditionId, events })
    assert.equal(fromEvent.branch, branchName)
    assert.equal(fromEvent.source, "branchCreatedEvent")
    assert.equal(fromEvent.tipCommit, tip)

    // 3. Neither: a remote ref naming the expedition.
    git(root, ["update-ref", `refs/remotes/origin/${branchName}`, tip])
    const fromRemote = resolveDeliveryBranch(root, { expeditionId })
    assert.equal(fromRemote.source, "remoteScan")
    assert.equal(fromRemote.tipCommit, tip)

    // 4. A recorded name this clone cannot resolve loses to one that can: the
    //    point is a command that works, not fidelity to a stale binding.
    const staleBinding = resolveDeliveryBranch(root, { expeditionId, executionBranch: "merged-and-deleted" })
    assert.equal(staleBinding.branch, `origin/${branchName}`)
    assert.equal(staleBinding.source, "remoteScan")
    assert.equal(staleBinding.canonicalBranch, branchName, "the canonical name survives the origin/ form")

    // A name nothing in this clone resolves is reported with the fetch that
    // would fix it — never printed as a command that would fail.
    const missing = resolveDeliveryBranch(root, { expeditionId: "beef1234beef1234", executionBranch: "merged-and-deleted" })
    assert.equal(missing.branch, "merged-and-deleted")
    assert.equal(missing.unresolved, "merged-and-deleted")
    assert.equal(missing.fetchHint, "git fetch origin merged-and-deleted")
    assert.equal(missing.tipCommit, undefined)

    // Nothing known at all: no branch is invented.
    assert.deepEqual(resolveDeliveryBranch(root, { expeditionId: "0000000000000000" }), {})
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("delivery: resolveIntegrationCandidate names the base head that contains the tip, and nothing otherwise", () => {
  const { root } = makeDeliveryRepo()
  try {
    git(root, ["checkout", "-q", "-b", "feat"])
    fs.writeFileSync(path.join(root, "FEAT.md"), "feat\n")
    git(root, ["add", "-A"])
    git(root, ["commit", "-m", "feat: work"])
    const tip = git(root, ["rev-parse", "HEAD"])

    assert.deepEqual(
      resolveIntegrationCandidate(root, { tipCommit: tip, baseBranches: ["main"] }),
      {},
      "main does not contain the tip yet, so nothing is named",
    )
    assert.deepEqual(resolveIntegrationCandidate(root, { baseBranches: ["main"] }), {}, "no tip, no guess")

    git(root, ["checkout", "-q", "main"])
    git(root, ["merge", "--no-ff", "-q", "-m", "Merge feat", "feat"])
    assert.deepEqual(
      resolveIntegrationCandidate(root, { tipCommit: tip, baseBranches: ["main"] }),
      { mergeCommit: git(root, ["rev-parse", "HEAD"]), base: "main" },
    )
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test("status: a pending expedition warns with copy-pasteable commands, and deliver works bare", async () => {
  const projectDir = await setupGitBackedProject("synth-delivery-inbox-")
  try {
    const { missionId } = await createAndApproveMission(projectDir, {
      subject: "Inbox Mission",
      purpose: "Prove status prints working commands",
      returnGateContext: true,
    })
    const branch = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"])

    const created = runSynth(
      ["expedition", "create", "--mission", missionId, "--subject", "Inbox Expedition", "--goal", "Prove the inbox"],
      projectDir,
    )
    assert.equal(created.status, 0, created.stderr)
    const expeditionId = parseJson(created.stdout).draftId
    assert.equal(runSynth(["expedition", "approve", "--draft-id", expeditionId], projectDir).status, 0)

    // Declare the branch (ADR-056) so the record carries it. This is what a
    // fresh session has, and what `deliver --id <id>` needs to work bare.
    const committed = runSynth(
      ["expedition", "commit", "--proposal-id", expeditionId, "--branch", branch, "--no-create"],
      projectDir,
    )
    assert.equal(committed.status, 0, committed.stderr)
    const started = runSynth(["expedition", "start", "--id", expeditionId, "--branch", branch, "--no-create"], projectDir)
    assert.equal(started.status, 0, started.stderr)

    fs.writeFileSync(path.join(projectDir, "INBOX.md"), "inbox payload\n")
    git(projectDir, ["add", "INBOX.md"])
    git(projectDir, ["commit", "-m", "feat: inbox payload"])
    const finished = runSynth(["expedition", "finish", "--id", expeditionId, "--note", "inbox test"], projectDir)
    assert.equal(finished.status, 0, finished.stderr)

    const warning = parseBriefing(runSynth(["status"], projectDir).stdout).warnings.find(
      (w) => w.kind === "delivery-pending",
    )
    assert.ok(warning, "the finished expedition warns")
    assert.ok(Array.isArray(warning.commands), `the warning carries commands, not prose to parse: ${warning.remediation}`)
    assert.equal(warning.commands[0], `synth expedition deliver --id ${expeditionId} --branch ${branch} --no-push`)
    assert.match(warning.commands[1], new RegExp(`^synth expedition seal --id ${expeditionId} --merge-commit \\S+$`))

    // Whatever commit the seal command names must really contain the tip.
    const named = warning.commands[1].split("--merge-commit ")[1]
    if (named !== "<sha>") {
      const contains = (() => {
        try {
          execFileSync("git", ["merge-base", "--is-ancestor", git(projectDir, ["rev-parse", branch]), named], {
            cwd: projectDir,
            stdio: "pipe",
          })
          return true
        } catch {
          return false
        }
      })()
      assert.equal(contains, true, `${named} does not contain the delivered tip`)
    }

    // The printed deliver command works as printed — bare, with no --branch.
    const delivered = runSynth(["expedition", "deliver", "--id", expeditionId, "--no-push"], projectDir)
    assert.equal(delivered.status, 0, delivered.stderr)
    const deliveredJson = parseJson(delivered.stdout)
    assert.equal(deliveredJson.branch, branch)
    assert.equal(deliveredJson.branchSource, "executionBranch")
  } finally {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
})
