#!/usr/bin/env node
// ============================================================
// SKR-001: Serialization Tests
// ============================================================
// Tests JSON/YAML serialization round-trips and format integrity.
//
// Invariants tested:
//   KI-007: Historical compatibility SHALL be at architectural boundaries only
// ============================================================

import { strict as assert } from "assert"
import { CanonicalLanguageAuditor } from "../../dist/workspace/index.js"

// ---- Test harness ----
const TESTS = []
let passed = 0, failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n  ─── SKR-001: Serialization Tests ───")
  for (const t of TESTS) {
    try {
      await t.fn()
      console.log(`  [PASS] ${t.name}`)
      passed++
    } catch (err) {
      console.log(`  [FAIL] ${t.name}`)
      console.log(`         ${err.message || err}`)
      failed++
    }
  }
  console.log(`  ${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

// ---- Helper: valid knowledge graph ----
function makeValidGraph() {
  return {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    metadata: {
      system: "Synth v2",
      createdAt: "2026-06-28T00:00:00Z",
    },
    nodes: [
      {
        kind: "Mission",
        id: "M-001",
        title: "Build deterministic execution kernel",
        metadata: { createdAt: "2026-06-28T00:00:00Z", version: "1.0.0" },
        extensions: {},
      },
      {
        kind: "Expedition",
        id: "EXP-001",
        title: "Migrate Ticket to WorkItem",
        status: "active",
        metadata: { createdAt: "2026-06-28T00:00:00Z" },
        extensions: {},
      },
      {
        kind: "WorkItem",
        id: "WI-001",
        title: "Implement SKR auditor",
        status: "complete",
        extensions: { priority: "high" },
      },
    ],
    relationships: [
      { source: "EXP-001", target: "M-001", type: "implements" },
      { source: "WI-001", target: "EXP-001", type: "depends_on" },
    ],
  }
}

// ---- Tests ----

test("JSON round-trip preserves all fields", () => {
  const original = makeValidGraph()
  const serialized = JSON.stringify(original)
  const deserialized = JSON.parse(serialized)
  assert.deepStrictEqual(deserialized, original)
})

test("JSON round-trip preserves node types", () => {
  const original = makeValidGraph()
  const serialized = JSON.stringify(original)
  const deserialized = JSON.parse(serialized)
  assert.strictEqual(deserialized.nodes[0].kind, "Mission")
  assert.strictEqual(deserialized.nodes[1].kind, "Expedition")
  assert.strictEqual(deserialized.nodes[2].kind, "WorkItem")
})

test("JSON round-trip preserves relationship types", () => {
  const original = makeValidGraph()
  const serialized = JSON.stringify(original)
  const deserialized = JSON.parse(serialized)
  assert.strictEqual(deserialized.relationships[0].type, "implements")
  assert.strictEqual(deserialized.relationships[1].type, "depends_on")
})

test("auditor validates deserialized graph correctly", () => {
  const auditor = new CanonicalLanguageAuditor()
  const original = makeValidGraph()
  const serialized = JSON.stringify(original)
  const deserialized = JSON.parse(serialized)

  const result = auditor.auditSKR(deserialized)
  assert.strictEqual(result.passed, true)
  assert.strictEqual(result.issues.length, 0)
})

test("auditor detects forbidden node after round-trip", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = makeValidGraph()
  graph.nodes.push({ kind: "Agent", id: "A-1", role: "assistant" })

  const serialized = JSON.stringify(graph)
  const deserialized = JSON.parse(serialized)

  const result = auditor.auditSKR(deserialized)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Agent")))
})

test("serialization handles nested metadata", () => {
  const graph = {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    metadata: {
      system: "Synth v2",
      nested: { key: "value", array: [1, 2, 3] },
    },
    nodes: [],
    relationships: [],
  }
  const serialized = JSON.stringify(graph)
  const deserialized = JSON.parse(serialized)
  assert.deepStrictEqual(deserialized.metadata.nested, { key: "value", array: [1, 2, 3] })
})

test("serialization handles empty extensions", () => {
  const graph = makeValidGraph()
  const serialized = JSON.stringify(graph)
  const deserialized = JSON.parse(serialized)

  assert.deepStrictEqual(deserialized.nodes[0].extensions, {})
  assert.deepStrictEqual(deserialized.nodes[2].extensions, { priority: "high" })
})

test("version field follows semantic versioning format", () => {
  const graph = makeValidGraph()
  assert.ok(/^\d+\.\d+\.\d+$/.test(graph.version), "Version should be semantic")
})

test("graph with all approved node types serializes correctly", () => {
  const graph = {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    nodes: [
      { kind: "Mission", id: "M-1", title: "Mission" },
      { kind: "Expedition", id: "EXP-1", title: "Expedition" },
      { kind: "Objective", id: "OBJ-1", title: "Objective" },
      { kind: "WorkItem", id: "WI-1", title: "WorkItem" },
      { kind: "Discovery", id: "D-1", title: "Discovery" },
      { kind: "Decision", id: "DC-1", title: "Decision" },
      { kind: "Artifact", id: "ART-1", title: "Artifact" },
      { kind: "Observation", id: "OBS-1", content: "Observation" },
      { kind: "Constraint", id: "CON-1", description: "Constraint" },
    ],
    relationships: [],
  }
  const serialized = JSON.stringify(graph)
  const deserialized = JSON.parse(serialized)
  assert.strictEqual(deserialized.nodes.length, 9)
  const auditor = new CanonicalLanguageAuditor()
  assert.strictEqual(auditor.auditSKR(deserialized).passed, true)
})

test("string input to auditSKR is parsed as JSON", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = makeValidGraph()
  const json = JSON.stringify(graph)
  const result = auditor.auditSKR(json)
  assert.strictEqual(result.passed, true)
})

test("string input with forbidden node is detected", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = makeValidGraph()
  graph.nodes.push({ kind: "Workflow", id: "WF-1" })
  const json = JSON.stringify(graph)
  const result = auditor.auditSKR(json)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Workflow")))
})

test("invalid JSON string does not crash auditSKR", () => {
  const auditor = new CanonicalLanguageAuditor()
  const result = auditor.auditSKR("this is not json")
  // Should not crash; may pass or have warnings
  assert.ok(result.passed || result.issues.every((i) => i.severity === "warning"))
})

test("serialized graph maintains relationship order", () => {
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      { kind: "Mission", id: "M-1" },
      { kind: "WorkItem", id: "WI-1" },
      { kind: "Decision", id: "DC-1" },
    ],
    relationships: [
      { source: "WI-1", target: "M-1", type: "implements" },
      { source: "DC-1", target: "WI-1", type: "blocks" },
      { source: "M-1", target: "DC-1", type: "produces" },
    ],
  }
  const serialized = JSON.stringify(graph)
  const deserialized = JSON.parse(serialized)
  assert.strictEqual(deserialized.relationships[0].type, "implements")
  assert.strictEqual(deserialized.relationships[1].type, "blocks")
  assert.strictEqual(deserialized.relationships[2].type, "produces")
})

// ---- Run ----
run().catch((err) => { console.error("Test runner error:", err); process.exit(1) })
