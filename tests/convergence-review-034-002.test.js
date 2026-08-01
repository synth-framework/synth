// ============================================================
// EXP-REVIEW-002 — Second Convergence Review of Program 034
// ============================================================
// Verifies that the second convergence review is chartered, recorded,
// and reflected in the affected program trackers.
// ============================================================

import fs from "fs/promises"
import path from "path"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

const ROOT = process.cwd()
const CHARTER = path.join(ROOT, "docs", "expeditions", "EXP-REVIEW-002.md")
const REVIEW_RECORD = path.join(ROOT, "docs", "governance", "convergence-review-034-002.md")
const PROGRAM_031 = path.join(ROOT, "docs", "expeditions", "EXP-PROGRAM-031.md")
const PROGRAM_034 = path.join(ROOT, "docs", "expeditions", "EXP-PROGRAM-034.md")

async function testReviewCharterExists() {
  const content = await fs.readFile(CHARTER, "utf-8")
  assert(content.includes("EXP-REVIEW-002"), "charter must reference EXP-REVIEW-002")
  assert(content.includes("EXP-PROGRAM-034"), "charter must reference EXP-PROGRAM-034")
  assert(content.includes("ADR-039"), "charter must reference ADR-039")
  console.log("[PASS] EXP-REVIEW-002 charter exists")
}

async function testReviewRecordExists() {
  const content = await fs.readFile(REVIEW_RECORD, "utf-8")
  assert(content.includes("EXP-REVIEW-002"), "review record must reference EXP-REVIEW-002")
  assert(content.includes("EXP-PROGRAM-034"), "review record must reference EXP-PROGRAM-034")
  assert(content.includes("CONVERGED"), "review record must contain CONVERGED outcome")
  assert(content.includes("REWRITE REQUIRED"), "review record must reference prior REWRITE REQUIRED outcome")
  assert(content.includes("src/task/task-graph.ts"), "review record must reference task graph implementation")
  assert(content.includes("src/graph/dependency-graph.ts"), "review record must reference shared primitive")
  console.log("[PASS] Convergence review record exists and contains required sections")
}

async function testProgram031ReferencesReview() {
  const content = await fs.readFile(PROGRAM_031, "utf-8")
  assert(content.includes("EXP-REVIEW-002"), "Program 031 tracker must reference EXP-REVIEW-002")
  assert(content.includes("Second Convergence Review of Program 034"), "Program 031 tracker must describe review")
  console.log("[PASS] Program 031 tracker references EXP-REVIEW-002")
}

async function testProgram034ReferencesReview() {
  const content = await fs.readFile(PROGRAM_034, "utf-8")
  assert(content.includes("EXP-REVIEW-002"), "Program 034 tracker must reference EXP-REVIEW-002")
  assert(content.includes("CONVERGED"), "Program 034 tracker must record CONVERGED outcome")
  assert(content.includes("convergence-review-034-002.md"), "Program 034 tracker must reference review record")
  assert(content.includes("Design-phase deliverables"), "Program 034 tracker must split deliverables")
  assert(content.includes("Implementation-phase deliverables"), "Program 034 tracker must split deliverables")
  console.log("[PASS] Program 034 tracker references EXP-REVIEW-002 and split deliverables")
}

async function main() {
  await testReviewCharterExists()
  await testReviewRecordExists()
  await testProgram031ReferencesReview()
  await testProgram034ReferencesReview()
  console.log("\n[CONVERGENCE REVIEW 034-002] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  console.error(err.stack)
  process.exit(1)
})
