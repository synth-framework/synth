// ============================================================
// DISCOVERY PROJECTION CAPABILITY EXECUTOR TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { executeProjectionCapabilities, hashCanonical } from "../dist/discovery/index.js"

function emptyGraph() {
  return {
    schema: "synth-discovery-evidence-v1",
    observations: [],
    claims: [],
    edges: [],
    observationIndex: {},
    claimIndex: {},
    sourceIndex: {},
  }
}

function makeCapability(projectionType, dependencies, project, id = projectionType) {
  return {
    id,
    version: "1.0.0",
    projectionType,
    dependencies,
    project,
  }
}

test("executeProjectionCapabilities runs projections in dependency order", () => {
  const order = []
  const capabilities = [
    makeCapability("a", [], () => {
      order.push("a")
      return "A"
    }),
    makeCapability("b", ["a"], () => {
      order.push("b")
      return "B"
    }),
    makeCapability("c", ["a"], () => {
      order.push("c")
      return "C"
    }),
  ]

  const { outputs } = executeProjectionCapabilities(emptyGraph(), capabilities)

  assert.strictEqual(outputs.a, "A")
  assert.strictEqual(outputs.b, "B")
  assert.strictEqual(outputs.c, "C")
  assert.strictEqual(order.indexOf("a") < order.indexOf("b"), true)
  assert.strictEqual(order.indexOf("a") < order.indexOf("c"), true)
})

test("executeProjectionCapabilities rejects dependency cycles", () => {
  const capabilities = [
    makeCapability("a", ["b"], () => "A"),
    makeCapability("b", ["a"], () => "B"),
  ]

  assert.throws(
    () => executeProjectionCapabilities(emptyGraph(), capabilities),
    /cycle detected/,
  )
})

test("executeProjectionCapabilities rejects missing dependencies", () => {
  const capabilities = [
    makeCapability("a", ["missing"], () => "A"),
  ]

  assert.throws(
    () => executeProjectionCapabilities(emptyGraph(), capabilities),
    /unknown dependency/,
  )
})

test("executeProjectionCapabilities is referentially transparent", () => {
  const capabilities = [
    makeCapability("mutator", [], (context) => {
      // Attempt to mutate the shared context.
      context.priorOutputs["tampered"] = true
      return { ok: true }
    }),
    makeCapability("observer", ["mutator"], (context) => {
      return { sawTampering: "tampered" in context.priorOutputs }
    }),
  ]

  const { outputs } = executeProjectionCapabilities(emptyGraph(), capabilities)

  assert.strictEqual(outputs.mutator.ok, true)
  assert.strictEqual(outputs.observer.sawTampering, false)
})

test("executeProjectionCapabilities records projection provenance", () => {
  const graph = emptyGraph()
  const capabilities = [
    makeCapability("first", [], () => ({ value: 1 }), "capability:first"),
    makeCapability("second", ["first"], () => ({ value: 2 }), "capability:second"),
  ]

  const { provenance } = executeProjectionCapabilities(graph, capabilities)

  assert.ok(provenance.first, "first provenance recorded")
  assert.ok(provenance.second, "second provenance recorded")
  assert.strictEqual(provenance.first.evidenceGraphHash, hashCanonical(graph))
  assert.deepStrictEqual(provenance.first.priorOutputHashes, {})
  assert.strictEqual(provenance.first.capabilityVersions["capability:first"], "1.0.0")
  assert.ok("first" in provenance.second.priorOutputHashes)
})

test("executeProjectionCapabilities returns empty results for no capabilities", () => {
  const { outputs, provenance } = executeProjectionCapabilities(emptyGraph(), [])

  assert.deepStrictEqual(outputs, {})
  assert.deepStrictEqual(provenance, {})
})
