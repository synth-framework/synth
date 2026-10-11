// ============================================================
// Identity Resolver Tests
// ============================================================
// Validates EXP-GOV-007 stage 2: canonical identities are built from
// normalized events deterministically.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { resolveIdentities, getCanonicalId } from "../dist/runtime/identity-resolver.js"
import { makeIdentityEvent as makeEvent, identityCreationEvents, missionMEvent } from "./helpers/kernel-event-fixtures.js"

test("builds identity registry from creation events", () => {
  const events = identityCreationEvents()

  const { registry } = resolveIdentities(events)
  assert.strictEqual(registry.size, 2)
  assert.strictEqual(getCanonicalId(registry, "m1"), "m1")
  assert.strictEqual(getCanonicalId(registry, "ex1"), "ex1")
  assert.strictEqual(registry.get("m1")?.kind, "mission")
  assert.strictEqual(registry.get("ex1")?.kind, "expedition")
})

test("ignores non-creation events", () => {
  const events = [
    missionMEvent("e1"),
    makeEvent("e2", "MISSION_APPROVED", { id: "m1", status: "active" }),
  ]

  const { registry, notices } = resolveIdentities(events)
  assert.strictEqual(registry.size, 1)
  assert.strictEqual(notices.length, 0)
})

test("reports duplicate identities", () => {
  const events = [
    missionMEvent("e1"),
    missionMEvent("e2", "M", 2),
  ]

  const { registry, notices } = resolveIdentities(events)
  assert.strictEqual(registry.size, 1)
  assert.strictEqual(notices.length, 1)
  assert.strictEqual(notices[0].kind, "duplicate-identity")
})
