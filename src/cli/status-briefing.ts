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
import { deliveryState } from "../ledger/delivery.js"
import { toOperatorBriefing } from "../runtime/status-projection.js"
import { createCapabilityRegistry } from "../capability/registry.js"
import { createAdapterRegistry } from "../mission-studio/adapter-registry.js"
import { buildCapabilityEntries, buildImplementedCommandSet } from "./capabilities-data.js"

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

  // EXP-CAPTRANS-003: the runtime resolver intentionally does not depend on
  // CLI command-surface wiring. Re-project capability availability here using
  // the same command-surface detection used by `synth capabilities` so status
  // warnings match the installed CLI.
  const installedCapabilities = new Set(createCapabilityRegistry().list())
  const installedAdapters = new Set(createAdapterRegistry().list())
  const implementedCommands = buildImplementedCommandSet()
  result.derived.capabilities = buildCapabilityEntries(
    installedCapabilities,
    installedAdapters,
    implementedCommands,
  )

  const transition = deriveValidTransition(result)
  const briefing = toOperatorBriefing(result, transition)
  if (briefing.status !== "ok") return briefing
  return { ...briefing, warnings: [...briefing.warnings, ...deliveryWarnings(result)] }
}

/**
 * ADR-055 §2.6: a finished expedition is not delivered until its merge is
 * sealed. `deliveryState` (ledger/delivery) is the one definition of "pending",
 * so status and `expedition show` cannot disagree.
 */
function deliveryWarnings(ctx: { authoritative: { replayedState: { expeditions?: Record<string, any> } } }): Blocker[] {
  return Object.values(ctx.authoritative.replayedState.expeditions || {})
    .map((e) => ({ e, d: deliveryState(e) }))
    .filter(({ d }) => d.deliveryPending)
    .map(({ e, d }) => {
      const id8 = String(e.id).slice(0, 8)
      const tip = d.delivery?.tipCommit
      if (tip) {
        return {
          kind: "delivery-pending",
          description: `Expedition ${id8} (${e.name}) was delivered from ${d.delivery?.branch} at ${tip.slice(0, 8)}, but no merge is sealed yet.`,
          remediation: `Merge the delivered branch, then record the merge: \`synth expedition seal --id ${e.id} --merge-commit <sha>\`.`,
        }
      }
      return {
        kind: "delivery-pending",
        description: `Expedition ${id8} (${e.name}) is finished but not delivered: its work is not yet merged or sealed.`,
        remediation: `Deliver it: \`synth expedition deliver --id ${e.id}\`. Then merge and record the merge: \`synth expedition seal --id ${e.id} --merge-commit <sha>\`.`,
      }
    })
}
