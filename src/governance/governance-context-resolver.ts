// ============================================================
// GOVERNANCE: Governance Context Resolver
// ============================================================
// Resolves the governance context needed to evaluate an implementation
// proposal for an expedition: mission, alignment contract, and the rule set
// that applies to that contract.
//
// This is the only module that couples an expedition to its governing
// artifacts. The execution layer consumes the resolved context and knows
// nothing about Program 027 or any specific rule set.
// ============================================================

import type { CanonicalState, DerivedState, Mission } from "../types/index.js"
import type { AlignmentContract } from "./alignment-contract.js"
import type { ProposalEvaluationRuleSet } from "./proposal-evaluation/types.js"
import { program027RuleSet } from "./proposal-evaluation/rules/program-027.js"

export type GovernanceContext = {
  mission: Mission
  alignmentContract: AlignmentContract
  ruleSet: ProposalEvaluationRuleSet
}

/** Resolve the governance context for an expedition. */
export function resolveGovernanceContext(
  expeditionId: string,
  state: CanonicalState,
  derivedState: DerivedState
): GovernanceContext {
  const expedition = state.expeditions[expeditionId]
  if (!expedition) {
    throw new Error(`GOVERNANCE_CONTEXT_MISSING: expedition ${expeditionId} not found`)
  }

  const mission = state.missions[expedition.missionId]
  if (!mission) {
    throw new Error(`MISSION_NOT_FOUND: ${expedition.missionId} for expedition ${expeditionId}`)
  }

  const alignmentContractId = mission.alignmentContractId
  if (!alignmentContractId) {
    throw new Error(`ALIGNMENT_CONTRACT_NOT_FOUND: mission ${mission.id} has no alignment contract`)
  }

  const alignmentContract = derivedState.alignmentContracts[alignmentContractId] as AlignmentContract | undefined
  if (!alignmentContract) {
    throw new Error(`ALIGNMENT_CONTRACT_NOT_FOUND: ${alignmentContractId}`)
  }

  const ruleSet = resolveRuleSet(alignmentContract)

  return { mission, alignmentContract, ruleSet }
}

/** Resolve the proposal-evaluation rule set for an alignment contract.
 *
 * Today this is hardcoded to the Program 027 homepage rule set because it is
 * the only rule set in the system. A registry can be introduced here later
 * without changing callers.
 */
export function resolveRuleSet(_contract: AlignmentContract): ProposalEvaluationRuleSet {
  return program027RuleSet
}
