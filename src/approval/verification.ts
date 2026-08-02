// ============================================================
// APPROVAL: Verification
// ============================================================
// Check whether a destructive operation has a valid, unexpired,
// two-party approval.
// ============================================================

import type { CanonicalState } from "../types/index.js"
import type { ApprovalRequest, ApprovalPolicyConfig } from "./types.js"
import { getApprovalState } from "./state.js"
import { computeApprovalFingerprint } from "./fingerprint.js"
import type { CapabilityInvocation } from "../types/index.js"
import { operationIdForInvocation } from "./types.js"
import { defaultApprovalPolicyConfig } from "./policy.js"

export type ApprovalCheckResult =
  | { required: false }
  | { required: true; satisfied: true; requestId: string }
  | { required: true; satisfied: false; reason: string }

/** Determine whether two-party approval is required for an invocation. */
export function isApprovalRequired(
  invocation: CapabilityInvocation,
  config?: ApprovalPolicyConfig,
): boolean {
  const effectiveConfig = config ?? defaultApprovalPolicyConfig()
  const payload = invocation.payload as Record<string, unknown> | undefined
  const operation = typeof payload?.operation === "string" ? payload.operation : undefined
  const operationId = operationIdForInvocation(invocation.capability, operation)
  const configured = effectiveConfig.operations.find((o) => o.operation === operationId)
  if (configured) return configured.required
  return false
}

/** Find a valid approval request matching the invocation fingerprint. */
export function findValidApproval(
  invocation: CapabilityInvocation,
  state: CanonicalState,
): ApprovalRequest | undefined {
  const approvalState = getApprovalState(state)
  const payload = invocation.payload as Record<string, unknown> | undefined
  const operation = typeof payload?.operation === "string" ? payload.operation : undefined
  const operationId = operationIdForInvocation(invocation.capability, operation)
  const fingerprint = computeApprovalFingerprint(operationId, payload)

  for (const request of Object.values(approvalState.requests)) {
    if (request.operationFingerprint !== fingerprint) continue
    if (request.status !== "granted") continue
    if (new Date(request.expiresAt).getTime() < Date.now()) continue
    return request
  }

  return undefined
}

/** Check whether a valid two-party approval exists for the invocation. */
export function isApprovalSatisfied(
  invocation: CapabilityInvocation,
  state: CanonicalState,
): ApprovalCheckResult {
  const request = findValidApproval(invocation, state)
  if (request) {
    return { required: true, satisfied: true, requestId: request.requestId }
  }
  return { required: true, satisfied: false, reason: "No valid two-party approval found" }
}

/** Resolve the current status of an approval request from state. */
export function approvalStatusForRequest(
  requestId: string,
  state: CanonicalState,
): ApprovalRequest["status"] | "unknown" {
  const approvalState = getApprovalState(state)
  return approvalState.requests[requestId]?.status ?? "unknown"
}
