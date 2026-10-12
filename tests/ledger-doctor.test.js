// ============================================================
// LEDGER DOCTOR (ADR-055 §2.10, AC6 / AC8 / AC13)
// ============================================================
// The four silent-failure classes of the ceremony ledger, each against a real
// temporary repository:
//   1. an uncommitted ceremony         → committed by `doctor --fix` as ONE commit
//   2. a prunable anchor               → pruned and recreated
//   3. the anchor behind the branch    → re-pointed at the branch tip
//   4. a detached checkout             → reported; repair refuses
// Plus the read-only contract: `checkLedger` never writes.
// ============================================================

import { strict as assert } from "assert"
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import test from "node:test"
import { checkLedger, dirtyLedgerPaths, ledgerBranch, repairLedger } from "../dist/ledger/doctor.js"
import { anchorPath, ensureAnchor, readAnchorState } from "../dist/ledger/writer.js"
import { makeTempDirSync } from "./helpers/workspace.js"

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf-8" }).trim()
}

function writeLedgerFixture(root) {
  fs.mkdirSync(path.join(root, ".synth", "data", "event-stream", "partition-0"), { recursive: true })
  fs.mkdirSync(path.join(root, "proof", "expeditions"), { recursive: true })
  fs.mkdirSync(path.join(root, "src"), { recursive: true })
  fs.writeFileSync(path.join(root, ".synth", "data", "canonical-state.json"), JSON.stringify({ version: 1 }) + "\n")
  fs.writeFileSync(path.join(root, ".synth", "data", "event-stream", "partition-0", "segment-0001.jsonl"), "")
  fs.writeFileSync(path.join(root, "proof", "expeditions", ".gitkeep"), "")
  fs.writeFileSync(path.join(root, "src", "main.ts"), "export const main = () => 1\n")
  fs.writeFileSync(
    path.join(root, ".gitignore"),
    [".synth/anchor/", ".synth/worktrees/", ".synth/cache/", "dist/"].join("\n") + "\n",
  )
}

function makeLedgerRepo(prefix = "synth-doctor-") {
  const root = makeTempDirSync(prefix)
  writeLedgerFixture(root)
  execFileSync("git", ["init", "-b", "main", root], { stdio: "pipe" })
  git(root, ["config", "user.email", "doctor@test"])
  git(root, ["config", "user.name", "Doctor Test"])
  git(root, ["add", "-A"])
  git(root, ["commit", "-m", "fixture"])
  return root
}

async function withRepo(fn) {
  const root = makeLedgerRepo()
  try {
    return await fn(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("ledger doctor: a healthy ledger passes every check, and checking writes nothing", async () => {
  await withRepo(async (root) => {
    await ensureAnchor(root, "main")
    const headBefore = git(root, ["rev-parse", "HEAD"])

    const health = await checkLedger(root)

    assert.equal(health.repo, true)
    assert.equal(health.branch, "main")
    assert.equal(health.anchor.ok, true)
    assert.equal(health.ceremony.ok, true)
    assert.equal(health.sync.ok, true)
    assert.equal(git(root, ["rev-parse", "HEAD"]), headBefore, "checkLedger must not commit")
    assert.equal(git(root, ["status", "--porcelain"]), "", "checkLedger must not write")
  })
})

test("ledger doctor: an uncommitted ceremony is detected and repaired as one commit", async () => {
  await withRepo(async (root) => {
    fs.writeFileSync(path.join(root, ".synth", "data", "canonical-state.json"), JSON.stringify({ version: 2 }) + "\n")

    const before = await checkLedger(root)
    assert.equal(before.ceremony.ok, false, "an uncommitted ceremony must be visible")
    assert.match(before.ceremony.detail, /canonical-state\.json/)
    assert.ok(before.ceremony.nextStep)

    const repair = await repairLedger(root)
    assert.deepEqual(repair.errors, [])
    assert.equal(repair.actions[0], "recorded the ledger branch as main", repair.actions.join(", "))
    assert.ok(
      repair.actions.some((a) => a.startsWith("committed ledger changes:")),
      repair.actions.join(", "),
    )
    assert.ok(repair.actions.some((a) => a.includes("recreated the anchor")), repair.actions.join(", "))
    assert.deepEqual(repair.commit.files, [".synth/data/canonical-state.json", ".synth/data/ledger.json"])
    assert.equal(git(root, ["log", "-1", "--format=%s"]), "chore(synth): ledger repair (doctor --fix)")
    assert.equal(git(root, ["status", "--porcelain"]), "", "the repair leaves a clean checkout")

    const after = await checkLedger(root)
    assert.equal(after.ceremony.ok, true)
    assert.equal(after.sync.ok, true, "the anchor is reconciled with the new commit")
  })
})

test("ledger doctor: a prunable anchor is detected and recreated", async () => {
  await withRepo(async (root) => {
    await ensureAnchor(root, "main")
    fs.rmSync(anchorPath(root), { recursive: true, force: true })

    const before = await checkLedger(root)
    assert.equal(before.anchor.ok, false, "a deleted anchor directory must be reported")
    assert.match(before.anchor.detail, /prunable/)

    const repair = await repairLedger(root)
    assert.deepEqual(repair.errors, [])
    assert.equal(repair.anchor.created, true)
    assert.equal((await readAnchorState(root)).present, true)

    const after = await checkLedger(root)
    assert.equal(after.anchor.ok, true)
    assert.equal(after.sync.ok, true)
  })
})

test("ledger doctor: an anchor behind the branch is re-pointed at the tip", async () => {
  await withRepo(async (root) => {
    await ensureAnchor(root, "main")
    // A ceremony that bypassed the anchor: a direct ledger commit in the checkout.
    fs.writeFileSync(path.join(root, ".synth", "data", "canonical-state.json"), JSON.stringify({ version: 3 }) + "\n")
    git(root, ["add", ".synth/data/canonical-state.json"])
    git(root, ["commit", "-m", "chore(synth): direct ledger commit"])

    const before = await checkLedger(root)
    assert.equal(before.sync.ok, false, "a stale anchor must be reported")
    assert.match(before.sync.detail, /behind/)

    const repair = await repairLedger(root)
    assert.deepEqual(repair.errors, [])
    assert.ok(repair.actions.some((a) => a.includes("re-pointed")), repair.actions.join(", "))
    assert.equal((await readAnchorState(root)).commit, git(root, ["rev-parse", "main"]))

    const after = await checkLedger(root)
    assert.equal(after.sync.ok, true)
  })
})

test("ledger doctor: a detached checkout is reported and the repair refuses", async () => {
  await withRepo(async (root) => {
    await ensureAnchor(root, "main")
    git(root, ["checkout", "--detach"])

    const health = await checkLedger(root)
    assert.equal(health.branch, undefined)
    assert.equal(health.sync.ok, false)
    assert.match(health.sync.detail, /Detached HEAD/)
    assert.equal(ledgerBranch(root), undefined)

    const repair = await repairLedger(root)
    assert.equal(repair.actions.length, 0)
    assert.equal(repair.errors.length, 1)
    assert.match(repair.errors[0], /Detached HEAD/)
  })
})

test("ledger doctor: --fix names an inferred ledger branch once, then is a no-op", async () => {
  await withRepo(async (root) => {
    await ensureAnchor(root, "main")
    const head = git(root, ["rev-parse", "HEAD"])

    const before = await checkLedger(root)
    assert.equal(before.branchSource, "inferred")

    // First --fix: name the ledger branch (recorded and committed), and
    // reconcile the anchor with the new tip.
    const first = await repairLedger(root)
    assert.equal(first.actions[0], "recorded the ledger branch as main")
    assert.ok(first.actions.some((a) => a.startsWith("committed ledger changes:")), first.actions.join(", "))
    assert.ok(first.actions.some((a) => a.includes("re-pointed the anchor")), first.actions.join(", "))
    assert.deepEqual(first.errors, [])
    assert.deepEqual(first.commit.files, [".synth/data/ledger.json"])
    assert.equal(git(root, ["log", "-1", "--format=%s"]), "chore(synth): ledger repair (doctor --fix)")
    assert.equal(git(root, ["status", "--porcelain"]), "", "the record is committed, not left dirty")
    assert.equal((await checkLedger(root)).branchSource, "recorded")

    // Second --fix: nothing left to repair.
    const head2 = git(root, ["rev-parse", "HEAD"])
    const second = await repairLedger(root)
    assert.deepEqual(second.actions, [])
    assert.deepEqual(second.errors, [])
    assert.equal(second.commit, undefined)
    assert.equal(git(root, ["rev-parse", "HEAD"]), head2)
    assert.equal(dirtyLedgerPaths(root).length, 0)
    void head
  })
})
