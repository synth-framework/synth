// ============================================================
// EXP-ARTIFACT-POLICY — the classification table is the single source
// ============================================================
// Verifies that:
//   - src/state/artifact-policy.ts classifies each artifact family as designed
//     (durable, input, derived, cache, legacy) with first-match-wins ordering
//   - the committed repository agrees with the policy: no tracked path is
//     classified non-committable, and no tracked path is ignored
//   - scripts/check-artifact-policy.js passes on this checkout
//
// The guard script is the CI-facing form of this test; the direct assertions
// below keep the invariant testable even if the script is refactored.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const POLICY_MODULE = path.join(REPO_ROOT, "dist", "state", "artifact-policy.js")

const policy = await import(POLICY_MODULE)
const { ARTIFACT_RULES, classifyArtifact, isCommittableArtifact, isExcludedFromCompletionGate } = policy

function git(args, options = {}) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf-8", ...options })
}

test("artifact policy: classification", async (t) => {
  await t.test("durable replay state is committable and gate-exempt", () => {
    for (const relPath of [
      ".synth/data/event-stream/2026-10-12-abc.jsonl",
      ".synth/data/canonical-state.json",
      ".synth/data/missions/b536ecc7ceb9217a.json",
      ".synth/data/expeditions/ecc3688796be0545.json",
      ".synth/data/snapshots/10b6638b9e7790b3.json",
      ".synth/data/decisions.jsonl",
      "proof/expeditions/ecc3688796be0545/manifest.json",
      "AGENTS.md",
    ]) {
      assert.strictEqual(classifyArtifact(relPath), "durable", relPath)
      assert.strictEqual(isCommittableArtifact(relPath), true, relPath)
      assert.strictEqual(isExcludedFromCompletionGate(relPath), true, relPath)
    }
  })

  await t.test("draft inputs are committable (approve reads them)", () => {
    const draft = ".synth/data/drafts/2db51370ae127555.json"
    assert.strictEqual(classifyArtifact(draft), "input")
    assert.strictEqual(isCommittableArtifact(draft), true)
    const integrity = ".synth/data/drafts/2db51370ae127555.integrity.json"
    assert.strictEqual(isCommittableArtifact(integrity), true)
  })

  await t.test("derived, cache and legacy artifacts are never committable", () => {
    for (const [relPath, klass] of [
      ["docs/generated/README.md", "derived"],
      [".synth/cache/dependency-records.json", "cache"],
      [".synth/anchor/HEAD", "cache"],
      [".synth/worktrees/expedition/README.md", "cache"],
      [".synth/data/dependency-records-cache.json", "cache"],
      [".synth/data/event-log.jsonl", "legacy"],
      [".synth/data/cli-errors.jsonl", "legacy"],
    ]) {
      assert.strictEqual(classifyArtifact(relPath), klass, relPath)
      assert.strictEqual(isCommittableArtifact(relPath), false, relPath)
    }
  })

  await t.test("agent projections, context and discovery baselines are durable and tracked", () => {
    for (const relPath of [
      ".synth/ai/lifecycle.json",
      ".synth/context.json",
      ".synth/discovery/baseline-2026-08-04T04-09-52-238Z-e72dc6e1a986c57e.json",
    ]) {
      assert.strictEqual(classifyArtifact(relPath), "durable", relPath)
      assert.strictEqual(isCommittableArtifact(relPath), true, relPath)
    }
  })

  await t.test("first match wins (a committed stub inside a derived dir)", () => {
    assert.strictEqual(classifyArtifact("docs/generated/.gitkeep"), "durable")
    assert.strictEqual(isCommittableArtifact("docs/generated/.gitkeep"), true)
  })

  await t.test("paths outside the governance tree are unclassified", () => {
    for (const relPath of ["src/cli/synth.ts", "tests/artifact-policy.test.js", "README.md"]) {
      assert.strictEqual(classifyArtifact(relPath), undefined, relPath)
      assert.strictEqual(isCommittableArtifact(relPath), false, relPath)
    }
  })
})

test("artifact policy: the repository obeys it", async (t) => {
  await t.test("no tracked path is classified non-committable", () => {
    const tracked = git(["ls-files"]).split("\n").filter(Boolean)
    const violations = tracked.filter((relPath) => {
      const klass = classifyArtifact(relPath)
      return klass !== undefined && !isCommittableArtifact(relPath)
    })
    assert.deepStrictEqual(violations, [], `tracked non-committable artifacts:\n${violations.join("\n")}`)
  })

  await t.test("no tracked path is ignored (a tracked file is never 'ignored')", () => {
    const tracked = git(["ls-files"]).split("\n").filter(Boolean)
    let ignored = ""
    try {
      ignored = git(["check-ignore", "--no-index", "--stdin"], { input: tracked.join("\n") })
    } catch (error) {
      if (error?.status !== 1) throw error
    }
    assert.strictEqual(ignored.trim(), "", `tracked but ignored:\n${ignored}`)
  })

  await t.test("every policy rule has a note and a cycle-free class", () => {
    const validClasses = new Set(["durable", "input", "derived", "cache", "legacy"])
    for (const rule of ARTIFACT_RULES) {
      assert.ok(validClasses.has(rule.class), `${rule.pattern} has class ${rule.class}`)
      assert.ok(rule.note && rule.note.length > 0, `${rule.pattern} has no note`)
    }
  })

  await t.test("scripts/check-artifact-policy.js passes", () => {
    const result = execFileSync(process.execPath, ["scripts/check-artifact-policy.js"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
    assert.match(result, /check-artifact-policy: PASS/)
  })
})

// ------------------------------------------------------------
// Removal guard and ignore rules against the base branch
// ------------------------------------------------------------

const { findUnmanifestedRemovals, validateRemovalManifest } = await import(
  path.join(REPO_ROOT, "scripts", "lib", "removal-guard.js")
)

test("removal guard: a removal without a manifest entry is a problem", () => {
  const problems = findUnmanifestedRemovals(["a.json", "b.json"], ["a.json"], [])
  assert.strictEqual(problems.length, 1)
  assert.match(problems[0], /^b\.json/)
})

test("removal guard: an approved removal passes", () => {
  const manifest = [{ path: "b.json", reason: "superseded", approvedBy: "owner" }]
  assert.deepStrictEqual(findUnmanifestedRemovals(["a.json", "b.json"], ["a.json"], manifest), [])
})

test("removal guard: a manifest entry without approvedBy does not count", () => {
  const manifest = [{ path: "b.json", reason: "superseded" }]
  const problems = findUnmanifestedRemovals(["b.json"], [], manifest)
  assert.strictEqual(problems.length, 1)
  assert.match(problems[0], /approvedBy/)
})

test("removal guard: a file added on this branch is never a removal", () => {
  assert.deepStrictEqual(findUnmanifestedRemovals(["a.json"], ["a.json", "new.json"], []), [])
})

test("removal manifest must be an array of entries with a path", () => {
  assert.deepStrictEqual(validateRemovalManifest([{ path: "x", reason: "r", approvedBy: "a" }]), [])
  assert.ok(validateRemovalManifest({}).length > 0)
  assert.ok(validateRemovalManifest([{ reason: "no path" }]).length > 0)
})

test("no .gitignore rule hides a path the base branch tracks", (t) => {
  let base = null
  for (const ref of ["origin/main", "main"]) {
    try {
      git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`])
      base = ref
      break
    } catch {
      // try the next ref
    }
  }
  if (base === null) {
    t.skip("no base branch in this checkout (CI fetches full history)")
    return
  }
  const approvedRemovals = new Set(
    JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "docs", "artifact-removals.json"), "utf-8")).map((e) => e.path),
  )
  const baseTracked = git(["ls-tree", "-r", "--name-only", base])
    .split("\n")
    .filter(Boolean)
    .filter((relPath) => !approvedRemovals.has(relPath))
  let ignored = ""
  try {
    ignored = git(["check-ignore", "--no-index", "--stdin"], { input: baseTracked.join("\n") })
  } catch (error) {
    if (error?.status !== 1) throw error
  }
  assert.strictEqual(ignored.trim(), "", `ignored although tracked on ${base}:\n${ignored}`)
})
