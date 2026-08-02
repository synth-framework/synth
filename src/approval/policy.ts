// ============================================================
// APPROVAL: Policy Integration
// ============================================================
// Registers default two-party approval policies with the policy engine.
// Policies return REQUIRE_VERIFICATION for destructive operations; the
// ExecutionGate checks whether a valid approval exists.
// ============================================================

import type { Policy } from "../policy/policy-engine.js"
import { DESTRUCTIVE_OPERATIONS, operationIdForInvocation, type ApprovalPolicyConfig } from "./types.js"

/** Default approval policy configuration. */
export function defaultApprovalPolicyConfig(): ApprovalPolicyConfig {
  return {
    defaultExpiryHours: 24,
    operations: DESTRUCTIVE_OPERATIONS.map((operation) => ({ operation, required: true })),
  }
}

/** Build a policy that requires two-party approval for configured operations. */
export function createTwoPartyApprovalPolicy(config?: ApprovalPolicyConfig): Policy {
  const effectiveConfig = config ?? defaultApprovalPolicyConfig()
  const requiredOperations = new Set(
    effectiveConfig.operations.filter((o) => o.required).map((o) => o.operation),
  )

  return {
    id: "two-party-approval",
    name: "Two-Party Approval for Destructive Operations",
    scope: {},
    condition: (intent) => {
      const payload = intent.payload as Record<string, unknown> | undefined
      const operation = typeof payload?.operation === "string" ? payload.operation : undefined
      const operationId = operationIdForInvocation(intent.capability, operation)
      return requiredOperations.has(operationId)
    },
    effect: "REQUIRE_VERIFICATION",
    severity: "high",
    enabled: true,
  }
}
