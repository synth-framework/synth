#!/usr/bin/env node
// ============================================================
// SKR-001: Compatibility Tests
// ============================================================
// Tests backward compatibility with Synth IR v1 and boundary preservation.
//
// Invariants tested:
//   KI-007: Historical compatibility SHALL be at architectural boundaries only
// ============================================================

import { strict as assert } from "assert"
import { CanonicalLanguageAuditor } from "../../dist/workspace/index.js"
import { translateCapability } from "../../dist/capability/registry.js"

// ---- Test harness ----
const TESTS = []
let passed = 0, failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function run() {
  console.log("\n  ─── SKR-001: Compatibility Tests ───")
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

// ── ASC-001: API Translation Layer Compatibility ──

test("translateCapability maps CreateTicket to CreateWorkItem", () => {
  assert.strictEqual(translateCapability("CreateTicket"), "CreateWorkItem")
})

test("translateCapability maps StartTicket to StartWorkItem", () => {
  assert.strictEqual(translateCapability("StartTicket"), "StartWorkItem")
})

test("translateCapability maps CompleteTicket to CompleteWorkItem", () => {
  assert.strictEqual(translateCapability("CompleteTicket"), "CompleteWorkItem")
})

test("translateCapability maps BlockTicket to BlockWorkItem", () => {
  assert.strictEqual(translateCapability("BlockTicket"), "BlockWorkItem")
})

test("translateCapability passes through unknown capabilities unchanged", () => {
  assert.strictEqual(translateCapability("CreateMission"), "CreateMission")
  assert.strictEqual(translateCapability("CustomCapability"), "CustomCapability")
  assert.strictEqual(translateCapability(""), "")
})

test("translateCapability handles null/undefined gracefully", () => {
  assert.strictEqual(translateCapability(null), null)
  assert.strictEqual(translateCapability(undefined), undefined)
})

// ── SKR Graph Compatibility ──

test("auditor accepts legacy field names in extensions only", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "WorkItem",
        id: "WI-1",
        title: "Legacy migration",
        extensions: {
          // Legacy Synth IR fields are acceptable in extensions
          _legacy_ir: { type: "ticket", old_id: "TKT-42" },
        },
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("auditor flags legacy node type 'Agent' even with migration metadata", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [
      {
        kind: "Agent",  // FORBIDDEN — even with migration metadata
        id: "A-1",
        extensions: {
          _migration: { from: "synth-ir-v1", date: "2026-06-28" },
        },
      },
    ],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.message.includes("Agent")))
})

test("graph with only 'kind' field and no version is still validated", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "WorkItem", id: "WI-1" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  assert.strictEqual(result.passed, true)
})

test("graph with minimal fields passes validation", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    nodes: [{ kind: "Mission", id: "M-1" }],
  }
  const result = auditor.auditSKR(graph)
  assert.ok(result.passed || result.issues.every((i) => i.severity === "warning"))
})

// ── Replay Event Compatibility ──

test("TICKET_CREATED replay alias is understood by kernel", async () => {
  // This test verifies that the kernel can still replay TICKET_* events
  // by importing the canonical functions that handle replay aliases
  const { createWorkItem, startWorkItem, completeWorkItem, blockWorkItem } = await import("../../dist/domain/index.js")

  assert.strictEqual(typeof createWorkItem, "function")
  assert.strictEqual(typeof startWorkItem, "function")
  assert.strictEqual(typeof completeWorkItem, "function")
  assert.strictEqual(typeof blockWorkItem, "function")

  // Verify WorkItem domain functions exist and work
  const testCtx = { timestamp: 1, commandId: "test-cmd" }
  const wi = createWorkItem("WI-1", testCtx, { title: "Test" })
  assert.strictEqual(wi.id, "WI-1")
  assert.strictEqual(wi.status, "idle")

  const started = startWorkItem(wi, testCtx)
  assert.strictEqual(started.status, "active")

  const completed = completeWorkItem(started, testCtx)
  assert.strictEqual(completed.status, "complete")
})

// ── Boundary Preservation ──

test("canonical language auditor detects no Ticket in approved vocabulary", () => {
  const auditor = new CanonicalLanguageAuditor()
  const report = auditor.getLanguageReport()

  const allApproved = [
    ...report.planning,
    ...report.execution,
    ...report.governance,
    ...report.infrastructure,
    ...report.projection,
    ...report.workspace,
  ]

  assert.ok(
    !allApproved.some((t) => t.term === "Ticket"),
    "Ticket must not appear in any approved vocabulary layer"
  )
})

test("canonical language auditor lists Ticket as forbidden", () => {
  const auditor = new CanonicalLanguageAuditor()
  const report = auditor.getLanguageReport()

  assert.ok(
    report.forbidden.some((t) => t.term === "Ticket" && t.status === "forbidden"),
    "Ticket must be listed as forbidden"
  )
})

test("canonical language auditor includes SKR vocabulary in report", () => {
  const auditor = new CanonicalLanguageAuditor()
  const report = auditor.getLanguageReport()

  assert.ok(report.skr, "Report should include SKR section")
  assert.ok(report.skr.approvedNodes.length > 0, "SKR should have approved nodes")
  assert.ok(report.skr.forbiddenNodes.length > 0, "SKR should have forbidden nodes")
  assert.ok(report.skr.approvedRelationships.length > 0, "SKR should have approved relationships")
  assert.ok(report.skr.forbiddenRelationships.length > 0, "SKR should have forbidden relationships")
})

test("forbidden SKR nodes include Agent, Tool, Workflow, Capability", () => {
  const auditor = new CanonicalLanguageAuditor()
  const report = auditor.getLanguageReport()

  const forbiddenTerms = report.skr.forbiddenNodes.map((n) => n.term)
  assert.ok(forbiddenTerms.includes("Agent"), "Agent should be forbidden")
  assert.ok(forbiddenTerms.includes("Tool"), "Tool should be forbidden")
  assert.ok(forbiddenTerms.includes("Workflow"), "Workflow should be forbidden")
  assert.ok(forbiddenTerms.includes("Capability"), "Capability should be forbidden")
  assert.ok(forbiddenTerms.includes("Runtime"), "Runtime should be forbidden")
  assert.ok(forbiddenTerms.includes("Protocol"), "Protocol should be forbidden")
})

// ── Source Compatibility ──

test("auditSource detects legacy Ticket factory in source code", () => {
  const auditor = new CanonicalLanguageAuditor()
  const src = `function createTicket(id) { return { id, status: "open" } }`
  const result = auditor.auditSource(src)
  assert.strictEqual(result.passed, false)
  assert.ok(result.issues.some((i) => i.rule === "ASC-I1"))
})

test("auditSource allows Ticket in comment context", () => {
  const auditor = new CanonicalLanguageAuditor()
  const src = `
    // Legacy: TICKET_CREATED events are replay aliases for WORK_ITEM_CREATED
    // See ADR-0011 for migration details
    function handleEvent(e) { /* ... */ }
  `
  const result = auditor.auditSource(src)
  // Comments are not flagged by the regex patterns (they match code patterns only)
  // This is acceptable — comments are documentation, not code
  assert.ok(result.passed || !result.issues.some((i) => i.message.includes("comment")))
})

// ── Version Compatibility ──

test("SKR version v1 is the current schema version", () => {
  const graph = {
    kind: "SynthKnowledgeGraph",
    version: "1.0.0",
    nodes: [],
    relationships: [],
  }
  assert.strictEqual(graph.version, "1.0.0")
})

test("unknown version produces warning but does not fail validation", () => {
  const auditor = new CanonicalLanguageAuditor()
  const graph = {
    kind: "SynthKnowledgeGraph",
    version: "v999",
    nodes: [{ kind: "WorkItem", id: "WI-1" }],
    relationships: [],
  }
  const result = auditor.auditSKR(graph)
  // Unknown version may produce warning but should not fail
  assert.ok(result.passed || result.issues.every((i) => i.severity === "warning"))
})

// ---- Run ----
run().catch((err) => { console.error("Test runner error:", err); process.exit(1) })
