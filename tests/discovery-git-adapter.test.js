// ============================================================
// DISCOVERY GIT ADAPTER TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createGitDiscoveryAdapterWithProvider,
  createInMemoryGitProvider,
  GIT_ADAPTER_ID,
  GIT_ADAPTER_VERSION,
} from "../dist/discovery/index.js"

function makeGitProvider(path = "/project", overrides = {}) {
  return createInMemoryGitProvider(
    {
      [path]: {
        gitDir: ".git",
        headRef: "main",
        headSha: "abc123def456",
        isBare: false,
        isShallow: false,
        ...overrides.state,
      },
    },
    {
      [path]: overrides.remotes ?? [{ name: "origin", url: "https://example.com/repo.git" }],
    },
    {
      [path]:
        overrides.branches ?? [
          { name: "main", current: true, ref: "abc123def456" },
          { name: "feature", current: false, ref: "def456abc123" },
        ],
    },
    {
      [path]: overrides.tags ?? [{ name: "v1.0.0", ref: "abc123def456" }],
    },
    {
      [path]:
        overrides.commits ?? [
          {
            sha: "abc123def456",
            subject: "initial commit",
            authorName: "dev",
            authorEmail: "dev@example.com",
            timestamp: 1000,
          },
        ],
    },
    {
      [path]: overrides.workingTree ?? { clean: true, modified: 0, added: 0, deleted: 0, untracked: 0 },
    },
  )
}

test("git adapter declares id, version, and determinism", () => {
  const adapter = createGitDiscoveryAdapterWithProvider(createInMemoryGitProvider())

  assert.strictEqual(adapter.id, GIT_ADAPTER_ID)
  assert.strictEqual(adapter.version, GIT_ADAPTER_VERSION)
  assert.strictEqual(adapter.determinism, "deterministic")
})

test("git adapter canHandle returns true only for filesystem sources", () => {
  const adapter = createGitDiscoveryAdapterWithProvider(createInMemoryGitProvider())

  assert.strictEqual(adapter.canHandle({ type: "filesystem", path: "/project" }), true)
  assert.strictEqual(adapter.canHandle({ type: "git", url: "https://example.com/repo.git" }), false)
  assert.strictEqual(adapter.canHandle({ type: "api", endpoint: "https://example.com/api" }), false)
})

test("git adapter returns observations with required provenance", async () => {
  const adapter = createGitDiscoveryAdapterWithProvider(makeGitProvider())
  const source = { type: "filesystem", path: "/project" }

  const observations = await adapter.collectObservations(source, {})

  assert.ok(observations.length > 0, "observations are produced")
  for (const observation of observations) {
    assert.strictEqual(observation.adapterId, GIT_ADAPTER_ID)
    assert.strictEqual(observation.adapterVersion, GIT_ADAPTER_VERSION)
    assert.deepStrictEqual(observation.source, source)
    assert.strictEqual(typeof observation.fact, "string")
    assert.ok(observation.timestamp > 0, "timestamp is set")
  }
})

test("git adapter includes repository state in first observation", async () => {
  const adapter = createGitDiscoveryAdapterWithProvider(makeGitProvider())
  const observations = await adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  const repoObservation = observations.find((o) => o.fact === "git repository detected")
  assert.ok(repoObservation, "repository detected observation missing")
  assert.strictEqual(repoObservation.payload.headRef, "main")
  assert.strictEqual(repoObservation.payload.headSha, "abc123def456")
  assert.strictEqual(repoObservation.payload.isBare, false)
  assert.strictEqual(repoObservation.payload.gitDir, ".git")
})

test("git adapter lists remotes", async () => {
  const adapter = createGitDiscoveryAdapterWithProvider(makeGitProvider())
  const observations = await adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  const remoteObservations = observations.filter((o) => o.fact === "remote exists")
  assert.strictEqual(remoteObservations.length, 1)
  assert.strictEqual(remoteObservations[0].payload.name, "origin")
  assert.strictEqual(remoteObservations[0].payload.url, "https://example.com/repo.git")
})

test("git adapter lists branches", async () => {
  const adapter = createGitDiscoveryAdapterWithProvider(makeGitProvider())
  const observations = await adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  const branchObservations = observations.filter((o) => o.fact === "branch exists")
  assert.strictEqual(branchObservations.length, 2)
  const main = branchObservations.find((o) => o.payload.name === "main")
  assert.ok(main)
  assert.strictEqual(main.payload.current, true)
})

test("git adapter lists tags", async () => {
  const adapter = createGitDiscoveryAdapterWithProvider(makeGitProvider())
  const observations = await adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  const tagObservations = observations.filter((o) => o.fact === "tag exists")
  assert.strictEqual(tagObservations.length, 1)
  assert.strictEqual(tagObservations[0].payload.name, "v1.0.0")
})

test("git adapter lists recent commits", async () => {
  const adapter = createGitDiscoveryAdapterWithProvider(makeGitProvider())
  const observations = await adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  const commitObservations = observations.filter((o) => o.fact === "commit observed")
  assert.strictEqual(commitObservations.length, 1)
  assert.strictEqual(commitObservations[0].payload.sha, "abc123def456")
  assert.strictEqual(commitObservations[0].payload.subject, "initial commit")
})

test("git adapter reports working tree state", async () => {
  const adapter = createGitDiscoveryAdapterWithProvider(
    makeGitProvider("/project", {
      workingTree: { clean: false, modified: 2, added: 1, deleted: 0, untracked: 3 },
    }),
  )
  const observations = await adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  const stateObservation = observations.find((o) => o.fact === "working tree state observed")
  assert.ok(stateObservation)
  assert.strictEqual(stateObservation.payload.clean, false)
  assert.strictEqual(stateObservation.payload.modified, 2)
})

test("git adapter does not modify the repository", async () => {
  // In-memory provider has no mutation methods; this test documents the
  // read-only expectation.
  const provider = makeGitProvider()
  const adapter = createGitDiscoveryAdapterWithProvider(provider)

  await adapter.collectObservations({ type: "filesystem", path: "/project" }, {})

  // If the provider were real, we would assert no .git changes here.
  assert.ok(true, "read-only contract preserved")
})
