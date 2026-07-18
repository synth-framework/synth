// EXP-EXEC-002 — Work Item Runtime regression tests

import { synthesizeIntents, buildIntentGraph, executeGraph } from "../dist/execution/index.js"
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

test("synthesizeIntents: writeFile produces filesystem intent", () => {
  const workItem = makeWorkItem("WI-1", {
    operation: "writeFile",
    target: "src/example.ts",
    content: "export const x = 1",
  })
  const result = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem,
    baseBranch: "main",
  })

  assert.strictEqual(result.intents.length, 1)
  const intent = result.intents[0]
  assert.strictEqual(intent.capability, "filesystem")
  assert.strictEqual(intent.operation, "writeFile")
  assert.strictEqual(intent.target, "src/example.ts")
  assert.strictEqual(intent.payload.content, "export const x = 1")
  assert.strictEqual(intent.verification.kind, "path_exists")
})

test("synthesizeIntents: unknown operation produces no-op intent", () => {
  const workItem = makeWorkItem("WI-1", { operation: "magic" })
  const result = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem,
    baseBranch: "main",
  })

  assert.strictEqual(result.intents[0].capability, "unknown")
})

test("executeGraph: emits lifecycle events and completes intents", async () => {
  const intents = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem: makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" }),
    baseBranch: "main",
  }).intents

  const graph = buildIntentGraph("EXP-1", "exp/exp-1", [intents])

  const handlers = {
    filesystem: async (intent) => {
      return { success: true, result: `wrote ${intent.target}` }
    },
  }

  const events = await executeGraph(graph, {
    handlers,
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
  })

  const types = events.map((e) => e.type)
  assert.ok(types.includes("EXECUTION_INTENT_GRAPH_CREATED"))
  assert.ok(types.includes("EXECUTION_INTENT_CREATED"))
  assert.ok(types.includes("EXECUTION_INTENT_STARTED"))
  assert.ok(types.includes("EXECUTION_INTENT_COMPLETED"))
  assert.ok(!types.includes("EXECUTION_INTENT_FAILED"))
})

test("executeGraph: halts and emits failure when handler missing", async () => {
  const intents = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem: makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" }),
    baseBranch: "main",
  }).intents

  const graph = buildIntentGraph("EXP-1", "exp/exp-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {},
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
  })

  const failed = events.find((e) => e.type === "EXECUTION_INTENT_FAILED")
  assert.ok(failed)
  assert.ok(String(failed.payload.reason).includes("No handler registered"))
})

test("executeGraph: halts on handler failure", async () => {
  const intents = synthesizeIntents({
    expedition: makeExpedition("EXP-1"),
    objective: makeObjective("OBJ-1", "EXP-1"),
    workItem: makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" }),
    baseBranch: "main",
  }).intents

  const graph = buildIntentGraph("EXP-1", "exp/exp-1", [intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async () => ({ success: false, error: "disk full" }),
    },
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
  })

  const failed = events.find((e) => e.type === "EXECUTION_INTENT_FAILED")
  assert.ok(failed)
  assert.strictEqual(failed.payload.reason, "disk full")
})

test("executeGraph: multiple intents run in order", async () => {
  const order = []
  const wi1 = makeWorkItem("WI-1", { operation: "writeFile", target: "a.txt", content: "a" })
  const wi2 = makeWorkItem("WI-2", { operation: "writeFile", target: "b.txt", content: "b" })

  const r1 = synthesizeIntents({ expedition: makeExpedition("EXP-1"), objective: makeObjective("OBJ-1", "EXP-1"), workItem: wi1, baseBranch: "main", sequenceStart: 0 })
  const r2 = synthesizeIntents({ expedition: makeExpedition("EXP-1"), objective: makeObjective("OBJ-1", "EXP-1"), workItem: wi2, baseBranch: "main", sequenceStart: r1.nextSequence })

  const graph = buildIntentGraph("EXP-1", "exp/exp-1", [r1.intents, r2.intents])

  const events = await executeGraph(graph, {
    handlers: {
      filesystem: async (intent) => {
        if (intent.operation === "writeFile") order.push(intent.id)
        return { success: true }
      },
    },
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
  })

  assert.strictEqual(order.length, 2)
  assert.ok(order[0].endsWith("/write"))
  assert.ok(order[1].endsWith("/write"))
  const completed = events.filter((e) => e.type === "EXECUTION_INTENT_COMPLETED")
  assert.strictEqual(completed.length, 2)
})
