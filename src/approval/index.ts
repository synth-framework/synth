// ============================================================
// APPROVAL module public surface
// ============================================================

export {
  type ApprovalRequest,
  type OperationFingerprintPayload,
  type ApprovalPolicyConfig,
  type DestructiveOperation,
} from "./types.js"
export {
  createTwoPartyApprovalPolicy,
} from "./policy.js"

export {
  type ApprovalState,
} from "./state.js"

export {
  isApprovalSatisfied,
  type ApprovalCheckResult,
} from "./verification.js"
