// EXP-EXEC-003 — Branch-per-Expedition Workflow regression tests

import {
  synthesizeIntents,
  buildIntentGraph,
  deriveExpeditionBranch,
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

test("deriveExpeditionBranch: produces deterministic branch name", () => {
  assert.strictEqual(deriveExpeditionBranch("EXP-1"), "exp/EXP-1")
  assert.strictEqual(deriveExpeditionBranch("EXP-123"), "exp/EXP-123")
  // Deterministic: same input produces same output.
  assert.strictEqual(deriveExpeditionBranch("EXP-1"), "exp/EXP-1")
})

test("executeGraph: creates expedition branch before executing intents", async () => {
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
        assert.strictEqual(intent.operation, "switchRevision")
        assert.strictEqual(intent.target, "exp/EXP-1")
        assert.strictEqual(intent.payload.branch, "exp/EXP-1")
        assert.strictEqual(intent.payload.createBranch, true)
        return { success: true, result: { commit: "baseabc123" } }
      },
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
      versioning: async () => ({ success: false, error: "branch already exists" }),
    },
    actor: "test",
    transactionId: "tx-1",
    timestamp: 1,
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

  const branchCreated = events.find((e) => e.type === "EXPEDITION_BRANCH_CREATED")
  assert.ok(!branchCreated, "EXPEDITION_BRANCH_CREATED should not be emitted without versioning handler")

  const completed = events.filter((e) => e.type === "EXECUTION_INTENT_COMPLETED")
  assert.strictEqual(completed.length, 1)
})
