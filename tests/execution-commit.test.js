// EXP-EXEC-004 — Commit-as-Evidence regression tests

import {
  synthesizeIntents,
  buildIntentGraph,
  executeGraph,
} from "../dist/execution/index.js"
import assert from "node:assert"
import test from "node:test"
import { makeWorkItem, makeExpedition, makeObjective, makeVersioningHandler, synthesizeSingleObjectiveIntents, synthesizeTwoObjectiveIntents, EXEC_OPTIONS } from "./helpers/execution-fixtures.js"

test("executeGraph: commits expedition changes after intents complete", async () => {
  const intents = synthesizeSingleObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: makeVersioningHandler({
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

  const committed = events.find((e) => e.type === "EXPEDITION_EXECUTION_COMMITTED")
  assert.ok(committed, "EXPEDITION_EXECUTION_COMMITTED event missing")
  assert.strictEqual(committed.payload.expeditionId, "EXP-1")
  assert.strictEqual(committed.payload.commit, "resultdef456")
})

test("executeGraph: commit message includes multiple objectives", async () => {
  const { r1, r2 } = synthesizeTwoObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [r1.intents, r2.intents])

  let capturedMessage = ""
  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: makeVersioningHandler({
        onCreateRevision: (intent) => {
          capturedMessage = String(intent.payload.message)
          return { success: true, result: { commit: "resultdef456" } }
        },
      }),
    },
    ...EXEC_OPTIONS,
  })

  assert.ok(events.find((e) => e.type === "EXPEDITION_EXECUTION_COMMITTED"))
  assert.ok(
    capturedMessage.includes("OBJ-1") && capturedMessage.includes("OBJ-2"),
    `Expected commit message to include both objectives, got: ${capturedMessage}`
  )
})

test("executeGraph: halts when commit fails", async () => {
  const intents = synthesizeSingleObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: makeVersioningHandler({
        onCreateRevision: () => ({ success: false, error: "nothing to commit" }),
      }),
    },
    ...EXEC_OPTIONS,
  })

  const committed = events.find((e) => e.type === "EXPEDITION_EXECUTION_COMMITTED")
  assert.ok(!committed, "EXPEDITION_EXECUTION_COMMITTED should not be emitted on commit failure")

  const failed = events.find((e) => e.type === "EXECUTION_INTENT_FAILED")
  assert.ok(failed)
  assert.ok(String(failed.payload.reason).includes("nothing to commit"))
})

test("executeGraph: skips commit when no versioning handler is provided", async () => {
  const intents = synthesizeSingleObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
    },
    ...EXEC_OPTIONS,
  })

  const committed = events.find((e) => e.type === "EXPEDITION_EXECUTION_COMMITTED")
  assert.ok(!committed, "EXPEDITION_EXECUTION_COMMITTED should not be emitted without versioning handler")

  const completed = events.filter((e) => e.type === "EXECUTION_INTENT_COMPLETED")
  assert.strictEqual(completed.length, 1)
})
