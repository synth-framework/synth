// ============================================================
// CLI: Operator Briefing Projection
// ============================================================
// Deterministic "where am I and what happens next?" surface for
// `synth status`. All values are projections of the runtime governance
// model produced by the Governance Resolver.
// ============================================================

import { deriveValidTransition } from "../runtime/transition-engine.js"
import {
  deliveryState,
  buildRefIndex,
  remoteBranchesFromIndex,
  resolveDeliveryBranch,
  resolveIntegrationCandidate,
  type BranchCreatedEventLike,
} from "../ledger/delivery.js"
import { toOperatorBriefing } from "../runtime/status-projection.js"
import { buildCapabilityEntries, buildImplementedCommandSet } from "./capabilities-data.js"

// EXP-CLI-003 item 2 — the three heavy edges below are loaded at CALL time inside
// buildOperatorBriefing, not at import time:
//
//   runtime/governance-resolver.js         119 modules / 820 KB
//   capability/registry.js                  64 modules / 429 KB
//   mission-studio/adapter-registry.js      54 modules / 331 KB
//
// `status` genuinely needs all three — the briefing IS a projection of the
// governance resolver — so the fix is WHEN they load, not whether. This module is
// imported statically by status-light.ts, which entry.ts imports statically, so
// these three edges were 89% of the "light" path's 134-module / 918 KB eager
// graph and were paid for by every invocation of the shipped dispatcher,
// including --version and help. Output is unchanged; the eager graph is not.
// The cheap edges stay static: ledger/delivery 1/17, transition-engine 2/6,
// status-projection 2/20, capabilities-data 2/32.

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
  /**
   * The remediation as ready-to-run commands, one per line, with every id,
   * branch and commit already filled in. `status` is the inbox: an operator (or
   * an agent) copies these instead of assembling them from three other queries.
   */
  commands?: string[]
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
  const { resolveGovernanceContext, isGovernanceResolutionFailure } = await import(
    "../runtime/governance-resolver.js"
  )
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
  const [{ createCapabilityRegistry }, { createAdapterRegistry }] = await Promise.all([
    import("../capability/registry.js"),
    import("../mission-studio/adapter-registry.js"),
  ])
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
  return { ...briefing, warnings: [...briefing.warnings, ...deliveryWarnings(result, rootDir)] }
}

/** Where a resolved branch name came from, phrased for the operator. */
function branchSourceNote(source: string | undefined, id8: string): string | undefined {
  if (source === "branchCreatedEvent") return "branch from the EXPEDITION_BRANCH_CREATED event"
  if (source === "remoteScan") return `branch from a remote ref naming ${id8}`
  return undefined
}

/**
 * ADR-055 §2.6: a finished expedition is not delivered until its merge is
 * sealed. `deliveryState` (ledger/delivery) is the one definition of "pending",
 * so status and `expedition show` cannot disagree.
 *
 * The remediation is a *working command*, not a template: the branch is
 * resolved (recorded binding → branch-created event → a remote ref naming the
 * expedition) and the merge commit is named when the base branch already
 * contains the delivered tip. Printing `deliver --id <id>` alone is what makes
 * a fresh session fail with NoExecutionBranch and go hunting through the event
 * log; printing `--merge-commit <sha>` alone is what makes it guess.
 */
function deliveryWarnings(
  ctx: {
    authoritative: {
      replayedState: { expeditions?: Record<string, any> }
      events?: unknown[]
    }
  },
  rootDir: string,
): Blocker[] {
  const pending = Object.values(ctx.authoritative.replayedState.expeditions || {})
    .map((e) => ({ e, d: deliveryState(e) }))
    .filter(({ d }) => d.deliveryPending)
  if (pending.length === 0) return []

  // One git call for the whole briefing: every branch name is resolved against
  // an in-memory ref index, so status stays read-only and stays fast however
  // many expeditions are pending.
  const refs = buildRefIndex(rootDir)
  const remoteBranches = remoteBranchesFromIndex(refs)
  const cache = new Map<string, string | undefined>()
  const events = (ctx.authoritative.events ?? []) as unknown as BranchCreatedEventLike[]

  return pending.map(({ e, d }) => {
    const id = String(e.id)
    const id8 = id.slice(0, 8)
    const resolved = resolveDeliveryBranch(rootDir, {
      expeditionId: id,
      ...(typeof e.executionBranch === "string" && e.executionBranch.length > 0
        ? { executionBranch: e.executionBranch }
        : {}),
      events,
      remoteBranches,
      cache,
      refs,
    })
    const tip = d.delivery?.tipCommit ?? resolved.tipCommit
    const integration = resolveIntegrationCandidate(rootDir, { tipCommit: tip, cache, refs })
    const mergeArg = integration.mergeCommit ?? "<sha>"
    const sealCommand = `synth expedition seal --id ${id} --merge-commit ${mergeArg}`

    // Already delivered: the only missing step is the seal.
    if (d.delivery?.tipCommit) {
      return {
        kind: "delivery-pending",
        description: `Expedition ${id8} (${e.name}) was delivered from ${d.delivery?.branch} at ${d.delivery.tipCommit.slice(0, 8)}, but no merge is sealed yet.`,
        remediation: integration.mergeCommit
          ? `Seal it — ${integration.base} already contains the delivered tip:\n  ${sealCommand}`
          : `No base-branch commit contains the delivered tip yet. Merge it, then record the merge:\n  ${sealCommand}`,
        commands: [sealCommand],
      }
    }

    const deliverCommand = `synth expedition deliver --id ${id} --branch ${resolved.branch ?? "<branch>"} --no-push`
    const commands = [
      ...(resolved.unresolved && resolved.fetchHint ? [resolved.fetchHint] : []),
      deliverCommand,
      sealCommand,
    ]
    const note = branchSourceNote(resolved.source, id8)
    const noteLine = note ? `\n  # ${note}` : ""

    if (resolved.unresolved) {
      return {
        kind: "delivery-pending",
        description: `Expedition ${id8} (${e.name}) is completed but not delivered: its work is not yet merged or sealed, and its branch is not in this clone.`,
        remediation: `Fetch the branch, then deliver and seal it (copy-paste):\n  ${commands.join("\n  ")}${noteLine}`,
        commands,
      }
    }
    if (resolved.branch) {
      return {
        kind: "delivery-pending",
        description: `Expedition ${id8} (${e.name}) is completed but not delivered: its work is not yet merged or sealed.`,
        remediation: `Deliver it, then seal the merge (copy-paste):\n  ${commands.join("\n  ")}${noteLine}`,
        commands,
      }
    }
    return {
      kind: "delivery-pending",
      description: `Expedition ${id8} (${e.name}) is finished but not delivered: its work is not yet merged or sealed.`,
      remediation: `Deliver it, then seal the merge. No branch is recorded for this expedition and no remote ref names ${id8}, so name the branch that carries the work:\n  ${commands.join("\n  ")}`,
      commands,
    }
  })
}
