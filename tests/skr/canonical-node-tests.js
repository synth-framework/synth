#!/usr/bin/env node
// ============================================================
// SKR-001: Canonical Node Tests
// ============================================================
// Tests approved and forbidden node types per SKR-001 section 4.
//
// Invariants tested:
//   KI-001: Canonical knowledge MUST NOT depend on execution
//   KI-008: The Knowledge Layer SHALL define the system's ubiquitous language
// ============================================================

import { strict as assert } from "assert"
import { CanonicalLanguageAuditor } from "../../dist/workspace/index.js"

// ---- Test harness ----
const TESTS = []
let passed = 0, failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n  ─── SKR-001: Canonical Node Tests ───")
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

// ---- Approved node types (SKR-001 Section 4.1) ----
const APPROVED_NODES = [
  "Mission", "Expedition", "Objective", "WorkItem",
  "Discovery", "Decision", "Artifact", "Observation", "Constraint",
]

// ---- Forbidden node types (SKR-001 Section 4.3) ----
const FORBIDDEN_NODES = [
  "Agent", "Tool", "Workflow", "Capability", "Runtime", "Protocol",
  "Server", "Adapter", "Plugin", "Transport", "Provider", "Connector",
  "MCP", "A2A", "GitHub", "Jira", "Linear",
]

// ---- Tests ----

test("auditor exposes approved node list", () => {
  const auditor = new CanonicalLanguageAuditor()
  assert.deepStrictEqual(auditor.skrApprovedNodes, APPROVED_NODES)
})

test("auditor exposes forbidden node list", () => {
  const auditor = new CanonicalLanguageAuditor()
  assert.deepStrictEqual(auditor.skrForbiddenNodes, FORBIDDEN_NODES)
})

test("approved nodes are all canonical engineering concepts", () => {
  // Every approved node represents engineering knowledge, not infrastructure
  const infraMarkers = ["Agent", "Tool", "Runtime", "Protocol", "Server", "Adapter"]
  for (const node of APPROVED_NODES) {
    assert.ok(
      !infraMarkers.some((m) => node.includes(m)),
      `${node} should not contain infrastructure vocabulary`
    )
  }
})

test("forbidden nodes are all infrastructure/execution concepts", () => {
  // Every forbidden node is an implementation concern
  for (const node of FORBIDDEN_NODES) {
    assert.ok(
      !APPROVED_NODES.includes(node),
      `${node} must not be in approved list`
    )
  }
})

test("detects forbidden node type 'Agent' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    nodes: [
      { kind: "Agent", id: "A-1", role: "assistant" },  // FORBIDDEN
      { kind: "WorkItem", id: "WI-1", title: "Valid item" },  // OK
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Agent")), "Should flag Agent node")
  assert.ok(result.issues.some((i) => i.rule === "SKR-I5"), "Should use SKR-I5 rule")
  assert.ok(result.issues.some((i) => i.invariant === "KI-001"), "Should reference KI-001")
})

test("detects forbidden node type 'Tool' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Tool", id: "T-1", name: "github-search" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Tool")))
})

test("detects forbidden node type 'Workflow' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Workflow", id: "WF-1", steps: [] }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Workflow")))
})

test("detects forbidden node type 'Capability' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Capability", id: "C-1", name: "file_write" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Capability")))
})

test("detects forbidden node type 'Runtime' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Runtime", id: "R-1", name: "node" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Runtime")))
})

test("detects forbidden node type 'Protocol' in knowledge graph", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Protocol", id: "P-1", name: "MCP" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Protocol")))
})

test("valid knowledge graph with only approved nodes passes", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    nodes: [
      { kind: "Mission", id: "M-1", title: "Build deterministic kernel" },
      { kind: "Expedition", id: "EXP-1", title: "Migrate terminology", status: "active" },
      { kind: "Objective", id: "OBJ-1", title: "Remove Ticket references" },
      { kind: "WorkItem", id: "WI-1", title: "Update auditor", status: "complete" },
      { kind: "Discovery", id: "D-1", title: "Capability leaked into 6 layers" },
      { kind: "Decision", id: "DC-1", title: "Capability is bytecode" },
      { kind: "Artifact", id: "ART-1", title: "SKR-001.md" },
      { kind: "Observation", id: "OBS-1", content: "Test observation" },
      { kind: "Constraint", id: "CON-1", description: "Replay must remain deterministic" },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
  assert.strictEqual(result.issues.length, 0)
})

test("valid knowledge graph with 'kind' variations on approved nodes passes", () => {
  // Sub-types of approved nodes are allowed via extensions
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    nodes: [
      {
        kind: "WorkItem",
        id: "WI-2",
        title: "Test with extensions",
        extensions: { priority: "high", platform: "backend" },  // OK — extensions allowed
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("forbidden node 'MCP' is detected (protocol vendor)", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "MCP", id: "MCP-1", version: "2025-03-26" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("MCP")))
})

test("forbidden node 'A2A' is detected (protocol vendor)", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "A2A", id: "A2A-1", version: "1.0" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("A2A")))
})

test("forbidden node 'GitHub' is detected (vendor)", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "GitHub", id: "GH-1", org: "synth" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("GitHub")))
})

test("unknown node type produces warning (forward compatibility)", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "FutureNode", id: "F-1" }],  // Unknown but not explicitly forbidden
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.ok(result.issues.some((i) => i.severity === "warning"))
  assert.ok(result.issues.some((i) => i.rule === "SKR-I6"))
})

test("detects 'kind: Agent' in YAML-like source code", () => {
  const auditor = new CanonicalLanguageAuditor()
  const src = `
    kind: Agent
    id: agent-1
    role: assistant
  `
  const result = auditor.auditSKR(src, { isSourceCode: true })
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Agent")))
  assert.ok(result.issues.some((i) => i.rule === "SKR-I1"))
})

test("empty knowledge graph passes", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    nodes: [],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
  assert.strictEqual(result.issues.length, 0)
})

test("graph without nodes array is not validated (graceful)", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = { kind: "SynthKnowledgeGraph", version: "1.0.0" }
  const result = auditor.auditSKR(graph)
  // Should not crash; passes because no nodes to validate
  assert.ok(result.passed || result.issues.length === 0 || result.issues.every((i) => i.severity === "warning"))
})

// ---- Run ----
run().catch((err) => { console.error("Test runner error:", err); process.exit(1) })
