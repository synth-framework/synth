// ============================================================
// EXP-GOV-024 — Replay Mission/Expedition Navigation
// =========================================================// Verifies that EXPEDITION_CREATED updates mission.expeditions so that
// replayed state keeps parent/child navigation consistent.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { rebuildState } from "../dist/runtime/replay.js"

function makeEvent(type, payload) {
  return {
    id: `evt-${type}`,
    type,
    timestamp: 1,
    transactionId: "tx-test",
    capability: "test",
    actor: "test",
    payload,
  }
}

test("EXPEDITION_CREATED appends expedition id to mission.expeditions", () => {
  const events = [
    makeEvent("MISSION_CREATED", {
      mission: {
        id: "m1",
        name: "Mission 1",
        purpose: "purpose",
        status: "active",
        expeditions: [],
        metadata: {},
        createdAt: 1,
        updatedAt: 1,
      },
    }),
    makeEvent("EXPEDITION_CREATED", {
      expedition: {
        id: "e1",
        missionId: "m1",
        name: "Expedition 1",
        goal: "goal",
        status: "executing",
        objectives: [],
        discoveries: [],
        decisions: [],
        dependsOn: [],
        metadata: {},
        createdAt: 1,
        updatedAt: 1,
      },
    }),
  ]

  const state = rebuildState(events)
  assert.deepStrictEqual(state.missions.m1.expeditions, ["e1"])
  assert.strictEqual(state.expeditions.e1.missionId, "m1")
})

test("EXPEDITION_CREATED does not duplicate expedition ids", () => {
  const expedition = {
    id: "e1",
    missionId: "m1",
    name: "Expedition 1",
    goal: "goal",
    status: "executing",
    objectives: [],
    discoveries: [],
    decisions: [],
    dependsOn: [],
    metadata: {},
    createdAt: 1,
    updatedAt: 1,
  }
  const events = [
    makeEvent("MISSION_CREATED", {
      mission: {
        id: "m1",
        name: "Mission 1",
        purpose: "purpose",
        status: "active",
        expeditions: ["e1"],
        metadata: {},
        createdAt: 1,
        updatedAt: 1,
      },
    }),
    makeEvent("EXPEDITION_CREATED", { expedition }),
  ]

  const state = rebuildState(events)
  assert.deepStrictEqual(state.missions.m1.expeditions, ["e1"])
})
