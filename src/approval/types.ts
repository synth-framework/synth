// ============================================================
// APPROVAL: Types
// ============================================================

import type { AgentIdentity } from "../identity/types.js"

/** A request for two-party approval of a destructive operation. */
export interface ApprovalRequest {
  requestId: string
  operation: string
  operationFingerprint: string
  requestedBy: AgentIdentity
  requestedAt: string
  reason: string
  expiresAt: string
  status: "pending" | "granted" | "denied" | "expired" | "executed"
}

/** Payload signed/hashed to bind an approval to an exact operation. */
export interface OperationFingerprintPayload {
  capability: string
  operation: string
  payload: unknown
  targetAggregate?: string
}

/** Approval policy configuration per project. */
export interface ApprovalPolicyConfig {
  defaultExpiryHours: number
  operations: Array<{
    operation: string
    required: boolean
  }>
}

/** Map a capability/operation pair to an approval operation id. */
export function operationIdForInvocation(capability: string, operation?: string): string {
  const op = operation ? `${capability}:${operation}` : capability
  switch (op) {
    case "Bootstrap:approve":
    case "bootstrap:approve":
      return "bootstrap"
    case "Expedition:delete":
    case "expedition:delete":
      return "expedition-delete"
    case "Log:edit":
    case "log:edit":
      return "log-edit"
    case "Migrate:import":
    case "migrate:import":
      return "migrate-import"
    case "Signing:rotate-key":
    case "signing:rotate-key":
      return "signing-rotate-key"
    case "Expedition:complete-force":
    case "expedition:complete-force":
      return "expedition-complete-force"
    default:
      return op.toLowerCase()
  }
}

/** Destructive operations that may require two-party approval. */
export const DESTRUCTIVE_OPERATIONS = [
  "bootstrap",
  "expedition-delete",
  "log-edit",
  "migrate-import",
  "signing-rotate-key",
  "expedition-complete-force",
] as const

export type DestructiveOperation = (typeof DESTRUCTIVE_OPERATIONS)[number]


