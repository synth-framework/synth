// ============================================================
// DISCOVERY REPLAY CONTRACT TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createDefaultDiscoveryEngine,
  createFilesystemDiscoveryAdapterWithProvider,
  createFilesystemCorrelationCapability,
  createFindingsProjectionCapability,
  createProjectModelProjectionCapability,
  verifyDiscoveryReplay,
  hashCanonical,
} from "../dist/discovery/index.js"
import { createInMemoryFilesystemProvider } from "../dist/environment/index.js"

function createFilesystemSession() {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
    "/project/README.md": "# Project",
  })
  const engine = createDefaultDiscoveryEngine({
    adapters: [createFilesystemDiscoveryAdapterWithProvider(fs)],
  })
  return engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })
}

test("deterministic filesystem adapter produces exact replay", async () => {
  const session = await createFilesystemSession()

  assert.strictEqual(session.replay.status, "exact")
  assert.strictEqual(session.replay.tamperDetected, false)
  assert.ok(session.replay.adapterChecks.every((c) => c.status === "passed"))
  assert.ok(
    session.replay.stageResults.every(
      (s) => s.status === "passed" || s.status === "skipped",
    ),
  )
})

test("replay report includes every pipeline stage result", async () => {
  const session = await createFilesystemSession()

  const stageNames = session.replay.stageResults.map((r) => r.stage)
  assert.ok(stageNames.includes("acquisition"))
  assert.ok(stageNames.includes("normalization"))
  assert.ok(stageNames.includes("correlation"))
  assert.ok(stageNames.includes("projection"))
  assert.ok(stageNames.includes("verification"))

  for (const stageResult of session.replay.stageResults) {
    assert.strictEqual(typeof stageResult.expectedHash, "string")
    assert.strictEqual(typeof stageResult.actualHash, "string")
    assert.strictEqual(typeof stageResult.invariant, "string")
    assert.ok(Array.isArray(stageResult.warnings))
  }
})

test("tampering with a stage hash is detected", async () => {
  const session = await createFilesystemSession()

  session.pipeline.normalization.outputHash = "tampered-hash"
  const replay = verifyDiscoveryReplay(
    session,
    [createFilesystemCorrelationCapability()],
    [createFindingsProjectionCapability(), createProjectModelProjectionCapability()],
  )

  assert.strictEqual(replay.status, "invalid")
  assert.strictEqual(replay.tamperDetected, true)
  const normalizationStage = replay.stageResults.find(
    (r) => r.stage === "normalization",
  )
  assert.ok(normalizationStage)
  assert.strictEqual(normalizationStage.status, "failed")
  assert.ok(
    replay.tamperDetails.some((d) => d.includes("Normalization stage hash mismatch")),
  )
})

test("tampering with an evidence claim reference is detected", async () => {
  const session = await createFilesystemSession()

  // Add a bogus claim reference to the project-model projection.
  const projectModel = session.projections["project-model"]
  assert.ok(projectModel, "project-model projection exists")
  projectModel.evidenceClaimReferences = ["claim-does-not-exist"]

  const replay = verifyDiscoveryReplay(
    session,
    [createFilesystemCorrelationCapability()],
    [createFindingsProjectionCapability(), createProjectModelProjectionCapability()],
  )

  assert.strictEqual(replay.status, "invalid")
  assert.strictEqual(replay.tamperDetected, true)
  assert.ok(
    replay.provenanceChecks.some(
      (c) =>
        c.kind === "claim-reference" &&
        c.targetId === "claim-does-not-exist" &&
        c.status === "failed",
    ),
  )
})

test("contextual adapter produces contextual replay when source state is preserved", async () => {
  const contextualAdapter = {
    id: "discovery:contextual",
    version: "1.0.0",
    determinism: "contextual",
    canHandle: (source) => source.type === "filesystem",
    collectObservations: async (source) => [
      {
        id: "ctx-1",
        adapterId: "discovery:contextual",
        adapterVersion: "1.0.0",
        source,
        fact: "contextual state observed",
        timestamp: 1,
        sourceState: { snapshot: "stable-snapshot" },
      },
    ],
  }

  const engine = createDefaultDiscoveryEngine({
    adapters: [contextualAdapter],
  })

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })

  assert.strictEqual(session.replay.status, "contextual")
  assert.strictEqual(session.replay.tamperDetected, false)
  const adapterCheck = session.replay.adapterChecks.find(
    (c) => c.adapterId === "discovery:contextual",
  )
  assert.ok(adapterCheck)
  assert.strictEqual(adapterCheck.status, "contextual")
})

test("non-deterministic adapter without source-state snapshot produces impossible replay", async () => {
  const nonDeterministicAdapter = {
    id: "discovery:non-deterministic",
    version: "1.0.0",
    determinism: "non-deterministic",
    canHandle: (source) => source.type === "filesystem",
    collectObservations: async (source) => [
      {
        id: "nd-1",
        adapterId: "discovery:non-deterministic",
        adapterVersion: "1.0.0",
        source,
        fact: "random sample observed",
        timestamp: 1,
      },
    ],
  }

  const engine = createDefaultDiscoveryEngine({
    adapters: [nonDeterministicAdapter],
  })

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })

  assert.strictEqual(session.replay.status, "impossible")
  const adapterCheck = session.replay.adapterChecks.find(
    (c) => c.adapterId === "discovery:non-deterministic",
  )
  assert.ok(adapterCheck)
  assert.strictEqual(adapterCheck.status, "failed")
})

test("non-deterministic adapter with source-state snapshot produces contextual replay", async () => {
  const nonDeterministicAdapter = {
    id: "discovery:non-deterministic",
    version: "1.0.0",
    determinism: "non-deterministic",
    canHandle: (source) => source.type === "filesystem",
    collectObservations: async (source) => [
      {
        id: "nd-1",
        adapterId: "discovery:non-deterministic",
        adapterVersion: "1.0.0",
        source,
        fact: "random sample observed",
        timestamp: 1,
        sourceState: { snapshot: "stable-snapshot" },
      },
    ],
  }

  const engine = createDefaultDiscoveryEngine({
    adapters: [nonDeterministicAdapter],
  })

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })

  assert.strictEqual(session.replay.status, "contextual")
  assert.strictEqual(session.replay.tamperDetected, false)
  const adapterCheck = session.replay.adapterChecks.find(
    (c) => c.adapterId === "discovery:non-deterministic",
  )
  assert.ok(adapterCheck)
  assert.strictEqual(adapterCheck.status, "contextual")
})

test("replay report records durationMs", async () => {
  const session = await createFilesystemSession()

  assert.strictEqual(typeof session.replay.durationMs, "number")
  assert.ok(session.replay.durationMs >= 0)
})

test("session hash matches replay sessionHash", async () => {
  const session = await createFilesystemSession()

  assert.strictEqual(session.replay.sessionHash, session.hash)
})
