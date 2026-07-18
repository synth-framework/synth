// ============================================================
// Historical Normalizer Tests
// ============================================================
// Validates EXP-GOV-007 stage 1: duplicate and malformed creation
// events are detected and collapsed without mutating history.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { normalizeHistoricalEvents } from "../dist/runtime/historical-normalizer.js"

function makeEvent(id, type, payload) {
  return {
    id,
    type,
    timestamp: Date.now(),
    transactionId: "tx-1",
    capability: "Genesis",
    actor: "system",
    payload,
    eventHash: "hash",
    previousHash: "prev",
  }
}

test("collapses duplicate mission creation events", () => {
  const missionId = "mission-001"
  const events = [
    makeEvent("e1", "MISSION_CREATED", {
      mission: { id: missionId, name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e2", "MISSION_CREATED", {
      mission: { id: missionId, name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 2, updatedAt: 2 },
    }),
    makeEvent("e3", "MISSION_CREATED", {
      mission: { id: missionId, name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 3, updatedAt: 3 },
    }),
  ]

  const result = normalizeHistoricalEvents(events)
  assert.strictEqual(result.events.length, 1)
  assert.strictEqual(result.events[0].id, "e1")
  assert.strictEqual(result.notices.length, 2)
  assert.ok(result.notices.every((n) => n.kind === "duplicate-identity"))
  assert.ok(result.canonicalIdentities.has(`mission:${missionId}`))
})

test("preserves non-creation events unchanged", () => {
  const events = [
    makeEvent("e1", "MISSION_CREATED", {
      mission: { id: "m1", name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e2", "MISSION_APPROVED", { id: "m1", status: "active" }),
  ]

  const result = normalizeHistoricalEvents(events)
  assert.strictEqual(result.events.length, 2)
  assert.strictEqual(result.events[1].type, "MISSION_APPROVED")
  assert.strictEqual(result.notices.length, 0)
})

test("detects malformed creation event", () => {
  const events = [
    makeEvent("e1", "MISSION_CREATED", { mission: { name: "No ID" } }),
  ]

  const result = normalizeHistoricalEvents(events)
  assert.strictEqual(result.events.length, 1)
  assert.strictEqual(result.notices.length, 1)
  assert.strictEqual(result.notices[0].kind, "malformed-creation")
  assert.strictEqual(result.notices[0].severity, "error")
})

test("collapses duplicate expedition and objective creation events", () => {
  const events = [
    makeEvent("e1", "MISSION_CREATED", {
      mission: { id: "m1", name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e2", "EXPEDITION_CREATED", {
      expedition: { id: "ex1", missionId: "m1", name: "E", goal: "g", status: "draft", objectives: [], discoveries: [], decisions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e3", "EXPEDITION_CREATED", {
      expedition: { id: "ex1", missionId: "m1", name: "E", goal: "g", status: "draft", objectives: [], discoveries: [], decisions: [], metadata: {}, createdAt: 2, updatedAt: 2 },
    }),
    makeEvent("e4", "OBJECTIVE_ADDED", {
      objective: { id: "ob1", expeditionId: "ex1", title: "O", purpose: "", status: "draft", metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e5", "OBJECTIVE_ADDED", {
      objective: { id: "ob1", expeditionId: "ex1", title: "O", purpose: "", status: "draft", metadata: {}, createdAt: 2, updatedAt: 2 },
    }),
  ]

  const result = normalizeHistoricalEvents(events)
  assert.strictEqual(result.events.length, 3)
  assert.strictEqual(result.notices.length, 2)
  assert.ok(result.canonicalIdentities.has("expedition:ex1"))
  assert.ok(result.canonicalIdentities.has("objective:ob1"))
})
