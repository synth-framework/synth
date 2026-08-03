// ============================================================
// GOVERNANCE RANKING TESTS (EXP-CLI-004)
// ============================================================
// Tests deterministic scoring, ranking, --next selection, and
// status-hygiene warnings for programs and expeditions.
// ============================================================

import fs from "fs/promises"
import os from "os"
import path from "path"
import { strict as assert } from "assert"
import {
  rankExpeditions,
  rankPrograms,
  loadProgramCompositionStatus,
} from "../dist/governance/rank.js"

async function setupCharterDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-rank-test-"))

  await fs.writeFile(
    path.join(dir, "EXP-PROGRAM-001.md"),
    `# EXP-PROGRAM-001 — Test Program

**Status:** Active
**Kind:** Program
**Priority:** Critical

## Composition

- EXP-TASK-001   Task One   [COMPLETED]
- EXP-TASK-002   Task Two   Proposed
`,
    "utf-8",
  )

  await fs.writeFile(
    path.join(dir, "EXP-TASK-001.md"),
    `# EXP-TASK-001 — Task One

**Status:** Draft
**Kind:** Architecture Expedition
**Priority:** High
**Program:** EXP-PROGRAM-001
**Depends On:**
**Blocks:** EXP-TASK-002
`,
    "utf-8",
  )

  await fs.writeFile(
    path.join(dir, "EXP-TASK-002.md"),
    `# EXP-TASK-002 — Task Two

**Status:** Proposed
**Kind:** Architecture Expedition
**Priority:** Critical
**Program:** EXP-PROGRAM-001
**Depends On:** EXP-TASK-001
**Blocks:**
`,
    "utf-8",
  )

  return dir
}

async function teardown(dir) {
  await fs.rm(dir, { recursive: true, force: true })
}

async function testRankExpeditions() {
  const dir = await setupCharterDir()
  try {
    const result = await rankExpeditions(dir, {})
    assert.equal(result.status, "ok")
    assert.equal(result.kind, "ExpeditionRank")
    assert.equal(result.count, 2)

    const task1 = result.expeditions.find((e) => e.id === "EXP-TASK-001")
    const task2 = result.expeditions.find((e) => e.id === "EXP-TASK-002")
    assert.ok(task1, "EXP-TASK-001 must be ranked")
    assert.ok(task2, "EXP-TASK-002 must be ranked")

    // TASK-002 is Critical and blocks nothing but depends on TASK-001.
    // TASK-001 is High but blocks TASK-002, so it gets downstream pressure.
    assert.ok(task2.score > task1.score, "Critical priority should outweigh High with one downstream block")
    assert.equal(result.expeditions[0].id, "EXP-TASK-002")
  } finally {
    await teardown(dir)
  }
  console.log("  [PASS] rankExpeditions scores by priority and downstream impact")
}

async function testRankExpeditionsNext() {
  const dir = await setupCharterDir()
  try {
    const result = await rankExpeditions(dir, {}, { next: true })
    assert.equal(result.next, "EXP-TASK-002")
  } finally {
    await teardown(dir)
  }
  console.log("  [PASS] rankExpeditions --next returns highest-scoring expedition")
}

async function testRankPrograms() {
  const dir = await setupCharterDir()
  try {
    const result = await rankPrograms(dir, {})
    assert.equal(result.status, "ok")
    assert.equal(result.kind, "ProgramRank")
    assert.equal(result.count, 1)
    assert.equal(result.programs[0].id, "EXP-PROGRAM-001")
    assert.ok(result.programs[0].score > 0)
  } finally {
    await teardown(dir)
  }
  console.log("  [PASS] rankPrograms returns active programs")
}

async function testHygieneWarning() {
  const dir = await setupCharterDir()
  try {
    const result = await rankExpeditions(dir, {})
    const warning = result.warnings.find((w) => w.expeditionId === "EXP-TASK-001")
    assert.ok(warning, "EXP-TASK-001 should produce a hygiene warning")
    assert.equal(warning.code, "WARN-GOV-001")
    assert.match(warning.message, /EXP-TASK-001 is Draft in its charter but marked completed/)
  } finally {
    await teardown(dir)
  }
  console.log("  [PASS] hygiene warning emitted when charter status disagrees with program tracker")
}

async function testLoadProgramCompositionStatus() {
  const dir = await setupCharterDir()
  try {
    const composition = await loadProgramCompositionStatus(dir)
    const programCompleted = composition.get("EXP-PROGRAM-001")
    assert.ok(programCompleted, "composition status must include EXP-PROGRAM-001")
    assert.ok(programCompleted.has("EXP-TASK-001"))
    assert.ok(!programCompleted.has("EXP-TASK-002"))
  } finally {
    await teardown(dir)
  }
  console.log("  [PASS] loadProgramCompositionStatus parses completion markers")
}

console.log("\n=== Governance Ranking Tests ===\n")

await testRankExpeditions()
await testRankExpeditionsNext()
await testRankPrograms()
await testHygieneWarning()
await testLoadProgramCompositionStatus()

console.log("\n=== All governance ranking tests passed ===\n")
