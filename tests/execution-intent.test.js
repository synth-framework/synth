// EXP-EXEC-001 — Execution Intent Model regression tests
// Verifies that execution-intent lifecycle events update derived state.

import { rebuildState } from "../dist/runtime/replay.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import assert from "node:assert"
import test from "node:test"

function event(type, payload) {
  return {
    id: `${type}-1`,
    type,
    timestamp: Date.now(),
    transactionId: "tx-1",
    capability: "execution",
    actor: "test",
    payload,
    eventHash: "hash",
    previousHash: "prev",
  }
}

test("Execution Intent Model: lifecycle events update state", () => {
  const events = [
    event("EXECUTION_INTENT_CREATED", {
      intentId: "I-1",
      expeditionId: "E-1",
      objectiveId: "O-1",
      workItemId: "W-1",
      sequence: 0,
      capability: "filesystem",
      operation: "writeFile",
      target: "src/example.ts",
      dependencies: [],
    }),
    event("EXECUTION_INTENT_GRAPH_CREATED", {
      expeditionId: "E-1",
      branch: "exp/e-1-execution",
      intentIds: ["I-1"],
      edgeCount: 0,
    }),
    event("EXPEDITION_BRANCH_CREATED", {
      expeditionId: "E-1",
      branch: "exp/e-1-execution",
      baseCommit: "abc123",
    }),
    event("EXECUTION_INTENT_STARTED", {
      intentId: "I-1",
      expeditionId: "E-1",
    }),
    event("EXECUTION_INTENT_COMPLETED", {
      intentId: "I-1",
      expeditionId: "E-1",
      resultSummary: "wrote 42 bytes",
    }),
    event("EXPEDITION_EXECUTION_COMMITTED", {
      expeditionId: "E-1",
      commit: "def456",
    }),
    event("EXPEDITION_EXECUTION_PROJECTED", {
      expeditionId: "E-1",
      projectionType: "pull_request",
      projectionUrl: "https://github.com/synth-framework/synth/pull/124",
    }),
  ]

  const state = rebuildState(events)
  const derived = buildDerivedState(events)

  assert.strictEqual(derived.executionIntents["I-1"].status, "completed")
  assert.strictEqual(derived.executionIntents["I-1"].capability, "filesystem")
  assert.strictEqual(derived.executionGraphs["E-1"].phase, "projected")
  assert.strictEqual(derived.executionGraphs["E-1"].branch, "exp/e-1-execution")
  assert.strictEqual(derived.executionGraphs["E-1"].baseCommit, "abc123")
  assert.strictEqual(derived.executionGraphs["E-1"].resultCommit, "def456")
  assert.strictEqual(derived.executionGraphs["E-1"].projectionType, "pull_request")
})

test("Execution Intent Model: failure and rollback update phase", () => {
  const events = [
    event("EXECUTION_INTENT_CREATED", {
      intentId: "I-1",
      expeditionId: "E-1",
      objectiveId: "O-1",
      workItemId: "W-1",
      sequence: 0,
      capability: "filesystem",
      operation: "writeFile",
      target: "src/example.ts",
      dependencies: [],
    }),
    event("EXECUTION_INTENT_GRAPH_CREATED", {
      expeditionId: "E-1",
      branch: "exp/e-1-execution",
      intentIds: ["I-1"],
      edgeCount: 0,
    }),
    event("EXECUTION_INTENT_STARTED", {
      intentId: "I-1",
      expeditionId: "E-1",
    }),
    event("EXECUTION_INTENT_FAILED", {
      intentId: "I-1",
      expeditionId: "E-1",
      reason: "permission denied",
    }),
    event("EXECUTION_INTENT_ROLLEDBACK", {
      intentId: "I-1",
      expeditionId: "E-1",
    }),
  ]

  const state = rebuildState(events)
  const derived = buildDerivedState(events)

  assert.strictEqual(derived.executionIntents["I-1"].status, "rolledback")
  assert.strictEqual(derived.executionIntents["I-1"].failureReason, "permission denied")
  assert.strictEqual(derived.executionGraphs["E-1"].phase, "rolledback")
})
