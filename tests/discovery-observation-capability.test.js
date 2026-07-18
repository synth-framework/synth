// ============================================================
// DISCOVERY OBSERVATION CAPABILITY CONTRACT TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createFilesystemObservationCapability,
  createFilesystemObservationCapabilityWithProvider,
  FILESYSTEM_CAPABILITY_ID,
  FILESYSTEM_CAPABILITY_VERSION,
  FILESYSTEM_OBSERVATION_CONTRACT,
  createGitObservationCapabilityWithProvider,
  GIT_CAPABILITY_ID,
  GIT_CAPABILITY_VERSION,
  GIT_OBSERVATION_CONTRACT,
  createInMemoryGitProvider,
} from "../dist/discovery/index.js"
import { createInMemoryFilesystemProvider } from "../dist/environment/index.js"

test("filesystem capability declares id, version, and contract", () => {
  const capability = createFilesystemObservationCapability()

  assert.strictEqual(capability.id, FILESYSTEM_CAPABILITY_ID)
  assert.strictEqual(capability.version, FILESYSTEM_CAPABILITY_VERSION)
  assert.ok(Array.isArray(capability.observationContract.produces))
  assert.ok(Array.isArray(capability.observationContract.neverProduces))
  assert.ok(capability.observationContract.produces.includes("directory exists"))
  assert.ok(capability.observationContract.neverProduces.includes("Node.js project"))
})

test("filesystem capability adapter can be used for discovery", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
    "/project/README.md": "# Project",
  })
  const capability = createFilesystemObservationCapabilityWithProvider(fs)

  assert.strictEqual(typeof capability.adapter.canHandle, "function")
  assert.strictEqual(typeof capability.adapter.collectObservations, "function")

  const observations = await capability.adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  const facts = observations.map((o) => o.fact)
  assert.ok(facts.includes("manifest detected"))
  assert.ok(facts.includes("file exists"))
})

test("filesystem capability never produces interpretive facts", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": JSON.stringify({ dependencies: { react: "^18" } }),
    "/project/src/index.ts": "export {}",
  })
  const capability = createFilesystemObservationCapabilityWithProvider(fs)
  const observations = await capability.adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  for (const fact of observations.map((o) => o.fact)) {
    assert.ok(
      !FILESYSTEM_OBSERVATION_CONTRACT.neverProduces.includes(fact),
      `Fact "${fact}" violates observation contract`,
    )
  }
})

test("git capability declares id, version, and contract", () => {
  const provider = createInMemoryGitProvider()
  const capability = createGitObservationCapabilityWithProvider(provider)

  assert.strictEqual(capability.id, GIT_CAPABILITY_ID)
  assert.strictEqual(capability.version, GIT_CAPABILITY_VERSION)
  assert.ok(capability.observationContract.produces.includes("git repository detected"))
  assert.ok(capability.observationContract.neverProduces.includes("healthy git repository"))
})

test("git capability adapter emits only observation facts", async () => {
  const provider = createInMemoryGitProvider(
    {
      "/project": {
        gitDir: ".git",
        headRef: "main",
        headSha: "abc123",
        isBare: false,
        isShallow: false,
      },
    },
    {
      "/project": [{ name: "origin", url: "https://example.com/repo.git" }],
    },
    {
      "/project": [{ name: "main", current: true, ref: "abc123" }],
    },
    {
      "/project": [{ name: "v1.0.0", ref: "abc123" }],
    },
    {
      "/project": [
        {
          sha: "abc123",
          subject: "initial",
          authorName: "dev",
          authorEmail: "dev@example.com",
          timestamp: 1,
        },
      ],
    },
    {
      "/project": { clean: true, modified: 0, added: 0, deleted: 0, untracked: 0 },
    },
  )

  const capability = createGitObservationCapabilityWithProvider(provider)
  const observations = await capability.adapter.collectObservations(
    { type: "filesystem", path: "/project" },
    {},
  )

  const facts = observations.map((o) => o.fact)
  assert.ok(facts.includes("git repository detected"))
  assert.ok(facts.includes("remote exists"))
  assert.ok(facts.includes("branch exists"))
  assert.ok(facts.includes("tag exists"))
  assert.ok(facts.includes("commit observed"))
  assert.ok(facts.includes("working tree state observed"))

  for (const fact of facts) {
    assert.ok(
      !GIT_OBSERVATION_CONTRACT.neverProduces.includes(fact),
      `Fact "${fact}" violates observation contract`,
    )
  }
})

test("git capability adapter reports non-git paths", async () => {
  const provider = createInMemoryGitProvider()
  const capability = createGitObservationCapabilityWithProvider(provider)
  const observations = await capability.adapter.collectObservations(
    { type: "filesystem", path: "/not-a-repo" },
    {},
  )

  assert.strictEqual(observations.length, 1)
  assert.strictEqual(observations[0].fact, "git repository not detected")
})
