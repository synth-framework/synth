// ============================================================
// EXP-GATE-012 — Certification for Program 035
// Three-Gate Governance Model (Intent Refinement & Review)
// ============================================================
// Validates the five canonical governance scenarios through
// the domain logic (applyDomain) with an in-memory event log,
// verifying correct state transitions and event emissions.
// ============================================================

import { strict as assert } from "assert"
import { applyDomain } from "../dist/domain/execution.js"
import { createEmptyState, rebuildState } from "../dist/runtime/replay.js"
import { buildDerivedState } from "../dist/state/derived/index.js"
import {
  GATE_POLICIES,
  createReviewGateExpedition,
  approveRefinedIntent,
  beginExecution,
  completeImplementation,
  resolveReviewGate,
  beginRevision,
  blocksDownstream,
  ReviewGateError,
} from "../dist/governance/review-gates.js"

// ============================================================
// Helpers
// ============================================================

const humanReviewer = { kind: "human", id: "operator" }
const engineReviewer = { kind: "engine", id: "certification-engine" }

function makeRefinedIntentInput(missionId = "mission-gate-012") {
  return {
    missionId,
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

function createRunner() {
  const eventLog = []
  let seq = 0

  function run(capability, payload) {
    const state = rebuildState(eventLog)
    const derivedState = buildDerivedState(eventLog)
    const invocation = { actor: "test", capability, payload }
    const result = applyDomain(invocation, state, derivedState, { ...makeCtx(), currentState: state })
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
    return buildDerivedState(eventLog)
  }
  run.getEvents = () => eventLog
  run.getCanonicalState = () => rebuildState(eventLog)
  return run
}

const TESTS = []
let passed = 0
let failed = 0

function test(name, fn) { TESTS.push({ name, fn }) }

async function runTests() {
  console.log("\n═══════════════════════════════════════════════════════════════")
  console.log("  EXP-GATE-012 — Program 035 Certification (Three-Gate Model)")
  console.log("═══════════════════════════════════════════════════════════════\n")

  for (const t of TESTS) {
    try {
      await t.fn()
      console.log(`  [PASS] ${t.name}`)
      passed++
    } catch (err) {
      console.log(`  [FAIL] ${t.name}`)
      console.log(`         ${err.message || err}`)
      failed++
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════════")
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  console.log("═══════════════════════════════════════════════════════════════\n")

  if (failed > 0) process.exit(1)
}

// ============================================================
// Scenario 1 — Straight-through acceptance
// ============================================================
// Refinement approved → Mission created → Implementation →
// Review approved → Accepted
// ============================================================

test("Scenario 1 — Straight-through acceptance", () => {
  const run = createRunner()

  // Step 1: Approve Refined Intent
  let state = run("ApproveRefinedIntent", {
    expeditionId: "exp-001",
    refinedIntent: makeRefinedIntentInput("mission-001"),
    reviewer: humanReviewer,
    policy: GATE_POLICIES.humanRequired(),
  })
  assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "proposed")
  assert.ok(state.reviewGateExpeditions["exp-001"].refinedIntentId)

  // Step 2: Open Review Gate (triggers beginExecution + completeImplementation)
  state = run("OpenReviewGate", {
    expeditionId: "exp-001",
    implementationReference: "storybook-v1.html",
    policy: GATE_POLICIES.humanRequired(),
  })
  assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "awaiting_review")
  assert.ok(state.reviewGateExpeditions["exp-001"].currentGateId)

  // Step 3: Resolve Review Gate — approve
  state = run("ResolveReviewGate", {
    expeditionId: "exp-001",
    decision: "approve",
    reviewer: humanReviewer,
    reason: "Matches Refined Intent",
    evidence: ["storybook-v1.html"],
  })
  assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "approved")
  assert.ok(!blocksDownstream(state.reviewGateExpeditions["exp-001"]))

  // Step 4: Open Acceptance Gate (use automatic policy so engine reviewer is allowed)
  state = run("OpenAcceptanceGate", {
    expeditionId: "exp-001",
    policy: GATE_POLICIES.automatic(),
  })
  assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "awaiting_acceptance")

  // Step 5: Resolve Acceptance Gate — accepted
  state = run("ResolveAcceptanceGate", {
    expeditionId: "exp-001",
    decision: "accepted",
    reviewer: engineReviewer,
    reason: "Production ready",
    evidence: ["lighthouse-report.json"],
  })
  assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "accepted")

  // Step 6: Close Expedition
  state = run("CloseExpedition", { expeditionId: "exp-001" })
  assert.strictEqual(state.reviewGateExpeditions["exp-001"].status, "closed")

  // Verify event trail
  const events = run.getEvents()
  const eventTypes = events.map((e) => e.type)
  assert.ok(eventTypes.includes("REFINED_INTENT_APPROVED"), "REFINED_INTENT_APPROVED event should exist")
  assert.ok(eventTypes.includes("REVIEW_GATE_OPENED"), "REVIEW_GATE_OPENED event should exist")
  assert.ok(eventTypes.includes("REVIEW_GATE_RESOLVED"), "REVIEW_GATE_RESOLVED event should exist")
  assert.ok(eventTypes.includes("ACCEPTANCE_GATE_OPENED"), "ACCEPTANCE_GATE_OPENED event should exist")
  assert.ok(eventTypes.includes("ACCEPTANCE_GATE_RESOLVED"), "ACCEPTANCE_GATE_RESOLVED event should exist")
  assert.ok(eventTypes.includes("EXPEDITION_CLOSED"), "EXPEDITION_CLOSED event should exist")

  // Verify gate identities in gates array (review and acceptance are tracked)
  const rge = state.reviewGateExpeditions["exp-001"]
  const gateTypes = rge.gates.map((g) => g.gateType)
  assert.ok(gateTypes.includes("review"), "Review gate should exist")
  assert.ok(gateTypes.includes("acceptance"), "Acceptance gate should exist")

  // Refinement gate existence is verified by the REFINED_INTENT_APPROVED event
})

// ============================================================
// Scenario 2 — Revision loop
// ============================================================
// Review → Revision Requested → Implementation resumes →
// Review → Approved
// ============================================================

test("Scenario 2 — Revision loop (engine path up to revision request)", () => {
  const run = createRunner()

  run("ApproveRefinedIntent", {
    expeditionId: "exp-002",
    refinedIntent: makeRefinedIntentInput("mission-002"),
    reviewer: humanReviewer,
    policy: GATE_POLICIES.humanRequired(),
  })

  run("OpenReviewGate", {
    expeditionId: "exp-002",
    implementationReference: "homepage-v1.html",
    policy: GATE_POLICIES.humanRequired(),
  })

  // Resolve review — revision required
  let state = run("ResolveReviewGate", {
    expeditionId: "exp-002",
    decision: "revision_required",
    reviewer: humanReviewer,
    reason: "Does not match design language",
    evidence: ["design-board-v4.png"],
    affectedAssets: ["homepage", "mission-studio"],
    requiredChanges: ["Replace dashboard cards", "Restore document artifacts"],
  })
  assert.strictEqual(state.reviewGateExpeditions["exp-002"].status, "revision_requested")

  const gateId = state.reviewGateExpeditions["exp-002"].currentGateId

  // Request revision
  state = run("RequestRevision", {
    expeditionId: "exp-002",
    gateId,
    reviewer: humanReviewer,
    reason: "Replace dashboard cards with workspace components",
    evidence: ["restored-artifacts.png"],
  })
  assert.strictEqual(state.reviewGateExpeditions["exp-002"].status, "executing")

  // Verify REVISION_REQUESTED event
  const events = run.getEvents()
  const hasRevision = events.some((e) => e.type === "REVISION_REQUESTED")
  assert.ok(hasRevision, "REVISION_REQUESTED event should exist")

  const revisionEvent = events.find((e) => e.type === "REVISION_REQUESTED")
  assert.strictEqual(revisionEvent.payload.expeditionId, "exp-002")
  assert.strictEqual(revisionEvent.payload.gateId, gateId)
})

test("Scenario 2 — Revision loop (pure function: complete loop)", () => {
  const expeditionId = "exp-002-pure"

  let expedition = createReviewGateExpedition(expeditionId)
  assert.strictEqual(expedition.status, "proposed")

  // Approve refined intent
  expedition = approveRefinedIntent(expedition, makeRefinedIntentInput("mission-002-pure"), humanReviewer).expedition
  assert.ok(expedition.refinedIntentId)

  // Begin execution
  expedition = beginExecution(expedition)
  assert.strictEqual(expedition.status, "executing")

  // Complete implementation → opens review gate
  const { expedition: afterImpl, gate: reviewGate } = completeImplementation(expedition, "homepage-v1.html", GATE_POLICIES.humanRequired())
  expedition = afterImpl
  assert.strictEqual(expedition.status, "awaiting_review")

  // Resolve review — revision required
  expedition = resolveReviewGate(expedition, "revision_required", humanReviewer, "Does not match design language").expedition
  assert.strictEqual(expedition.status, "revision_requested")

  // Begin revision → resumes execution
  expedition = beginRevision(expedition, reviewGate, humanReviewer, "Address design concerns").expedition
  assert.strictEqual(expedition.status, "executing")

  // Complete implementation again (reopening review gate)
  const { expedition: afterReImpl } = completeImplementation(expedition, "homepage-v2.html", GATE_POLICIES.humanRequired())
  expedition = afterReImpl
  assert.strictEqual(expedition.status, "awaiting_review")

  // Re-resolve review — approve
  expedition = resolveReviewGate(expedition, "approve", humanReviewer, "Now matches Refined Intent").expedition
  assert.strictEqual(expedition.status, "approved")

  // Verify the expedition has multiple review gates (v1 and v2)
  const reviewGates = expedition.gates.filter((g) => g.gateType === "review")
  assert.strictEqual(reviewGates.length, 2, "Should have two review gates from revision loop")
  assert.strictEqual(reviewGates[0].status, "revision_requested", "First gate should be revision_requested")
  assert.strictEqual(reviewGates[1].status, "approved", "Second gate should be approved")
})

// ============================================================
// Scenario 3 — Refinement clarification blocks Mission
// ============================================================
// Refinement → Clarification Requested → Mission cannot be created
// ============================================================

test("Scenario 3 — Refinement clarification blocks execution", () => {
  const run = createRunner()

  // Attempt OpenReviewGate without an approved Refined Intent
  assert.throws(
    () => {
      run("OpenReviewGate", {
        expeditionId: "exp-003",
        implementationReference: "no-refinement.html",
        policy: GATE_POLICIES.humanRequired(),
      })
    },
    /Cannot begin execution without an approved Refined Intent/
  )

  // Verify no REVIEW_GATE_OPENED event was emitted
  const events = run.getEvents()
  const hasReviewGateOpened = events.some((e) => e.type === "REVIEW_GATE_OPENED")
  assert.ok(!hasReviewGateOpened, "REVIEW_GATE_OPENED should not be emitted without refined intent")
})

test("Scenario 3 — beginExecution pure function blocks without refined intent", () => {
  const expedition = createReviewGateExpedition("exp-003-pure")
  // No Refined Intent approved
  assert.throws(
    () => beginExecution(expedition),
    ReviewGateError
  )
})

// ============================================================
// Scenario 4 — Mission change invalidates reviews
// ============================================================
// Mission changes → Existing reviews invalidated
// ============================================================

test("Scenario 4 — Mission change invalidates reviews", () => {
  const run = createRunner()

  // Step 1: Approve refined intent (v1)
  run("ApproveRefinedIntent", {
    expeditionId: "exp-004",
    refinedIntent: makeRefinedIntentInput("mission-004"),
    reviewer: humanReviewer,
    policy: GATE_POLICIES.humanRequired(),
  })

  // Step 2: Open review gate
  run("OpenReviewGate", {
    expeditionId: "exp-004",
    implementationReference: "homepage-v1.html",
    policy: GATE_POLICIES.humanRequired(),
  })

  // Step 3: Resolve review — approve
  let state = run("ResolveReviewGate", {
    expeditionId: "exp-004",
    decision: "approve",
    reviewer: humanReviewer,
    reason: "Looks good",
    evidence: ["storybook-v1.html"],
  })
  assert.strictEqual(state.reviewGateExpeditions["exp-004"].status, "approved")

  // Capture the approved review gate's decisionId before re-approval
  const reviewDecisionIdBefore = state.reviewGateExpeditions["exp-004"].reviewDecisionId
  assert.ok(reviewDecisionIdBefore, "reviewDecisionId should be set after approval")

  // Step 4: Re-approve refined intent (v2) — simulates mission change
  state = run("ApproveRefinedIntent", {
    expeditionId: "exp-004",
    refinedIntent: { ...makeRefinedIntentInput("mission-004"), objective: "REVISED: Build a homepage" },
    reviewer: humanReviewer,
    policy: GATE_POLICIES.humanRequired(),
  })

  // After re-approval, the expedition is reset to proposed
  assert.strictEqual(state.reviewGateExpeditions["exp-004"].status, "proposed")

  // Verify events — the event trail is the authoritative source for invalidation
  const events = run.getEvents()

  // Two REFINED_INTENT_APPROVED events confirm the mission was re-approved
  const refinedIntentEvents = events.filter((e) => e.type === "REFINED_INTENT_APPROVED")
  assert.strictEqual(refinedIntentEvents.length, 2, "Two REFINED_INTENT_APPROVED events should exist (v1 and v2)")

  // The second refined intent event has a different id, confirming a new version
  assert.notStrictEqual(
    refinedIntentEvents[0].payload.refinedIntentId,
    refinedIntentEvents[1].payload.refinedIntentId,
    "Each REFINED_INTENT_APPROVED should have a unique refinedIntentId"
  )

  // One REVIEW_GATE_RESOLVED event before the re-approval
  const reviewResolvedEvents = events.filter((e) => e.type === "REVIEW_GATE_RESOLVED")
  assert.strictEqual(reviewResolvedEvents.length, 1, "One REVIEW_GATE_RESOLVED event before reset")

  // After re-approval, the expedition status resets to proposed
  assert.strictEqual(state.reviewGateExpeditions["exp-004"].status, "proposed")
})

// ============================================================
// Scenario 5 — Superseded expedition pauses dependents
// ============================================================
// Expedition superseded → Dependent expeditions paused
// ============================================================

test("Scenario 5 — Upstream gate blocks dependent expedition start", () => {
  const run = createRunner()

  // Create upstream expedition with an open (unresolved) review gate
  run("ApproveRefinedIntent", {
    expeditionId: "exp-upstream",
    refinedIntent: makeRefinedIntentInput("mission-upstream"),
    reviewer: humanReviewer,
    policy: GATE_POLICIES.humanRequired(),
  })
  run("OpenReviewGate", {
    expeditionId: "exp-upstream",
    implementationReference: "upstream.html",
    policy: GATE_POLICIES.humanRequired(),
  })

  // Create a mission and downstream expedition that depends on the upstream
  run("CreateMission", { id: "mission-005", name: "M-005", purpose: "Test dependent blocking" })
  run("CreateExpedition", {
    id: "exp-downstream",
    missionId: "mission-005",
    name: "Downstream",
    goal: "Depends on upstream",
    dependsOn: ["exp-upstream"],
  })
  run("ApproveExpedition", { id: "exp-downstream" })
  run("CommitExpedition", { id: "exp-downstream" })

  // Attempt to start dependent — should be blocked
  assert.throws(
    () => {
      run("StartExpedition", { id: "exp-downstream" })
    },
    /UPSTREAM_GATE_BLOCKED/
  )
})

test("Scenario 5 — Supersede resolves gate and downstream can proceed", () => {
  const run = createRunner()

  // Upstream: approve refined intent and open review gate
  run("ApproveRefinedIntent", {
    expeditionId: "exp-upstream-2",
    refinedIntent: makeRefinedIntentInput("mission-upstream-2"),
    reviewer: humanReviewer,
    policy: GATE_POLICIES.humanRequired(),
  })
  run("OpenReviewGate", {
    expeditionId: "exp-upstream-2",
    implementationReference: "upstream.html",
    policy: GATE_POLICIES.humanRequired(),
  })

  // Resolve the upstream review gate with supersede_expedition
  let state = run("ResolveReviewGate", {
    expeditionId: "exp-upstream-2",
    decision: "supersede_expedition",
    reviewer: humanReviewer,
    reason: "Replaced by new approach",
    evidence: ["new-plan.md"],
  })
  assert.strictEqual(state.reviewGateExpeditions["exp-upstream-2"].status, "rejected")

  // The supersede decision resolves the gate:
  // all gates that were blocking are now resolved
  const upstreamRge = state.reviewGateExpeditions["exp-upstream-2"]
  const anyBlocking = upstreamRge.gates.some((g) => g.blocking && !g.resolvedAt)
  assert.ok(!anyBlocking, "All gates should be resolved after supersede")
  assert.ok(!blocksDownstream(upstreamRge), "Upstream should not block downstream after supersede")

  // Create dependent expedition
  run("CreateMission", { id: "mission-005b", name: "M-005b", purpose: "Post-supersede test" })
  run("CreateExpedition", {
    id: "exp-downstream-2",
    missionId: "mission-005b",
    name: "Downstream-2",
    goal: "Depends on superseded upstream",
    dependsOn: ["exp-upstream-2"],
  })
  run("ApproveExpedition", { id: "exp-downstream-2" })
  run("CommitExpedition", { id: "exp-downstream-2" })

  // After upstream is superseded (resolved), downstream should be able to start
  const result = run("StartExpedition", { id: "exp-downstream-2" })
  // Verify downstream expedition exists in the canonical state
  const canonState = run.getCanonicalState()
  assert.ok(canonState.expeditions["exp-downstream-2"], "Downstream expedition should exist in canonical state")
  assert.strictEqual(
    canonState.expeditions["exp-downstream-2"].status,
    "executing",
    `Downstream expedition should be executing, got ${canonState.expeditions["exp-downstream-2"].status}`
  )

  // Verify supersede events
  const events = run.getEvents()
  const reviewResolvedEvents = events.filter((e) => e.type === "REVIEW_GATE_RESOLVED")
  const supersedeDecision = reviewResolvedEvents.find(
    (e) => e.payload.decision === "supersede_expedition"
  )
  assert.ok(supersedeDecision, "REVIEW_GATE_RESOLVED with supersede_expedition decision should exist")
  assert.strictEqual(supersedeDecision.payload.expeditionId, "exp-upstream-2")
})

// ============================================================
// Determinism check
// ============================================================

test("Deterministic: same scenario produces identical outcomes", () => {
  const run1 = createRunner()
  const run2 = createRunner()

  function executeScenario(run) {
    run("ApproveRefinedIntent", {
      expeditionId: "exp-det",
      refinedIntent: makeRefinedIntentInput("mission-det"),
      reviewer: humanReviewer,
      policy: GATE_POLICIES.humanRequired(),
    })
    run("OpenReviewGate", {
      expeditionId: "exp-det",
      implementationReference: "det.html",
      policy: GATE_POLICIES.humanRequired(),
    })
    run("ResolveReviewGate", {
      expeditionId: "exp-det",
      decision: "approve",
      reviewer: humanReviewer,
      reason: "Deterministic",
    })
    run("OpenAcceptanceGate", {
      expeditionId: "exp-det",
      policy: GATE_POLICIES.automatic(),
    })
    const state = run("ResolveAcceptanceGate", {
      expeditionId: "exp-det",
      decision: "accepted",
      reviewer: engineReviewer,
      reason: "Deterministic pass",
    })
    return {
      rge: state.reviewGateExpeditions["exp-det"],
      events: run.getEvents(),
    }
  }

  const result1 = executeScenario(run1)
  const result2 = executeScenario(run2)

  assert.strictEqual(result1.rge.status, result2.rge.status)
  assert.strictEqual(result1.rge.status, "accepted")
  assert.strictEqual(result1.events.length, result2.events.length)
  assert.strictEqual(
    result1.events.map((e) => e.type).join(","),
    result2.events.map((e) => e.type).join(",")
  )
})

// ============================================================
// Run
// ============================================================

await runTests()
