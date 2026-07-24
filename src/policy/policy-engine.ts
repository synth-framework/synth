// ============================================================
// POLICY: Deterministic Constraint System
// ============================================================
// Policies do NOT execute work. They only allow, deny, constrain,
// or require additional proof.
// Evaluated at: pre-execution, during execution, post-execution.
// ============================================================

import type { CanonicalState, CapabilityInvocation } from "../types/index.js"

/** Policy effect types */
export type PolicyEffect = "ALLOW" | "DENY" | "REQUIRE_VERIFICATION" | "WARN"

/** Policy severity */
export type PolicySeverity = "informational" | "low" | "medium" | "high" | "critical"

/** Policy definition */
export type Policy = {
  id: string
  name: string
  scope: PolicyScope
  condition: PolicyCondition
  effect: PolicyEffect
  severity: PolicySeverity
  enabled: boolean
}

/** Policy scope */
export type PolicyScope = {
  capabilities?: string[]      // which capabilities this applies to
  objectTypes?: string[]       // which object types
  actors?: string[]            // which actors (empty = all)
  excludeActors?: string[]     // actors to exclude
}

/** Policy condition function */
export type PolicyCondition = (
  intent: CapabilityInvocation,
  state: CanonicalState
) => boolean

/** Policy evaluation result */
export type PolicyEvaluation = {
  policyId: string
  effect: PolicyEffect
  severity: PolicySeverity
  matched: boolean
  reason?: string
}

/** Policy engine — evaluates all policies against intent + state */
export class PolicyEngine {
  private policies: Map<string, Policy> = new Map()
  private _frozen = false

  /** Register a policy */
  register(policy: Policy): void {
    if (this._frozen) {
      throw new Error("INVARIANT_VIOLATION: policy engine is frozen")
    }
    this.policies.set(policy.id, policy)
  }

  /** Remove a policy */
  unregister(policyId: string): void {
    if (this._frozen) {
      throw new Error("INVARIANT_VIOLATION: policy engine is frozen")
    }
    this.policies.delete(policyId)
  }

  /** List all policies */
  list(): Policy[] {
    return Array.from(this.policies.values())
  }

  /** Freeze the policy engine — no further policy changes */
  freeze(): void {
    this._frozen = true
    for (const [, value] of this.policies) {
      Object.freeze(value)
    }
    Object.freeze(this.policies)
  }

  /** Check if the policy engine is frozen */
  isFrozen(): boolean {
    return this._frozen
  }

  /** Evaluate all applicable policies for an intent */
  evaluate(
    intent: CapabilityInvocation,
    state: CanonicalState
  ): PolicyEvaluation[] {
    const results: PolicyEvaluation[] = []

    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue

      // Check if policy applies to this capability
      if (policy.scope.capabilities &&
          policy.scope.capabilities.length > 0 &&
          !policy.scope.capabilities.includes(intent.capability)) {
        continue
      }

      // Check actor exclusion
      if (policy.scope.excludeActors?.includes(intent.actor)) {
        continue
      }

      // Check actor inclusion (if specified)
      if (policy.scope.actors &&
          policy.scope.actors.length > 0 &&
          !policy.scope.actors.includes(intent.actor)) {
        continue
      }

      // Evaluate condition
      const matched = policy.condition(intent, state)

      results.push({
        policyId: policy.id,
        effect: policy.effect,
        severity: policy.severity,
        matched,
        reason: matched ? `Policy ${policy.name} matched` : `Policy ${policy.name} did not match`,
      })
    }

    return results
  }

  /** Check if intent is allowed (aggregate policy result) */
  isAllowed(
    intent: CapabilityInvocation,
    state: CanonicalState
  ): { allowed: boolean; reason?: string } {
    const evaluations = this.evaluate(intent, state)

    // Sort by severity: critical > high > medium > low > informational
    const severityOrder: Record<PolicySeverity, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      informational: 1,
    }

    const sorted = evaluations
      .filter((e) => e.matched)
      .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])

    // DENY overrides everything
    const deny = sorted.find((e) => e.effect === "DENY")
    if (deny) {
      return { allowed: false, reason: `Denied by policy: ${deny.policyId}` }
    }

    // REQUIRE_VERIFICATION blocks unless proven
    const requireVerification = sorted.find((e) => e.effect === "REQUIRE_VERIFICATION")
    if (requireVerification) {
      return { allowed: false, reason: `Verification required by policy: ${requireVerification.policyId}` }
    }

    // No DENY or REQUIRE_VERIFICATION matched → allowed
    return { allowed: true }
  }

  /** Get default system policies */
  static getDefaultPolicies(): Policy[] {
    return [
      // Never allow destructive system operations
      {
        id: "system-protection",
        name: "System Protection",
        scope: {
          capabilities: ["DeleteSystem", "ResetState", "WipeData"],
        },
        condition: () => true,
        effect: "DENY",
        severity: "critical",
        enabled: true,
      },

      // Prevent modifying completed work
      {
        id: "completed-work-protection",
        name: "Completed Work Protection",
        scope: {
          capabilities: ["StartWorkItem", "BlockWorkItem", "ResetWorkItem"],
        },
        condition: (intent, state) => {
          const workItemId = String(intent.payload.id)
          const workItem = state.workItems[workItemId]
          return workItem?.status === "complete"
        },
        effect: "DENY",
        severity: "high",
        enabled: true,
      },

      // Warn on direct state mutation attempts
      {
        id: "direct-mutation-warning",
        name: "Direct Mutation Warning",
        scope: {
          capabilities: ["MutateState", "WriteState", "SetState"],
        },
        condition: () => true,
        effect: "DENY",
        severity: "critical",
        enabled: true,
      },
    ]
  }
}

/** Create a policy engine with default policies */
export function createPolicyEngine(): PolicyEngine {
  const engine = new PolicyEngine()

  for (const policy of PolicyEngine.getDefaultPolicies()) {
    engine.register(policy)
  }

  return engine
}
