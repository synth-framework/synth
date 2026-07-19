// ============================================================
// First Contact Clarification Strategy Tests
// ============================================================
// Regression guards for EXP-AIFC-004:
//  - Ambiguities are detected from low-confidence fields.
//  - Targeted questions are generated.
//  - Answers update the artifact and confidence deterministically.
//  - Termination conditions are respected.
// ============================================================

import { extractIntent } from "../dist/first-contact/extract/index.js"
import { clarify, DefaultClarificationStrategy } from "../dist/first-contact/clarify/index.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function testDetectsAmbiguitiesFromLowConfidence() {
  const artifact = extractIntent("Let's build a space mission tracker.")
  const result = clarify(artifact)

  assert(result.ambiguities.length > 0, "should detect ambiguities in a short input")
  assert(result.questions.length === result.ambiguities.length, "should generate one question per ambiguity")
  assert(result.questions.some((q) => q.field === "audience.primaryUsers"), "should ask about audience")
  console.log("[PASS] detects ambiguities from low-confidence fields")
}

function testApplyAnswerUpdatesArtifact() {
  const artifact = extractIntent("Let's build a space mission tracker.")
  const strategy = new DefaultClarificationStrategy()
  const initial = clarify(artifact, strategy)

  const question = initial.questions.find((q) => q.field === "audience.primaryUsers")
  assert(question, "should have audience question")

  const updated = strategy.applyAnswer(artifact, question, { questionId: question.id, content: "space enthusiasts, journalists" })

  assert(updated.audience.primaryUsers.length === 2, "should split list answer")
  assert(updated.audience.primaryUsers.includes("space enthusiasts"), "should include first user")
  assert(updated.confidence.byField["audience.primaryUsers"] > artifact.confidence.byField["audience.primaryUsers"], "confidence should increase")
  assert(updated.transcript.length > artifact.transcript.length, "transcript should record Q&A")
  console.log("[PASS] applies answer and updates artifact")
}

function testDeterministicClarification() {
  const artifact = extractIntent("Create me a markdown viewer in Python.")
  const a = clarify(artifact)
  const b = clarify(artifact)

  assert(JSON.stringify(a.questions) === JSON.stringify(b.questions), "questions should be deterministic")
  assert(JSON.stringify(a.ambiguities) === JSON.stringify(b.ambiguities), "ambiguities should be deterministic")
  console.log("[PASS] clarification is deterministic")
}

function testCanApproveWhenConfident() {
  const artifact = extractIntent("Create me a markdown viewer in Python.")
  const strategy = new DefaultClarificationStrategy()

  let current = artifact
  for (let round = 0; round < 5; round++) {
    const result = clarify(current, strategy)
    if (result.canApprove || result.questions.length === 0) break
    for (const question of result.questions) {
      const answer = question.field.includes("audience")
        ? "developers"
        : question.field.includes("runtime")
          ? "cli"
          : question.field.includes("language")
            ? "python"
            : question.field.includes("platform")
              ? "cross-platform"
              : question.field.includes("capabilities")
                ? "markdown-parser, html-renderer"
                : question.field.includes("constraints")
                  ? "no-network-required"
                  : question.field.includes("goals")
                    ? "render markdown, apply themes"
                    : question.field.includes("success")
                      ? "users can render markdown files"
                      : "none"
      current = strategy.applyAnswer(current, question, { questionId: question.id, content: answer })
    }
  }

  const final = clarify(current, strategy)
  assert(final.canApprove || final.questions.length === 0, "should be ready to approve once ambiguities are resolved")
  console.log("[PASS] can reach approval-ready state")
}

async function main() {
  testDetectsAmbiguitiesFromLowConfidence()
  testApplyAnswerUpdatesArtifact()
  testDeterministicClarification()
  testCanApproveWhenConfident()
  console.log("\n[FIRST CONTACT CLARIFY] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
