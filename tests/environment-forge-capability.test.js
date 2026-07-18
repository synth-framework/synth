// ============================================================
// FORGE CAPABILITY TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createGitHubForgeProvider } from "../dist/environment/index.js"

/** Scripted ToolProvider fake keyed by gh subcommand */
function createFakeTools(responses = {}) {
  const calls = []
  return {
    name: "fake-tools",
    version: "1.0.0",
    calls,
    async isAvailable() {
      return true
    },
    async locate() {
      return undefined
    },
    async runTool(tool, args = [], options = {}) {
      calls.push({ tool, args, options })
      const key = args.slice(0, 2).join(" ")
      const response = responses[key] ?? { exitCode: 1, stdout: "", stderr: "not found" }
      return {
        command: tool,
        args,
        exitCode: response.exitCode ?? 0,
        stdout: response.stdout ?? "",
        stderr: response.stderr ?? "",
        durationMs: 1,
        timedOut: false,
      }
    },
  }
}

test("GitHubForgeProvider reads repository metadata", async () => {
  const tools = createFakeTools({
    "repo view": {
      stdout: JSON.stringify({
        name: "synth",
        owner: { login: "synth-framework" },
        url: "https://github.com/synth-framework/synth",
        defaultBranchRef: { name: "main" },
        description: "Deterministic execution system",
      }),
    },
  })
  const forge = createGitHubForgeProvider(tools, "/repo")
  const repo = await forge.getRepository()
  assert.deepStrictEqual(repo, {
    name: "synth",
    owner: "synth-framework",
    url: "https://github.com/synth-framework/synth",
    defaultBranch: "main",
    description: "Deterministic execution system",
  })
  assert.strictEqual(tools.calls[0].tool, "gh")
  assert.strictEqual(tools.calls[0].options.cwd, "/repo")
  assert.ok(tools.calls[0].args.includes("--json"))
})

test("GitHubForgeProvider returns undefined when repository read fails", async () => {
  const tools = createFakeTools()
  const forge = createGitHubForgeProvider(tools)
  assert.strictEqual(await forge.getRepository(), undefined)
})

test("GitHubForgeProvider lists issues with labels", async () => {
  const tools = createFakeTools({
    "issue list": {
      stdout: JSON.stringify([
        {
          number: 42,
          title: "Bug in replay",
          state: "OPEN",
          labels: [{ name: "bug" }, { name: "replay" }],
          url: "https://github.com/x/y/issues/42",
        },
        { number: 43, title: "Docs", state: "CLOSED", labels: [], url: "https://github.com/x/y/issues/43" },
      ]),
    },
  })
  const forge = createGitHubForgeProvider(tools)
  const issues = await forge.listIssues({ limit: 10, state: "all" })
  assert.strictEqual(issues.length, 2)
  assert.deepStrictEqual(issues[0], {
    number: 42,
    title: "Bug in replay",
    state: "OPEN",
    labels: ["bug", "replay"],
    url: "https://github.com/x/y/issues/42",
  })
  const args = tools.calls[0].args
  assert.deepStrictEqual(args.slice(0, 2), ["issue", "list"])
  assert.ok(args.includes("--limit") && args.includes("10"))
  assert.ok(args.includes("--state") && args.includes("all"))
})

test("GitHubForgeProvider skips malformed issue entries", async () => {
  const tools = createFakeTools({
    "issue list": {
      stdout: JSON.stringify([
        { number: 1, title: "Valid", state: "OPEN", labels: [] },
        { number: 2, state: "OPEN" },
        { title: "No number", state: "OPEN" },
        "garbage",
      ]),
    },
  })
  const forge = createGitHubForgeProvider(tools)
  const issues = await forge.listIssues()
  assert.strictEqual(issues.length, 1)
  assert.strictEqual(issues[0].number, 1)
})

test("GitHubForgeProvider lists pull requests with branches", async () => {
  const tools = createFakeTools({
    "pr list": {
      stdout: JSON.stringify([
        {
          number: 61,
          title: "Runtime capability",
          state: "OPEN",
          headRefName: "exp/env-007",
          baseRefName: "main",
          url: "https://github.com/x/y/pull/61",
        },
      ]),
    },
  })
  const forge = createGitHubForgeProvider(tools)
  const prs = await forge.listPullRequests()
  assert.deepStrictEqual(prs, [{
    number: 61,
    title: "Runtime capability",
    state: "OPEN",
    headBranch: "exp/env-007",
    baseBranch: "main",
    url: "https://github.com/x/y/pull/61",
  }])
  assert.deepStrictEqual(tools.calls[0].args.slice(0, 2), ["pr", "list"])
})

test("GitHubForgeProvider lists releases", async () => {
  const tools = createFakeTools({
    "release list": {
      stdout: JSON.stringify([
        { tagName: "v2.0.0-rc.1", name: "v2.0.0-rc.1", isDraft: false, isPrerelease: true },
        { tagName: "v1.0.0", name: "v1.0.0", isDraft: false, isPrerelease: false },
      ]),
    },
  })
  const forge = createGitHubForgeProvider(tools)
  const releases = await forge.listReleases({ limit: 5 })
  assert.strictEqual(releases.length, 2)
  assert.strictEqual(releases[0].tag, "v2.0.0-rc.1")
  assert.strictEqual(releases[0].isPrerelease, true)
  assert.strictEqual(releases[1].isDraft, false)
  assert.deepStrictEqual(tools.calls[0].args.slice(0, 2), ["release", "list"])
})

test("GitHubForgeProvider returns empty lists on unparseable output", async () => {
  const tools = createFakeTools({
    "issue list": { stdout: "not json" },
    "pr list": { stdout: "{}" },
    "release list": { stdout: "[1, 2, 3]" },
  })
  const forge = createGitHubForgeProvider(tools)
  assert.deepStrictEqual(await forge.listIssues(), [])
  assert.deepStrictEqual(await forge.listPullRequests(), [])
  assert.deepStrictEqual(await forge.listReleases(), [])
})

test("GitHubForgeProvider returns empty lists when gh fails", async () => {
  const tools = createFakeTools()
  const forge = createGitHubForgeProvider(tools)
  assert.deepStrictEqual(await forge.listIssues(), [])
  assert.deepStrictEqual(await forge.listPullRequests(), [])
  assert.deepStrictEqual(await forge.listReleases(), [])
})

test("GitHubForgeProvider creates a pull request", async () => {
  const tools = createFakeTools({
    "pr create": {
      stdout: JSON.stringify({
        number: 117,
        title: "Add feature",
        state: "OPEN",
        headRefName: "feature",
        baseRefName: "main",
        url: "https://github.com/x/y/pull/117",
      }),
    },
  })
  const forge = createGitHubForgeProvider(tools)
  const pr = await forge.createPullRequest({
    title: "Add feature",
    body: "Description",
    headBranch: "feature",
    baseBranch: "main",
  })
  assert.deepStrictEqual(pr, {
    number: 117,
    title: "Add feature",
    state: "OPEN",
    headBranch: "feature",
    baseBranch: "main",
    url: "https://github.com/x/y/pull/117",
  })
  const args = tools.calls[0].args
  assert.deepStrictEqual(args.slice(0, 2), ["pr", "create"])
  assert.ok(args.includes("--title") && args.includes("Add feature"))
  assert.ok(args.includes("--body") && args.includes("Description"))
  assert.ok(args.includes("--head") && args.includes("feature"))
  assert.ok(args.includes("--base") && args.includes("main"))
})

test("GitHubForgeProvider creates a draft pull request", async () => {
  const tools = createFakeTools({
    "pr create": {
      stdout: JSON.stringify({
        number: 118,
        title: "Draft feature",
        state: "OPEN",
        headRefName: "draft",
        baseRefName: "main",
        url: "https://github.com/x/y/pull/118",
      }),
    },
  })
  const forge = createGitHubForgeProvider(tools)
  const pr = await forge.createPullRequest({
    title: "Draft feature",
    headBranch: "draft",
    baseBranch: "main",
    draft: true,
  })
  assert.strictEqual(pr?.number, 118)
  assert.ok(tools.calls[0].args.includes("--draft"))
})

test("GitHubForgeProvider merges a pull request", async () => {
  const tools = createFakeTools({
    "pr merge": {
      stdout: JSON.stringify({
        number: 117,
        title: "Add feature",
        state: "MERGED",
        headRefName: "feature",
        baseRefName: "main",
        url: "https://github.com/x/y/pull/117",
      }),
    },
  })
  const forge = createGitHubForgeProvider(tools)
  const pr = await forge.mergePullRequest({ number: 117, strategy: "squash", deleteBranch: true })
  assert.strictEqual(pr?.state, "MERGED")
  const args = tools.calls[0].args
  assert.deepStrictEqual(args.slice(0, 3), ["pr", "merge", "117"])
  assert.ok(args.includes("--squash"))
  assert.ok(args.includes("--delete-branch"))
})

test("GitHubForgeProvider forks a repository", async () => {
  const tools = createFakeTools({
    "repo fork": { stdout: "" },
    "repo view": {
      stdout: JSON.stringify({
        name: "synth-fork",
        owner: { login: "contributor" },
        url: "https://github.com/contributor/synth-fork",
        defaultBranchRef: { name: "main" },
        description: "Fork of synth",
      }),
    },
  })
  const forge = createGitHubForgeProvider(tools)
  const repo = await forge.forkRepository({ defaultBranchOnly: true })
  assert.deepStrictEqual(repo, {
    name: "synth-fork",
    owner: "contributor",
    url: "https://github.com/contributor/synth-fork",
    defaultBranch: "main",
    description: "Fork of synth",
  })
  const args = tools.calls[0].args
  assert.deepStrictEqual(args.slice(0, 2), ["repo", "fork"])
  assert.ok(args.includes("--default-branch-only"))
})

test("GitHubForgeProvider returns undefined on failed mutation", async () => {
  const tools = createFakeTools()
  const forge = createGitHubForgeProvider(tools)
  assert.strictEqual(await forge.createPullRequest({ title: "x", headBranch: "a", baseBranch: "b" }), undefined)
  assert.strictEqual(await forge.mergePullRequest({ number: 1 }), undefined)
  assert.strictEqual(await forge.forkRepository(), undefined)
})
