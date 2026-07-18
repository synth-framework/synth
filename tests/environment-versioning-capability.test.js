// ============================================================
// VERSIONING CAPABILITY TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createGitVersioningProvider } from "../dist/environment/index.js"

function makeContext(files = {}, env = {}, cwd = "/repo") {
  const fileMap = { ...files }
  const counters = new Map()
  return {
    readFile: async (path) => {
      if (path.startsWith("/")) return fileMap[path]
      return fileMap[`${cwd}/${path}`]
    },
    listDirectory: async () => [],
    pathExists: async (path) => {
      if (path.startsWith("/")) return path in fileMap
      return `${cwd}/${path}` in fileMap
    },
    readEnv: (name) => env[name],
    execTool: async (command, args) => {
      const key = `${command} ${args.join(" ")}`
      if (env[key] !== undefined) {
        const value = env[key]
        if (typeof value === "function") {
          return value(args)
        }
        if (Array.isArray(value)) {
          const count = counters.get(key) || 0
          counters.set(key, count + 1)
          return value[count % value.length]
        }
        return value
      }
      return ""
    },
    cwd,
  }
}

test("GitVersioningProvider exposes name and version", () => {
  const provider = createGitVersioningProvider()
  assert.strictEqual(provider.name, "git-versioning")
  assert.strictEqual(provider.version, "1.0.0")
})

test("initializeRepository runs git init and returns descriptor", async () => {
  const ctx = makeContext({}, { "git -C /repo init": "" })
  const provider = createGitVersioningProvider()
  const descriptor = await provider.initializeRepository(ctx, "/repo")
  assert.strictEqual(descriptor.system, "git")
  assert.strictEqual(descriptor.present, true)
  assert.strictEqual(descriptor.root, "/repo")
})

test("createRevision stages tracked files and commits", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo add -u": "",
      "git -C /repo commit -m initial": "",
      "git -C /repo rev-parse HEAD": "abc123\n",
      "git -C /repo log -1 --pretty=format:%s": "initial",
      "git -C /repo log -1 --pretty=format:%an": "author",
      "git -C /repo log -1 --pretty=format:%ai": "2026-01-01T00:00:00+00:00",
      "git -C /repo log -1 --pretty=format:%P": "",
      "git -C /repo rev-parse --abbrev-ref HEAD": "main\n",
    },
  )
  const provider = createGitVersioningProvider()
  const revision = await provider.createRevision(ctx, "/repo", { message: "initial" })
  assert.strictEqual(revision.commit, "abc123")
  assert.strictEqual(revision.message, "initial")
  assert.strictEqual(revision.system, "git")
})

test("createRevision includes untracked files when requested", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo add .": "",
      "git -C /repo commit -m initial": "",
      "git -C /repo rev-parse HEAD": "abc123\n",
      "git -C /repo log -1 --pretty=format:%s": "initial",
      "git -C /repo log -1 --pretty=format:%an": "",
      "git -C /repo log -1 --pretty=format:%ai": "",
      "git -C /repo log -1 --pretty=format:%P": "",
      "git -C /repo rev-parse --abbrev-ref HEAD": "main\n",
    },
  )
  const provider = createGitVersioningProvider()
  const revision = await provider.createRevision(ctx, "/repo", { message: "initial", includeUntracked: true })
  assert.strictEqual(revision.commit, "abc123")
})

test("switchRevision checks out an existing branch", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo checkout feature": "",
      "git -C /repo rev-parse HEAD": "def456\n",
      "git -C /repo log -1 --pretty=format:%s": "",
      "git -C /repo log -1 --pretty=format:%an": "",
      "git -C /repo log -1 --pretty=format:%ai": "",
      "git -C /repo log -1 --pretty=format:%P": "",
      "git -C /repo rev-parse --abbrev-ref HEAD": "feature\n",
    },
  )
  const provider = createGitVersioningProvider()
  const revision = await provider.switchRevision(ctx, "/repo", { branch: "feature" })
  assert.strictEqual(revision.branch, "feature")
  assert.strictEqual(revision.commit, "def456")
})

test("switchRevision creates a new branch when requested", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo checkout -b feature": "",
      "git -C /repo rev-parse HEAD": "abc123\n",
      "git -C /repo log -1 --pretty=format:%s": "",
      "git -C /repo log -1 --pretty=format:%an": "",
      "git -C /repo log -1 --pretty=format:%ai": "",
      "git -C /repo log -1 --pretty=format:%P": "",
      "git -C /repo rev-parse --abbrev-ref HEAD": "feature\n",
    },
  )
  const provider = createGitVersioningProvider()
  const revision = await provider.switchRevision(ctx, "/repo", { branch: "feature", createBranch: true })
  assert.strictEqual(revision.branch, "feature")
})

test("publishRevision pushes to default origin", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo push origin main": "",
      "git -C /repo rev-parse main": "abc123\n",
    },
  )
  const provider = createGitVersioningProvider()
  const result = await provider.publishRevision(ctx, "/repo", "main")
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.remote, "origin")
  assert.strictEqual(result.publishedCommit, "abc123")
})

test("createSnapshot stashes working tree", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo stash push -m wip": "",
      "git -C /repo rev-parse HEAD": "abc123\n",
    },
  )
  const provider = createGitVersioningProvider()
  const snapshot = await provider.createSnapshot(ctx, "/repo", { label: "wip" })
  assert.strictEqual(snapshot.system, "git")
  assert.strictEqual(snapshot.label, "wip")
  assert.strictEqual(snapshot.commit, "abc123")
})

test("history parses git log output", async () => {
  const logOutput = "abc123\x00first\x00alice\x002026-01-01T00:00:00+00:00\x00\ndef456\x00second\x00bob\x002026-01-02T00:00:00+00:00\x00abc123"
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo log --pretty=format:%H%x00%s%x00%an%x00%ai%x00%P": logOutput,
    },
  )
  const provider = createGitVersioningProvider()
  const entries = await provider.history(ctx, "/repo")
  assert.strictEqual(entries.length, 2)
  assert.strictEqual(entries[0].commit, "abc123")
  assert.strictEqual(entries[0].message, "first")
  assert.strictEqual(entries[1].parents[0], "abc123")
})

test("compareRevisions parses name-status output", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo diff --stat a...b": "",
      "git -C /repo diff --name-status a...b": "A\tnew.ts\nM\tchanged.ts\nD\told.ts",
      "git -C /repo checkout a": "",
      "git -C /repo rev-parse HEAD": "aaa\n",
      "git -C /repo log -1 --pretty=format:%s": "",
      "git -C /repo log -1 --pretty=format:%an": "",
      "git -C /repo log -1 --pretty=format:%ai": "",
      "git -C /repo log -1 --pretty=format:%P": "",
      "git -C /repo rev-parse --abbrev-ref HEAD": "HEAD\n",
      "git -C /repo checkout main": "",
      "git -C /repo checkout b": "",
      "git -C /repo rev-parse HEAD": "bbb\n",
    },
  )
  const provider = createGitVersioningProvider()
  const comparison = await provider.compareRevisions(ctx, "/repo", "a", "b")
  assert.deepStrictEqual(comparison.addedFiles, ["new.ts"])
  assert.deepStrictEqual(comparison.changedFiles, ["changed.ts"])
  assert.deepStrictEqual(comparison.removedFiles, ["old.ts"])
})

test("synchronize fetches and pulls from remote", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo fetch origin": "",
      "git -C /repo rev-parse --abbrev-ref HEAD": "main\n",
      "git -C /repo pull origin main": "",
      "git -C /repo log HEAD..@{upstream} --pretty=format:%H": "def456\n",
      "git -C /repo rev-list --left-right --count HEAD...@{upstream}": "0\t0\n",
      "git -C /repo status --porcelain=v1": "",
    },
  )
  const provider = createGitVersioningProvider()
  const result = await provider.synchronize(ctx, "/repo")
  assert.strictEqual(result.success, true)
  assert.deepStrictEqual(result.integratedCommits, ["def456"])
})

test("integrateRevision merges source into target", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo checkout main": ["", "", ""],
      "git -C /repo merge feature": "",
      "git -C /repo rev-parse HEAD": ["main123\n", "merge123\n", "main123\n", "feature123\n"],
      "git -C /repo log -1 --pretty=format:%s": ["", "", "", ""],
      "git -C /repo log -1 --pretty=format:%an": ["", "", "", ""],
      "git -C /repo log -1 --pretty=format:%ai": ["", "", "", ""],
      "git -C /repo log -1 --pretty=format:%P": ["", "", "", ""],
      "git -C /repo rev-parse --abbrev-ref HEAD": ["main\n", "main\n", "main\n", "feature\n", "main\n"],
      "git -C /repo checkout feature": "",
      "git -C /repo status --porcelain=v1": "",
    },
  )
  const provider = createGitVersioningProvider()
  const result = await provider.integrateRevision(ctx, "/repo", "feature", "main")
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.resultCommit, "merge123")
})

test("throws when operating outside a repository", async () => {
  const ctx = makeContext({}, {})
  const provider = createGitVersioningProvider()
  await assert.rejects(() => provider.createRevision(ctx, "/repo", { message: "x" }), /Not a Git repository/)
})
