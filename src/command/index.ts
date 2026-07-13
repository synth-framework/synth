// ============================================================
// COMMAND: Authority Entry Layer
// ============================================================
// The ONLY place external systems enter Synth.
// The ONLY place mutation begins.
//
// Enforcement:
//   - All commands flow through ExecutionGate
//   - No direct infra access
//   - Fingerprinted for determinism verification
// ============================================================

export * from "../core/errors.js"
export * from "../core/execution-fingerprint.js"
export * from "../core/replay-verifier.js"
