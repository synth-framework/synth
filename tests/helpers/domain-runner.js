// ============================================================
// TEST HELPERS — Domain runner
// ============================================================
// Shared in-memory domain runner for tests that drive applyDomain
// directly (gate-012 certification, review-gate integration). Single home
// for the identical createRunner blocks (expedition 7a79e79b, round 15/150).
//
// `makeCtx` stays per-file (timestamp-flavor context builders differ by
// file); the runner takes it as a dependency so no test logic is copied.
//
// Usage:
//   import { createDomainRunner } from "./helpers/domain-runner.js"
//   const run = createDomainRunner({ makeCtx })
// ============================================================

import { applyDomain } from "../../dist/domain/execution.js"
import { rebuildState } from "../../dist/runtime/replay.js"
import { buildDerivedState } from "../../dist/state/derived/index.js"

/** Shared refined-intent input for review-gate tests (mission-001 homepage). */
export function makeRefinedIntentInput(expeditionId) {
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

/** Create an in-memory runner over an accumulating event log. */
export function createDomainRunner({ makeCtx }) {
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
