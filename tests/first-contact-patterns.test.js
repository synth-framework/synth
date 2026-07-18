// ============================================================
// First Contact Conversation Pattern Tests
// ============================================================
// Regression guards for EXP-FIRSTCONTACT-011 Phase 3 & 4:
//  - ConversationPattern extraction is deterministic and evidence-backed.
//  - Pattern validation correctly promotes or rejects patterns.
// ============================================================

import { extractConversationPattern, promoteConversationPattern } from "../dist/first-contact/patterns.js"

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`)
}

function buildEvidence(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    sessionId: "test-session",
    scenarioId: "repository-introduction",
    humanPrompt: "I want to understand this project before making any changes.",
    repositoryState: {
      initialized: true,
      files: ["README.md", "package.json"],
      phase: "initialized",
      notices: [],
    },
    agentInitialModel: { understoodAs: "unknown repository", confidence: 0.1, unknowns: ["purpose"] },
    evidenceConsumed: [
      {
        turn: 1,
        command: ["status"],
        intent: "Determine state.",
        agentReasoningState: { understoodAs: "unknown repository", confidence: 0.1, unknowns: ["purpose"] },
        inputs: {},
        outputs: { status: "ok", phase: "initialized" },
        stateBefore: {},
        stateAfter: {},
        stateChange: {},
        evidenceGenerated: [],
      },
      {
        turn: 2,
        command: ["explain"],
        intent: "Read briefing.",
        agentReasoningState: { understoodAs: "governed project", confidence: 0.6, unknowns: [] },
        inputs: {},
        outputs: { explanation: "..." },
        stateBefore: {},
        stateAfter: {},
        stateChange: {},
        evidenceGenerated: [],
      },
    ],
    interpretationChanges: [
      {
        turn: 2,
        command: "explain",
        evidenceConsumed: ["explanation"],
        from: { understoodAs: "unknown repository", confidence: 0.1, unknowns: ["purpose"] },
        to: { understoodAs: "governed project", confidence: 0.6, unknowns: [] },
        aligned: true,
      },
    ],
    interventions: [
      {
        turn: 2,
        command: "explain",
        description: "Model corrected from 'unknown repository' to 'governed project'.",
      },
    ],
    finalModel: { understoodAs: "governed project", confidence: 0.6, unknowns: [] },
    misinterpretationCategories: ["none"],
    successConditions: {
      inspectedBeforeActing: true,
      usedGovernedPath: false,
      reachedCorrectInterpretation: true,
      remainingUnknownsAcceptable: true,
    },
    ...overrides,
  }
}

function testExtractsPatternFromEvidence() {
  const evidence = buildEvidence()
  const pattern = extractConversationPattern(evidence, { evidencePath: "test-evidence.json" })

  assert(pattern.schemaVersion === "1.0.0", "pattern schemaVersion should be 1.0.0")
  assert(pattern.id === "repository-introduction", "pattern id should come from scenarioId")
  assert(pattern.trigger === evidence.humanPrompt, "trigger should be the human prompt")
  assert(pattern.trajectory.length === 2, "trajectory should include all turns")
  assert(pattern.trajectory[0].command === "status", "first turn command should be status")
  assert(pattern.trajectory[1].expectedReasoningState.understoodAs === "governed project", "final reasoning state preserved")
  assert(pattern.decisionPoints.length >= 1, "should record at least one decision point")
  assert(pattern.supportingEvidence[0].evidencePath === "test-evidence.json", "evidence path should be preserved")
  assert(pattern.confidence >= 0.5, "confidence should be at least 0.5")
  assert(pattern.status === "provisional", "extracted pattern should be provisional until validated")
  console.log("[PASS] extracts pattern from evidence")
}

function testPromotesPatternToCanonical() {
  const evidence = buildEvidence()
  const pattern = extractConversationPattern(evidence)
  const promoted = promoteConversationPattern(pattern, { minEvidenceCount: 1, minConfidence: 0.5 })

  assert(promoted.status === "canonical", "valid pattern should be canonical")
  assert(promoted.confidence === pattern.confidence, "promotion should not mutate confidence")
  console.log("[PASS] promotes valid pattern to canonical")
}

function testRejectsLowConfidencePattern() {
  const evidence = buildEvidence({
    finalModel: { understoodAs: "unknown repository", confidence: 0.1, unknowns: ["purpose"] },
    successConditions: {
      inspectedBeforeActing: false,
      usedGovernedPath: false,
      reachedCorrectInterpretation: false,
      remainingUnknownsAcceptable: false,
    },
  })
  const pattern = extractConversationPattern(evidence)
  const promoted = promoteConversationPattern(pattern, { minEvidenceCount: 1, minConfidence: 0.5 })

  assert(promoted.status === "rejected", "low-confidence pattern should be rejected")
  console.log("[PASS] rejects low-confidence pattern")
}

function testAntiPatternsDerivedFromEvidence() {
  const evidence = buildEvidence({
    misinterpretationCategories: ["intent-confusion"],
    interpretationChanges: [
      {
        turn: 2,
        command: "explain",
        evidenceConsumed: ["explanation"],
        from: { understoodAs: "unknown repository", confidence: 0.1, unknowns: ["purpose"] },
        to: { understoodAs: "incomplete application", confidence: 0.8, unknowns: [] },
        aligned: false,
      },
    ],
  })
  const pattern = extractConversationPattern(evidence)

  assert(pattern.antiPatterns.length > 0, "should derive anti-patterns from misinterpretations")
  assert(
    pattern.antiPatterns.some((ap) => ap.includes("incomplete application")),
    "anti-patterns should reference the misinterpreted model",
  )
  console.log("[PASS] derives anti-patterns from evidence")
}

async function main() {
  testExtractsPatternFromEvidence()
  testPromotesPatternToCanonical()
  testRejectsLowConfidencePattern()
  testAntiPatternsDerivedFromEvidence()
  console.log("\n[FIRST CONTACT PATTERNS] All tests passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
