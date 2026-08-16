// ============================================================
// APPROVAL: Operation Fingerprinting
// ============================================================
// Deterministic hash that binds an approval to an exact mutation.
// Changing the capability, operation, payload, or target aggregate
// changes the fingerprint, preventing replay against a different op.
// ============================================================

import crypto from "crypto"
import type { CapabilityInvocation } from "../types/index.js"
import { sortKeys, stableStringify } from "../sdk/json/index.js"
import { operationIdForInvocation, type OperationFingerprintPayload } from "./types.js"

/** Extract a stable target aggregate identifier from an invocation payload. */
function targetAggregateFromPayload(payload: unknown): string | undefined {
  const record = payload as Record<string, unknown> | undefined
  if (!record) return undefined
  if (typeof record.id === "string") return record.id
  if (typeof record.projectId === "string") return record.projectId
  if (typeof record.missionId === "string") return record.missionId
  if (typeof record.expeditionId === "string") return record.expeditionId
  if (typeof record.requestId === "string") return record.requestId
  return undefined
}

/** Build the canonical fingerprint payload for an invocation. */
function buildOperationFingerprintPayload(
  invocation: CapabilityInvocation,
  targetAggregate?: string,
): OperationFingerprintPayload {
  return {
    capability: invocation.capability,
    operation: String((invocation.payload as Record<string, unknown> | undefined)?.operation ?? "default"),
    payload: sortKeys(invocation.payload),
    targetAggregate,
  }
}

/** Compute a deterministic SHA-256 fingerprint for an invocation. */
function computeOperationFingerprint(invocation: CapabilityInvocation): string {
  const targetAggregate = targetAggregateFromPayload(invocation.payload)
  const payload = buildOperationFingerprintPayload(invocation, targetAggregate)
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex")
}

/** Compute the fingerprint used to bind an approval request to a destructive operation. */
export function computeApprovalFingerprint(
  operationId: string,
  params?: Record<string, unknown>,
): string {
  const payload = {
    operation: operationId,
    params: params ? sortKeys(params) : undefined,
  }
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex")
}

