// ============================================================
// Reference Resolver Tests
// ============================================================
// Validates EXP-GOV-007 stage 3: parent references are resolved,
// recovered via unique-candidate inference, or reported as unresolved.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { resolveReferences } from "../dist/runtime/reference-resolver.js"
import { resolveIdentities } from "../dist/runtime/identity-resolver.js"
import { makeIdentityEvent as makeEvent, identityCreationEvents, missionMEvent, expeditionEEvent } from "./helpers/kernel-event-fixtures.js"

test("resolves direct parent reference", () => {
  const events = identityCreationEvents()
  const { registry } = resolveIdentities(events)
  const result = resolveReferences(events, registry)

  assert.strictEqual(result.unresolved.length, 0)
  assert.strictEqual(result.notices.some((n) => n.kind === "resolved"), true)
  assert.strictEqual(result.events[1].payload.expedition.missionId, "m1")
})

test("recovers unknown parent reference via unique candidate", () => {
  const events = [
    missionMEvent("e1"),
    makeEvent("e2", "EXPEDITION_CREATED", {
      expedition: { id: "ex1", missionId: "legacy-mission", name: "E", goal: "g", status: "draft", objectives: [], discoveries: [], decisions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
  ]
  const { registry } = resolveIdentities(events)
  const result = resolveReferences(events, registry)

  assert.strictEqual(result.unresolved.length, 0)
  const recovery = result.notices.find((n) => n.kind === "recovered-unique-candidate")
  assert.ok(recovery, "should report unique-candidate recovery")
  assert.strictEqual(recovery.resolvedReference, "m1")
  assert.strictEqual(result.events[1].payload.expedition.missionId, "m1")
})

test("reports unresolved reference when multiple candidates exist", () => {
  const events = [
    missionMEvent("e1", "M1"),
    makeEvent("e2", "MISSION_CREATED", {
      mission: { id: "m2", name: "M2", status: "draft", expeditions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e3", "EXPEDITION_CREATED", {
      expedition: { id: "ex1", missionId: "unknown-mission", name: "E", goal: "g", status: "draft", objectives: [], discoveries: [], decisions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
  ]
  const { registry } = resolveIdentities(events)
  const result = resolveReferences(events, registry)

  assert.strictEqual(result.unresolved.length, 1)
  assert.strictEqual(result.unresolved[0].kind, "unresolved")
  assert.strictEqual(result.events[2].payload.expedition.missionId, "unknown-mission")
})

test("reports missing parent reference as unresolved", () => {
  const events = [
    missionMEvent("e1"),
    expeditionEEvent("e2"),
  ]
  const { registry } = resolveIdentities(events)
  const result = resolveReferences(events, registry)

  assert.strictEqual(result.unresolved.length, 1)
  assert.strictEqual(result.unresolved[0].kind, "unresolved")
  assert.strictEqual(result.unresolved[0].referenceName, "missionId")
})
