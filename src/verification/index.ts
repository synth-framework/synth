// ============================================================
// VERIFICATION ENGINE: Public Surface
// ============================================================

export { runVerification } from "./engine.js"
export { ALL_CHECKS } from "./checks.js"
export { buildVerificationContext } from "./context.js"
export type {
  Severity,
  CheckStatus,
  VerificationViolation,
  VerificationCheckResult,
  VerificationSummary,
  VerificationReport,
  DecisionRecord,
  VerificationContext,
  VerificationCheck,
} from "./types.js"
