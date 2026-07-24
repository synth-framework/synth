// ============================================================
// GOVERNANCE: Divergence Gate
// ============================================================
// Pre-Mission governance checkpoint that validates the Alignment
// Contract against the original intent and reference evidence.
// A Mission cannot be created unless the Divergence Gate is aligned.
// ============================================================

import type { Reviewer } from "./review-gates.js"
import type { Proposal, ProposalEvaluationRuleSet, EvaluationResult } from "./proposal-evaluation/types.js"
import { evaluateProposal } from "./proposal-evaluation/index.js"

export type DivergenceGateDecision =
  | "aligned"
  | "revision_required"
  | "rejected"
  | "superseded"

export type DivergenceGateStatus =
  | "draft"
  | "awaiting_alignment"
  | "aligned"
  | "revision_required"
  | "rejected"
  | "superseded"

export type DivergenceReport = {
  id: string
  gateId: string
  contractId: string
  intentModelId: string
  knownDivergence: string[]
  acceptedDivergence: string[]
  rejectedDivergence: string[]
  reviewer: Reviewer
  decision: DivergenceGateDecision
  reason: string
  evidence: string[]
  timestamp: number
}

export type DivergenceGate = {
  id: string
  contractId: string
  intentModelId: string
  status: DivergenceGateStatus
  reportId?: string
  createdAt: number
  resolvedAt?: number
}

export class DivergenceGateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DivergenceGateError"
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Open a Divergence Gate for an Alignment Contract. */
export function openDivergenceGate(
  contractId: string,
  intentModelId: string
): DivergenceGate {
  return {
    id: makeId("divergence-gate"),
    contractId,
    intentModelId,
    status: "awaiting_alignment",
    createdAt: Date.now(),
  }
}

/** Resolve a Divergence Gate with a decision and report. */
export function resolveDivergenceGate(
  gate: DivergenceGate,
  decision: DivergenceGateDecision,
  reviewer: Reviewer,
  reason: string,
  evidence: string[] = [],
  knownDivergence: string[] = [],
  acceptedDivergence: string[] = [],
  rejectedDivergence: string[] = []
): { gate: DivergenceGate; report: DivergenceReport } {
  if (gate.status !== "awaiting_alignment") {
    throw new DivergenceGateError(`Cannot resolve divergence gate from status ${gate.status}`)
  }

  const report: DivergenceReport = {
    id: makeId("divergence-report"),
    gateId: gate.id,
    contractId: gate.contractId,
    intentModelId: gate.intentModelId,
    knownDivergence,
    acceptedDivergence,
    rejectedDivergence,
    reviewer,
    decision,
    reason,
    evidence,
    timestamp: Date.now(),
  }

  return {
    gate: {
      ...gate,
      status: decision,
      reportId: report.id,
      resolvedAt: Date.now(),
    },
    report,
  }
}

/** Check whether a contract is aligned and allows Mission creation. */
export function isAligned(gate: DivergenceGate): boolean {
  return gate.status === "aligned"
}

/**
 * Resolve a Divergence Gate by evaluating a proposal against the Alignment Contract.
 *
 * This consumes the Proposal Evaluation Capability. The reviewer still authorizes the
 * resolution, but the decision is derived deterministically from the proposal, contract,
 * and rule set.
 */
export function resolveDivergenceGateWithProposalEvaluation(
  gate: DivergenceGate,
  proposal: Proposal,
  contract: import("./alignment-contract.js").AlignmentContract,
  ruleSet: ProposalEvaluationRuleSet,
  reviewer: Reviewer,
  knownDivergence: string[] = [],
  acceptedDivergence: string[] = [],
  rejectedDivergence: string[] = []
): { gate: DivergenceGate; report: DivergenceReport; evaluation: EvaluationResult } {
  const evaluation = evaluateProposal(proposal, contract, ruleSet)
  const decision = evaluation.decision

  const evidence = [
    ...evaluation.reasoning,
    ...evaluation.matchedDriftClasses.map((id) => `Matched drift class: ${id}`),
  ]

  const { gate: resolvedGate, report } = resolveDivergenceGate(
    gate,
    decision,
    reviewer,
    evaluation.evidence.summary,
    evidence,
    knownDivergence,
    acceptedDivergence,
    rejectedDivergence
  )

  return { gate: resolvedGate, report, evaluation }
}
