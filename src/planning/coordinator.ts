// ============================================================
// PLANNING: PlanningCoordinator — Permit validation + commit
// ============================================================
// Validates PlanningPermit signature and intent match, rejects
// reasoning-trace payload fields, then commits through the
// ExecutionGate (the single mutation authority).
// ============================================================

import { ExecutionGate } from "../control/execution-gate.js"
import type { CapabilityInvocation } from "../types/index.js"
import { PlanningPermit, PlanningIntent } from "./permit.js"

export class PlanningCoordinator {
  constructor(
    private gate: ExecutionGate,
    private planningKey: string,
  ) {}

  async commit(permit: PlanningPermit, planningIntent: PlanningIntent): Promise<{
    output: unknown
    events: Array<{ type: string; payload: unknown }>
    transactionId: string
  }> {
    if (!PlanningPermit.verify(permit, this.planningKey)) {
      throw new Error("INVARIANT_VIOLATION [P-2]: Invalid PlanningPermit signature — ledger write rejected")
    }

    if (
      permit.planningIntent.capability !== planningIntent.capability ||
      permit.planningIntent.actor !== planningIntent.actor
    ) {
      throw new Error("INVARIANT_VIOLATION [P-2]: PlanningPermit does not match intent — ledger write rejected")
    }

    const payload = planningIntent.payload || {}
    const reasoningFields = ["_llm_reasoning", "_confidence_chain", "_prompt_used", "_reasoning_trace", "_thought_process"]
    for (const field of reasoningFields) {
      if (field in payload) {
        throw new Error(`INVARIANT_VIOLATION [P-3]: Ledger payload contains reasoning trace field: ${field} — rejected`)
      }
    }

    const invocation: CapabilityInvocation = {
      actor: planningIntent.actor,
      capability: planningIntent.capability,
      payload: planningIntent.payload,
      context: planningIntent.context,
    }

    const { result } = await this.gate.execute(invocation)
    return {
      output: result.output,
      events: result.events,
      transactionId: result.transaction.id,
    }
  }
}
