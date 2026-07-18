// ============================================================
// RUNTIME: Transition Engine
// ============================================================
// Pure engine that selects the single valid governance transition
// given the current ResolvedGovernanceContext and the Governance
// Model. It does not own lifecycle semantics, perform mutations,
// access artifacts, or emit commands.
// ============================================================

import { GOVERNANCE_RULES } from "./governance-model.js"
import type { ResolvedGovernanceContext, ValidTransition } from "./governance-types.js"

export function deriveValidTransition(ctx: ResolvedGovernanceContext): ValidTransition {
  const sorted = [...GOVERNANCE_RULES].sort((a, b) => a.priority - b.priority)
  for (const rule of sorted) {
    if (rule.when(ctx)) {
      return typeof rule.transition === "function" ? rule.transition(ctx) : rule.transition
    }
  }
  return {
    kind: "NoOp",
    reason: "No governance transition applies to the current context.",
  }
}
