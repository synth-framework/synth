// EXP-EXEC-003 — Branch-per-Expedition Workflow regression tests

import {
  synthesizeIntents,
  buildIntentGraph,
  deriveExpeditionBranch,
  executeGraph,
} from "../dist/execution/index.js"
import assert from "node:assert"
import test from "node:test"
import { makeWorkItem, makeExpedition, makeObjective, makeVersioningHandler, synthesizeSingleObjectiveIntents, EXEC_OPTIONS } from "./helpers/execution-fixtures.js"

test("deriveExpeditionBranch: produces deterministic branch name", () => {
  assert.strictEqual(deriveExpeditionBranch("EXP-1"), "exp/EXP-1")
  assert.strictEqual(deriveExpeditionBranch("EXP-123"), "exp/EXP-123")
  // Deterministic: same input produces same output.
  assert.strictEqual(deriveExpeditionBranch("EXP-1"), "exp/EXP-1")
})

test("executeGraph: creates expedition branch before executing intents", async () => {
  const intents = synthesizeSingleObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: makeVersioningHandler({
        onSwitchRevision: (intent) => {
          assert.strictEqual(intent.target, "exp/EXP-1")
          assert.strictEqual(intent.payload.branch, "exp/EXP-1")
          assert.strictEqual(intent.payload.createBranch, true)
          return { success: true, result: { commit: "baseabc123" } }
        },
        onCreateRevision: (intent) => {
          assert.strictEqual(intent.payload.message, "expedition(EXP-1): OBJ-1")
          assert.strictEqual(intent.payload.includeUntracked, true)
          return { success: true, result: { commit: "resultdef456" } }
        },
      }),
    },
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
  })

  const branchCreated = events.find((e) => e.type === "EXPEDITION_BRANCH_CREATED")
  assert.ok(branchCreated, "EXPEDITION_BRANCH_CREATED event missing")
  assert.strictEqual(branchCreated.payload.expeditionId, "EXP-1")
  assert.strictEqual(branchCreated.payload.branch, "exp/EXP-1")
  assert.strictEqual(branchCreated.payload.baseCommit, "baseabc123")

  const completed = events.filter((e) => e.type === "EXECUTION_INTENT_COMPLETED")
  assert.strictEqual(completed.length, 1)
})

test("executeGraph: halts when branch creation fails", async () => {
  const intents = synthesizeSingleObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: async () => ({ success: false, error: "branch already exists" }),
    },
    ...EXEC_OPTIONS,
  })

  const branchCreated = events.find((e) => e.type === "EXPEDITION_BRANCH_CREATED")
  assert.ok(!branchCreated, "EXPEDITION_BRANCH_CREATED should not be emitted on failure")

  const failed = events.find((e) => e.type === "EXECUTION_INTENT_FAILED")
  assert.ok(failed)
  assert.ok(String(failed.payload.reason).includes("branch already exists"))

  const completed = events.filter((e) => e.type === "EXECUTION_INTENT_COMPLETED")
  assert.strictEqual(completed.length, 0)
})

test("executeGraph: skips branch creation when no versioning handler is provided", async () => {
  const intents = synthesizeSingleObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
    },
    ...EXEC_OPTIONS,
  })

  const branchCreated = events.find((e) => e.type === "EXPEDITION_BRANCH_CREATED")
  assert.ok(!branchCreated, "EXPEDITION_BRANCH_CREATED should not be emitted without versioning handler")

  const completed = events.filter((e) => e.type === "EXECUTION_INTENT_COMPLETED")
  assert.strictEqual(completed.length, 1)
})
