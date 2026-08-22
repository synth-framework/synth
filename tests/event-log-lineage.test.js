// ============================================================
// Event-Log Lineage Pre-Flight Guard — Pure Comparison Tests
// ============================================================
// Analyzes the current branch's event log against sibling refs to prevent
// forking the derived event log across branches (expedition e617ccd0ac6d60b8).
// ============================================================

import { strict as assert } from "assert"
import { analyzeEventLogLineage } from "../dist/cli/event-log-lineage.js"

const A = '{"type":"SEED"}'
const B = '{"type":"EXPEDITION_CREATED"}'
const C = '{"type":"EXPEDITION_COMMITTED"}'
const X = '{"type":"OTHER_BRANCH_EVENT"}'

async function testPrefixIsSafe() {
  // Current log is a strict prefix of another ref's log: stale-but-safe.
  const result = analyzeEventLogLineage([A, B], { "origin/main": [A, B, C] })
  assert.equal(result.diverged, false, "strict prefix must not be flagged as diverged")
  assert.equal(result.guidance, undefined, "no guidance needed for safe prefix")
  console.log("[PASS] current log as strict prefix is accepted")
}

async function testSupersetIsSafe() {
  // Current log already contains the other ref's events: ahead, safe.
  const result = analyzeEventLogLineage([A, B, C], { "origin/main": [A, B] })
  assert.equal(result.diverged, false, "superset over another ref must not be flagged")
  console.log("[PASS] current log superset of another ref is accepted")
}

async function testDivergedBlocks() {
  // Each side carries an exclusive event: genuine fork risk.
  const result = analyzeEventLogLineage([A, B, C], { "origin/main": [A, B, X] })
  assert.equal(result.diverged, true, "mutually-exclusive events must be flagged diverged")
  const other = result.branches.find((b) => b.ref === "origin/main")
  assert.ok(other, "diverged branch must be reported")
  assert.equal(other.relation, "diverged", "relation should classify as diverged")
  assert.ok(result.guidance && result.guidance.length > 0, "diverged case must carry reconciliation guidance")
  console.log("[PASS] diverged logs block with reconciliation guidance")
}

async function main() {
  await testPrefixIsSafe()
  await testSupersetIsSafe()
  await testDivergedBlocks()
  console.log("\nAll event-log lineage tests passed.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
