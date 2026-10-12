// ============================================================
// LEDGER WRITER (ADR-055 §2.3 / §2.10)
// ============================================================
// The writer is the single path for governance commits:
//   lock → anchor (detached, sparse) → commit → update-ref CAS.
// These tests exercise the mechanics against real temporary repositories:
// creation, sparse checkout, advancing the branch, the dirty-ledger refusal,
// the compare-and-swap refusal, lock contention / stale-lock recovery, and
// repair of a deleted anchor.
// ============================================================

import { strict as assert } from "assert"
import { execFileSync } from "child_process"
import fs from "fs"
import path from "path"
import test from "node:test"
import {
  LedgerError,
  acquireLedgerLock,
  advanceCanonicalBranch,
  anchorPath,
  ensureAnchor,
  readAnchorState,
  repairAnchor,
} from "../dist/ledger/writer.js"
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

function makeLedgerRepo(prefix = "synth-ledger-") {
  const root = makeTempDirSync(prefix)
  writeLedgerFixture(root)
  execFileSync("git", ["init", "-b", "main", root], { stdio: "pipe" })
  git(root, ["config", "user.email", "ledger@test"])
  git(root, ["config", "user.name", "Ledger Test"])
  git(root, ["add", "-A"])
  git(root, ["commit", "-m", "fixture"])
  return root
}

test("ledger writer: ensureAnchor creates a detached sparse anchor", async () => {
  const root = makeLedgerRepo()
  const result = await ensureAnchor(root, "main")

  assert.equal(result.created, true)
  assert.equal(result.path, anchorPath(root))
  assert.equal(git(root, ["-C", ".synth/anchor", "rev-parse", "--abbrev-ref", "HEAD"]), "HEAD", "anchor must be detached")
  assert.ok(fs.existsSync(path.join(root, ".synth", "anchor", ".synth")), "ledger paths are materialized")
  assert.ok(fs.existsSync(path.join(root, ".synth", "anchor", "proof")), "proof is materialized")
  assert.ok(!fs.existsSync(path.join(root, ".synth", "anchor", "src")), "source is sparse-excluded")

  // The anchor is invisible to the operator's checkout.
  assert.equal(git(root, ["status", "--porcelain"]), "", "anchor must not dirty the operator checkout")

  const state = await readAnchorState(root)
  assert.equal(state.present, true)
  assert.equal(state.detached, true)
  assert.deepEqual(state.dirtyPaths, [])

  fs.rmSync(root, { recursive: true, force: true })
})

test("ledger writer: advanceCanonicalBranch commits in the anchor and moves the branch by CAS", async () => {
  const root = makeLedgerRepo()
  await ensureAnchor(root, "main")
  const before = git(root, ["rev-parse", "main"])

  fs.writeFileSync(
    path.join(root, ".synth", "anchor", ".synth", "data", "canonical-state.json"),
    JSON.stringify({ version: 2 }) + "\n",
  )

  const result = await advanceCanonicalBranch(root, {
    branch: "main",
    message: "chore(synth): EXPEDITION_STARTED bda2bbd4",
  })

  assert.equal(result.committed, true)
  assert.notEqual(result.commitHash, before)
  assert.deepEqual(result.files, [".synth/data/canonical-state.json"])

  // The branch advanced, and the operator's checkout (which is on the branch)
  // was refreshed for the ceremony's paths — it must not look locally modified.
  assert.notEqual(result.commitHash, before)
  assert.equal(git(root, ["rev-parse", "main"]), result.commitHash)
  assert.equal(git(root, ["status", "--porcelain"]), "", "operator tree stays clean")
  assert.equal(
    fs.readFileSync(path.join(root, ".synth", "data", "canonical-state.json"), "utf-8"),
    JSON.stringify({ version: 2 }) + "\n",
    "operator working tree carries the committed ledger state",
  )
  assert.equal(
    git(root, ["show", `${result.commitHash}:.synth/data/canonical-state.json`]),
    JSON.stringify({ version: 2 }),
    "the commit carries the ledger change",
  )
  assert.match(git(root, ["log", "-1", "--format=%s", result.commitHash]), /^chore\(synth\): EXPEDITION_STARTED/)

  fs.rmSync(root, { recursive: true, force: true })
})

test("ledger writer: a second run with nothing staged reports no changes", async () => {
  const root = makeLedgerRepo()
  await ensureAnchor(root, "main")
  const result = await advanceCanonicalBranch(root, { branch: "main", message: "chore(synth): nothing" })
  assert.equal(result.committed, false)
  assert.equal(result.reason, "no ledger changes")
  fs.rmSync(root, { recursive: true, force: true })
})

test("ledger writer: residue outside the ceremony payload refuses with LEDGER_DIRTY", async () => {
  const root = makeLedgerRepo()
  await ensureAnchor(root, "main")

  // The ceremony's own payload: a ledger edit under .synth/.
  fs.writeFileSync(path.join(root, ".synth", "anchor", ".synth", "data", "canonical-state.json"), '{"v":2}\n')
  // Residue from a crashed ceremony: an edit under a ledger path the ceremony
  // does not own.
  fs.writeFileSync(path.join(root, ".synth", "anchor", "proof", "expeditions", "leftover.txt"), "residue\n")

  await assert.rejects(
    () => advanceCanonicalBranch(root, { branch: "main", message: "chore(synth): should fail", paths: [".synth"] }),
    (err) => {
      assert.ok(err instanceof LedgerError)
      assert.equal(err.code, "LEDGER_DIRTY")
      assert.match(err.message, /outside this ceremony's paths/)
      assert.match(err.message, /leftover\.txt/)
      assert.match(err.nextStep, /Commit or stash/)
      return true
    },
  )

  // Cleaning the residue unblocks the ceremony, which commits only its payload.
  fs.rmSync(path.join(root, ".synth", "anchor", "proof", "expeditions", "leftover.txt"))
  const result = await advanceCanonicalBranch(root, {
    branch: "main",
    message: "chore(synth): payload only",
    paths: [".synth"],
  })
  assert.equal(result.committed, true)
  assert.deepEqual(result.files, [".synth/data/canonical-state.json"])

  fs.rmSync(root, { recursive: true, force: true })
})

test("ledger writer: a branch that moved underneath the commit refuses with LEDGER_DIVERGED", async () => {
  const root = makeLedgerRepo()
  await ensureAnchor(root, "main")

  // Simulate a concurrent writer: while our commit is being created in the
  // anchor, a pre-commit hook lands another commit on the same branch.
  const hook = path.join(root, ".git", "hooks", "pre-commit")
  fs.writeFileSync(
    hook,
    [
      "#!/bin/sh",
      `env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE git -C ${JSON.stringify(root)} \
        -c user.email=other@test -c user.name="Other Writer" \
        commit --allow-empty -m "concurrent writer" || exit 0`,
      "exit 0",
      "",
    ].join("\n"),
    { mode: 0o755 },
  )

  fs.writeFileSync(path.join(root, ".synth", "anchor", ".synth", "data", "canonical-state.json"), '{"v":3}\n')
  await assert.rejects(
    () => advanceCanonicalBranch(root, { branch: "main", message: "chore(synth): stale writer", paths: [".synth"] }),
    (err) => {
      assert.ok(err instanceof LedgerError)
      assert.equal(err.code, "LEDGER_DIVERGED")
      assert.match(err.nextStep, /Re-run the ceremony/)
      return true
    },
  )

  // The concurrent writer's commit is preserved; ours was not published.
  const log = git(root, ["log", "--format=%s", "main"])
  assert.match(log, /^concurrent writer/)
  assert.ok(!log.includes("stale writer"), "the refused ceremony must not be on the branch")

  fs.rmSync(root, { recursive: true, force: true })
})

test("ledger writer: the lock serializes and recovers from a stale owner", async () => {
  const root = makeLedgerRepo()
  const lock = await acquireLedgerLock(root)

  await assert.rejects(
    () => acquireLedgerLock(root, { timeoutMs: 150, pollMs: 25 }),
    (err) => {
      assert.ok(err instanceof LedgerError)
      assert.equal(err.code, "LEDGER_LOCKED")
      assert.match(err.nextStep, /delete the lock file/)
      return true
    },
  )

  await lock.release()

  // A lock left behind by a dead process is stolen.
  fs.writeFileSync(
    path.join(root, ".git", "synth-ledger.lock"),
    JSON.stringify({ pid: 2147483646, startedAt: Date.now() - 60 * 60_000 }),
  )
  const recovered = await acquireLedgerLock(root, { timeoutMs: 500, pollMs: 25 })
  await recovered.release()

  fs.rmSync(root, { recursive: true, force: true })
})

test("ledger writer: repairAnchor rebuilds a deleted anchor", async () => {
  const root = makeLedgerRepo()
  await ensureAnchor(root, "main")
  fs.rmSync(anchorPath(root), { recursive: true, force: true })

  const orphaned = await readAnchorState(root)
  assert.equal(orphaned.present, false)
  assert.equal(orphaned.prunable, true, "a deleted anchor leaves prunable worktree metadata")

  const repaired = await repairAnchor(root, "main")
  assert.equal(repaired.pruned, true)
  assert.equal(repaired.created, true)

  const restored = await readAnchorState(root)
  assert.equal(restored.present, true)
  assert.deepEqual(restored.dirtyPaths, [])

  // And the writer works again.
  fs.writeFileSync(path.join(root, ".synth", "anchor", ".synth", "data", "canonical-state.json"), '{"v":9}\n')
  const result = await advanceCanonicalBranch(root, { branch: "main", message: "chore(synth): after repair" })
  assert.equal(result.committed, true)

  fs.rmSync(root, { recursive: true, force: true })
})
