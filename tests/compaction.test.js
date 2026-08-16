// ============================================================
// RUNTIME: Event Log Compaction Tests
// ============================================================

import { strict as assert } from "assert"
import { bootstrap } from "../dist/core/bootstrap.js"
import { EVENT_STORE_WRITE_TOKEN } from "../dist/infra/event-store.js"
import { rebuildState } from "../dist/runtime/replay.js"

// Simple test framework helper
const tests = []
function test(name, fn) {
  tests.push({ name, fn })
}

test("compaction collapses history and preserves replay consistency", async () => {
  const ctx = await bootstrap({
    infra: { persistence: "memory" },
  })

  // Append a sequence of test events
  const event1 = {
    id: "e1",
    type: "PROJECT_CREATED",
    timestamp: Date.now(),
    transactionId: "tx1",
    capability: "CreateProject",
    actor: "agent",
    payload: {
      project: { id: "p1", name: "Compaction Project", status: "active", createdAt: Date.now() },
    },
  }

  const event2 = {
    id: "e2",
    type: "MISSION_CREATED",
    timestamp: Date.now() + 10,
    transactionId: "tx2",
    capability: "CreateMission",
    actor: "agent",
    payload: {
      mission: { id: "m1", name: "Compaction Mission", status: "draft", expeditions: [], objectives: [], constraints: [], nonGoals: [], allowedVariation: [], forbiddenDrift: [], referenceEvidence: [], createdAt: Date.now() },
    },
  }

  const event3 = {
    id: "e3",
    type: "MISSION_APPROVED",
    timestamp: Date.now() + 20,
    transactionId: "tx3",
    capability: "ApproveMission",
    actor: "agent",
    payload: {
      id: "m1",
    },
  }

  // Archived mission
  const event4 = {
    id: "e4",
    type: "MISSION_CREATED",
    timestamp: Date.now() + 30,
    transactionId: "tx4",
    capability: "CreateMission",
    actor: "agent",
    payload: {
      mission: { id: "m2", name: "Archived Mission", status: "archived", expeditions: [], objectives: [], constraints: [], nonGoals: [], allowedVariation: [], forbiddenDrift: [], referenceEvidence: [], createdAt: Date.now() },
    },
  }

  // Completed expedition
  const event5 = {
    id: "e5",
    type: "EXPEDITION_CREATED",
    timestamp: Date.now() + 40,
    transactionId: "tx5",
    capability: "CreateExpedition",
    actor: "agent",
    payload: {
      expedition: { id: "ex1", missionId: "m1", name: "Completed Exp", goal: "Goal", status: "completed", objectives: [], discoveries: [], decisions: [], dependsOn: [], metadata: {}, createdAt: Date.now() },
    },
  }

  // Archived expedition
  const event6 = {
    id: "e6",
    type: "EXPEDITION_CREATED",
    timestamp: Date.now() + 50,
    transactionId: "tx6",
    capability: "CreateExpedition",
    actor: "agent",
    payload: {
      expedition: { id: "ex2", missionId: "m1", name: "Archived Exp", goal: "Goal", status: "archived", objectives: [], discoveries: [], decisions: [], dependsOn: [], metadata: {}, createdAt: Date.now() },
    },
  }

  // Cancelled expedition
  const event7 = {
    id: "e7",
    type: "EXPEDITION_CREATED",
    timestamp: Date.now() + 60,
    transactionId: "tx7",
    capability: "CreateExpedition",
    actor: "agent",
    payload: {
      expedition: { id: "ex3", missionId: "m1", name: "Cancelled Exp", goal: "Goal", status: "cancelled", objectives: [], discoveries: [], decisions: [], dependsOn: [], metadata: {}, createdAt: Date.now() },
    },
  }

  await ctx.infra.eventStore.appendBatch([event1, event2, event3, event4, event5, event6, event7], EVENT_STORE_WRITE_TOKEN)

  const originalEvents = await ctx.infra.eventStore.loadAll()
  assert.equal(originalEvents.length, 7, "Should have 7 original events")

  const originalState = rebuildState(originalEvents)
  assert.equal(originalState.lifecycle, "uninitialized")
  assert.equal(originalState.projects["p1"].name, "Compaction Project")
  assert.equal(originalState.missions["m1"].status, "active")
  assert.equal(originalState.missions["m2"].status, "archived")
  assert.equal(originalState.expeditions["ex1"].status, "completed")
  assert.equal(originalState.expeditions["ex2"].status, "archived")
  assert.equal(originalState.expeditions["ex3"].status, "cancelled")

  // Compact all events
  await ctx.infra.eventStore.compact(7, EVENT_STORE_WRITE_TOKEN)

  const compactedEvents = await ctx.infra.eventStore.loadAll()
  assert.equal(compactedEvents.length, 1, "Compacted event log should contain exactly 1 event")
  assert.equal(compactedEvents[0].type, "SYSTEM_SNAPSHOT", "The event should be a SYSTEM_SNAPSHOT")

  // Replay from compacted log
  const compactedState = rebuildState(compactedEvents)
  
  // Verify state equivalence for active/completed entities
  assert.equal(compactedState.projects["p1"].name, "Compaction Project")
  assert.equal(compactedState.missions["m1"].status, "active")
  assert.equal(compactedState.expeditions["ex1"].status, "completed")

  // Verify pruning of archived/cancelled entities
  assert.equal(compactedState.missions["m2"], undefined, "Archived mission should be pruned")
  assert.equal(compactedState.expeditions["ex2"], undefined, "Archived expedition should be pruned")
  assert.equal(compactedState.expeditions["ex3"], undefined, "Cancelled expedition should be pruned")
})

// Run the tests
async function run() {
  console.log("Running Compaction Tests...")
  for (const { name, fn } of tests) {
    try {
      await fn()
      console.log(`[PASS] ${name}`)
    } catch (err) {
      console.error(`[FAIL] ${name}`)
      console.error(err)
      process.exitCode = 1
    }
  }
}

await run()
