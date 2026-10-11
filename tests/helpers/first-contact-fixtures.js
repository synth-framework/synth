// ============================================================
// TEST HELPERS — First-contact conversation fixtures
// ============================================================
// Canonical status→explain conversation turns shared by first-contact
// evidence/pattern tests (first-contact-experiment,
// first-contact-patterns). Single home for the identical turn literals
// (expedition 7a79e79b, round 8/80).
//
// Usage:
//   import { evidenceTurns } from "./helpers/first-contact-fixtures.js"
// ============================================================

/** Canonical status→explain evidence turns; turn-1 stateBefore varies. */
export function evidenceTurns(stateBefore = {}) {
  return [
    {
      turn: 1,
      command: ["status"],
      intent: "Determine state.",
      agentReasoningState: { understoodAs: "unknown repository", confidence: 0.1, unknowns: ["purpose"] },
      inputs: {},
      outputs: { status: "ok", phase: "initialized" },
      stateBefore,
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
  ]
}
