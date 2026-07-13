#!/usr/bin/env node
// ============================================================
// SKR-001: Extension Tests
// ============================================================
// Tests the extensions mechanism for implementation-specific information.
//
// Invariants tested:
//   KI-005: Execution primitives MAY evolve without affecting canonical knowledge
// ============================================================

import { strict as assert } from "assert"
import { CanonicalLanguageAuditor } from "../../dist/workspace/index.js"

// ---- Test harness ----
const TESTS = []
let passed = 0, failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n  ─── SKR-001: Extension Tests ───")
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

// ---- Tests ----

test("extensions object is allowed on approved nodes", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "WorkItem",
        id: "WI-1",
        title: "Test item",
        extensions: { priority: "high", assignee: "engineer-1" },
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("empty extensions object passes", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "Mission",
        id: "M-1",
        title: "Test mission",
        extensions: {},
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("extensions can contain projection-specific data", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "WorkItem",
        id: "WI-1",
        title: "GitHub integration",
        extensions: {
          // Projection-layer data is allowed in extensions
          github: { issue_number: 42, labels: ["enhancement"] },
        },
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("extensions can contain execution-specific data", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "Decision",
        id: "DC-1",
        title: "Use event sourcing",
        extensions: {
          // Execution-layer data is allowed in extensions
          execution: { strategy: "event_sourcing", partition: "default" },
        },
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("extensions do not affect canonical node type validation", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "Agent",  // FORBIDDEN regardless of extensions
        id: "A-1",
        extensions: { valid: "data" },
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Agent")))
})

test("extensions survive JSON round-trip", () => {
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "WorkItem",
        id: "WI-1",
        title: "Test",
        extensions: {
          custom: { nested: { deep: "value" }, array: [1, 2, 3] },
        },
      },
    ],
    relationships: [],
  }
  const serialized = JSON.stringify(graph)
  const deserialized = JSON.parse(serialized)
  assert.deepStrictEqual(deserialized.nodes[0].extensions, graph.nodes[0].extensions)
})

test("extensions with null values survive round-trip", () => {
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "WorkItem",
        id: "WI-1",
        extensions: { nullable: null, flag: true },
      },
    ],
    relationships: [],
  }
  const serialized = JSON.stringify(graph)
  const deserialized = JSON.parse(serialized)
  assert.strictEqual(deserialized.nodes[0].extensions.nullable, null)
  assert.strictEqual(deserialized.nodes[0].extensions.flag, true)
})

test("extensions with array values survive round-trip", () => {
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "Discovery",
        id: "D-1",
        extensions: { tags: ["architecture", "performance", "security"] },
      },
    ],
    relationships: [],
  }
  const serialized = JSON.stringify(graph)
  const deserialized = JSON.parse(serialized)
  assert.deepStrictEqual(deserialized.nodes[0].extensions.tags, ["architecture", "performance", "security"])
})

test("node without extensions field passes validation", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      { kind: "WorkItem", id: "WI-1", title: "No extensions" },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("multiple nodes with different extensions all pass", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "Mission",
        id: "M-1",
        extensions: { roadmap: "Q3-2026" },
      },
      {
        kind: "Expedition",
        id: "EXP-1",
        extensions: { sprint_length: 14, team_size: 4 },
      },
      {
        kind: "WorkItem",
        id: "WI-1",
        extensions: { github: { pr: 123 }, priority: "high" },
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("extensions object must not redefine 'kind' as forbidden type", () => {
  // The extensions object itself is free-form, but the node's kind is still validated
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "Artifact",  // Approved node type
        id: "ART-1",
        extensions: {
          // It's OK to reference forbidden types inside extensions
          // — extensions are implementation-specific
          generated_by: "Agent",
          uses_tool: "github-search",
          runtime_env: "node-20",
        },
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  // Extensions are allowed to contain any data; only 'kind' is validated
  assert.strictEqual(result.passed, true)
})

// ---- Run ----
run().catch((err) => { console.error("Test runner error:", err); process.exit(1) })
