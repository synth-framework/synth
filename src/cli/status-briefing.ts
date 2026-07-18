// ============================================================
// CLI: Operator Briefing Projection
// ============================================================
// Deterministic "where am I and what happens next?" surface for
// `synth status`. All values are projections of the runtime governance
// model produced by the Governance Resolver.
// ============================================================

import {
  resolveGovernanceContext,
  isGovernanceResolutionFailure,
} from "../runtime/governance-resolver.js"
import { deriveValidTransition } from "../runtime/transition-engine.js"
import { toOperatorBriefing } from "../runtime/status-projection.js"

export type MissionBrief = {
  id: string
  name: string
  status: string
  approvedAt?: number
}

export type ActiveExpeditionBrief = {
  id: string
  name: string
  missionId: string
  status: string
}

export type Blocker = {
  kind: string
  description: string
  remediation: string
}

export type NextAction = {
  command: string
  reason: string
  priority: number
}

export type OperatorPhase = "uninitialized" | "initialized" | "planning" | "approved" | "executing" | "blocked" | "complete"

export type OperatorBriefing =
  | {
      status: "ok"
      kind: "OperatorBriefing"
      phase: OperatorPhase
      summary: string
      missions: MissionBrief[]
      activeExpeditions: ActiveExpeditionBrief[]
      blockers: Blocker[]
      warnings: Blocker[]
      nextActions: NextAction[]
      eventCount: number
      stateHash: string
    }
  | {
      status: "error"
      kind: "GovernanceResolutionFailure"
      diagnostic: string
      recovery: string
      conflicts: Array<{ artifact: string; issue: string }>
    }

/**
 * Build an Operator Briefing from the current working directory.
 * Every field is derived from the ResolvedGovernanceContext produced by
 * the Governance Resolver. No mutable status file is consulted.
 */
export async function buildOperatorBriefing(rootDir: string): Promise<OperatorBriefing> {
  const result = await resolveGovernanceContext(rootDir)

  if (isGovernanceResolutionFailure(result)) {
    return {
      status: "error",
      kind: "GovernanceResolutionFailure",
      diagnostic: result.diagnostic,
      recovery: result.recovery,
      conflicts: result.conflicts,
    }
  }

  const transition = deriveValidTransition(result)
  return toOperatorBriefing(result, transition)
}
