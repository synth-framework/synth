// ============================================================
// MISSION-SCOPED EXPEDITION RANKING TESTS
// ============================================================
// Verifies that a mission's expeditions can be listed ranked by the
// deterministic weighted scoring (priority, status, downstream impact,
// program priority) reusing the rankExpeditions machinery.
// ============================================================

import fs from "fs/promises"
import os from "os"
import path from "path"
import { strict as assert } from "assert"
import { rankExpeditionRecords } from "../dist/governance/rank.js"

function makeRecord(overrides) {
  return {
    id: "EXP-TEST-001",
    name: "Test Expedition",
    kind: "Architecture Expedition",
    status: "Proposed",
    priority: "High",
    program: "",
    dependsOn: [],
    blocks: [],
    ...overrides,
  }
}

const PROGRAM_CRITICAL = {
  id: "EXP-PROGRAM-001",
  name: "Critical Program",
  kind: "Program",
  status: "Active",
  priority: "Critical",
  openExpeditions: 3,
  completedExpeditions: 1,
}

async function testRanksOnlyOpenExpeditions() {
  const programById = new Map([[PROGRAM_CRITICAL.id, PROGRAM_CRITICAL]])
  const expeditions = [
    makeRecord({ id: "EXP-M-001", status: "Proposed", priority: "High" }),
    makeRecord({ id: "EXP-M-002", status: "Executing", priority: "Medium" }),
    makeRecord({ id: "EXP-M-003", status: "Completed", priority: "Critical" }),
  ]
  const ranked = rankExpeditionRecords(expeditions, programById)
  assert.equal(ranked.length, 2, "completed expeditions must be excluded from the open ranking")
  const ids = ranked.map((e) => e.id)
  assert.ok(ids.includes("EXP-M-001"), "Proposed expedition must be ranked")
  assert.ok(ids.includes("EXP-M-002"), "Executing expedition must be ranked")
  assert.ok(!ids.includes("EXP-M-003"), "Completed expedition must be excluded")
  console.log("  [PASS] mission ranking excludes completed expeditions")
}

async function testRanksByScoreDescending() {
  const programById = new Map([[PROGRAM_CRITICAL.id, PROGRAM_CRITICAL]])
  const expeditions = [
    makeRecord({ id: "EXP-M-001", status: "Proposed", priority: "High" }),
    makeRecord({ id: "EXP-M-002", status: "Executing", priority: "High" }),
  ]
  const ranked = rankExpeditionRecords(expeditions, programById)
  assert.equal(ranked[0].id, "EXP-M-002", "Executing must rank above Proposed at equal priority")
  assert.ok(ranked[0].score > ranked[1].score, "higher status weight must yield a higher score")
  console.log("  [PASS] mission ranking orders by score descending")
}

async function testScoresDownstreamBlocks() {
  const programById = new Map([[PROGRAM_CRITICAL.id, PROGRAM_CRITICAL]])
  const expeditions = [
    makeRecord({ id: "EXP-M-001", status: "Proposed", priority: "High", blocks: ["EXP-M-002"] }),
    makeRecord({ id: "EXP-M-002", status: "Proposed", priority: "Medium" }),
  ]
  const ranked = rankExpeditionRecords(expeditions, programById)
  assert.equal(ranked[0].id, "EXP-M-001", "an expedition blocking another must rank above it")
  assert.ok(ranked[0].score > ranked[1].score, "downstream impact must raise the score")
  assert.ok(ranked[0].rationale.includes("blocks 1 expedition"), "rationale must mention downstream block")
  console.log("  [PASS] mission ranking scores downstream blocks")
}

async function testTiesBrokenById() {
  const programById = new Map([[PROGRAM_CRITICAL.id, PROGRAM_CRITICAL]])
  const expeditions = [
    makeRecord({ id: "EXP-M-002", status: "Proposed", priority: "High" }),
    makeRecord({ id: "EXP-M-001", status: "Proposed", priority: "High" }),
  ]
  const ranked = rankExpeditionRecords(expeditions, programById)
  assert.equal(ranked[0].id, "EXP-M-001", "equal scores must break ties by id ascending")
  console.log("  [PASS] mission ranking breaks ties by id")
}

async function testNormalizesLowercaseRuntimeStatus() {
  const programById = new Map([[PROGRAM_CRITICAL.id, PROGRAM_CRITICAL]])
  const expeditions = [
    makeRecord({ id: "EXP-M-001", status: "executing", priority: "High" }),
    makeRecord({ id: "EXP-M-002", status: "proposed", priority: "High" }),
  ]
  const ranked = rankExpeditionRecords(expeditions, programById)
  assert.equal(ranked[0].id, "EXP-M-001", "lowercase 'executing' must rank above lowercase 'proposed'")
  console.log("  [PASS] mission ranking normalizes lowercase runtime statuses")
}

console.log("\n=== Mission-Scoped Expedition Ranking Tests ===\n")

await testRanksOnlyOpenExpeditions()
await testRanksByScoreDescending()
await testScoresDownstreamBlocks()
await testTiesBrokenById()
await testNormalizesLowercaseRuntimeStatus()

console.log("\n=== All mission-scoped expedition ranking tests passed ===\n")
