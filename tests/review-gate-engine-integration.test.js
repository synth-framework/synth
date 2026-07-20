import { describe, it } from "node:test"
import assert from "node:assert"
import { applyDomain } from "../dist/domain/execution.js"
import { createEmptyState, rebuildState } from "../dist/runtime/replay.js"
import { GATE_POLICIES } from "../dist/governance/review-gates.js"

const humanReviewer = { kind: "human", id: "operator" }

function makeCtx(timestamp = Date.now()) {
  return {
    timestamp,
    commandId: `cmd-${timestamp}`,
    actor: "test",
    capability: "Test",
    sequence: 0,
    previousHash: "genesis",
    currentState: createEmptyState(),
  }
}

function makeRefinedIntentInput() {
  return {
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
  }
}

function createRunner() {
  const eventLog = []
  let seq = 0

  return function run(capability, payload) {
    const state = rebuildState(eventLog)
    const invocation = { actor: "test", capability, payload }
    const result = applyDomain(invocation, state, { ...makeCtx(), currentState: state })
    for (const e of result.events) {
      eventLog.push({
        id: `evt-${seq}`,
        type: e.type,
        timestamp: Date.now(),
        transactionId: "tx-1",
        capability,
        actor: "test",
        payload: e.payload,
        previousHash: "genesis",
        eventHash: `hash-${seq}`,
      })
      seq += 1
    }
    return rebuildState(eventLog)
  }
}

void describe("Review Gate Engine Integration", () => {
  void it("Scenario 1: straight-through acceptance via domain capabilities", () => {
    const run = createRunner()

    let state = run("ApproveRefinedIntent", {
      expeditionId: "exp-001",
      refinedIntent: makeRefinedIntentInput(),
      reviewer: humanReviewer,
      policy: GATE_POLICIES.humanRequired(),
    })
    assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "proposed")
    assert.ok(state.reviewGateExpeditions["exp-001"].refinedIntentId)

    state = run("OpenReviewGate", {
      expeditionId: "exp-001",
      implementationReference: "storybook.html",
      policy: GATE_POLICIES.humanRequired(),
    })
    assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "awaiting_review")
    assert.ok(state.reviewGateExpeditions["exp-001"].currentGateId)

    state = run("ResolveReviewGate", {
      expeditionId: "exp-001",
      decision: "approve",
      reviewer: humanReviewer,
      reason: "Matches Refined Intent",
      evidence: ["storybook.html"],
    })
    assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "approved")

    state = run("OpenAcceptanceGate", {
      expeditionId: "exp-001",
      policy: GATE_POLICIES.council(),
    })
    assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "awaiting_acceptance")

    state = run("ResolveAcceptanceGate", {
      expeditionId: "exp-001",
      decision: "accepted",
      reviewer: humanReviewer,
      reason: "Production ready",
    })
    assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "accepted")

    state = run("CloseExpedition", { expeditionId: "exp-001" })
    assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "closed")
  })

  void it("Scenario 2: revision loop", () => {
    const run = createRunner()

    run("ApproveRefinedIntent", {
      expeditionId: "exp-002",
      refinedIntent: makeRefinedIntentInput(),
      reviewer: humanReviewer,
      policy: GATE_POLICIES.humanRequired(),
    })

    run("OpenReviewGate", {
      expeditionId: "exp-002",
      implementationReference: "storybook.html",
      policy: GATE_POLICIES.humanRequired(),
    })

    let state = run("ResolveReviewGate", {
      expeditionId: "exp-002",
      decision: "revision_required",
      reviewer: humanReviewer,
      reason: "Does not match design language",
    })
    assert.strictEqual(state.reviewGateExpeditions["exp-002"].status, "revision_requested")

    const gateId = state.reviewGateExpeditions["exp-002"].currentGateId
    state = run("RequestRevision", {
      expeditionId: "exp-002",
      gateId,
      reviewer: humanReviewer,
      reason: "Replace dashboard cards",
    })
    assert.strictEqual(state.reviewGateExpeditions["exp-002"].status, "executing")
  })

  void it("Scenario 5: upstream gate blocks dependent expedition start", () => {
    const run = createRunner()

    // Create upstream expedition with open review gate
    run("ApproveRefinedIntent", {
      expeditionId: "exp-upstream",
      refinedIntent: makeRefinedIntentInput(),
      reviewer: humanReviewer,
      policy: GATE_POLICIES.humanRequired(),
    })
    run("OpenReviewGate", {
      expeditionId: "exp-upstream",
      implementationReference: "upstream.html",
      policy: GATE_POLICIES.humanRequired(),
    })

    // Create a mission and dependent expedition
    run("CreateMission", { id: "mission-001", name: "M", purpose: "P" })
    run("CreateExpedition", {
      id: "exp-downstream",
      missionId: "mission-001",
      name: "Downstream",
      goal: "Depends on upstream",
      dependsOn: ["exp-upstream"],
    })
    run("ApproveExpedition", { id: "exp-downstream" })
    run("CommitExpedition", { id: "exp-downstream" })

    assert.throws(
      () => {
        run("StartExpedition", { id: "exp-downstream" })
      },
      /UPSTREAM_GATE_BLOCKED/
    )
  })

  void it("prevents implementer self-approval under human-required policy", () => {
    const run = createRunner()

    run("ApproveRefinedIntent", {
      expeditionId: "exp-003",
      refinedIntent: makeRefinedIntentInput(),
      reviewer: humanReviewer,
      policy: GATE_POLICIES.humanRequired(),
    })
    run("OpenReviewGate", {
      expeditionId: "exp-003",
      implementationReference: "storybook.html",
      policy: GATE_POLICIES.humanRequired(),
    })

    assert.throws(
      () => {
        run("ResolveReviewGate", {
          expeditionId: "exp-003",
          decision: "approve",
          reviewer: { kind: "ai", id: "implementer" },
          reason: "Looks good",
        })
      },
      /cannot approve its own work/
    )
  })
})
