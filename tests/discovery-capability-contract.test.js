// ============================================================
// DISCOVERY CAPABILITY CONTRACT TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { makeFilesystemEngine } from "./helpers/discovery-fixtures.js"

test("DefaultDiscoveryEngine implements DiscoveryCapability", async () => {
  const engine = makeFilesystemEngine()

  assert.strictEqual(typeof engine.discover, "function")
  assert.strictEqual(typeof engine.replay, "function")
})

test("discover returns a DiscoverySession with required fields", async () => {
  const engine = makeFilesystemEngine()

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })

  assert.strictEqual(session.schemaVersion, "synth-discovery-session-v1")
  assert.ok(session.id, "session id is present")
  assert.ok(session.hash, "session hash is present")
  assert.ok(session.startedAt > 0, "startedAt is set")
  assert.ok(session.completedAt >= session.startedAt, "completedAt is after startedAt")
  assert.deepStrictEqual(session.sources, [{ type: "filesystem", path: "/project" }])
  assert.ok(Array.isArray(session.adapters), "adapters is an array")
  assert.ok(Array.isArray(session.executionOrder), "executionOrder is an array")
  assert.ok(Array.isArray(session.observations), "observations is an array")
  assert.strictEqual(session.evidenceGraph.schema, "synth-discovery-evidence-v1")
  assert.ok(Array.isArray(session.evidenceGraph.claims), "evidenceGraph.claims is an array")
  assert.strictEqual(session.projections.findings.schema, "synth-discovery-findings-v1")
  assert.strictEqual(session.projections["project-model"].schemaVersion, "synth-project-model-v1")
  assert.ok(session.replay, "replay is present")
})

test("discover runs only adapters that can handle the source", async () => {
  const engine = makeFilesystemEngine({ "/project/package.json": "{}" })

  const session = await engine.discover({
    sources: [{ type: "git", url: "https://example.com/repo.git" }],
  })

  assert.strictEqual(session.adapters.length, 0)
  assert.strictEqual(session.observations.length, 0)
  assert.strictEqual(session.evidenceGraph.claims.length, 0)
})

test("replay verifies a deterministic session as exact", async () => {
  const engine = makeFilesystemEngine()

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })

  const replay = await engine.replay(session)
  assert.strictEqual(replay.status, "exact")
  assert.strictEqual(replay.tamperDetected, false)
  assert.ok(replay.stageResults.every((r) => r.status === "passed"))
  assert.ok(replay.adapterChecks.every((c) => c.status === "passed"))
})

test("session lineage supports parentSessionId", async () => {
  const engine = makeFilesystemEngine({ "/project/package.json": "{}" })

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
    parentSessionId: "parent-123",
  })

  assert.strictEqual(session.parentSessionId, "parent-123")
})
