// EXP-EXEC-004 — Commit-as-Evidence regression tests

import {
  synthesizeIntents,
  buildIntentGraph,
  executeGraph,
} from "../dist/execution/index.js"
import assert from "node:assert"
import test from "node:test"

function makeWorkItem(id, metadata) {
  return {
    id,
    expeditionId: "EXP-1",
    objectiveId: "OBJ-1",
    title: "work item",
    status: "generated",
    metadata,
    createdAt: Date.now(),
  }
}

function makeExpedition(id) {
  return {
    id,
    missionId: "M-1",
    name: "execution expedition",
    goal: "execute",
    status: "approved",
    objectives: ["OBJ-1"],
    discoveries: [],
    decisions: [],
    metadata: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function makeObjective(id, expeditionId) {
  return {
    id,
    expeditionId,
    title: "objective",
    purpose: "purpose",
    status: "draft",
    metadata: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

test("executeGraph: commits expedition changes after intents complete", async () => {
  const intents = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem: makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" }),
    baseBranch: "main",
  }).intents

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: async (intent) => {
        if (intent.operation === "switchRevision") {
          return { success: true, result: { commit: "baseabc123" } }
        }
        if (intent.operation === "createRevision") {
          assert.strictEqual(intent.payload.message, "expedition(EXP-1): OBJ-1")
          assert.strictEqual(intent.payload.includeUntracked, true)
          return { success: true, result: { commit: "resultdef456" } }
        }
        throw new Error(`Unexpected versioning operation: ${intent.operation}`)
      },
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
  const r1 = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem: makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" }),
    baseBranch: "main",
    sequenceStart: 0,
  })
  const r2 = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-2", "EXP-1"),
    workItem: makeWorkItem("WI-2", { operation: "writeFile", target: "b.txt", content: "b" }),
    baseBranch: "main",
    sequenceStart: r1.nextSequence,
  })

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [r1.intents, r2.intents])

  let capturedMessage = ""
  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: async (intent) => {
        if (intent.operation === "switchRevision") {
          return { success: true, result: { commit: "baseabc123" } }
        }
        if (intent.operation === "createRevision") {
          capturedMessage = String(intent.payload.message)
          return { success: true, result: { commit: "resultdef456" } }
        }
        throw new Error(`Unexpected versioning operation: ${intent.operation}`)
      },
    },
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
  })

  assert.ok(events.find((e) => e.type === "EXPEDITION_EXECUTION_COMMITTED"))
  assert.ok(
    capturedMessage.includes("OBJ-1") && capturedMessage.includes("OBJ-2"),
    `Expected commit message to include both objectives, got: ${capturedMessage}`
  )
})

test("executeGraph: halts when commit fails", async () => {
  const intents = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem: makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" }),
    baseBranch: "main",
  }).intents

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
      versioning: async (intent) => {
        if (intent.operation === "switchRevision") {
          return { success: true, result: { commit: "baseabc123" } }
        }
        if (intent.operation === "createRevision") {
          return { success: false, error: "nothing to commit" }
        }
        throw new Error(`Unexpected versioning operation: ${intent.operation}`)
      },
    },
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
  })

  const committed = events.find((e) => e.type === "EXPEDITION_EXECUTION_COMMITTED")
  assert.ok(!committed, "EXPEDITION_EXECUTION_COMMITTED should not be emitted on commit failure")

  const failed = events.find((e) => e.type === "EXECUTION_INTENT_FAILED")
  assert.ok(failed)
  assert.ok(String(failed.payload.reason).includes("nothing to commit"))
})

test("executeGraph: skips commit when no versioning handler is provided", async () => {
  const intents = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem: makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" }),
    baseBranch: "main",
  }).intents

  const graph = buildIntentGraph("EXP-1", "exp/EXP-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: true }),
    },
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
  })

  const committed = events.find((e) => e.type === "EXPEDITION_EXECUTION_COMMITTED")
  assert.ok(!committed, "EXPEDITION_EXECUTION_COMMITTED should not be emitted without versioning handler")

  const completed = events.filter((e) => e.type === "EXECUTION_INTENT_COMPLETED")
  assert.strictEqual(completed.length, 1)
})
