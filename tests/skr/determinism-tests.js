#!/usr/bin/env node
// ============================================================
// SKR-001: Determinism Tests
// ============================================================
// Tests that SKR operations produce identical results under identical inputs.
// This is the knowledge-layer counterpart to the execution kernel's determinism.
//
// Invariants tested:
//   KI-001: Canonical knowledge MUST NOT depend on execution
//   KI-007: Historical compatibility SHALL be at architectural boundaries only
// ============================================================

import { strict as assert } from "assert"
import { CanonicalLanguageAuditor } from "../../dist/workspace/index.js"

// ---- Test harness ----
const TESTS = []
let passed = 0, failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n  ─── SKR-001: Determinism Tests ───")
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
function makeGraph() {
  return {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    metadata: { system: "Synth v2", createdAt: "2026-06-28T00:00:00Z" },
    nodes: [
      { kind: "Mission", id: "M-001", title: "Build deterministic kernel" },
      { kind: "Expedition", id: "EXP-001", title: "Migrate terminology" },
      { kind: "WorkItem", id: "WI-001", title: "Implement auditor" },
    ],
    relationships: [
      { source: "EXP-001", target: "M-001", type: "implements" },
      { source: "WI-001", target: "EXP-001", type: "depends_on" },
    ],
  }
}

// ---- Tests ----

test("auditSKR produces identical results for identical inputs", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = makeGraph()

  const result1 = auditor.auditSKR(graph)
  const result2 = auditor.auditSKR(graph)

  assert.deepStrictEqual(result1.issues, result2.issues)
  assert.strictEqual(result1.passed, result2.passed)
  assert.strictEqual(result1.issues.length, result2.issues.length)
})

test("auditSKR produces identical results for identical inputs (JSON string)", () => {
  const auditor = new CanonicalLanguageAuditor()
  const json = JSON.stringify(makeGraph())

  const result1 = auditor.auditSKR(json)
  const result2 = auditor.auditSKR(json)

  assert.deepStrictEqual(result1.issues, result2.issues)
  assert.strictEqual(result1.passed, result2.passed)
})

test("auditSKR produces identical results for deep-equal objects", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph1 = makeGraph()
  const graph2 = makeGraph()

  const result1 = auditor.auditSKR(graph1)
  const result2 = auditor.auditSKR(graph2)

  assert.deepStrictEqual(result1.issues, result2.issues)
  assert.strictEqual(result1.passed, result2.passed)
})

test("auditSource produces identical results for identical inputs", () => {
  const auditor = new CanonicalLanguageAuditor()
  const src = `function createWorkItem(id) { return { id, status: "idle" } }`

  const result1 = auditor.auditSource(src)
  const result2 = auditor.auditSource(src)

  assert.deepStrictEqual(result1.issues, result2.issues)
  assert.strictEqual(result1.passed, result2.passed)
})

test("auditSource is deterministic across multiple invocations", () => {
  const auditor = new CanonicalLanguageAuditor()
  const src = `
    function createMission(id) { return { kind: "Mission", id } }
    function createWorkItem(id) { return { kind: "WorkItem", id } }
    const graph = {
      kind: "SynthKnowledgeGraph",
      nodes: [
        { kind: "Mission", id: "M-1" },
        { kind: "WorkItem", id: "WI-1" },
      ]
    }
  `

  const results = []
  for (let i = 0; i < 10; i++) {
    results.push(auditor.auditSource(src))
  }

  for (let i = 1; i < results.length; i++) {
    assert.deepStrictEqual(results[0].issues, results[i].issues)
    assert.strictEqual(results[0].passed, results[i].passed)
  }
})

test("forbidden node detection is deterministic", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      { kind: "Agent", id: "A-1" },
      { kind: "Tool", id: "T-1" },
    ],
    relationships: [],
  }

  const results = []
  for (let i = 0; i < 5; i++) {
    results.push(auditor.auditSKR(graph))
  }

  // All should fail with same number of issues
  const issueCounts = new Set(results.map((r) => r.issues.length))
  assert.strictEqual(issueCounts.size, 1, "All runs should produce same issue count")

  // All should find Agent and Tool
  for (const result of results) {
    assert.ok(result.issues.some((i) => i.message.includes("Agent")))
    assert.ok(result.issues.some((i) => i.message.includes("Tool")))
  }
})

test("approved node audit is deterministic for all types", () => {
  const auditor = new CanonicalLanguageAuditor()
  const approvedNodes = [
    "Mission", "Expedition", "Objective", "WorkItem",
    "Discovery", "Decision", "Artifact", "Observation", "Constraint",
  ]

  for (const nodeType of approvedNodes) {
    const graph = {
      kind: "SynthKnowledgeGraph",
      nodes: [{ kind: nodeType, id: "N-1" }],
      relationships: [],
    }
    const results = []
    for (let i = 0; i < 3; i++) {
      results.push(auditor.auditSKR(graph))
    }
    assert.strictEqual(new Set(results.map((r) => r.passed)).size, 1,
      `${nodeType} audit should be deterministic`)
    assert.strictEqual(results[0].passed, true,
      `${nodeType} should pass`)
  }
})

test("timestamp is the only non-deterministic field in audit result", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = makeGraph()

  const result1 = auditor.auditSKR(graph)
  // Small delay to ensure different timestamps
  const start = Date.now()
  while (Date.now() - start < 10) { /* spin */ }
  const result2 = auditor.auditSKR(graph)

  // Everything except timestamp should be identical
  assert.deepStrictEqual(result1.issues, result2.issues)
  assert.strictEqual(result1.passed, result2.passed)
  // Timestamps may differ
  assert.ok(result2.timestamp >= result1.timestamp, "Timestamp should not decrease")
})

test("concurrent audits on same input produce identical results", async () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = makeGraph()

  // Launch multiple concurrent audits
  const promises = []
  for (let i = 0; i < 20; i++) {
    promises.push(Promise.resolve(auditor.auditSKR(graph)))
  }

  const results = await Promise.all(promises)

  // All should pass with zero issues
  assert.ok(results.every((r) => r.passed), "All concurrent audits should pass")
  assert.ok(results.every((r) => r.issues.length === 0), "All concurrent audits should have zero issues")
})

test("auditor state does not mutate between audits", () => {
  const auditor = new CanonicalLanguageAuditor()

  const beforeApproved = [...auditor.skrApprovedNodes]
  const beforeForbidden = [...auditor.skrForbiddenNodes]
  const beforeRels = [...auditor.skrApprovedRelationships]

  // Run multiple audits
  auditor.auditSKR(makeGraph())
  auditor.auditSKR({ kind: "SynthKnowledgeGraph", nodes: [{ kind: "Agent", id: "A-1" }], relationships: [] })
  auditor.auditSource("function test() {}")

  const afterApproved = [...auditor.skrApprovedNodes]
  const afterForbidden = [...auditor.skrForbiddenNodes]
  const afterRels = [...auditor.skrApprovedRelationships]

  assert.deepStrictEqual(beforeApproved, afterApproved, "Approved nodes should not mutate")
  assert.deepStrictEqual(beforeForbidden, afterForbidden, "Forbidden nodes should not mutate")
  assert.deepStrictEqual(beforeRels, afterRels, "Approved relationships should not mutate")
})

// ---- Run ----
run().catch((err) => { console.error("Test runner error:", err); process.exit(1) })
