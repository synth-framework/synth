// ============================================================
// Identity Resolver Tests
// ============================================================
// Validates EXP-GOV-007 stage 2: canonical identities are built from
// normalized events deterministically.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { resolveIdentities, getCanonicalId } from "../dist/runtime/identity-resolver.js"

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

test("builds identity registry from creation events", () => {
  const events = [
    makeEvent("e1", "MISSION_CREATED", {
      mission: { id: "m1", name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e2", "EXPEDITION_CREATED", {
      expedition: { id: "ex1", missionId: "m1", name: "E", goal: "g", status: "draft", objectives: [], discoveries: [], decisions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
  ]

  const { registry } = resolveIdentities(events)
  assert.strictEqual(registry.size, 2)
  assert.strictEqual(getCanonicalId(registry, "m1"), "m1")
  assert.strictEqual(getCanonicalId(registry, "ex1"), "ex1")
  assert.strictEqual(registry.get("m1")?.kind, "mission")
  assert.strictEqual(registry.get("ex1")?.kind, "expedition")
})

test("ignores non-creation events", () => {
  const events = [
    makeEvent("e1", "MISSION_CREATED", {
      mission: { id: "m1", name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e2", "MISSION_APPROVED", { id: "m1", status: "active" }),
  ]

  const { registry, notices } = resolveIdentities(events)
  assert.strictEqual(registry.size, 1)
  assert.strictEqual(notices.length, 0)
})

test("reports duplicate identities", () => {
  const events = [
    makeEvent("e1", "MISSION_CREATED", {
      mission: { id: "m1", name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e2", "MISSION_CREATED", {
      mission: { id: "m1", name: "M", status: "draft", expeditions: [], metadata: {}, createdAt: 2, updatedAt: 2 },
    }),
  ]

  const { registry, notices } = resolveIdentities(events)
  assert.strictEqual(registry.size, 1)
  assert.strictEqual(notices.length, 1)
  assert.strictEqual(notices[0].kind, "duplicate-identity")
})
