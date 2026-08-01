// ============================================================
// EXP-REVIEW-001 — Convergence Review Record Validation
// ============================================================
// Verifies that the first convergence review under ADR-039 is
// durably recorded and referenced by the affected program trackers.
// ============================================================

import fs from "fs/promises"
import path from "path"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

const ROOT = process.cwd()
const REVIEW_RECORD = path.join(ROOT, "docs", "governance", "convergence-review-043-034.md")
const DESIGN_CONTRACT = path.join(ROOT, "docs", "design", "shared-dependency-graph.md")
const PROGRAM_031 = path.join(ROOT, "docs", "expeditions", "EXP-PROGRAM-031.md")
const PROGRAM_043 = path.join(ROOT, "docs", "expeditions", "EXP-PROGRAM-043.md")
const PROGRAM_034 = path.join(ROOT, "docs", "expeditions", "EXP-PROGRAM-034.md")
const PREFIX_REGISTRY = path.join(ROOT, "docs", "expeditions", "prefix-registry.json")
const CHARTER = path.join(ROOT, "docs", "expeditions", "EXP-REVIEW-001.md")

async function testReviewPrefixRegistered() {
  const registry = JSON.parse(await fs.readFile(PREFIX_REGISTRY, "utf-8"))
  assert(registry.prefixes?.REVIEW, "REVIEW prefix must be registered")
  assert(typeof registry.prefixes.REVIEW.name === "string", "REVIEW prefix must have a name")
  console.log("[PASS] REVIEW prefix is registered")
}

async function testReviewCharterExists() {
  const content = await fs.readFile(CHARTER, "utf-8")
  assert(content.includes("EXP-REVIEW-001"), "charter must reference EXP-REVIEW-001")
  assert(content.includes("ADR-039"), "charter must reference ADR-039")
  assert(content.includes("EXP-PROGRAM-043"), "charter must reference EXP-PROGRAM-043")
  assert(content.includes("EXP-PROGRAM-034"), "charter must reference EXP-PROGRAM-034")
  console.log("[PASS] EXP-REVIEW-001 charter exists")
}

async function testReviewRecordExists() {
  const content = await fs.readFile(REVIEW_RECORD, "utf-8")
  assert(content.includes("EXP-REVIEW-001"), "review record must reference EXP-REVIEW-001")
  assert(content.includes("ADR-039"), "review record must reference ADR-039")
  assert(content.includes("EXP-PROGRAM-043"), "review record must reference EXP-PROGRAM-043")
  assert(content.includes("EXP-PROGRAM-034"), "review record must reference EXP-PROGRAM-034")
  assert(content.includes("CONVERGED"), "review record must contain 043 outcome")
  assert(content.includes("REWRITE REQUIRED"), "review record must contain 034 outcome")
  assert(content.includes("## ADR-039 questionnaire"), "review record must contain questionnaire section")
  assert(content.includes("docs/design/shared-dependency-graph.md"), "review record must reference shared primitive design contract")
  console.log("[PASS] Convergence review record exists and contains required sections")
}

async function testDesignContractExists() {
  const content = await fs.readFile(DESIGN_CONTRACT, "utf-8")
  assert(content.includes("EXP-REVIEW-001"), "design contract must reference EXP-REVIEW-001")
  assert(content.includes("topologicalSort"), "design contract must define topologicalSort")
  assert(content.includes("detectCycles"), "design contract must define detectCycles")
  assert(content.includes("reachableFrom"), "design contract must define reachableFrom")
  assert(content.includes("isAcyclic"), "design contract must define isAcyclic")
  assert(content.includes("Program 034"), "design contract must reference Program 034")
  assert(content.includes("Program 031"), "design contract must reference Program 031")
  console.log("[PASS] Shared dependency-graph design contract exists and defines the primitive")
}

async function testProgram031TrackerReferencesReview() {
  const content = await fs.readFile(PROGRAM_031, "utf-8")
  assert(content.includes("EXP-REVIEW-001"), "Program 031 tracker must reference EXP-REVIEW-001")
  assert(content.includes("Active"), "Program 031 status should be Active")
  assert(content.includes("convergence-review-043-034.md"), "Program 031 tracker must reference review record")
  assert(content.includes("shared-dependency-graph.md"), "Program 031 tracker must reference design contract")
  console.log("[PASS] Program 031 tracker references the review and design contract")
}

async function testProgram043TrackerReferencesReview() {
  const content = await fs.readFile(PROGRAM_043, "utf-8")
  assert(content.includes("EXP-REVIEW-001"), "Program 043 tracker must reference EXP-REVIEW-001")
  assert(content.includes("CONVERGED"), "Program 043 tracker must record CONVERGED outcome")
  assert(content.includes("convergence-review-043-034.md"), "Program 043 tracker must reference review record")
  console.log("[PASS] Program 043 tracker references the review record")
}

async function testProgram034TrackerReferencesReview() {
  const content = await fs.readFile(PROGRAM_034, "utf-8")
  assert(content.includes("EXP-REVIEW-001"), "Program 034 tracker must reference EXP-REVIEW-001")
  assert(content.includes("REWRITE REQUIRED"), "Program 034 tracker must record REWRITE REQUIRED outcome")
  assert(content.includes("convergence-review-043-034.md"), "Program 034 tracker must reference review record")
  assert(content.includes("shared-dependency-graph.md"), "Program 034 tracker must reference design contract")
  console.log("[PASS] Program 034 tracker references the review and design contract")
}

async function main() {
  await testReviewPrefixRegistered()
  await testReviewCharterExists()
  await testReviewRecordExists()
  await testDesignContractExists()
  await testProgram031TrackerReferencesReview()
  await testProgram043TrackerReferencesReview()
  await testProgram034TrackerReferencesReview()
  console.log("\n[CONVERGENCE REVIEW 043-034] All tests passed")
}

main().catch((err) => {
  console.error("[FAIL]", err.message)
  console.error(err.stack)
  process.exit(1)
})
