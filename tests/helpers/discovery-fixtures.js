// ============================================================
// TEST HELPERS — Discovery evidence fixtures
// ============================================================
// Shared evidence-graph builder for discovery projection tests
// (discovery-project-model, discovery-project-model-rules). Single home for
// the identical makeGraph blocks (expedition 7a79e79b, round 14/140).
//
// Usage:
//   import { makeEvidenceGraph as makeGraph } from "./helpers/discovery-fixtures.js"
// ============================================================

import { createDefaultDiscoveryEngine, createFilesystemDiscoveryAdapterWithProvider } from "../../dist/discovery/index.js"
import { createInMemoryFilesystemProvider } from "../../dist/environment/index.js"
import assert from "node:assert"

/**
 * Build a synth-discovery-evidence-v1 graph from claim data. Items may be
 * `{ assertion, payload, source }` objects or bare assertion strings.
 * `sourcePath` defaults the filesystem source (and sourceIndex) when an
 * item carries no explicit source.
 */
export function makeEvidenceGraph(claimsData, { sourcePath = "/my-project" } = {}) {
  const claims = []
  const observations = []
  const edges = []
  const defaultSource = { type: "filesystem", path: sourcePath }

  for (let i = 0; i < claimsData.length; i++) {
    const item = typeof claimsData[i] === "string" ? { assertion: claimsData[i] } : claimsData[i]
    const { assertion, payload, source } = item
    const obsId = `obs-${i}`
    observations.push({
      id: obsId,
      adapterId: "discovery:filesystem",
      adapterVersion: "1.0.0",
      source: source ?? defaultSource,
      fact: assertion,
      payload,
      timestamp: 1,
    })
    const claimId = `claim-${String(i).padStart(6, "0")}`
    claims.push({
      id: claimId,
      assertion,
      observationIds: [obsId],
      adapterId: "discovery:filesystem",
      adapterVersion: "1.0.0",
      source: source ?? defaultSource,
      confidence: { value: 1, label: "certain", kind: "deterministic", reason: "test" },
    })
    edges.push({ from: obsId, to: claimId, kind: "supports" })
  }

  const observationIndex = {}
  const claimIndex = {}
  for (let i = 0; i < observations.length; i++) observationIndex[observations[i].id] = i
  for (let i = 0; i < claims.length; i++) claimIndex[claims[i].id] = i

  return {
    schema: "synth-discovery-evidence-v1",
    observations,
    claims,
    edges,
    observationIndex,
    claimIndex,
    sourceIndex: { [`filesystem:${sourcePath}`]: 0 },
  }
}

/** Build a contextual test adapter; include sourceState to preserve replay. */
export function makeContextualAdapter({ sourceState } = {}) {
  return {
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
        ...(sourceState ? { sourceState } : {}),
      },
    ],
  }
}

/** Discover with a contextual adapter; returns the session for assertions. */
export async function discoverWithContextualAdapter({ sourceState } = {}) {
  const engine = createDefaultDiscoveryEngine({
    adapters: [makeContextualAdapter({ sourceState })],
  })
  return engine.discover({
    sources: [{ type: "filesystem", path: "/project" }],
  })
}

/** Build an engine over an in-memory two-file project; shared arrange block. */
export function makeFilesystemEngine(files = { "/project/package.json": "{}", "/project/README.md": "# Project" }, options = {}) {
  const fs = createInMemoryFilesystemProvider(files)
  return createDefaultDiscoveryEngine({
    adapters: [createFilesystemDiscoveryAdapterWithProvider(fs)],
    ...options,
  })
}

/** Assert an adapter handles only filesystem sources. */
export function assertFilesystemOnlyCanHandle(adapter) {
  assert.strictEqual(adapter.canHandle({ type: "filesystem", path: "/project" }), true)
  assert.strictEqual(adapter.canHandle({ type: "git", url: "https://example.com/repo.git" }), false)
  assert.strictEqual(adapter.canHandle({ type: "api", endpoint: "https://example.com/api" }), false)
}
