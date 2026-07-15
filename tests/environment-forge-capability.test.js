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
