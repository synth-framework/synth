// ============================================================
// DISCOVERY REPLAY VERIFIER TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  createDefaultDiscoveryEngine,
  createFilesystemDiscoveryAdapterWithProvider,
  createFindingsProjectionCapability,
  createProjectModelProjectionCapability,
  createFilesystemCorrelationCapability,
  verifyDiscoveryReplay,
  hashCanonical,
} from "../dist/discovery/index.js"
import { createInMemoryFilesystemProvider } from "../dist/environment/index.js"

test("hashCanonical is deterministic for equivalent objects", () => {
  const a = hashCanonical({ b: 1, a: 2, nested: { z: 3, y: 4 } })
  const b = hashCanonical({ a: 2, b: 1, nested: { y: 4, z: 3 } })
  assert.strictEqual(a, b)
})

test("hashCanonical differs for different values", () => {
  const a = hashCanonical({ value: 1 })
  const b = hashCanonical({ value: 2 })
  assert.notStrictEqual(a, b)
})

test("engine discover produces exact replay for deterministic adapter", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
    "/project/README.md": "# Project",
  })
  const engine = createDefaultDiscoveryEngine({
    adapters: [createFilesystemDiscoveryAdapterWithProvider(fs)],
  })

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })

  assert.strictEqual(session.replay.status, "exact")
  assert.strictEqual(session.replay.tamperDetected, false)
  assert.ok(session.replay.stageResults.length > 0)
  assert.ok(session.replay.adapterChecks.length > 0)
  assert.strictEqual(session.replay.sessionId, session.id)
  assert.strictEqual(session.replay.sessionHash, session.hash)
  for (const stageResult of session.replay.stageResults) {
    // Verification is skipped during initial discovery because the session
    // hash is computed after the replay report is produced.
    assert.ok(
      stageResult.status === "passed" || stageResult.status === "skipped",
    )
  }
})

test("engine replay verifies a stored session", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
    "/project/README.md": "# Project",
  })
  const engine = createDefaultDiscoveryEngine({
    adapters: [createFilesystemDiscoveryAdapterWithProvider(fs)],
  })

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })
  const replay = await engine.replay(session)

  assert.strictEqual(replay.status, "exact")
  assert.strictEqual(replay.tamperDetected, false)
})

test("verifyDiscoveryReplay returns invalid when projection outputs differ", () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
  })
  const projectionCapabilities = [
    createFindingsProjectionCapability(),
    createProjectModelProjectionCapability(),
  ]

  const engine = createDefaultDiscoveryEngine({
    adapters: [createFilesystemDiscoveryAdapterWithProvider(fs)],
    projectionCapabilities,
  })

  // Build a session with a tampered projection output.
  const session = {
    schemaVersion: "synth-discovery-session-v1",
    id: "session-test",
    hash: "",
    startedAt: 1,
    completedAt: 2,
    sources: [{ type: "filesystem", path: "/project" }],
    adapters: [
      {
        adapterId: "discovery:filesystem",
        adapterVersion: "1.0.0",
        capabilityVersion: "1.0.0",
        determinism: "deterministic",
        configurationHash: "",
        source: { type: "filesystem", path: "/project" },
      },
    ],
    executionOrder: ["discovery:filesystem"],
    observations: [],
    evidenceGraph: {
      schema: "synth-discovery-evidence-v1",
      observations: [],
      claims: [],
      edges: [],
      observationIndex: {},
      claimIndex: {},
      sourceIndex: {},
    },
    projections: { findings: { schema: "synth-discovery-findings-v1", items: [] }, "project-model": { tampered: true } },
    projectionProvenance: {},
    pipeline: {
      acquisition: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
      normalization: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
      correlation: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
      projection: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
      verification: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
    },
    replay: {
      status: "exact",
      sessionId: "session-test",
      sessionHash: "",
      stageResults: [],
      adapterChecks: [],
      provenanceChecks: [],
      tamperDetected: false,
      tamperDetails: [],
      durationMs: 0,
    },
  }

  const replay = verifyDiscoveryReplay(session, [createFilesystemCorrelationCapability()], projectionCapabilities)
  assert.strictEqual(replay.status, "invalid")
  assert.strictEqual(replay.tamperDetected, true)
  const projectionStage = replay.stageResults.find((r) => r.stage === "projection")
  assert.ok(projectionStage)
  assert.strictEqual(projectionStage.status, "failed")
})

test("verifyDiscoveryReplay returns impossible when pipeline re-execution fails", () => {
  const projectionCapabilities = [
    {
      id: "discovery:failing",
      version: "1.0.0",
      projectionType: "failing",
      dependencies: [],
      project: () => {
        throw new Error("projection failure")
      },
    },
  ]

  const session = {
    schemaVersion: "synth-discovery-session-v1",
    id: "session-test",
    hash: "",
    startedAt: 1,
    completedAt: 2,
    sources: [{ type: "filesystem", path: "/project" }],
    adapters: [],
    executionOrder: [],
    observations: [],
    evidenceGraph: {
      schema: "synth-discovery-evidence-v1",
      observations: [],
      claims: [],
      edges: [],
      observationIndex: {},
      claimIndex: {},
      sourceIndex: {},
    },
    projections: {},
    projectionProvenance: {},
    pipeline: {
      acquisition: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
      normalization: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
      correlation: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
      projection: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
      verification: { inputHash: "", outputHash: "", durationMs: 0, version: "1.0.0", warnings: [] },
    },
    replay: {
      status: "exact",
      sessionId: "session-test",
      sessionHash: "",
      stageResults: [],
      adapterChecks: [],
      provenanceChecks: [],
      tamperDetected: false,
      tamperDetails: [],
      durationMs: 0,
    },
  }

  const replay = verifyDiscoveryReplay(session, [], projectionCapabilities)
  assert.strictEqual(replay.status, "impossible")
})

test("engine produces contextual replay for contextual adapters", async () => {
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

test("cross-run equivalence for deterministic adapters", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
    "/project/README.md": "# Project",
    "/project/src/index.js": "console.log('hello')",
  })
  const engine = createDefaultDiscoveryEngine({
    adapters: [createFilesystemDiscoveryAdapterWithProvider(fs)],
  })

  const sessionA = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })
  const sessionB = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })

  assert.strictEqual(sessionA.replay.status, "exact")
  assert.strictEqual(sessionB.replay.status, "exact")
  assert.strictEqual(sessionA.hash, sessionB.hash)
  assert.strictEqual(
    hashCanonical(sessionA.evidenceGraph),
    hashCanonical(sessionB.evidenceGraph),
  )
  assert.strictEqual(
    hashCanonical(sessionA.projections),
    hashCanonical(sessionB.projections),
  )
})

test("tamper detection flags a mutated session hash", async () => {
  const fs = createInMemoryFilesystemProvider({
    "/project/package.json": "{}",
  })
  const engine = createDefaultDiscoveryEngine({
    adapters: [createFilesystemDiscoveryAdapterWithProvider(fs)],
  })

  const session = await engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })

  session.hash = "tampered-hash"
  const replay = await engine.replay(session)

  assert.strictEqual(replay.status, "invalid")
  assert.strictEqual(replay.tamperDetected, true)
  assert.ok(replay.tamperDetails.some((d) => d.includes("Session hash mismatch")))
})
