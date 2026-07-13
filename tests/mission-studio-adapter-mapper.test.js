// ============================================================
// MISSION STUDIO ADAPTER MAPPER TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  mapObservationToPlanningObservation,
  mapObservationsToPlanningObservations,
} from "../dist/mission-studio/adapter-mapper.js"

function makeObservation(category, overrides = {}) {
  return {
    id: `obs-${category}`,
    source: { adapter: "test-adapter", locator: "/test", adapterVersion: "1.0.0" },
    category,
    subject: "Test Subject",
    evidence: [{ description: "Test evidence", snippet: "snippet", fingerprint: "abc123" }],
    confidence: "high",
    timestamp: 1000,
    metadata: { extra: "value" },
    ...overrides,
  }
}

test("maps a valid Observation to PlanningObservation", () => {
  const obs = makeObservation("intent")
  const mapped = mapObservationToPlanningObservation(obs)

  assert.ok(mapped)
  assert.strictEqual(mapped.id, obs.id)
  assert.strictEqual(mapped.sourceAdapter, "test-adapter")
  assert.strictEqual(mapped.type, "intent")
  assert.strictEqual(mapped.payload.subject, "Test Subject")
  assert.strictEqual(mapped.payload.description, "Test evidence")
  assert.strictEqual(mapped.payload.snippet, "snippet")
  assert.strictEqual(mapped.evidenceReference, "abc123")
  assert.strictEqual(mapped.confidence, "high")
  assert.strictEqual(mapped.timestamp, 1000)
  assert.strictEqual(mapped.payload.extra, "value")
})

test("derives evidenceReference from evidence when fingerprint is missing", () => {
  const obs = makeObservation("language", {
    evidence: [{ description: "No fingerprint" }],
  })
  const mapped = mapObservationToPlanningObservation(obs)

  assert.ok(mapped)
  assert.strictEqual(typeof mapped.evidenceReference, "string")
  assert.ok(mapped.evidenceReference.length > 0)
})

test("filters out unsupported categories", () => {
  const obs = makeObservation("intent")
  const unsupported = { ...makeObservation("unsupported-category"), id: "obs-unsupported" }
  const result = mapObservationsToPlanningObservations([obs, unsupported])

  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].type, "intent")
})

test("filters out structurally invalid observations", () => {
  const invalid = { ...makeObservation("intent"), id: "" }
  const result = mapObservationsToPlanningObservations([invalid])

  assert.strictEqual(result.length, 0)
})

test("deduplicates observations by id-sourceAdapter-type", () => {
  const obs1 = makeObservation("mission", { subject: "A" })
  const obs2 = makeObservation("mission", { subject: "B" })
  const result = mapObservationsToPlanningObservations([obs1, obs2])

  assert.strictEqual(result.length, 1)
})

test("normalizes missing confidence to unknown", () => {
  const obs = makeObservation("risk", { confidence: undefined })
  const mapped = mapObservationToPlanningObservation(obs)

  assert.strictEqual(mapped.confidence, "unknown")
})

test("preserves all planning-relevant categories", () => {
  const categories = [
    "intent", "language", "framework", "dependency", "component", "architecture",
    "constraint", "risk", "assumption", "unknown", "evidence", "actor",
    "capability", "test", "coverage", "mission", "expedition", "objective",
    "wizard", "custom",
  ]

  const observations = categories.map((category, index) =>
    makeObservation(category, { id: `obs-${index}` })
  )

  const result = mapObservationsToPlanningObservations(observations)
  assert.strictEqual(result.length, categories.length)

  for (const category of categories) {
    assert.ok(result.some((o) => o.type === category), `missing category ${category}`)
  }
})
