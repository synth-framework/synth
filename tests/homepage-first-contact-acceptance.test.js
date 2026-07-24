// ============================================================
// HOMEPAGE FIRST CONTACT ACCEPTANCE TEST
// ============================================================
// Validates the complete public-facing SYNTH journey on the
// Mission Studio homepage:
//
// Idea → Question → Understanding → Contract → Mission → Plan →
// Evidence → Review → Acceptance.
//
// This test drives the homepage runtime and public experience views
// through every transition, asserts the correct public step is
// rendered, and verifies no internal governance vocabulary leaks
// into the user-facing surface.
// ============================================================

import { test } from "node:test"
import assert from "node:assert"
import { createHomepageRuntime } from "../packages/homepage-runtime/dist/runtime.js"
import { resolvePublicExperience } from "../packages/homepage-runtime/dist/public-experience.js"
import { DemoOperator } from "../packages/homepage-runtime/dist/operator.js"
import { demoExamples } from "../packages/homepage-runtime/dist/demos.js"
import {
  renderPublicExperience,
  renderPublicHeader,
  renderPublicActions,
} from "../website/js/public-experience-views.js"

const FORBIDDEN_TERMS = [
  "Alignment Contract",
  "Divergence Gate",
  "Mission Projection Package",
  "Projection Certification",
  "Review Gate Package",
  "Acceptance Gate Package",
  "Governance State Machine",
  "Refinement Session",
  "Refinement Report",
  "Refined Intent",
  "Gate Policy",
  "Reviewer Kind",
]

function assertNoForbiddenVocabulary(html, label) {
  const lower = html.toLowerCase()
  for (const term of FORBIDDEN_TERMS) {
    assert.ok(
      !lower.includes(term.toLowerCase()),
      `${label} should not contain "${term}"`
    )
  }
}

function assertContains(html, text, label) {
  assert.ok(
    html.toLowerCase().includes(text.toLowerCase()),
    `${label} should contain "${text}"`
  )
}

function assertHasAction(html, actionId, label) {
  assert.ok(
    html.includes(`data-action="${actionId}"`),
    `${label} should expose action "${actionId}"`
  )
}

function renderSurface(state, projection, examples) {
  const experience = resolvePublicExperience(state)
  return {
    experience,
    html: [
      renderPublicHeader({ experience }),
      renderPublicExperience({ experience, state, projection, examples }),
      renderPublicActions({ actions: experience.actions }),
    ].join(""),
  }
}

async function answerUnknowns(runtime, state) {
  const operator = new DemoOperator()
  const questions = state.unknowns.items.map((u, i) => ({
    id: `q-${i}`,
    field: u.field,
    description: u.description,
  }))
  const answers = await operator.answerClarification(questions)
  const result = await runtime.clarify(state, answers)
  return result.state
}

async function runFullFlow(runtime, input, mode = "greenfield") {
  let { state, projection } = await runtime.discover(input, mode)
  state = await answerUnknowns(runtime, state)
  ;({ state, projection } = await runtime.approveContract(state))
  ;({ state, projection } = await runtime.approveMission(state))
  if (state.expeditions.length === 0) {
    ;({ state, projection } = await runtime.buildExpeditions(state))
  }
  ;({ state, projection } = await runtime.approvePlan(state))
  ;({ state, projection } = await runtime.startExecution(state))
  ;({ state, projection } = await runtime.completeExecution(state))
  ;({ state, projection } = await runtime.approveReview(state))
  ;({ state, projection } = await runtime.acceptOutcome(state))
  return { state, projection }
}

test("Homepage first-contact acceptance flow", async () => {
  const runtime = createHomepageRuntime()
  const examples = demoExamples

  // 1. Idea
  let state = { input: "", mode: "greenfield", unknowns: { kind: "unknowns", items: [] }, expeditions: [], evidence: [], answers: [], publicFlow: { contractApproved: false, missionApproved: false, planApproved: false, executionStarted: false, executionComplete: false, reviewApproved: false, accepted: false } }
  let projection = { phase: "idle", unknowns: { kind: "unknowns", items: [] }, expeditions: [], evidence: [] }
  let { experience, html } = renderSurface(state, projection, examples)
  assert.strictEqual(experience.step, "idea")
  assertContains(html, "What do you want to build?", "Idea step")
  assertContains(html, "Start", "Idea step")
  assertNoForbiddenVocabulary(html, "Idea step")

  // 2. Discover → Question
  const discovered = await runtime.discover("Build a homepage for my AI tool", "greenfield")
  state = discovered.state
  projection = discovered.projection
  ;({ experience, html } = renderSurface(state, projection, examples))
  assert.strictEqual(experience.step, "question")
  assertContains(html, "Before SYNTH can help", "Question step")
  assertContains(html, "Your answers shape the contract", "Question step")
  assertNoForbiddenVocabulary(html, "Question step")

  // 3. Answer questions → Understanding
  state = await answerUnknowns(runtime, state)
  projection = runtime.currentArtifacts(state)
  ;({ experience, html } = renderSurface(state, projection, examples))
  assert.strictEqual(experience.step, "understanding")
  assertContains(html, "Here is what SYNTH understood", "Understanding step")
  assertHasAction(html, "approve-contract", "Understanding step")
  assertNoForbiddenVocabulary(html, "Understanding step")

  // 4. Approve contract → Mission
  const contractApproved = await runtime.approveContract(state)
  state = contractApproved.state
  projection = contractApproved.projection
  ;({ experience, html } = renderSurface(state, projection, examples))
  assert.strictEqual(experience.step, "mission")
  assertContains(html, "This is what SYNTH will build", "Mission step")
  assertHasAction(html, "approve-mission", "Mission step")
  assertNoForbiddenVocabulary(html, "Mission step")

  // 5. Approve mission → Plan (app derives expeditions automatically)
  let missionApproved = await runtime.approveMission(state)
  state = missionApproved.state
  if (state.expeditions.length === 0) {
    const planned = await runtime.buildExpeditions(state)
    state = planned.state
  }
  projection = runtime.currentArtifacts(state)
  ;({ experience, html } = renderSurface(state, projection, examples))
  assert.strictEqual(experience.step, "plan")
  assertContains(html, "This is how SYNTH will build it", "Plan step")
  assertHasAction(html, "approve-plan", "Plan step")
  assertContains(html, "Plan item", "Plan step")
  assertNoForbiddenVocabulary(html, "Plan step")

  // 6. Approve plan → still Plan, but Start building action is available.
  const planApproved = await runtime.approvePlan(state)
  state = planApproved.state
  projection = planApproved.projection
  ;({ experience, html } = renderSurface(state, projection, examples))
  assert.strictEqual(experience.step, "plan")
  assertHasAction(html, "start-execution", "Plan step after approval")
  assertNoForbiddenVocabulary(html, "Plan step after approval")

  // 7. Start execution → Evidence
  const started = await runtime.startExecution(state)
  state = started.state
  projection = started.projection
  ;({ experience, html } = renderSurface(state, projection, examples))
  assert.strictEqual(experience.step, "evidence")
  assertContains(html, "Execution status", "Evidence step")
  assertContains(html, "In progress", "Evidence step")
  assertNoForbiddenVocabulary(html, "Evidence step")

  // 8. Complete execution → Review
  const completed = await runtime.completeExecution(state)
  state = completed.state
  projection = completed.projection
  ;({ experience, html } = renderSurface(state, projection, examples))
  assert.strictEqual(experience.step, "review")
  assertContains(html, "Compare the outcome to the original contract", "Review step")
  assertContains(html, "Contract", "Review step")
  assertContains(html, "Outcome", "Review step")
  assertHasAction(html, "approve-review", "Review step")
  assertNoForbiddenVocabulary(html, "Review step")

  // Plan items should be marked completed in Review.
  assertContains(html, "completed", "Review step completed plan items")

  // 9. Approve review → Acceptance
  const reviewApproved = await runtime.approveReview(state)
  state = reviewApproved.state
  projection = reviewApproved.projection
  ;({ experience, html } = renderSurface(state, projection, examples))
  assert.strictEqual(experience.step, "acceptance")
  assertContains(html, "Is this outcome complete?", "Acceptance step")
  assertHasAction(html, "accept-outcome", "Acceptance step")
  assertNoForbiddenVocabulary(html, "Acceptance step")

  // 10. Accept outcome → Complete
  const accepted = await runtime.acceptOutcome(state)
  state = accepted.state
  projection = accepted.projection
  ;({ experience, html } = renderSurface(state, projection, examples))
  assert.strictEqual(experience.step, "complete")
  assertContains(html, "The journey from idea to accepted outcome is complete", "Complete step")
  assertHasAction(html, "replay", "Complete step")
  assertNoForbiddenVocabulary(html, "Complete step")
})

test("AI product homepage demo scenario completes end-to-end", async () => {
  const runtime = createHomepageRuntime()
  const example = demoExamples.find((e) => e.id === "ai-product-homepage")
  assert.ok(example, "AI product homepage demo example should exist")

  const { state, projection } = await runFullFlow(runtime, example.input, example.mode)
  const experience = resolvePublicExperience(state)

  assert.strictEqual(experience.step, "complete")
  assert.ok(state.mission, "Mission should be generated")
  assert.ok(state.expeditions.length > 0, "Plan should have items")
  assert.ok(state.publicFlow.accepted, "Outcome should be accepted")
  assert.ok(projection.repository, "Repository summary should exist")

  const html = renderPublicExperience({ experience, state, projection, examples: demoExamples })
  assertContains(html, example.input, "Complete step should reference original idea")
  assertNoForbiddenVocabulary(html, "AI product homepage complete step")
})
