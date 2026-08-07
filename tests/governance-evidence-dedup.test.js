// ============================================================
// EXP-EVIDENCE-DEDUP — Expedition Evidence Attachment Dedup
// ============================================================
// Verifies that repeated EVIDENCE_ATTACHED events for the same
// attachment (kind + path + hash) do not accumulate duplicates in
// replayed expedition state.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { rebuildState } from "../dist/runtime/replay.js"

function makeEvent(type, payload, timestamp) {
  return {
    id: `evt-${type}-${timestamp}`,
    type,
    timestamp,
    transactionId: "tx-test",
    capability: "test",
    actor: "test",
    payload,
  }
}

function seedExpeditionEvents() {
  return [
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
    }, 1),
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
        createdAt: 2,
        updatedAt: 2,
      },
    }, 2),
  ]
}

test("EVIDENCE_ATTACHED does not accumulate duplicate attachments", () => {
  const duplicate = { kind: "git-diff", path: "proof/expeditions/e1/git-diff.patch", hash: "abc123" }
  const events = [
    ...seedExpeditionEvents(),
    makeEvent("EVIDENCE_ATTACHED", { expeditionId: "e1", attachments: [duplicate], note: "first" }, 3),
    makeEvent("EVIDENCE_ATTACHED", { expeditionId: "e1", attachments: [duplicate], note: "second" }, 4),
  ]
  const state = rebuildState(events)
  assert.strictEqual(state.expeditions.e1.attachments.length, 1)
  assert.strictEqual(state.expeditions.e1.attachments[0].hash, "abc123")
})

test("distinct attachments are preserved and only identical ones are dropped", () => {
  const gitDiff = { kind: "git-diff", path: "proof/expeditions/e1/git-diff.patch", hash: "aaa" }
  const testResults = { kind: "test-results", path: "proof/expeditions/e1/test-results.txt", hash: "bbb" }
  const events = [
    ...seedExpeditionEvents(),
    makeEvent("EVIDENCE_ATTACHED", { expeditionId: "e1", attachments: [gitDiff] }, 3),
    makeEvent("EVIDENCE_ATTACHED", { expeditionId: "e1", attachments: [gitDiff, testResults] }, 4),
  ]
  const state = rebuildState(events)
  assert.strictEqual(state.expeditions.e1.attachments.length, 2)
  const hashes = state.expeditions.e1.attachments.map((a) => a.hash)
  assert.ok(hashes.includes("aaa"))
  assert.ok(hashes.includes("bbb"))
})

test("same path with different content hash is kept (content-addressed)", () => {
  const first = { kind: "attachment", path: "proof/expeditions/e1/attachments/a.txt", hash: "one" }
  const second = { kind: "attachment", path: "proof/expeditions/e1/attachments/a.txt", hash: "two" }
  const events = [
    ...seedExpeditionEvents(),
    makeEvent("EVIDENCE_ATTACHED", { expeditionId: "e1", attachments: [first] }, 3),
    makeEvent("EVIDENCE_ATTACHED", { expeditionId: "e1", attachments: [second] }, 4),
  ]
  const state = rebuildState(events)
  assert.strictEqual(state.expeditions.e1.attachments.length, 2)
})
