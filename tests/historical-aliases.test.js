// ============================================================
// Historical Alias Registry Tests (EXP-GOV-009)
// ============================================================
// Validates that known historical identity aliases suppress duplicate
// warnings and recover parent references without mutating the event log.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { normalizeHistoricalEvents } from "../dist/runtime/historical-normalizer.js"
import { resolveReferences } from "../dist/runtime/reference-resolver.js"
import { resolveIdentities } from "../dist/runtime/identity-resolver.js"
import { validateAggregateGraph } from "../dist/runtime/replay.js"
import { makeIdentityEvent as makeEvent, identityCreationEvents, missionMEvent } from "./helpers/kernel-event-fixtures.js"
import {
  createEmptyHistoricalAliasRegistry,
  identityKey,
  isKnownAlias,
  getCanonicalId,
} from "../dist/runtime/historical-aliases.js"

function makeRegistry(entries) {
  const registry = createEmptyHistoricalAliasRegistry()
  for (const [key, entry] of Object.entries(entries)) {
    registry.canonicalIdentities[key] = entry
  }
  return registry
}

test("identityKey and registry helpers work", () => {
  const registry = makeRegistry({
    "mission:m1": {
      kind: "mission",
      canonicalId: "m1",
      aliasEventIds: ["e1", "e2"],
    },
  })

  assert.strictEqual(identityKey("mission", "m1"), "mission:m1")
  assert.strictEqual(isKnownAlias(registry, "mission", "m1", "e1"), true)
  assert.strictEqual(isKnownAlias(registry, "mission", "m1", "e3"), false)
  assert.strictEqual(getCanonicalId(registry, "mission", "m1"), "m1")
  assert.strictEqual(getCanonicalId(registry, "mission", "unknown"), undefined)
})

test("normalizer suppresses duplicate warnings for registered aliases", () => {
  const canonicalMissionId = "m1"
  const events = [1, 2, 3].map((t) => missionMEvent(`e${t}`, "M", t))

  const withoutRegistry = normalizeHistoricalEvents(events)
  assert.strictEqual(withoutRegistry.notices.length, 2)
  assert.ok(withoutRegistry.notices.every((n) => n.kind === "duplicate-identity"))

  const registry = makeRegistry({
    [`mission:${canonicalMissionId}`]: {
      kind: "mission",
      canonicalId: canonicalMissionId,
      aliasEventIds: ["e1", "e2", "e3"],
    },
  })
  const withRegistry = normalizeHistoricalEvents(events, registry)
  assert.strictEqual(withRegistry.notices.length, 0)
  assert.strictEqual(withRegistry.events.length, 1)
})

test("reference resolver recovers historical parent aliases", () => {
  const events = identityCreationEvents("m1", "ex1", { expeditionMissionId: "legacy-m1" })

  const { registry } = resolveIdentities(events)
  const registryWithAlias = makeRegistry({
    "mission:legacy-m1": {
      kind: "mission",
      canonicalId: "m1",
      aliasEventIds: [],
    },
  })

  const result = resolveReferences(events, registry, registryWithAlias)

  assert.strictEqual(result.unresolved.length, 0)
  const recovery = result.notices.find((n) => n.kind === "recovered-alias")
  assert.ok(recovery, "should report recovered-alias notice")
  assert.strictEqual(recovery.severity, "info")
  assert.strictEqual(recovery.originalReference, "legacy-m1")
  assert.strictEqual(recovery.resolvedReference, "m1")
  assert.strictEqual(result.events[1].payload.expedition.missionId, "m1")
})

test("validateAggregateGraph suppresses duplicate and parent-alias violations", () => {
  const events = [
    missionMEvent("e1"),
    missionMEvent("e2", "M", 2),
    makeEvent("e3", "EXPEDITION_CREATED", {
      expedition: { id: "ex1", missionId: "legacy-m1", name: "E", goal: "g", status: "draft", objectives: [], discoveries: [], decisions: [], metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
    makeEvent("e4", "OBJECTIVE_ADDED", {
      objective: { id: "ob1", expeditionId: "ex1", title: "O", purpose: "", status: "draft", metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
  ]

  const withoutRegistry = validateAggregateGraph(events)
  assert.ok(
    withoutRegistry.some((v) => v.kind === "duplicate-creation" && v.aggregateId === "m1"),
    "should report duplicate mission without registry",
  )
  assert.ok(
    withoutRegistry.some((v) => v.kind === "broken-parent-reference" && v.aggregateId === "ex1"),
    "should report broken parent reference without registry",
  )

  const registry = makeRegistry({
    "mission:m1": {
      kind: "mission",
      canonicalId: "m1",
      aliasEventIds: ["e1", "e2"],
    },
    "mission:legacy-m1": {
      kind: "mission",
      canonicalId: "m1",
      aliasEventIds: [],
    },
    "expedition:ex1": {
      kind: "expedition",
      canonicalId: "ex1",
      aliasEventIds: ["e3"],
    },
  })

  const withRegistry = validateAggregateGraph(events, undefined, registry)
  assert.strictEqual(withRegistry.length, 0)
})

test("validateAggregateGraph resolves alias parent ids for cycle and reachability checks", () => {
  const events = [
    ...identityCreationEvents("m1", "ex1", { expeditionMissionId: "legacy-m1" }),
    makeEvent("e3", "OBJECTIVE_ADDED", {
      objective: { id: "ob1", expeditionId: "legacy-ex1", title: "O", purpose: "", status: "draft", metadata: {}, createdAt: 1, updatedAt: 1 },
    }),
  ]

  const registry = makeRegistry({
    "mission:legacy-m1": {
      kind: "mission",
      canonicalId: "m1",
      aliasEventIds: [],
    },
    "expedition:legacy-ex1": {
      kind: "expedition",
      canonicalId: "ex1",
      aliasEventIds: [],
    },
  })

  const violations = validateAggregateGraph(events, undefined, registry)
  assert.strictEqual(violations.length, 0)
})
