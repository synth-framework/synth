// DEPENDENCY GRAPH TESTS (EXP-GATE-013 / ADR-050)
// Tests for charter parsing, status checking, and policy enforcement.

import { strict as assert } from "assert"
import {
  parseDependencyRecord,
  checkUpstreamDependencies,
} from "../dist/governance/dependency-graph.js"

// Sample charter with dependency headers
const SAMPLE_CHARTER = `# EXP-TEST-001 — Test Expedition

**Status:** Proposed
**Kind:** Engine Expedition
**Priority:** High
**Program:** EXP-PROGRAM-035
**Depends On:** EXP-GATE-001, EXP-GATE-002
**Blocks:** EXP-GATE-003

## Objective

Test the dependency parser.

## Deliverables

1. Something

## Acceptance Criteria

1. It works

## Out of Scope

- Nothing

## Relationship to Other Work

- None
`

const CHARTER_NO_DEPS = `# EXP-SOLO — Solo Expedition

**Status:** Active

## Objective

No dependencies.

## Deliverables

1. Something

## Acceptance Criteria

1. It works

## Out of Scope

- Nothing

## Relationship to Other Work

- None
`

const CHARTER_BLOCKS_ONLY = `# EXP-BLOCKER — Blocker Expedition

**Status:** Proposed
**Blocks:** EXP-DOWNSTREAM-001, EXP-DOWNSTREAM-002

## Objective

Block things.
`

// Test 1: Parse dependency record with Depends On and Blocks
function testParseFullCharter() {
  const record = parseDependencyRecord("EXP-TEST-001", SAMPLE_CHARTER)
  assert.equal(record.expeditionId, "EXP-TEST-001")
  assert.deepEqual(record.dependsOn, ["EXP-GATE-001", "EXP-GATE-002"])
  assert.deepEqual(record.blocks, ["EXP-GATE-003"])
  console.log("  [PASS] parseDependencyRecord: full charter")
}

// Test 2: Parse charter with no dependencies
function testParseNoDeps() {
  const record = parseDependencyRecord("EXP-SOLO", CHARTER_NO_DEPS)
  assert.equal(record.expeditionId, "EXP-SOLO")
  assert.deepEqual(record.dependsOn, [])
  assert.deepEqual(record.blocks, [])
  console.log("  [PASS] parseDependencyRecord: no dependencies")
}

// Test 3: Parse charter with only Blocks
function testParseBlocksOnly() {
  const record = parseDependencyRecord("EXP-BLOCKER", CHARTER_BLOCKS_ONLY)
  assert.equal(record.expeditionId, "EXP-BLOCKER")
  assert.deepEqual(record.dependsOn, [])
  assert.deepEqual(record.blocks, ["EXP-DOWNSTREAM-001", "EXP-DOWNSTREAM-002"])
  console.log("  [PASS] parseDependencyRecord: blocks only")
}

// Test 4: Check upstream dependencies — all resolved
function testAllDependenciesResolved() {
  const state = {
    expeditions: {
      "EXP-GATE-001": { id: "EXP-GATE-001", status: "completed", dependsOn: [] },
      "EXP-GATE-002": { id: "EXP-GATE-002", status: "completed", dependsOn: [] },
    },
  }
  const result = checkUpstreamDependencies("EXP-TEST-001", state, [
    { expeditionId: "EXP-TEST-001", dependsOn: ["EXP-GATE-001", "EXP-GATE-002"], blocks: [] },
  ])
  assert.equal(result.status, "resolved")
  assert.equal(result.upstreamExpeditions.length, 2)
  assert.ok(result.upstreamExpeditions.every((u) => u.resolved))
  console.log("  [PASS] checkUpstreamDependencies: all resolved")
}

// Test 5: Check upstream dependencies — blocked (all unresolved)
function testDependenciesUnresolved() {
  const state = {
    expeditions: {
      "EXP-GATE-001": { id: "EXP-GATE-001", status: "draft", dependsOn: [] },
      "EXP-GATE-002": { id: "EXP-GATE-002", status: "proposed", dependsOn: [] },
    },
  }
  const result = checkUpstreamDependencies("EXP-TEST-001", state, [
    { expeditionId: "EXP-TEST-001", dependsOn: ["EXP-GATE-001", "EXP-GATE-002"], blocks: [] },
  ])
  assert.equal(result.status, "unresolved")
  assert.equal(result.upstreamExpeditions.length, 2)
  assert.ok(result.upstreamExpeditions.every((u) => !u.resolved))
  console.log("  [PASS] checkUpstreamDependencies: unresolved")
}

// Test 6: Check upstream dependencies — partial (mixed resolved/in-progress)
function testDependenciesPartial() {
  const state = {
    expeditions: {
      "EXP-GATE-001": { id: "EXP-GATE-001", status: "completed", dependsOn: [] },
      "EXP-GATE-002": { id: "EXP-GATE-002", status: "executing", dependsOn: [] },
    },
  }
  const result = checkUpstreamDependencies("EXP-TEST-001", state, [
    { expeditionId: "EXP-TEST-001", dependsOn: ["EXP-GATE-001", "EXP-GATE-002"], blocks: [] },
  ])
  assert.equal(result.status, "partial")
  assert.equal(result.upstreamExpeditions.length, 2)
  assert.ok(result.upstreamExpeditions[0].resolved)
  assert.ok(!result.upstreamExpeditions[1].resolved)
  console.log("  [PASS] checkUpstreamDependencies: partial")
}

// Test 7: No dependencies — trivially resolved
function testNoDependencies() {
  const state = { expeditions: {} }
  const result = checkUpstreamDependencies("EXP-SOLO", state, [
    { expeditionId: "EXP-SOLO", dependsOn: [], blocks: [] },
  ])
  assert.equal(result.status, "resolved")
  assert.equal(result.upstreamExpeditions.length, 0)
  console.log("  [PASS] checkUpstreamDependencies: no deps")
}

// Test 8: Derive deps from runtime state
function testDepsFromRuntimeState() {
  const state = {
    expeditions: {
      "EXP-TEST-001": { id: "EXP-TEST-001", status: "proposed", dependsOn: ["EXP-GATE-001"] },
      "EXP-GATE-001": { id: "EXP-GATE-001", status: "completed", dependsOn: [] },
    },
  }
  const result = checkUpstreamDependencies("EXP-TEST-001", state)
  assert.equal(result.status, "resolved")
  assert.equal(result.upstreamExpeditions.length, 1)
  assert.ok(result.upstreamExpeditions[0].resolved)
  console.log("  [PASS] checkUpstreamDependencies: from runtime state")
}

console.log("\n=== Dependency Graph Tests ===\n")

testParseFullCharter()
testParseNoDeps()
testParseBlocksOnly()
testAllDependenciesResolved()
testDependenciesUnresolved()
testDependenciesPartial()
testNoDependencies()
testDepsFromRuntimeState()

console.log("\n=== All dependency graph tests passed ===\n")
