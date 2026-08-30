// ============================================================
// GENESIS SNAPSHOT BRIDGE TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { snapshotToGenesisInput, snapshotToSeedEvents } from "../dist/genesis/snapshot-bridge.js"
import { rebuildState } from "../dist/runtime/replay.js"
import { makeSnapshot as _makeSnapshot } from "./helpers/snapshot-fixtures.js"

function makeSnapshot(overrides = {}) {
  return _makeSnapshot({ signature: "sig", ...overrides })
}

test("snapshotToGenesisInput derives projectName from actor node", () => {
  const snapshot = makeSnapshot()
  const input = snapshotToGenesisInput(snapshot)

  assert.strictEqual(input.projectName, "Synth System")
  assert.strictEqual(input.systemId, "snapshot-1")
  assert.strictEqual(input.partitions, 4)
})

test("snapshotToGenesisInput maps proposals to initial plans and work items", () => {
  const snapshot = makeSnapshot()
  const input = snapshotToGenesisInput(snapshot)

  assert.strictEqual(input.initialPlans.length, 1)
  assert.strictEqual(input.initialPlans[0].id, "expedition-1")
  assert.strictEqual(input.initialPlans[0].name, "CRM Data Model")

  assert.strictEqual(input.initialWorkItems.length, 1)
  assert.strictEqual(input.initialWorkItems[0].id, "objective-1")
  assert.strictEqual(input.initialWorkItems[0].name, "Design Schema")
  assert.strictEqual(input.initialWorkItems[0].status, "idle")
})

test("snapshotToGenesisInput produces seed events for missions and artifacts", () => {
  const snapshot = makeSnapshot()
  const input = snapshotToGenesisInput(snapshot)

  assert.ok(input.seedEvents.length > 0)
  assert.ok(input.seedEvents.some((e) => e.type === "MISSION_CREATED"))
  assert.ok(input.seedEvents.some((e) => e.type === "EXPEDITION_CREATED"))
  assert.ok(input.seedEvents.some((e) => e.type === "OBJECTIVE_ADDED"))
})

test("snapshotToSeedEvents produces replayable events", () => {
  const snapshot = makeSnapshot()
  const seedEvents = snapshotToSeedEvents(snapshot)

  // Replay through rebuildState to verify canonical shapes.
  const state = rebuildState(seedEvents)

  assert.ok(state.projects["actor-1"])
  assert.strictEqual(state.projects["actor-1"].name, "Synth System")
  assert.ok(state.missions["mission-1"])
  assert.strictEqual(state.missions["mission-1"].name, "Build CRM")
  assert.ok(state.expeditions["expedition-1"])
  assert.strictEqual(state.expeditions["expedition-1"].missionId, "mission-1")
  assert.ok(state.objectives["objective-1"])
  assert.strictEqual(state.objectives["objective-1"].title, "Design Schema")
})

test("falls back projectName when no actor or component node exists", () => {
  const snapshot = makeSnapshot()
  snapshot.worldModel.nodes = new Map()
  const input = snapshotToGenesisInput(snapshot)

  assert.strictEqual(input.projectName, "Mission Model Seed")
  assert.strictEqual(input.initialProjects.length, 0)
})
