// ============================================================
// VERSIONING CAPABILITY CERTIFICATION
// ============================================================
// Deterministic certification tests for the Repository Versioning
// Capability. These tests exercise real Git operations in isolated
// temporary repositories to prove that the same capability invocations
// produce the same repository state every time.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { mkdtemp, realpath, rm, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createGitVersioningProvider, createNodeObservationContext } from "../dist/environment/index.js"

const provider = createGitVersioningProvider()

// Ensure Git commits have author/committer metadata in environments without global config.
process.env.GIT_AUTHOR_NAME = process.env.GIT_AUTHOR_NAME || "Synth Cert"
process.env.GIT_AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL || "cert@synth.local"
process.env.GIT_COMMITTER_NAME = process.env.GIT_COMMITTER_NAME || "Synth Cert"
process.env.GIT_COMMITTER_EMAIL = process.env.GIT_COMMITTER_EMAIL || "cert@synth.local"

async function makeTempRepo() {
  const dir = await mkdtemp(join(tmpdir(), "synth-vcs-cert-"))
  const root = await realpath(dir)
  const ctx = createNodeObservationContext(root)
  await provider.initializeRepository(ctx, root)
  // Explicitly create and commit to a named default branch so tests can rely on it.
  await ctx.execTool("git", ["checkout", "-b", "main"])
  await writeFile(join(root, "README.md"), "# cert", "utf-8")
  await ctx.execTool("git", ["add", "."])
  await ctx.execTool("git", ["commit", "-m", "initial"])
  return { root, ctx }
}

async function cleanup(root) {
  await rm(root, { recursive: true, force: true })
}

async function commitFile(ctx, root, filename, content, message) {
  await writeFile(join(root, filename), content, "utf-8")
  return provider.createRevision(ctx, root, { message, includeUntracked: true })
}

test("certification: initializeRepository creates a valid Git repository", async () => {
  const { root, ctx } = await makeTempRepo()
  try {
    const repo = await provider.initializeRepository(ctx, root)
    assert.strictEqual(repo.system, "git")
    assert.strictEqual(repo.present, true)
    assert.strictEqual(repo.root, root)
  } finally {
    await cleanup(root)
  }
})

test("certification: createRevision captures file changes deterministically", async () => {
  const { root, ctx } = await makeTempRepo()
  try {
    const revision1 = await commitFile(ctx, root, "a.txt", "alpha", "add alpha")
    assert.ok(revision1.commit)
    assert.strictEqual(revision1.message, "add alpha")

    const revision2 = await commitFile(ctx, root, "b.txt", "beta", "add beta")
    assert.ok(revision2.commit)
    assert.notStrictEqual(revision2.commit, revision1.commit)

    // Re-running the same operation on a fresh repo produces different commit hashes
    // (because timestamps differ), but the repository structure is equivalent.
    const history = await provider.history(ctx, root)
    const messages = history.map((h) => h.message)
    assert.ok(messages.includes("add beta"))
    assert.ok(messages.includes("add alpha"))
  } finally {
    await cleanup(root)
  }
})

test("certification: switchRevision moves between branches", async () => {
  const { root, ctx } = await makeTempRepo()
  try {
    const defaultBranch = (await ctx.execTool("git", ["rev-parse", "--abbrev-ref", "HEAD"]))?.trim() || "main"
    await commitFile(ctx, root, `${defaultBranch}.txt`, defaultBranch, `on ${defaultBranch}`)
    await provider.switchRevision(ctx, root, { branch: "feature", createBranch: true })
    await commitFile(ctx, root, "feature.txt", "feature", "on feature")

    const featureRev = await provider.history(ctx, root)
    assert.strictEqual(featureRev[0].message, "on feature")

    await provider.switchRevision(ctx, root, { branch: defaultBranch })
    const mainRev = await provider.history(ctx, root)
    assert.strictEqual(mainRev[0].message, `on ${defaultBranch}`)
  } finally {
    await cleanup(root)
  }
})

test("certification: compareRevisions detects added and modified files", async () => {
  const { root, ctx } = await makeTempRepo()
  try {
    const r1 = await commitFile(ctx, root, "file.txt", "v1", "v1")
    const r2 = await commitFile(ctx, root, "file.txt", "v2", "v2")
    const comparison = await provider.compareRevisions(ctx, root, r1.commit, r2.commit)
    assert.deepStrictEqual(comparison.changedFiles, ["file.txt"])
    assert.deepStrictEqual(comparison.addedFiles, [])
    assert.deepStrictEqual(comparison.removedFiles, [])
  } finally {
    await cleanup(root)
  }
})

test("certification: createSnapshot captures working tree state", async () => {
  const { root, ctx } = await makeTempRepo()
  try {
    await commitFile(ctx, root, "stable.txt", "stable", "stable")
    await writeFile(join(root, "wip.txt"), "work in progress", "utf-8")
    const snapshot = await provider.createSnapshot(ctx, root, { label: "wip" })
    assert.strictEqual(snapshot.system, "git")
    assert.strictEqual(snapshot.label, "wip")
    assert.ok(snapshot.commit)

    // After stashing, working tree should be clean.
    const status = await ctx.execTool("git", ["status", "--porcelain=v1"])
    assert.strictEqual(status?.trim(), "")
  } finally {
    await cleanup(root)
  }
})

test("certification: integrateRevision merges branches", async () => {
  const { root, ctx } = await makeTempRepo()
  try {
    const defaultBranch = (await ctx.execTool("git", ["rev-parse", "--abbrev-ref", "HEAD"]))?.trim() || "main"
    await commitFile(ctx, root, "base.txt", "base", "base")
    await provider.switchRevision(ctx, root, { branch: "feature", createBranch: true })
    await commitFile(ctx, root, "feature.txt", "feature", "feature work")
    await provider.switchRevision(ctx, root, { branch: defaultBranch })

    const result = await provider.integrateRevision(ctx, root, "feature", defaultBranch)
    assert.strictEqual(result.success, true)
    assert.ok(result.resultCommit)
    assert.strictEqual(result.conflictedFiles?.length, 0)

    const history = await provider.history(ctx, root)
    const messages = history.map((h) => h.message)
    assert.ok(messages.includes("feature work"))
    assert.ok(messages.includes("base"))
  } finally {
    await cleanup(root)
  }
})

test("certification: repeated identical sequence produces equivalent repository state", async () => {
  async function runSequence() {
    const { root, ctx } = await makeTempRepo()
    try {
      const defaultBranch = (await ctx.execTool("git", ["rev-parse", "--abbrev-ref", "HEAD"]))?.trim() || "main"
      await commitFile(ctx, root, "a.txt", "a", "first")
      await provider.switchRevision(ctx, root, { branch: "dev", createBranch: true })
      await commitFile(ctx, root, "b.txt", "b", "second")
      await provider.switchRevision(ctx, root, { branch: defaultBranch })
      await provider.integrateRevision(ctx, root, "dev", defaultBranch)
      const history = await provider.history(ctx, root)
      return history.map((h) => h.message)
    } finally {
      await cleanup(root)
    }
  }

  const run1 = await runSequence()
  const run2 = await runSequence()

  // Commit hashes differ due to timestamps, but the logical history is identical.
  assert.deepStrictEqual(run1, run2)
})

test("certification: GitVersioningProvider rejects operations outside a repository", async () => {
  const dir = await mkdtemp(join(tmpdir(), "synth-vcs-cert-norepo-"))
  const root = await realpath(dir)
  const ctx = createNodeObservationContext(root)
  try {
    await assert.rejects(
      () => provider.createRevision(ctx, root, { message: "x" }),
      /Not a Git repository/,
    )
  } finally {
    await cleanup(root)
  }
})
