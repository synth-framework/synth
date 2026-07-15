// ============================================================
// REVISION CAPABILITY TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createGitRevisionProvider } from "../dist/environment/index.js"

function makeContext(files = {}, env = {}, cwd = "/repo") {
  const fileMap = { ...files }
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
      return env[key]
    },
    cwd,
  }
}

test("GitRevisionProvider exposes name and version", () => {
  const provider = createGitRevisionProvider()
  assert.strictEqual(provider.name, "git-revision")
  assert.strictEqual(provider.version, "1.0.0")
})

test("isRepository returns true when .git exists", async () => {
  const ctx = makeContext({ "/repo/.git": "" }, {})
  const provider = createGitRevisionProvider()
  const result = await provider.isRepository(ctx, "/repo")
  assert.strictEqual(result, true)
})

test("isRepository returns false when .git is absent", async () => {
  const ctx = makeContext({}, {})
  const provider = createGitRevisionProvider()
  const result = await provider.isRepository(ctx, "/repo")
  assert.strictEqual(result, false)
})

test("getCurrentBranch returns parsed branch", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    { "git -C /repo rev-parse --abbrev-ref HEAD": "main\n" },
  )
  const provider = createGitRevisionProvider()
  const branch = await provider.getCurrentBranch(ctx, "/repo")
  assert.strictEqual(branch, "main")
})

test("getCommitHash returns parsed hash", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    { "git -C /repo rev-parse HEAD": "abc123\n" },
  )
  const provider = createGitRevisionProvider()
  const hash = await provider.getCommitHash(ctx, "/repo")
  assert.strictEqual(hash, "abc123")
})

test("getRemotes parses .git/config", async () => {
  const config = `[remote "origin"]\n\turl = https://github.com/example/repo.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n[remote "upstream"]\n\turl = https://github.com/upstream/repo.git\n`
  const ctx = makeContext({ "/repo/.git/config": config }, {})
  const provider = createGitRevisionProvider()
  const remotes = await provider.getRemotes(ctx, "/repo")
  assert.strictEqual(remotes.length, 2)
  assert.strictEqual(remotes[0].name, "origin")
  assert.strictEqual(remotes[0].url, "https://github.com/example/repo.git")
  assert.strictEqual(remotes[1].name, "upstream")
})

test("getStatus reports clean working tree", async () => {
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo status --porcelain=v1": "",
      "git -C /repo rev-list --left-right --count HEAD...@{upstream}": "0\t0\n",
    },
  )
  const provider = createGitRevisionProvider()
  const status = await provider.getStatus(ctx, "/repo")
  assert.strictEqual(status.clean, true)
  assert.strictEqual(status.modified.length, 0)
  assert.strictEqual(status.untracked.length, 0)
})

test("getStatus reports modified and untracked files", async () => {
  const porcelain = " M src/file.ts\n?? new-file.txt\n"
  const ctx = makeContext(
    { "/repo/.git": "" },
    {
      "git -C /repo status --porcelain=v1": porcelain,
      "git -C /repo rev-list --left-right --count HEAD...@{upstream}": "1\t2\n",
    },
  )
  const provider = createGitRevisionProvider()
  const status = await provider.getStatus(ctx, "/repo")
  assert.strictEqual(status.clean, false)
  assert.deepStrictEqual(status.modified, ["src/file.ts"])
  assert.deepStrictEqual(status.untracked, ["new-file.txt"])
  assert.strictEqual(status.ahead, 1)
  assert.strictEqual(status.behind, 2)
})

test("discover returns full descriptor for repository", async () => {
  const config = `[remote "origin"]\n\turl = https://github.com/example/repo.git\n`
  const ctx = makeContext(
    { "/repo/.git": "", "/repo/.git/config": config },
    {
      "git -C /repo rev-parse --abbrev-ref HEAD": "main\n",
      "git -C /repo rev-parse HEAD": "abc123\n",
      "git -C /repo status --porcelain=v1": "",
      "git -C /repo rev-list --left-right --count HEAD...@{upstream}": "0\t0\n",
    },
  )
  const provider = createGitRevisionProvider()
  const descriptor = await provider.discover(ctx)
  assert.strictEqual(descriptor.system, "git")
  assert.strictEqual(descriptor.present, true)
  assert.strictEqual(descriptor.branch, "main")
  assert.strictEqual(descriptor.commit, "abc123")
  assert.strictEqual(descriptor.remotes.length, 1)
  assert.strictEqual(descriptor.clean, true)
})

test("discover returns absent descriptor outside repository", async () => {
  const ctx = makeContext({}, {}, "/tmp")
  const provider = createGitRevisionProvider()
  const descriptor = await provider.discover(ctx)
  assert.strictEqual(descriptor.present, false)
  assert.strictEqual(descriptor.remotes.length, 0)
})
