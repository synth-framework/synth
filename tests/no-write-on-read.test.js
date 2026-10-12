// ============================================================
// EXP-READS-NEVER-WRITE — A read-only command must not touch the tree
// ============================================================
// The invariant (docs/plans/reads-never-write.md §0):
//
//   A read-only command must not modify anything that git tracks, and
//   derived state must never block work.
//
// This test materializes the exact committed tree in a temp directory
// (`git archive HEAD | tar -x`, the recipe from AGENTS.md), initializes a
// clean git baseline, and then runs each read-only command. Afterwards
// `git status --porcelain` must be **empty**: no modified tracked file, no
// new untracked file, no deletion.
//
// It goes red on `status`, `doctor` and `capabilities` before the fix
// (E2/E3) and green after.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { execFileSync, spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const CLI = path.join(REPO_ROOT, "dist", "cli", "synth.js")

/** Commands that must be pure reads. Each entry is argv after `synth`. */
const READ_ONLY_COMMANDS = [
  ["status"],
  ["doctor"],
  ["capabilities"],
  ["explain", "replay"],
  ["explain", "status"],
  ["validate", "--dry-run"],
  ["expedition", "list"],
  ["mission", "list"],
  ["program", "list"],
]

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf-8" })
}

function materializePristineTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "synth-no-write-on-read-"))
  const archive = execFileSync("git", ["archive", "HEAD"], { cwd: REPO_ROOT, maxBuffer: 256 * 1024 * 1024 })
  execFileSync("tar", ["-x", "-C", dir], { input: archive, maxBuffer: 256 * 1024 * 1024 })
  git(dir, ["init", "-q"])
  git(dir, ["add", "-A"])
  execFileSync("git", ["-c", "user.email=test@synth", "-c", "user.name=test", "commit", "-qm", "baseline"], { cwd: dir })
  return dir
}

test("read-only commands never modify the working tree", { concurrency: false }, async (t) => {
  if (!fs.existsSync(CLI)) {
    assert.fail(`CLI not built at ${CLI} — run \`npm run build\` before this test`)
  }

  const pristine = materializePristineTree()
  const baseline = git(pristine, ["rev-parse", "HEAD"]).trim()

  t.after(() => {
    fs.rmSync(pristine, { recursive: true, force: true })
  })

  assert.ok(!fs.existsSync(path.join(pristine, ".synth", "ai")), "pristine tree must not ship .synth/ai/")

  /** Restore the pristine baseline so each command is judged independently. */
  function resetTree() {
    git(pristine, ["reset", "-q", "--hard", baseline])
    git(pristine, ["clean", "-qfdx"])
  }

  for (const args of READ_ONLY_COMMANDS) {
    await t.test(`synth ${args.join(" ")} leaves the tree clean`, () => {
      resetTree()

      const result = spawnSync(process.execPath, [CLI, ...args], {
        cwd: pristine,
        encoding: "utf-8",
        timeout: 120_000,
      })
      assert.strictEqual(result.status, 0, `synth ${args.join(" ")} exited ${result.status}\n${result.stderr}`)

      // 1. Nothing tracked may be modified, added or deleted.
      const dirty = git(pristine, ["status", "--porcelain"])
      assert.strictEqual(dirty.trim(), "", `synth ${args.join(" ")} dirtied the tree:\n${dirty}`)

      // 2. HEAD may not move.
      assert.strictEqual(git(pristine, ["rev-parse", "HEAD"]).trim(), baseline, "HEAD moved")

      // 3. The .synth/ai/ projection must not be written — it is ignored by
      //    git, so `status` alone cannot see it (audit D5).
      assert.ok(!fs.existsSync(path.join(pristine, ".synth", "ai")), "read-only command created .synth/ai/")
    })
  }

  // A cache may be written (git refreshes .git/index on read commands too),
  // but it must be content-keyed and stable: a second identical run must not
  // rewrite it (audit D7 — mtime-keyed caches rewrote on every fresh clone).
  await t.test("the charter cache is content-stable across identical runs", () => {
    resetTree()
    const run = () =>
      spawnSync(process.execPath, [CLI, "capabilities"], { cwd: pristine, encoding: "utf-8", timeout: 120_000 })
    const first = run()
    assert.strictEqual(first.status, 0, first.stderr)
    const cachePath = path.join(pristine, ".synth", "cache", "dependency-records.json")
    assert.ok(fs.existsSync(cachePath), "capabilities did not build the charter cache")
    const before = fs.readFileSync(cachePath, "utf-8")

    const second = run()
    assert.strictEqual(second.status, 0, second.stderr)
    const after = fs.readFileSync(cachePath, "utf-8")
    assert.strictEqual(after, before, "the cache was rewritten by an identical run")
  })
})
