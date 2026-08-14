// ============================================================
// DUPLICATE-AWARE MISSION & EXPEDITION CREATION TESTS
// ============================================================
// EXP-DUP-001 — Deterministic lexical duplicate detection for
// mission/expedition create. Pure, no ML, no LLM, no runtime deps.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import {
  tokenize,
  buildWeightedTokens,
  scoreWeightedJaccard,
  findSimilarMissions,
  findSimilarExpeditions,
} from "../dist/mission-studio/index.js"

test("tokenize splits camelCase and non-word boundaries, drops stopwords and short tokens", () => {
  const tokens = tokenize("Create duplicate-Aware mission & expedition setup for the CLI")
  assert.ok(tokens.includes("create"), "should include lowercase create")
  assert.ok(tokens.includes("duplicate"), "should split duplicate-Aware into duplicate")
  assert.ok(tokens.includes("aware"), "should include aware")
  assert.ok(tokens.includes("mission"), "should include mission")
  assert.ok(tokens.includes("expedition"), "should include expedition")
  assert.ok(tokens.includes("cli"), "should include cli")
  assert.ok(!tokens.includes("the"), "stopword 'the' should be dropped")
  assert.ok(!tokens.includes("&"), "non-word symbols should be dropped")
})

test("buildWeightedTokens merges text/scope/intent with distinct weights", () => {
  const bag = buildWeightedTokens({
    text: "agent catalog runtime",
    scopeTokens: ["cli"],
    intentTokens: ["adapter", "catalog"],
  })
  const w = (t) => (bag.has(t) ? bag.get(t) : 0)
  assert.strictEqual(w("adapter"), 3, "intent tokens should carry weight 3")
  assert.strictEqual(w("cli"), 2, "scope tokens should carry weight 2")
  assert.strictEqual(w("catalog"), 3, "catalog appears in text and intent; intent weight wins")
  assert.strictEqual(w("agent"), 1, "text-only tokens carry weight 1")
  assert.strictEqual(w("runtime"), 1, "text-only tokens carry weight 1")
})

test("scoreWeightedJaccard returns 1 for identical bags and 0 for disjoint", () => {
  const a = buildWeightedTokens({ text: "mission creation duplicate check" })
  const b = buildWeightedTokens({ text: "mission creation duplicate check" })
  const c = buildWeightedTokens({ text: "adapter catalog registry" })
  assert.strictEqual(scoreWeightedJaccard(a, b), 1)
  assert.strictEqual(scoreWeightedJaccard(a, c), 0)
})

test("scoreWeightedJaccard is higher when shared tokens are high-weight (intent/scope)", () => {
  // Both records share exactly one text token with the candidate (lifecycle);
  // the differentiator is the intent token weight (3 vs 1).
  const base = buildWeightedTokens({ text: "adapter lifecycle" })
  const near = buildWeightedTokens({ text: "architecture runtime", intentTokens: ["adapter"] })
  const far = buildWeightedTokens({ text: "adapter lifecycle" })
  const nearScore = scoreWeightedJaccard(base, near)
  const farScore = scoreWeightedJaccard(base, far)
  assert.ok(nearScore > 0, "sharing one intent token should score > 0")
  assert.ok(
    nearScore < farScore,
    "sharing identical text should still outrank a single shared intent token",
  )
})

test("findSimilarMissions ranks a near-duplicate mission highest", () => {
  const candidate = {
    subject: "Duplicate-aware mission creation",
    purpose: "Surface similar missions at create time",
    scopeTokens: ["mission-studio"],
    intentTokens: ["duplicate"],
  }
  const results = findSimilarMissions(candidate, [
    { id: "M-A", name: "Duplicate-aware mission & expedition creation", purpose: "Surface similar missions and expeditions at creation time", scopeTokens: ["mission-studio"], intentTokens: ["duplicate"] },
    { id: "M-B", name: "Adapter catalog registry", purpose: "Namespace adapter ids and factory registration", scopeTokens: ["adapter-catalog"], intentTokens: ["adapter"] },
    { id: "M-C", name: "Govern log cleanup", purpose: "Remove stale govern logs from repo root", intentTokens: ["housekeeping"] },
  ])
  assert.strictEqual(results[0].id, "M-A", "near-duplicate should rank first")
  assert.ok(results[0].score > 0.3, `near-duplicate score should be meaningful, got ${results[0].score}`)
  assert.ok(results[0].overlap.length > 0, "should report overlapping tokens")
})

test("findSimilarMissions is advisory: returns empty when nothing is similar", () => {
  const results = findSimilarMissions(
    { subject: "Postgres index migration", purpose: "Add partial indexes to decision log", intentTokens: ["database"] },
    [
      { id: "M-Z", name: "Unified SYNTH Onboarding", purpose: "Agent onboarding guides", intentTokens: ["onboarding"] },
    ],
  )
  assert.deepStrictEqual(results, [])
})

test("findSimilarExpeditions scores expeditions by goal text plus scope/intent", () => {
  const candidate = {
    subject: "Organize tests directory",
    goal: "Move 225 root test files into domain subdirectories",
    scopeTokens: ["tests"],
    intentTokens: ["reorganize"],
  }
  const results = findSimilarExpeditions(candidate, [
    { id: "E-1", name: "Organize tests/ directory structure", goal: "Audit root test files into domain directories", scopeTokens: ["tests"], intentTokens: ["reorganize"] },
    { id: "E-2", name: "Remove legacy migration subsystem", goal: "Rip out synth migrate subsystem", intentTokens: ["migration"] },
  ])
  assert.strictEqual(results[0].id, "E-1", "same-scope expedition should rank first")
})

test("legacy records without stored tokens are scored from text on the fly", () => {
  const candidate = { subject: "Event-log self-inspection", purpose: "Verify state lag against event log", intentTokens: ["replay"] }
  const results = findSimilarMissions(candidate, [
    { id: "M-LEGACY", name: "Event-log self-inspection & state-lag verification", purpose: "Verify event log and canonical state stay in sync" },
  ])
  assert.ok(results.length === 1, "legacy plain-text records should still be compared")
  assert.strictEqual(results[0].id, "M-LEGACY")
  assert.ok(results[0].score > 0.3)
})