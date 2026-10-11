// EXP-EXEC-005 — Pull Request Projection regression tests

import {
  synthesizeIntents,
  buildIntentGraph,
  executeGraph,
} from "../dist/execution/index.js"
import assert from "node:assert"
import test from "node:test"
import { makeWorkItem, makeExpedition, makeObjective, makeVersioningHandler, synthesizeSingleObjectiveIntents, synthesizeTwoObjectiveIntents, EXEC_OPTIONS } from "./helpers/execution-fixtures.js"

test("executeGraph: creates pull request after commit", async () => {
  const intents = synthesizeSingleObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents], "main")

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: makeVersioningHandler(),
      forge: async (intent) => {
        assert.strictEqual(intent.operation, "createPullRequest")
        assert.strictEqual(intent.payload.headBranch, "exp/EXP-1")
        assert.strictEqual(intent.payload.baseBranch, "main")
        return { success: true, result: { number: 42, title: String(intent.payload.title), url: "https://github.com/synth-framework/synth/pull/42" } }
      },
    },
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
  })

  const projected = events.find((e) => e.type === "EXPEDITION_EXECUTION_PROJECTED")
  assert.ok(projected, "EXPEDITION_EXECUTION_PROJECTED event missing")
  assert.strictEqual(projected.payload.expeditionId, "EXP-1")
  assert.strictEqual(projected.payload.projectionType, "pull_request")
  assert.strictEqual(projected.payload.projectionUrl, "https://github.com/synth-framework/synth/pull/42")
})

test("executeGraph: PR title and body correlate expedition and objectives", async () => {
  const { r1, r2 } = synthesizeTwoObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [r1.intents, r2.intents], "main")

  let capturedPayload = null
  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: makeVersioningHandler(),
      forge: async (intent) => {
        capturedPayload = intent.payload
        return { success: true, result: { number: 43, title: String(intent.payload.title) } }
      },
    },
    ...EXEC_OPTIONS,
  })

  assert.ok(events.find((e) => e.type === "EXPEDITION_EXECUTION_PROJECTED"))
  assert.ok(capturedPayload.title.includes("EXP-1"))
  assert.ok(capturedPayload.title.includes("OBJ-1"))
  assert.ok(capturedPayload.title.includes("OBJ-2"))
  assert.ok(capturedPayload.body.includes("EXP-1"))
  assert.ok(capturedPayload.body.includes("OBJ-1"))
  assert.ok(capturedPayload.body.includes("OBJ-2"))
})

test("executeGraph: halts when pull request creation fails", async () => {
  const intents = synthesizeSingleObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents], "main")

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: makeVersioningHandler(),
      forge: async () => ({ success: false, error: "no fork permission" }),
    },
    ...EXEC_OPTIONS,
  })

  const projected = events.find((e) => e.type === "EXPEDITION_EXECUTION_PROJECTED")
  assert.ok(!projected, "EXPEDITION_EXECUTION_PROJECTED should not be emitted on PR failure")

  const failed = events.find((e) => e.type === "EXECUTION_INTENT_FAILED")
  assert.ok(failed)
  assert.ok(String(failed.payload.reason).includes("no fork permission"))
})

test("executeGraph: skips PR projection when no forge handler is provided", async () => {
  const intents = synthesizeSingleObjectiveIntents()

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents], "main")

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: makeVersioningHandler(),
    },
    ...EXEC_OPTIONS,
  })

  const projected = events.find((e) => e.type === "EXPEDITION_EXECUTION_PROJECTED")
  assert.ok(!projected, "EXPEDITION_EXECUTION_PROJECTED should not be emitted without forge handler")

  const committed = events.find((e) => e.type === "EXPEDITION_EXECUTION_COMMITTED")
  assert.ok(committed)
})
