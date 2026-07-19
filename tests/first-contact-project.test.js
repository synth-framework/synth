// ============================================================
// First Contact Architecture Projection Tests
// ============================================================
// Regression guards for EXP-AIFC-005:
//  - Projection produces at least one candidate.
//  - Candidates include rationale, tradeoffs, and assumptions.
//  - A recommended candidate is identified.
//  - Projection is deterministic for equivalent inputs.
// ============================================================

import { extractIntent } from "../dist/first-contact/extract/index.js"
import { projectArchitecture, RuleBasedArchitectureProjectionAdapter } from "../dist/first-contact/project/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function testProjectsWebTypeScript() {
  const artifact = extractIntent("Let's build a space mission tracker in TypeScript for the web.")
  const result = projectArchitecture(artifact)

  assert(result.candidates.length >= 1, "should produce at least one candidate")
  assert(result.recommended, "should identify a recommended candidate")
  assert(result.candidates.every((c) => c.rationale && c.tradeoffs && c.assumptions), "candidates should include rationale, tradeoffs, assumptions")
  assert(result.candidates.some((c) => c.name.toLowerCase().includes("next.js")), "should produce a Next.js candidate for web + TypeScript")
  console.log("[PASS] projects web + TypeScript candidates")
}

function testProjectsCliPython() {
  const artifact = extractIntent("Create me a markdown viewer in Python.")
  const result = projectArchitecture(artifact)

  assert(result.candidates.some((c) => c.name.toLowerCase().includes("python cli")), "should produce a Python CLI candidate")
  assert(result.recommended, "should identify a recommended candidate")
  console.log("[PASS] projects CLI + Python candidates")
}

function testDeterministicProjection() {
  const artifact = extractIntent("Create a CLI tool in TypeScript that validates event schemas.")
  const a = projectArchitecture(artifact)
  const b = projectArchitecture(artifact)

  assert(JSON.stringify(a) === JSON.stringify(b), "projection should be deterministic")
  console.log("[PASS] projection is deterministic")
}

function testFallbackCandidate() {
  const artifact = extractIntent("Build something cool.")
  const result = projectArchitecture(artifact)

  assert(result.candidates.length >= 1, "should produce a fallback candidate")
  assert(result.recommended, "should mark a candidate as recommended")
  console.log("[PASS] fallback candidate for ambiguous input")
}

async function main() {
  testProjectsWebTypeScript()
  testProjectsCliPython()
  testDeterministicProjection()
  testFallbackCandidate()
  console.log("\n[FIRST CONTACT PROJECT] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
