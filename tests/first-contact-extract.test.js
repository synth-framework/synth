// ============================================================
// First Contact Intent Extraction Tests
// ============================================================
// Regression guards for EXP-AIFC-003:
//  - Intent extraction produces structured fields from plain input.
//  - Confidence scores are deterministic and in range.
//  - Unknowns are explicitly identified rather than guessed.
// ============================================================

import { extractIntent } from "../dist/first-contact/extract/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function testExtractsSpaceMissionTracker() {
  const input = "Let's build a space mission tracker."
  const result = extractIntent(input)

  assert(result.intent.description === input, "description should preserve input")
  assert(result.intent.goals.length > 0, "should extract at least one goal")
  assert(result.intent.successCriteria.length > 0, "should derive success criteria")
  assert(result.capabilities.required.some((c) => c.includes("mission")), "should infer mission capability")
  assert(result.unknowns.length > 0, "should identify unknowns")
  assert(result.confidence.overall >= 0 && result.confidence.overall <= 1, "overall confidence should be in range")
  assert(result.transcript.length === 1, "transcript should record the operator input")
  console.log("[PASS] extracts intent from space mission tracker")
}

function testExtractsMarkdownViewer() {
  const input = "Create me a markdown viewer in Python."
  const result = extractIntent(input)

  assert(result.intent.description === input, "description should preserve input")
  assert(result.environment.languagePreferences.includes("python"), "should detect Python preference")
  assert(result.capabilities.required.some((c) => c.includes("markdown")), "should infer markdown capability")
  assert(result.unknowns.some((u) => u.field === "audience.primaryUsers"), "should identify audience unknown")
  console.log("[PASS] extracts intent from markdown viewer")
}

function testConfidenceIsDeterministic() {
  const input = "Create a CLI tool in TypeScript that validates event schemas."
  const a = extractIntent(input)
  const b = extractIntent(input)

  assert(a.confidence.overall === b.confidence.overall, "overall confidence should be deterministic")
  assert(
    JSON.stringify(a.confidence.byField) === JSON.stringify(b.confidence.byField),
    "per-field confidence should be deterministic",
  )
  assert(JSON.stringify(a.unknowns) === JSON.stringify(b.unknowns), "unknowns should be deterministic")
  console.log("[PASS] extraction is deterministic")
}

function testRejectsEmptyInput() {
  try {
    extractIntent("   ")
    assert(false, "should throw on empty input")
  } catch (err) {
    assert(err.message.includes("non-empty"), "error should mention non-empty input")
  }
  console.log("[PASS] rejects empty input")
}

function testTranscriptIncludesPriorEntries() {
  const prior = [
    { turn: 1, actor: "operator", type: "input", content: "Hello.", timestamp: "2026-07-19T00:00:00.000Z" },
  ]
  const result = extractIntent("Let's build a space mission tracker.", { priorTranscript: prior, turn: 2 })

  assert(result.transcript.length === 2, "transcript should include prior entries")
  assert(result.transcript[0].content === "Hello.", "prior entry should be preserved")
  assert(result.transcript[1].turn === 2, "new entry should use provided turn")
  console.log("[PASS] transcript appends to prior entries")
}

async function main() {
  testExtractsSpaceMissionTracker()
  testExtractsMarkdownViewer()
  testConfidenceIsDeterministic()
  testRejectsEmptyInput()
  testTranscriptIncludesPriorEntries()
  console.log("\n[FIRST CONTACT EXTRACT] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
