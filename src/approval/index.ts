// ============================================================
// APPROVAL module public surface
// ============================================================

export {
  DESTRUCTIVE_OPERATIONS,
  operationIdForInvocation,
  type ApprovalRequest,
  type OperationFingerprintPayload,
  type ApprovalPolicyConfig,
  type DestructiveOperation,
} from "./types.js"

export {
  targetAggregateFromPayload,
  buildOperationFingerprintPayload,
  computeOperationFingerprint,
  computeApprovalFingerprint,
} from "./fingerprint.js"

export {
  defaultApprovalPolicyConfig,
  createTwoPartyApprovalPolicy,
} from "./policy.js"

export {
  getApprovalState,
  applyApprovalEvent,
  type ApprovalState,
} from "./state.js"

export {
  findValidApproval,
  isApprovalRequired,
  isApprovalSatisfied,
  approvalStatusForRequest,
  type ApprovalCheckResult,
} from "./verification.js"
