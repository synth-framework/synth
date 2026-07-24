import { describe, it } from "node:test"
import assert from "node:assert"
import {
  createReviewGateExpedition,
  beginExecution,
  completeImplementation,
  resolveReviewGate,
  beginRevision,
  openAcceptanceGate,
  resolveAcceptanceGate,
  closeExpedition,
  approveRefinedIntent,
  blocksDownstream,
  invalidateDecision,
  ReviewGateError,
  GATE_POLICIES,
} from "../dist/governance/review-gates.js"

const humanReviewer = { kind: "human", id: "operator" }
const aiReviewer = { kind: "ai", id: "reviewer-agent" }
const engineReviewer = { kind: "engine", id: "certification-engine" }

function makeRefinedIntentInput(expeditionId) {
  return {
    missionId: "mission-001",
    objective: "Build a homepage that demonstrates SYNTH",
    scope: "Mission Studio shell embedded in the homepage",
    nonGoals: ["Backend runtime", "AI agent integration"],
    successCriteria: ["Visitor understands SYNTH in under five minutes"],
    visualReferences: ["design-board-v4.png"],
    behavioralReferences: ["sticky workspace"],
    constraints: ["No filesystem dependencies", "GitHub Pages deployable"],
    protectedAssets: ["Public Vocabulary"],
    acceptanceExamples: ["Storybook matches design board"],
    knownUnknowns: ["Exact scroll thresholds"],
    risks: ["Performance on low-end devices"],
  }
}

void describe("Review Gate Governance", () => {
  void it("Scenario 1: straight-through acceptance", () => {
    let expedition = createReviewGateExpedition("exp-001")

    const { expedition: afterRefinement, refinedIntent } = approveRefinedIntent(
      expedition,
      makeRefinedIntentInput("exp-001"),
      humanReviewer,
      GATE_POLICIES.humanRequired()
    )
    expedition = afterRefinement
    assert.ok(expedition.refinedIntentId)

    expedition = beginExecution(expedition)
    assert.strictEqual(expedition.status, "executing")

    const { expedition: afterComplete, gate: reviewGate, reviewPackage } = completeImplementation(
      expedition,
      "storybook.html",
      GATE_POLICIES.humanRequired()
    )
    expedition = afterComplete
    assert.strictEqual(expedition.status, "awaiting_review")
    assert.ok(blocksDownstream(expedition))
    assert.strictEqual(reviewPackage.gateId, reviewGate.id)

    const { expedition: afterReview, decision: reviewDecision } = resolveReviewGate(
      expedition,
      "approve",
      humanReviewer,
      "Matches Refined Intent",
      ["storybook.html"]
    )
    expedition = afterReview
    assert.strictEqual(expedition.status, "approved")
    assert.ok(!blocksDownstream(expedition))

    const { expedition: afterAcceptanceOpen, gate: acceptanceGate, acceptancePackage } = openAcceptanceGate(
      expedition,
      reviewDecision,
      GATE_POLICIES.council()
    )
    expedition = afterAcceptanceOpen
    assert.strictEqual(expedition.status, "awaiting_acceptance")
    assert.strictEqual(acceptancePackage.gateId, acceptanceGate.id)
    assert.strictEqual(acceptanceGate.parentGateId, reviewGate.id)

    const { expedition: afterAcceptance, record: acceptanceRecord } = resolveAcceptanceGate(
      expedition,
      "accepted",
      engineReviewer,
      "Production ready",
      ["lighthouse-report.json"]
    )
    expedition = afterAcceptance
    assert.strictEqual(expedition.status, "accepted")
    assert.ok(acceptanceRecord)

    expedition = closeExpedition(expedition)
    assert.strictEqual(expedition.status, "closed")
  })

  void it("Scenario 2: revision loop", () => {
    let expedition = createReviewGateExpedition("exp-002")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-002"), humanReviewer).expedition
    expedition = beginExecution(expedition)

    const { expedition: afterComplete, gate: reviewGate } = completeImplementation(expedition, "homepage.html")
    expedition = afterComplete

    const { expedition: afterReview, decision: reviewDecision } = resolveReviewGate(
      expedition,
      "revision_required",
      humanReviewer,
      "Still resembles a dashboard",
      ["design-board-v4.png"],
      ["homepage", "mission-studio"]
    )
    expedition = afterReview
    assert.strictEqual(expedition.status, "revision_requested")

    const { expedition: afterRevision, revisionRequest } = beginRevision(
      expedition,
      reviewGate,
      humanReviewer,
      "Address dashboard resemblance",
      ["restored-document-artifacts.png"]
    )
    expedition = afterRevision
    assert.strictEqual(expedition.status, "executing")
    assert.strictEqual(revisionRequest.gateId, reviewGate.id)

    expedition = completeImplementation(expedition, "homepage-v2.html").expedition
    assert.strictEqual(expedition.status, "awaiting_review")

    const { expedition: afterSecondReview } = resolveReviewGate(expedition, "approve", humanReviewer, "Now matches Refined Intent")
    expedition = afterSecondReview
    assert.strictEqual(expedition.status, "approved")
  })

  void it("Scenario 3: refinement clarification blocks Mission", () => {
    const expedition = createReviewGateExpedition("exp-003")
    // No Refined Intent approved yet.
    assert.throws(() => beginExecution(expedition), ReviewGateError)
  })

  void it("Scenario 4: Mission change invalidates reviews (obsolete)", () => {
    let expedition = createReviewGateExpedition("exp-004")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-004"), humanReviewer).expedition
    expedition = beginExecution(expedition)

    const { expedition: afterComplete, gate: reviewGate } = completeImplementation(expedition, "homepage.html")
    expedition = afterComplete
    expedition = resolveReviewGate(expedition, "approve", humanReviewer, "Looks good").expedition
    assert.strictEqual(expedition.status, "approved")

    // A new Refined Intent version invalidates the prior review as obsolete.
    const { expedition: afterRefinement } = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-004"), humanReviewer)
    expedition = afterRefinement
    assert.strictEqual(expedition.status, "proposed")
    assert.strictEqual(expedition.reviewDecisionId, undefined)

    const obsoleteGate = expedition.gates.find((g) => g.id === reviewGate.id)
    assert.ok(obsoleteGate)
    assert.strictEqual(obsoleteGate.status, "rejected")
  })

  void it("Scenario 5: superseded expedition pauses dependents", () => {
    let upstream = createReviewGateExpedition("exp-upstream")
    upstream = approveRefinedIntent(upstream, makeRefinedIntentInput("exp-upstream"), humanReviewer).expedition
    upstream = beginExecution(upstream)
    upstream = completeImplementation(upstream, "homepage.html").expedition

    upstream = resolveReviewGate(upstream, "supersede_expedition", humanReviewer, "Replaced by new approach").expedition
    assert.strictEqual(upstream.status, "rejected")
  })

  void it("gate identity is preserved and queryable", () => {
    let expedition = createReviewGateExpedition("exp-identity")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-identity"), humanReviewer).expedition
    expedition = beginExecution(expedition)

    const { gate } = completeImplementation(expedition, "artifact.html")
    assert.ok(gate.id)
    assert.strictEqual(gate.gateType, "review")
    assert.strictEqual(gate.expeditionId, "exp-identity")
    assert.ok(gate.createdAt > 0)
  })

  void it("supports composable policies", () => {
    const policy = GATE_POLICIES.humanAndAi()
    assert.deepStrictEqual(policy.reviewers, ["human", "ai"])
    assert.strictEqual(policy.quorum, "all")

    let expedition = createReviewGateExpedition("exp-policy")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-policy"), humanReviewer).expedition
    expedition = beginExecution(expedition)

    expedition = completeImplementation(expedition, "docs.html", policy).expedition
    const { expedition: afterReview } = resolveReviewGate(expedition, "approve", aiReviewer, "AI review passes")
    assert.strictEqual(afterReview.status, "approved")
  })

  void it("prevents implementer self-approval", () => {
    let expedition = createReviewGateExpedition("exp-self")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-self"), humanReviewer).expedition
    expedition = beginExecution(expedition)
    expedition = completeImplementation(expedition, "work.html").expedition

    assert.throws(
      () => resolveReviewGate(expedition, "approve", { kind: "human", id: "implementer" }, "I approve my own work"),
      ReviewGateError
    )
  })

  void it("prevents skipping gates", () => {
    const expedition = createReviewGateExpedition("exp-skip")
    assert.throws(() => completeImplementation(expedition, "skip.html"), ReviewGateError)
  })

  void it("records Review Decision with affected assets and validity", () => {
    let expedition = createReviewGateExpedition("exp-decision")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-decision"), humanReviewer).expedition
    expedition = beginExecution(expedition)
    expedition = completeImplementation(expedition, "work.html").expedition

    const { decision } = resolveReviewGate(
      expedition,
      "revision_required",
      humanReviewer,
      "Dashboard resemblance",
      ["design-board-v4.png"],
      ["homepage", "mission-studio", "design-system"],
      ["replace dashboard cards", "restore document artifacts"]
    )

    assert.strictEqual(decision.gateType, "review")
    assert.strictEqual(decision.decision, "revision_required")
    assert.deepStrictEqual(decision.affectedAssets, ["homepage", "mission-studio", "design-system"])
    assert.deepStrictEqual(decision.requiredChanges, ["replace dashboard cards", "restore document artifacts"])
    assert.strictEqual(decision.validity, "valid")
    assert.ok(decision.timestamp > 0)
  })

  void it("distinguishes invalid from obsolete decisions", () => {
    let expedition = createReviewGateExpedition("exp-validity")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-validity"), humanReviewer).expedition
    expedition = beginExecution(expedition)

    const { expedition: afterComplete, gate } = completeImplementation(expedition, "work.html")
    expedition = afterComplete
    expedition = resolveReviewGate(expedition, "approve", humanReviewer, "Good").expedition

    expedition = invalidateDecision(expedition, gate.id, "invalid", "Reviewer mistake")
    const invalidGate = expedition.gates.find((g) => g.id === gate.id)
    assert.ok(invalidGate.blocking)

    // Re-approve as obsolete through a new Refined Intent.
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-validity"), humanReviewer).expedition
    const obsoleteGate = expedition.gates.find((g) => g.id === gate.id)
    assert.strictEqual(obsoleteGate.status, "rejected")
  })
})
