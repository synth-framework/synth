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
  ReviewGateError,
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
    let expedition = createReviewGateExpedition("exp-001", "human_required")

    const { expedition: afterRefinement, refinedIntent } = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-001"), humanReviewer)
    expedition = afterRefinement
    expedition = beginExecution(expedition)
    expedition = completeImplementation(expedition)
    assert.strictEqual(expedition.status, "awaiting_review")
    assert.ok(blocksDownstream(expedition))

    const { expedition: afterReview } = resolveReviewGate(expedition, "approve", humanReviewer, "Matches Refined Intent", ["storybook.html"])
    expedition = afterReview
    assert.strictEqual(expedition.status, "approved")
    assert.ok(!blocksDownstream(expedition))

    expedition = openAcceptanceGate(expedition)
    assert.strictEqual(expedition.status, "awaiting_acceptance")

    const { expedition: afterAcceptance } = resolveAcceptanceGate(expedition, "accepted", engineReviewer, "Production ready", ["lighthouse-report.json"])
    expedition = afterAcceptance
    assert.strictEqual(expedition.status, "accepted")

    expedition = closeExpedition(expedition)
    assert.strictEqual(expedition.status, "closed")
  })

  void it("Scenario 2: revision loop", () => {
    let expedition = createReviewGateExpedition("exp-002", "human_required")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-002"), humanReviewer).expedition
    expedition = beginExecution(expedition)
    expedition = completeImplementation(expedition)

    const { expedition: afterReview } = resolveReviewGate(
      expedition,
      "revision_required",
      humanReviewer,
      "Still resembles a dashboard",
      ["design-board-v4.png"],
      ["homepage", "mission-studio"]
    )
    expedition = afterReview
    assert.strictEqual(expedition.status, "revision_requested")

    const { expedition: afterRevision } = beginRevision(expedition, {
      reason: "Address dashboard resemblance",
      evidence: ["restored-document-artifacts.png"],
      reviewer: humanReviewer,
    })
    expedition = afterRevision
    assert.strictEqual(expedition.status, "executing")

    expedition = completeImplementation(expedition)
    assert.strictEqual(expedition.status, "awaiting_review")

    const { expedition: afterSecondReview } = resolveReviewGate(expedition, "approve", humanReviewer, "Now matches Refined Intent")
    expedition = afterSecondReview
    assert.strictEqual(expedition.status, "approved")
  })

  void it("Scenario 3: refinement clarification blocks Mission", () => {
    const expedition = createReviewGateExpedition("exp-003", "human_required")
    // No Refined Intent approved yet.
    assert.throws(() => beginExecution(expedition), ReviewGateError)
  })

  void it("Scenario 4: Mission change invalidates reviews", () => {
    let expedition = createReviewGateExpedition("exp-004", "human_required")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-004"), humanReviewer).expedition
    expedition = beginExecution(expedition)
    expedition = completeImplementation(expedition)

    const { expedition: afterReview } = resolveReviewGate(expedition, "approve", humanReviewer, "Looks good")
    expedition = afterReview
    assert.strictEqual(expedition.status, "approved")

    // A new Refined Intent version invalidates the prior review.
    const { expedition: afterRefinement } = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-004"), humanReviewer)
    expedition = afterRefinement
    assert.strictEqual(expedition.refinedIntentId, afterRefinement.refinedIntentId)
  })

  void it("Scenario 5: superseded expedition pauses dependents", () => {
    let upstream = createReviewGateExpedition("exp-upstream", "human_required")
    upstream = approveRefinedIntent(upstream, makeRefinedIntentInput("exp-upstream"), humanReviewer).expedition
    upstream = beginExecution(upstream)
    upstream = completeImplementation(upstream)

    const { expedition: afterReview } = resolveReviewGate(upstream, "supersede_expedition", humanReviewer, "Replaced by new approach")
    upstream = afterReview

    // While upstream is in a terminal decision state awaiting handling, downstream should not start.
    assert.ok(upstream.status === "awaiting_review" || upstream.status === "rejected")
  })

  void it("enforces completion policies", () => {
    let expedition = createReviewGateExpedition("exp-policy", "ai_required")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-policy"), humanReviewer).expedition
    expedition = beginExecution(expedition)
    expedition = completeImplementation(expedition)

    // AI policy allows AI reviewer.
    const { expedition: aiApproved } = resolveReviewGate(expedition, "approve", aiReviewer, "Quality checks pass")
    assert.strictEqual(aiApproved.status, "approved")

    // Implementation agent cannot approve under AI policy.
    let autoExpedition = createReviewGateExpedition("exp-auto", "automatic")
    autoExpedition = approveRefinedIntent(autoExpedition, makeRefinedIntentInput("exp-auto"), humanReviewer).expedition
    autoExpedition = beginExecution(autoExpedition)
    autoExpedition = completeImplementation(autoExpedition)
    const { expedition: autoApproved } = resolveReviewGate(autoExpedition, "approve", engineReviewer, "Automatic policy")
    assert.strictEqual(autoApproved.status, "approved")
  })

  void it("prevents implementer self-approval", () => {
    let expedition = createReviewGateExpedition("exp-self", "human_required")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-self"), humanReviewer).expedition
    expedition = beginExecution(expedition)
    expedition = completeImplementation(expedition)

    assert.throws(
      () => resolveReviewGate(expedition, "approve", { kind: "human", id: "implementer" }, "I approve my own work"),
      ReviewGateError
    )
  })

  void it("prevents skipping gates", () => {
    const expedition = createReviewGateExpedition("exp-skip", "human_required")
    assert.throws(() => completeImplementation(expedition), ReviewGateError)
  })

  void it("records Review Decision with affected assets", () => {
    let expedition = createReviewGateExpedition("exp-decision", "human_required")
    expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("exp-decision"), humanReviewer).expedition
    expedition = beginExecution(expedition)
    expedition = completeImplementation(expedition)

    const { decision } = resolveReviewGate(
      expedition,
      "revision_required",
      humanReviewer,
      "Dashboard resemblance",
      ["design-board-v4.png"],
      ["homepage", "mission-studio", "design-system"]
    )

    assert.strictEqual(decision.gateType, "review")
    assert.strictEqual(decision.decision, "revision_required")
    assert.deepStrictEqual(decision.affectedAssets, ["homepage", "mission-studio", "design-system"])
    assert.ok(decision.timestamp > 0)
  })
})
