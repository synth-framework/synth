// ============================================================
// DISCOVERY CORRELATE STAGE TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { correlateEvidence, createFilesystemCorrelationCapability } from "../dist/discovery/index.js"

function obs(fact, payload, overrides = {}) {
  return {
    id: `obs-${overrides.id ?? fact}`,
    adapterId: "discovery:filesystem",
    adapterVersion: "1.0.0",
    source: { type: "filesystem", path: "/project" },
    fact,
    payload,
    timestamp: 1,
    ...overrides,
  }
}

test("correlate produces an EvidenceGraph with schema and indexes", () => {
  const observations = [obs("filesystem directory exists")]
  const graph = correlateEvidence(observations, [createFilesystemCorrelationCapability()])

  assert.strictEqual(graph.schema, "synth-discovery-evidence-v1")
  assert.ok(Array.isArray(graph.claims))
  assert.ok(Array.isArray(graph.edges))
  assert.ok(graph.observationIndex["obs-filesystem directory exists"] !== undefined)
  assert.ok(graph.claimIndex[graph.claims[0].id] !== undefined)
})

test("correlate creates claims from matching rules", () => {
  const observations = [
    obs("filesystem directory exists"),
    obs("manifest detected", { type: "node", path: "/project/package.json" }),
    obs("file exists", { kind: "readme", path: "/project/README.md" }),
  ]
  const graph = correlateEvidence(observations, [createFilesystemCorrelationCapability()])

  const assertions = graph.claims.map((c) => c.assertion)
  assert.ok(assertions.includes("Source directory observed"))
  assert.ok(assertions.includes("Node.js project manifest present"))
  assert.ok(assertions.includes("Documentation present"))
})

test("correlate creates fallback claims for unmatched observations", () => {
  const observations = [obs("custom fact", { value: 1 })]
  const graph = correlateEvidence(observations, [createFilesystemCorrelationCapability()])

  assert.strictEqual(graph.claims.length, 1)
  assert.strictEqual(graph.claims[0].assertion, "custom fact")
  assert.deepStrictEqual(graph.claims[0].observationIds, ["obs-custom fact"])
})

test("correlate creates supports edges from observations to claims", () => {
  const observations = [obs("file exists", { kind: "readme", path: "/project/README.md" })]
  const graph = correlateEvidence(observations, [createFilesystemCorrelationCapability()])

  assert.strictEqual(graph.edges.length, 1)
  assert.strictEqual(graph.edges[0].from, "obs-file exists")
  assert.strictEqual(graph.edges[0].to, graph.claims[0].id)
  assert.strictEqual(graph.edges[0].kind, "supports")
})

test("correlate respects payload constraints when matching rules", () => {
  const observations = [
    obs("directory exists", { kind: "implementation", path: "/project/src" }),
    obs("directory exists", { kind: "docs", path: "/project/docs" }),
  ]
  const graph = correlateEvidence(observations, [createFilesystemCorrelationCapability()])

  const assertions = graph.claims.map((c) => c.assertion)
  assert.ok(assertions.includes("Implementation directory observed"))
  assert.ok(assertions.includes("Docs directory observed"))
})

test("correlate sorts claims by rule priority", () => {
  const observations = [
    obs("file exists", { kind: "readme", path: "/project/README.md" }),
    obs("manifest detected", { type: "node", path: "/project/package.json" }),
    obs("filesystem directory exists"),
  ]
  const graph = correlateEvidence(observations, [createFilesystemCorrelationCapability()])

  const assertions = graph.claims.map((c) => c.assertion)
  assert.strictEqual(assertions[0], "Source directory observed")
  assert.strictEqual(assertions[1], "Node.js project manifest present")
  assert.strictEqual(assertions[2], "Documentation present")
})

test("correlate preserves observation payloads in graph", () => {
  const observations = [obs("custom fact", { value: 42 })]
  const graph = correlateEvidence(observations, [createFilesystemCorrelationCapability()])

  assert.strictEqual(graph.observations[0].payload.value, 42)
})
