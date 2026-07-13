// ============================================================
// CORE: System Kernel (NO IO)
// ============================================================
// Enforcement rule:
//   - May call: runtime, domain, policy, validation
//   - May NOT call: infra (event-store, filesystem)
//   - May NOT perform: any IO
//
// This directory contains the system's brain.
// It makes all decisions. It touches nothing external.
// ============================================================

export * from "./errors.js"
export * from "../control/execution-contract.js"
export * from "../control/execution-gate.js"
export * from "./execution-fingerprint.js"
export * from "./replay-verifier.js"
export * from "./bootstrap.js"
