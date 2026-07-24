// ============================================================
// ADAPTER TESTS — GitHub Adapter
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createGitHubAdapter } from "../dist/adapters/github/adapter.js"
import { createAdapterRegistry } from "../dist/mission-studio/adapter-registry.js"

function createMockFetch(responses) {
  const calls = []
  return {
    fetchFn: async (url, init) => {
      calls.push({ url, init })
      const key = `${init.method || "GET"} ${url}`
      const response = responses[key]
      if (!response) {
        return {
          ok: false,
          status: 404,
          statusText: "Not Found",
          text: async () => JSON.stringify({ message: "Mock not found" }),
        }
      }
      return {
        ok: response.ok !== false,
        status: response.status || 200,
        statusText: response.statusText || "OK",
        text: async () => JSON.stringify(response.body || {}),
      }
    },
    calls,
  }
}

const baseConfig = {
  owner: "synth-org",
  repo: "synth-v2",
  token: "test-token",
  defaultBranch: "main",
}

test("AdapterRegistry lists github adapter", () => {
  const registry = createAdapterRegistry()
  assert.ok(registry.list().includes("github"))
  assert.ok(registry.list().includes("repository"))
})

test("GitHubAdapter starts in discovered state", () => {
  const adapter = createGitHubAdapter()
  assert.strictEqual(adapter.state, "discovered")
  assert.strictEqual(adapter.metadata.category, "integration")
  assert.strictEqual(adapter.metadata.kind, "github")
})

test("GitHubAdapter transitions through lifecycle", async () => {
  const adapter = createGitHubAdapter()
  await adapter.configure(baseConfig)
  assert.strictEqual(adapter.state, "configured")
  await adapter.validate()
  assert.strictEqual(adapter.state, "validated")
  await adapter.enable()
  assert.strictEqual(adapter.state, "enabled")
  await adapter.disable()
  assert.strictEqual(adapter.state, "disabled")
})

test("GitHubAdapter creates an issue", async () => {
  const { fetchFn, calls } = createMockFetch({
    "POST https://api.github.com/repos/synth-org/synth-v2/issues": {
      body: { number: 42, title: "Bug", state: "open", html_url: "https://github.com/synth-org/synth-v2/issues/42" },
    },
  })
  const adapter = createGitHubAdapter(fetchFn)
  await adapter.configure(baseConfig)
  await adapter.enable()
  const result = await adapter.createIssue("Bug", "Something is broken")
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.issue.number, 42)
  assert.strictEqual(result.issue.state, "open")
  assert.strictEqual(calls.length, 1)
})

test("GitHubAdapter creates a pull request", async () => {
  const { fetchFn, calls } = createMockFetch({
    "POST https://api.github.com/repos/synth-org/synth-v2/pulls": {
      body: {
        number: 7,
        title: "Feature",
        state: "open",
        html_url: "https://github.com/synth-org/synth-v2/pull/7",
        head: { ref: "feature/x" },
        base: { ref: "main" },
      },
    },
  })
  const adapter = createGitHubAdapter(fetchFn)
  await adapter.configure(baseConfig)
  await adapter.enable()
  const result = await adapter.createPullRequest("Feature", "feature/x", "main", "Adds feature")
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.pullRequest.number, 7)
  assert.strictEqual(result.pullRequest.head, "feature/x")
  assert.strictEqual(result.pullRequest.base, "main")
})

test("GitHubAdapter merges a pull request", async () => {
  const { fetchFn, calls } = createMockFetch({
    "PUT https://api.github.com/repos/synth-org/synth-v2/pulls/7/merge": {
      body: { sha: "abc123" },
    },
  })
  const adapter = createGitHubAdapter(fetchFn)
  await adapter.configure(baseConfig)
  await adapter.enable()
  const result = await adapter.mergePullRequest(7)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.mergeCommitSha, "abc123")
})

test("GitHubAdapter closes an issue", async () => {
  const { fetchFn, calls } = createMockFetch({
    "PATCH https://api.github.com/repos/synth-org/synth-v2/issues/42": {
      body: { number: 42, title: "Bug", state: "closed", html_url: "https://github.com/synth-org/synth-v2/issues/42" },
    },
  })
  const adapter = createGitHubAdapter(fetchFn)
  await adapter.configure(baseConfig)
  await adapter.enable()
  const result = await adapter.closeIssue(42)
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.issue.state, "closed")
})

test("GitHubAdapter health check reports healthy when authenticated", async () => {
  const { fetchFn } = createMockFetch({
    "GET https://api.github.com/user": {
      body: { login: "test-user" },
    },
    "GET https://api.github.com/repos/synth-org/synth-v2": {
      body: { full_name: "synth-org/synth-v2", default_branch: "main" },
    },
  })
  const adapter = createGitHubAdapter(fetchFn)
  await adapter.configure(baseConfig)
  await adapter.enable()
  const health = await adapter.checkHealth()
  assert.strictEqual(health.healthy, true)
  assert.strictEqual(health.checks.authenticated, true)
  assert.strictEqual(health.checks.repositoryReachable, true)
})

test("GitHubAdapter health check reports unhealthy on auth failure", async () => {
  const { fetchFn } = createMockFetch({
    "GET https://api.github.com/user": {
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      body: { message: "Bad credentials" },
    },
  })
  const adapter = createGitHubAdapter(fetchFn)
  await adapter.configure(baseConfig)
  await adapter.enable()
  const health = await adapter.checkHealth()
  assert.strictEqual(health.healthy, false)
  assert.strictEqual(health.checks.authenticated, false)
})
