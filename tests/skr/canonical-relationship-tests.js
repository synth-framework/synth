#!/usr/bin/env node
// ============================================================
// SKR-001: Canonical Relationship Tests
// ============================================================
// Tests approved and forbidden relationship types per SKR-001 section 4.
//
// Invariants tested:
//   KI-002: Execution vocabulary MUST remain below planning
//   KI-003: Protocol vocabulary MUST remain below projection
// ============================================================

import { strict as assert } from "assert"
import { CanonicalLanguageAuditor } from "../../dist/workspace/index.js"

// ---- Test harness ----
const TESTS = []
let passed = 0, failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n  ─── SKR-001: Canonical Relationship Tests ───")
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

// ---- Approved relationship types (SKR-001 Section 4.2) ----
const APPROVED_RELS = [
  "depends_on", "implements", "supports", "derived_from",
  "discovers", "produces", "invalidates", "blocks", "relates_to", "references",
]

// ---- Forbidden relationship types (SKR-001 Section 4.4) ----
const FORBIDDEN_RELS = [
  "invoke", "execute", "rpc", "call", "tool_use", "http_request",
  "capability_invoke", "workflow_trigger", "agent_dispatch",
]

// ---- Tests ----

test("auditor exposes approved relationship list", () => {
  const auditor = new CanonicalLanguageAuditor()
  assert.deepStrictEqual(auditor.skrApprovedRelationships, APPROVED_RELS)
})

test("auditor exposes forbidden relationship list", () => {
  const auditor = new CanonicalLanguageAuditor()
  assert.deepStrictEqual(auditor.skrForbiddenRelationships, FORBIDDEN_RELS)
})

test("approved relationships are all semantic (not execution mechanisms)", () => {
  for (const rel of APPROVED_RELS) {
    assert.ok(
      !FORBIDDEN_RELS.includes(rel),
      `${rel} must not be in forbidden list`
    )
    // Approved relationships express meaning, not action
    assert.ok(
      !["invoke", "execute", "call", "trigger", "dispatch"].some((f) => rel.includes(f)),
      `${rel} should not contain action verbs reserved for execution`
    )
  }
})

test("forbidden relationships are all execution mechanisms", () => {
  for (const rel of FORBIDDEN_RELS) {
    assert.ok(
      !APPROVED_RELS.includes(rel),
      `${rel} must not be in approved list`
    )
  }
})

test("detects forbidden relationship 'invoke' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      { kind: "WorkItem", id: "WI-1" },
      { kind: "WorkItem", id: "WI-2" },
    ],
    relationships: [
      { source: "WI-1", target: "WI-2", type: "invoke" },  // FORBIDDEN
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("invoke")))
  assert.ok(result.issues.some((i) => i.rule === "SKR-I7"))
  assert.ok(result.issues.some((i) => i.invariant === "KI-002"))
})

test("detects forbidden relationship 'execute' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "WorkItem", id: "WI-1" }],
    relationships: [
      { source: "WI-1", target: "WI-1", type: "execute" },  // FORBIDDEN
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("execute")))
})

test("detects forbidden relationship 'tool_use' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Discovery", id: "D-1" }],
    relationships: [
      { source: "D-1", target: "D-1", type: "tool_use" },  // FORBIDDEN
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("tool_use")))
})

test("detects forbidden relationship 'capability_invoke' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Decision", id: "DC-1" }],
    relationships: [
      { source: "DC-1", target: "DC-1", type: "capability_invoke" },  // FORBIDDEN
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("capability_invoke")))
})

test("detects forbidden relationship 'workflow_trigger' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Mission", id: "M-1" }],
    relationships: [
      { source: "M-1", target: "M-1", type: "workflow_trigger" },  // FORBIDDEN
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("workflow_trigger")))
})

test("detects forbidden relationship 'agent_dispatch' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Expedition", id: "EXP-1" }],
    relationships: [
      { source: "EXP-1", target: "EXP-1", type: "agent_dispatch" },  // FORBIDDEN
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("agent_dispatch")))
})

test("valid graph with approved relationships passes", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    nodes: [
      { kind: "Mission", id: "M-1" },
      { kind: "Expedition", id: "EXP-1" },
      { kind: "Objective", id: "OBJ-1" },
      { kind: "WorkItem", id: "WI-1" },
      { kind: "Discovery", id: "D-1" },
      { kind: "Decision", id: "DC-1" },
    ],
    relationships: [
      { source: "EXP-1", target: "M-1", type: "implements" },
      { source: "OBJ-1", target: "EXP-1", type: "supports" },
      { source: "WI-1", target: "OBJ-1", type: "depends_on" },
      { source: "D-1", target: "WI-1", type: "discovers" },
      { source: "DC-1", target: "D-1", type: "derived_from" },
      { source: "M-1", target: "DC-1", type: "produces" },
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
  assert.strictEqual(result.issues.length, 0)
})

test("all approved relationship types pass individually", () => {
  const auditor = new CanonicalLanguageAuditor()
  for (const relType of APPROVED_RELS) {
    const graph = {
      kind: "SynthKnowledgeGraph",
      nodes: [
        { kind: "WorkItem", id: "WI-a" },
        { kind: "WorkItem", id: "WI-b" },
      ],
      relationships: [
        { source: "WI-a", target: "WI-b", type: relType },
      ],
    }
    const result = auditor.auditSKR(graph)
    assert.strictEqual(result.passed, true, `Relationship '${relType}' should be valid`)
  }
})

test("unknown relationship type produces warning (forward compatibility)", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      { kind: "WorkItem", id: "WI-1" },
      { kind: "WorkItem", id: "WI-2" },
    ],
    relationships: [
      { source: "WI-1", target: "WI-2", type: "future_relationship" },  // Unknown
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.ok(result.issues.some((i) => i.severity === "warning"))
  assert.ok(result.issues.some((i) => i.rule === "SKR-I8"))
})

test("graph with no relationships passes", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Mission", id: "M-1" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("graph with mixed valid and forbidden relationships flags only forbidden", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      { kind: "WorkItem", id: "WI-1" },
      { kind: "WorkItem", id: "WI-2" },
      { kind: "WorkItem", id: "WI-3" },
    ],
    relationships: [
      { source: "WI-1", target: "WI-2", type: "depends_on" },    // OK
      { source: "WI-2", target: "WI-3", type: "invoke" },        // FORBIDDEN
      { source: "WI-3", target: "WI-1", type: "supports" },      // OK
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.strictEqual(result.issues.length, 1)
  assert.ok(result.issues[0].message.includes("invoke"))
})

test("'blocks' is an approved relationship (negative relationships allowed)", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      { kind: "Decision", id: "DC-1" },
      { kind: "WorkItem", id: "WI-1" },
    ],
    relationships: [
      { source: "DC-1", target: "WI-1", type: "blocks" },  // OK — approved
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("'invalidates' is an approved relationship (decision consequences)", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      { kind: "Decision", id: "DC-1" },
      { kind: "Artifact", id: "ART-1" },
    ],
    relationships: [
      { source: "DC-1", target: "ART-1", type: "invalidates" },  // OK — approved
    ],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

// ---- Run ----
run().catch((err) => { console.error("Test runner error:", err); process.exit(1) })
