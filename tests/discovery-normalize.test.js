// ============================================================
// DISCOVERY NORMALIZE STAGE TESTS
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { normalizeObservations } from "../dist/discovery/index.js"

function obs(overrides = {}) {
  return {
    id: "",
    adapterId: "discovery:test",
    adapterVersion: "1.0.0",
    source: { type: "filesystem", path: "/project" },
    fact: "test fact",
    timestamp: Date.now(),
    ...overrides,
  }
}

test("normalize assigns stable ids to observations missing them", () => {
  const observations = [obs({ fact: "a" }), obs({ fact: "b" })]
  const normalized = normalizeObservations(observations)

  assert.strictEqual(normalized[0].id, "obs-000000")
  assert.strictEqual(normalized[1].id, "obs-000001")
})

test("normalize preserves existing ids", () => {
  const observations = [obs({ id: "custom-1", fact: "a" })]
  const normalized = normalizeObservations(observations)

  assert.strictEqual(normalized[0].id, "custom-1")
})

test("normalize rejects observation missing adapterId", () => {
  const observations = [{ ...obs(), adapterId: "" }]
  assert.throws(() => normalizeObservations(observations), /missing adapterId/)
})

test("normalize rejects observation missing fact", () => {
  const observations = [{ ...obs(), fact: "" }]
  assert.throws(() => normalizeObservations(observations), /missing or invalid fact/)
})

test("normalize rejects observation with invalid timestamp", () => {
  const observations = [{ ...obs(), timestamp: 0 }]
  assert.throws(() => normalizeObservations(observations), /missing or invalid timestamp/)
})

test("normalize rejects duplicate observation ids", () => {
  const observations = [
    obs({ id: "same", fact: "a" }),
    obs({ id: "same", fact: "b" }),
  ]
  assert.throws(() => normalizeObservations(observations), /Duplicate observation id/)
})

test("normalize produces canonically sorted observations", () => {
  const observations = [
    obs({ fact: "z", source: { type: "filesystem", path: "/b" } }),
    obs({ fact: "a", source: { type: "filesystem", path: "/a" } }),
    obs({ fact: "m", source: { type: "filesystem", path: "/a" } }),
  ]
  const normalized = normalizeObservations(observations)

  assert.strictEqual(normalized[0].fact, "a")
  assert.strictEqual(normalized[1].fact, "m")
  assert.strictEqual(normalized[2].fact, "z")
})
