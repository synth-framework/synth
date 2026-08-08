// ============================================================
// Governance Intake Gate Regression Tests
// ============================================================
// Covers lifecycle transitions relaxed or added in EXP-GATE-013 / 28640ebf0a8841dc
// and b2a6b10375b881fa:
//   - expedition.create allowed while another expedition is executing
//   - expedition.start allowed from committed, archived, paused, and cancelled
//   - expedition.pause allowed only from executing
//   - expedition.archive blocks already-archived expeditions
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { validateAgentAction } from "../dist/governance/intake.js"

function makeState(overrides = {}) {
  return {
    missions: {},
    expeditions: {},
    alignmentContracts: {},
    convergenceCertifications: {},
    snapshots: {},
    ...overrides,
  }
}

function makeMission(id, status = "active") {
  return {
    id,
    name: "Mission " + id,
    purpose: "purpose",
    status,
    expeditions: [],
    metadata: {},
    createdAt: 1,
    updatedAt: 1,
  }
}

function makeExpedition(id, status, missionId = "m1") {
  return {
    id,
    missionId,
    name: "Expedition " + id,
    goal: "goal",
    status,
    objectives: [],
    discoveries: [],
    decisions: [],
    dependsOn: [],
    metadata: {},
    createdAt: 1,
    updatedAt: 1,
  }
}

test("expedition.create is allowed while another expedition is executing", () => {
  const state = makeState({
    missions: { m1: makeMission("m1", "active") },
    expeditions: {
      e1: makeExpedition("e1", "executing", "m1"),
    },
  })

  const result = validateAgentAction({ kind: "expedition.create", missionId: "m1" }, state)
  assert.strictEqual(result.decision, "ALLOW", `expected ALLOW, got ${JSON.stringify(result)}`)
})

test("expedition.create without explicit mission is allowed while another expedition is executing", () => {
  const state = makeState({
    missions: { m1: makeMission("m1", "active") },
    expeditions: {
      e1: makeExpedition("e1", "executing", "m1"),
    },
  })

  const result = validateAgentAction({ kind: "expedition.create" }, state)
  assert.strictEqual(result.decision, "ALLOW", `expected ALLOW, got ${JSON.stringify(result)}`)
  assert.strictEqual(result.activeMissionId, "m1", "should resolve to the active mission")
})

test("expedition.approve and expedition.commit are allowed while another expedition is executing", () => {
  const state = makeState({
    missions: { m1: makeMission("m1", "active") },
    expeditions: {
      e1: makeExpedition("e1", "executing", "m1"),
      e2: makeExpedition("e2", "draft", "m1"),
      e3: makeExpedition("e3", "approved", "m1"),
    },
  })

  const approveResult = validateAgentAction({ kind: "expedition.approve", expeditionId: "e2" }, state)
  assert.strictEqual(approveResult.decision, "ALLOW", `expected ALLOW for approve, got ${JSON.stringify(approveResult)}`)

  const commitResult = validateAgentAction({ kind: "expedition.commit", expeditionId: "e3" }, state)
  assert.strictEqual(commitResult.decision, "ALLOW", `expected ALLOW for commit, got ${JSON.stringify(commitResult)}`)
})

test("expedition.start is allowed from committed, archived, paused, and cancelled", () => {
  const state = makeState({
    missions: { m1: makeMission("m1", "active") },
    expeditions: {
      e_committed: makeExpedition("e_committed", "committed", "m1"),
      e_archived: makeExpedition("e_archived", "archived", "m1"),
      e_paused: makeExpedition("e_paused", "paused", "m1"),
      e_cancelled: makeExpedition("e_cancelled", "cancelled", "m1"),
    },
  })

  for (const id of ["e_committed", "e_archived", "e_paused", "e_cancelled"]) {
    const result = validateAgentAction({ kind: "expedition.start", expeditionId: id }, state)
    assert.strictEqual(result.decision, "ALLOW", `expected ALLOW for ${id}, got ${JSON.stringify(result)}`)
  }
})

test("expedition.start is blocked when another expedition is executing", () => {
  const state = makeState({
    missions: { m1: makeMission("m1", "active") },
    expeditions: {
      e1: makeExpedition("e1", "executing", "m1"),
      e2: makeExpedition("e2", "committed", "m1"),
    },
  })

  const result = validateAgentAction({ kind: "expedition.start", expeditionId: "e2" }, state)
  assert.strictEqual(result.decision, "BLOCK")
  assert.ok(result.reason.includes("e1"), `reason should mention executing expedition e1: ${result.reason}`)
})

test("expedition.pause is allowed from executing", () => {
  const state = makeState({
    missions: { m1: makeMission("m1", "active") },
    expeditions: {
      e1: makeExpedition("e1", "executing", "m1"),
    },
  })

  const result = validateAgentAction({ kind: "expedition.pause", expeditionId: "e1" }, state)
  assert.strictEqual(result.decision, "ALLOW", `expected ALLOW, got ${JSON.stringify(result)}`)
})

test("expedition.pause is blocked from non-executing statuses", () => {
  const state = makeState({
    missions: { m1: makeMission("m1", "active") },
    expeditions: {
      e_draft: makeExpedition("e_draft", "draft", "m1"),
      e_committed: makeExpedition("e_committed", "committed", "m1"),
      e_archived: makeExpedition("e_archived", "archived", "m1"),
      e_paused: makeExpedition("e_paused", "paused", "m1"),
    },
  })

  for (const id of ["e_draft", "e_committed", "e_archived", "e_paused"]) {
    const result = validateAgentAction({ kind: "expedition.pause", expeditionId: id }, state)
    assert.strictEqual(result.decision, "BLOCK", `expected BLOCK for ${id}, got ${JSON.stringify(result)}`)
    assert.ok(result.reason.includes("executing"), `reason should mention executing requirement for ${id}: ${result.reason}`)
  }
})

test("expedition.archive blocks already-archived expeditions", () => {
  const state = makeState({
    missions: { m1: makeMission("m1", "active") },
    expeditions: {
      e1: makeExpedition("e1", "archived", "m1"),
    },
  })

  const result = validateAgentAction({ kind: "expedition.archive", expeditionId: "e1" }, state)
  assert.strictEqual(result.decision, "BLOCK")
  assert.ok(result.reason.includes("archived"), `reason should mention archived status: ${result.reason}`)
})
