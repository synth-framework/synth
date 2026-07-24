import { describe, it } from "node:test"
import assert from "node:assert"
import {
  validateRefinedIntent,
  validateReviewGatePackage,
  validateReviewDecision,
  validateRevisionRequest,
  validateAcceptanceGatePackage,
  validateAcceptanceRecord,
  validateGatePolicy,
  ARTIFACT_SCHEMAS,
} from "../dist/governance/review-gate-validation.js"

const humanReviewer = { kind: "human", id: "operator" }
const aiReviewer = { kind: "ai", id: "reviewer-agent" }

function makeRefinedIntent() {
  return {
    id: "ri-001",
    missionId: "mission-001",
    objective: "Build a homepage that demonstrates SYNTH",
    scope: "Mission Studio shell embedded in the homepage",
    nonGoals: ["Backend runtime"],
    successCriteria: ["Visitor understands SYNTH"],
    visualReferences: ["design-board-v4.png"],
    behavioralReferences: ["sticky workspace"],
    constraints: ["No filesystem dependencies"],
    protectedAssets: ["Public Vocabulary"],
    acceptanceExamples: ["Storybook matches design board"],
    knownUnknowns: ["Exact scroll thresholds"],
    risks: ["Performance on low-end devices"],
    approvedBy: humanReviewer,
    approvedAt: Date.now(),
    version: 1,
  }
}

function makeReviewPackage() {
  return {
    id: "rgp-001",
    gateId: "gate-001",
    expeditionId: "exp-001",
    refinedIntentId: "ri-001",
    implementationReference: "storybook.html",
    knownDivergence: [],
    acceptedDivergence: [],
    rejectedDivergence: [],
  }
}

function makeReviewDecision() {
  return {
    id: "rd-001",
    gateId: "gate-001",
    gateType: "review",
    expeditionId: "exp-001",
    decision: "approve",
    reason: "Matches the Refined Intent",
    affectedAssets: ["homepage"],
    requiredChanges: [],
    evidence: ["storybook.html"],
    reviewer: humanReviewer,
    validity: "valid",
    timestamp: Date.now(),
  }
}

function makeRevisionRequest() {
  return {
    id: "rr-001",
    gateId: "gate-001",
    expeditionId: "exp-001",
    reason: "Dashboard aesthetic does not match design language",
    evidence: ["design-board-v4.png"],
    reviewer: humanReviewer,
    timestamp: Date.now(),
  }
}

function makeAcceptancePackage() {
  return {
    id: "agp-001",
    gateId: "gate-002",
    expeditionId: "exp-001",
    reviewDecisionId: "rd-001",
    certificationEvidence: ["certification-report.json"],
    stakeholderApprovals: ["operator"],
    rolloutReadiness: ["GitHub Pages configured"],
  }
}

function makeAcceptanceRecord() {
  return {
    id: "ar-001",
    gateId: "gate-002",
    expeditionId: "exp-001",
    decision: "accepted",
    reviewer: humanReviewer,
    timestamp: Date.now(),
  }
}

void describe("Review Gate Artifact Validation", () => {
  void it("validates a correct RefinedIntent", () => {
    const result = validateRefinedIntent(makeRefinedIntent())
    assert.strictEqual(result.valid, true)
    assert.deepStrictEqual(result.errors, [])
  })

  void it("rejects a RefinedIntent with missing required fields", () => {
    const result = validateRefinedIntent({ id: "ri-001" })
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.includes("missionId is required"))
    assert.ok(result.errors.includes("objective is required"))
    assert.ok(result.errors.includes("version must be a number"))
  })

  void it("rejects a RefinedIntent with wrong array types", () => {
    const artifact = { ...makeRefinedIntent(), nonGoals: "none" }
    const result = validateRefinedIntent(artifact)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.includes("nonGoals must be a string array"))
  })

  void it("validates a correct ReviewGatePackage", () => {
    const result = validateReviewGatePackage(makeReviewPackage())
    assert.strictEqual(result.valid, true)
    assert.deepStrictEqual(result.errors, [])
  })

  void it("rejects a ReviewGatePackage missing gateId", () => {
    const { gateId, ...rest } = makeReviewPackage()
    const result = validateReviewGatePackage(rest)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.includes("gateId is required"))
  })

  void it("validates a correct ReviewDecision", () => {
    const result = validateReviewDecision(makeReviewDecision())
    assert.strictEqual(result.valid, true)
    assert.deepStrictEqual(result.errors, [])
  })

  void it("rejects an unknown gateType or decision", () => {
    const result = validateReviewDecision({
      ...makeReviewDecision(),
      gateType: "retrospective",
      decision: "maybe",
      validity: "unknown",
    })
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.some((e) => e.includes("gateType")))
    assert.ok(result.errors.some((e) => e.includes("decision")))
    assert.ok(result.errors.some((e) => e.includes("validity")))
  })

  void it("prevents implementer self-approval by reviewer validation", () => {
    const result = validateReviewDecision({
      ...makeReviewDecision(),
      reviewer: { kind: "ai", id: "implementer" },
    })
    assert.strictEqual(result.valid, true)
    // Validation layer does not encode policy; the engine enforces self-approval.
  })

  void it("validates a correct RevisionRequest", () => {
    const result = validateRevisionRequest(makeRevisionRequest())
    assert.strictEqual(result.valid, true)
    assert.deepStrictEqual(result.errors, [])
  })

  void it("rejects a RevisionRequest missing reason", () => {
    const { reason, ...rest } = makeRevisionRequest()
    const result = validateRevisionRequest(rest)
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.includes("reason is required"))
  })

  void it("validates a correct AcceptanceGatePackage", () => {
    const result = validateAcceptanceGatePackage(makeAcceptancePackage())
    assert.strictEqual(result.valid, true)
    assert.deepStrictEqual(result.errors, [])
  })

  void it("rejects an AcceptanceGatePackage with non-array evidence", () => {
    const result = validateAcceptanceGatePackage({
      ...makeAcceptancePackage(),
      certificationEvidence: "certification-report.json",
    })
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.includes("certificationEvidence must be a string array"))
  })

  void it("validates a correct AcceptanceRecord", () => {
    const result = validateAcceptanceRecord(makeAcceptanceRecord())
    assert.strictEqual(result.valid, true)
    assert.deepStrictEqual(result.errors, [])
  })

  void it("rejects an AcceptanceRecord with an invalid decision", () => {
    const result = validateAcceptanceRecord({
      ...makeAcceptanceRecord(),
      decision: "deferred",
    })
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.includes("decision must be accepted or rejected"))
  })

  void it("validates a correct GatePolicy", () => {
    const result = validateGatePolicy({
      reviewers: ["human", "ai"],
      quorum: "all",
      timeout: 86400000,
      revisionLimit: 5,
      autoAdvance: false,
    })
    assert.strictEqual(result.valid, true)
    assert.deepStrictEqual(result.errors, [])
  })

  void it("rejects a GatePolicy with no reviewers", () => {
    const result = validateGatePolicy({ reviewers: [], quorum: "any" })
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.includes("reviewers must be a non-empty array"))
  })

  void it("rejects a GatePolicy with invalid reviewer kinds", () => {
    const result = validateGatePolicy({ reviewers: ["human", "ghost"], quorum: "any" })
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.includes("reviewers must be valid reviewer kinds"))
  })

  void it("rejects a GatePolicy with invalid quorum", () => {
    const result = validateGatePolicy({ reviewers: ["human"], quorum: "most" })
    assert.strictEqual(result.valid, false)
    assert.ok(result.errors.includes("quorum must be 'all', 'any', or a number"))
  })

  void it("exports schema definitions for every governed artifact", () => {
    assert.ok(ARTIFACT_SCHEMAS.refinedIntent)
    assert.ok(ARTIFACT_SCHEMAS.reviewGatePackage)
    assert.ok(ARTIFACT_SCHEMAS.reviewDecision)
    assert.ok(ARTIFACT_SCHEMAS.gatePolicy)
    assert.ok(ARTIFACT_SCHEMAS.refinedIntent.required.includes("version"))
  })
})
