// ============================================================
// APPROVAL: State Helpers
// ============================================================
// Derive approval request state from the canonical state folded from
// the event log.
// ============================================================

import type { CanonicalState, SynthEvent } from "../types/index.js"
import type { ApprovalRequest } from "./types.js"

export interface ApprovalState {
  requests: Record<string, ApprovalRequest>
}

/** Extract the approval sub-state from canonical state. */
export function getApprovalState(state: CanonicalState): ApprovalState {
  const approvals = state.approvals as Record<string, ApprovalRequest> | undefined
  return { requests: approvals ?? {} }
}

/** Apply an approval-related event to the approval state. */
export function applyApprovalEvent(state: ApprovalState, event: SynthEvent): ApprovalState {
  const payload = event.payload as Record<string, unknown> | undefined
  if (!payload) return state

  const requests = { ...state.requests }

  switch (event.type) {
    case "APPROVAL_REQUESTED": {
      const requestId = String(payload.requestId)
      requests[requestId] = {
        requestId,
        operation: String(payload.operation),
        operationFingerprint: String(payload.operationFingerprint),
        requestedBy: payload.requestedBy as ApprovalRequest["requestedBy"],
        requestedAt: String(payload.requestedAt),
        reason: String(payload.reason),
        expiresAt: String(payload.expiresAt),
        status: "pending",
      }
      break
    }
    case "APPROVAL_GRANTED": {
      const requestId = String(payload.requestId)
      const existing = requests[requestId]
      if (existing) {
        requests[requestId] = { ...existing, status: "granted" }
      }
      break
    }
    case "APPROVAL_DENIED": {
      const requestId = String(payload.requestId)
      const existing = requests[requestId]
      if (existing) {
        requests[requestId] = { ...existing, status: "denied" }
      }
      break
    }
    case "APPROVAL_EXPIRED": {
      const requestId = String(payload.requestId)
      const existing = requests[requestId]
      if (existing) {
        requests[requestId] = { ...existing, status: "expired" }
      }
      break
    }
    case "APPROVAL_EXECUTED": {
      const requestId = String(payload.requestId)
      const existing = requests[requestId]
      if (existing) {
        requests[requestId] = { ...existing, status: "executed" }
      }
      break
    }
  }

  return { requests }
}
