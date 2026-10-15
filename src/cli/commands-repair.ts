// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printJson, printError } from "./print.js"
import { resolveGovernanceContext, isGovernanceResolutionFailure } from "../runtime/governance-resolver.js"
import * as sdk from "../sdk/index.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"
import { namespaceHelp } from "./command-help.js"
import { prepareAlignmentContract } from "./command-alignment.js"


export async function cmdRepairHelp() {
  printJson(namespaceHelp("repair", "Runtime repair operations", [
    { name: "synth repair replay", description: "Detect runtime drift against certified Mission snapshots and propose repairs" },
    { name: "synth repair replay --approve", description: "Apply proposed repairs by emitting compensating runtime events", args: "--approve" },
    { name: "synth repair state", description: "Detect canonical-state divergences and propose regeneration from replay" },
    { name: "synth repair state --approve", description: "Regenerate canonical-state.json by emitting a REPAIR_ACCEPTED audit event", args: "--approve" },
  ], {
    note: "Repair uses only public CLI commands and the ExecutionGate. It never edits event logs or state files directly.",
  }))
}


export interface RepairEntry {
  snapshotId: string
  missionId?: string
  status: string
  requiredActions?: string[]
  appliedActions?: string[]
  reason?: string
  error?: string
}


export async function cmdRepairReplay(args: string[], flags: Record<string, string | boolean>) {
  const approve = flags.approve === true || flags.approve === "true"
  await sdk.paths.ensureDataDir(sdk.workspace.root())

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()

  const listResult = (await ctx.api.missionStudioOperation({
    operation: "listSnapshots",
    params: {},
  })) as { status: string; snapshots?: Array<{ id: string }>; error?: string }

  if (listResult.status !== "ok") {
    printError(`Failed to list certified snapshots: ${listResult.error || JSON.stringify(listResult)}`)
  }

  const snapshotSummaries = listResult.snapshots ?? []
  const repairs: RepairEntry[] = []
  const repairedMissionIds = new Set<string>()

  for (const summary of snapshotSummaries) {
    const getResult = (await ctx.api.missionStudioOperation({
      operation: "getSnapshot",
      params: { snapshotId: summary.id },
    })) as {
      status: string
      snapshot?: import("../mission-studio/types.js").ApprovedMissionModelSnapshot
      error?: string
    }

    if (getResult.status !== "ok" || !getResult.snapshot) {
      repairs.push({
        snapshotId: summary.id,
        status: "error",
        error: getResult.error || "snapshot could not be loaded",
      })
      continue
    }

    const snapshot = getResult.snapshot
    const missionNode = Array.from(snapshot.worldModel.nodes.values()).find(
      (n: import("../mission-studio/types.js").WorldModelNode): n is import("../mission-studio/types.js").MissionNode =>
        n.kind === "mission",
    )

    if (!missionNode) {
      repairs.push({
        snapshotId: snapshot.id,
        status: "skipped",
        reason: "snapshot contains no mission node",
      })
      continue
    }

    const missionId = missionNode.id

    if (repairedMissionIds.has(missionId)) {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "already-repaired",
      })
      continue
    }

    const existing = state.missions[missionId]
    if (existing && existing.status === "active") {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "consistent",
      })
      continue
    }

    const requiredActions: string[] = []
    if (!existing) {
      requiredActions.push("create")
    } else if (existing.status === "draft") {
      requiredActions.push("approve")
    }

    if (requiredActions.length === 0) {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "consistent",
      })
      continue
    }

    if (!approve) {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "proposed",
        requiredActions,
      })
      continue
    }

    try {
      if (!existing) {
        const createResult = await ctx.api.handleIntent({
          actor: "synth-cli",
          capability: "CreateMission",
          payload: {
            id: missionId,
            name: missionNode.name,
            purpose: missionNode.purpose,
          },
        })
        if (createResult.status !== "ok") {
          throw new Error(`CreateMission failed: ${createResult.error || JSON.stringify(createResult)}`)
        }
      }

      const { contractId } = await prepareAlignmentContract(ctx)
      const approveResult = await ctx.api.handleIntent({
        actor: "synth-cli",
        capability: "ApproveMission",
        payload: { id: missionId, alignmentContractId: contractId },
      })
      if (approveResult.status !== "ok") {
        throw new Error(`ApproveMission failed: ${approveResult.error || JSON.stringify(approveResult)}`)
      }

      repairedMissionIds.add(missionId)
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "repaired",
        appliedActions: requiredActions,
      })
    } catch (err) {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const repairedEntries = repairs.filter((r) => r.status === "repaired")
  if (approve && repairedEntries.length > 0) {
    const allAppliedActions = repairedEntries.flatMap((r) => r.appliedActions || [])
    const recordResult = await ctx.api.handleIntent({
      actor: "synth-cli",
      capability: "RecordRepair",
      payload: {
        repairPlan: { repairs: repairedEntries },
        appliedActions: allAppliedActions,
      },
    })
    if (recordResult.status !== "ok") {
      repairs.push({
        snapshotId: "audit",
        status: "failed",
        error: `RecordRepair failed: ${recordResult.error || JSON.stringify(recordResult)}`,
      })
    }
  }

  const failed = repairs.some((r) => r.status === "failed" || r.status === "error")
  const proposed = repairs.some((r) => r.status === "proposed")

  printJson({
    status: failed ? "error" : "ok",
    kind: "RepairReport",
    mode: approve ? "apply" : "dry-run",
    snapshotCount: snapshotSummaries.length,
    repairs,
    nextStep: failed
      ? "Inspect the failure details, then re-run after resolving the underlying issue."
      : proposed
        ? "Run 'synth repair replay --approve' to apply the proposed repairs."
        : "Run 'synth explain replay' to verify runtime consistency.",
  })

  if (failed) {
    process.exit(1)
  }
}


export const REPAIRABLE_DIVERGENCE_KINDS = [
  "state-lags-events",
  "replayed-state-mismatch",
  "missing-events",
]


export interface StateRepairEntry {
  kind: string
  severity: string
  artifact: string
  description: string
  action: string
}


export async function cmdRepairState(flags: Record<string, string | boolean>) {
  const approve = flags.approve === true || flags.approve === "true"
  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const rootDir = process.cwd()

  const ctxResult = await resolveGovernanceContext(rootDir)
  let stateDivergences: Array<{ kind: string; severity: string; artifact: string; description: string }> = []
  let unrepairableDivergences: Array<{ kind: string; severity: string; artifact: string; description: string }> = []

  if (isGovernanceResolutionFailure(ctxResult)) {
    // EXP-GOV-025: some resolution failures are repairable canonical-state
    // divergences (missing-events, replayed-state-mismatch). Surface them as
    // proposed repairs when they are the only problem; otherwise treat the
    // failure as unrepairable through state regeneration.
    const conflicts = ctxResult.conflicts || []
    stateDivergences = conflicts
      .filter((c) => REPAIRABLE_DIVERGENCE_KINDS.includes(c.kind || ""))
      .map((c) => ({
        kind: c.kind || "unknown",
        severity: "error" as const,
        artifact: c.artifact || "canonical-state.json",
        description: c.issue,
      }))
    unrepairableDivergences = conflicts
      .filter((c) => !REPAIRABLE_DIVERGENCE_KINDS.includes(c.kind || ""))
      .map((c) => ({
        kind: c.kind || "unknown",
        severity: "error" as const,
        artifact: c.artifact || "unknown",
        description: c.issue,
      }))
  } else {
    const graphViolations = ctxResult.derived.graphViolations || []
    const divergences = ctxResult.derived.divergences
    stateDivergences = divergences
      .filter((d) => REPAIRABLE_DIVERGENCE_KINDS.includes(d.kind))
      .map((d) => ({
        kind: d.kind,
        severity: d.severity,
        artifact: d.artifact || "canonical-state.json",
        description: d.description,
      }))
    unrepairableDivergences = [
      ...graphViolations.map((v) => ({
        kind: v.kind || "aggregate-graph-violation",
        severity: "error" as const,
        artifact: "event-log.jsonl",
        description: v.message,
      })),
      ...divergences
        .filter((d) => !REPAIRABLE_DIVERGENCE_KINDS.includes(d.kind))
        .map((d) => ({
          kind: d.kind,
          severity: d.severity,
          artifact: d.artifact || "unknown",
          description: d.description,
        })),
    ]
  }

  const repairs: StateRepairEntry[] = stateDivergences.map((d) => ({
    kind: d.kind,
    severity: d.severity,
    artifact: d.artifact || "canonical-state.json",
    description: d.description,
    action: "regenerate-canonical-state-from-replay",
  }))

  if (stateDivergences.length === 0 && unrepairableDivergences.length === 0) {
    printJson({
      status: "ok",
      kind: "RepairReport",
      mode: approve ? "apply" : "dry-run",
      repairs: [],
      note: "No canonical-state divergences detected.",
    })
    return
  }

  if (unrepairableDivergences.length > 0) {
    printJson({
      status: "error",
      kind: "RepairReport",
      mode: approve ? "apply" : "dry-run",
      repairs,
      unrepairable: unrepairableDivergences,
      note: "Event-log graph violations or non-state divergences are present. These cannot be repaired by regenerating canonical-state.json.",
    })
    process.exit(1)
  }

  if (!approve) {
    printJson({
      status: "ok",
      kind: "RepairReport",
      mode: "dry-run",
      repairs,
      nextStep: "Run 'synth repair state --approve' to regenerate canonical-state.json from replay.",
    })
    return
  }

  // EXP-GOV-025: apply the repair by recording a REPAIR_ACCEPTED audit event.
  // The runtime commit rewrites canonical-state.json with the replayed state,
  // which resolves state-lags-events, replayed-state-mismatch, and missing-events
  // divergences without hand-editing derived JSON.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const recordResult = await gateCtx.api.handleIntent({
    actor: "synth-cli",
    capability: "RecordRepair",
    payload: {
      repairPlan: {
        action: "regenerate-canonical-state-from-replay",
        divergences: stateDivergences,
      },
      appliedActions: ["regenerate-canonical-state"],
    },
  })

  if (recordResult.status !== "ok") {
    printError(`Repair failed: ${recordResult.error || JSON.stringify(recordResult)}`, {
      code: "RepairFailed",
      category: "repair",
      suggestion: "Inspect the event log and run 'synth explain diagnostics'.",
    })
  }

  // Verify the repair by re-resolving the governance context.
  const afterCtx = await resolveGovernanceContext(rootDir)
  const remaining = isGovernanceResolutionFailure(afterCtx)
    ? []
    : afterCtx.derived.divergences.filter((d) => REPAIRABLE_DIVERGENCE_KINDS.includes(d.kind))

  printJson({
    status: remaining.length === 0 ? "ok" : "warning",
    kind: "RepairReport",
    mode: "apply",
    repairs: repairs.map((r) => ({ ...r, status: "repaired" })),
    remainingDivergences: remaining,
    note:
      remaining.length === 0
        ? "canonical-state.json regenerated from replay; repair recorded as REPAIR_ACCEPTED event."
        : "Some canonical-state divergences remain after repair.",
  })

  if (remaining.length > 0) {
    process.exit(1)
  }
}


export async function cmdRepairStateHelp() {
  printJson(namespaceHelp("repair state", "Repair canonical-state divergences", [
    { name: "synth repair state", description: "Diagnose canonical-state divergences" },
    { name: "synth repair state --approve", description: "Regenerate canonical-state.json from replay and record the repair", args: "--approve" },
  ]))
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "replay") await cmdRepairReplay(positional.slice(2), flags)
  else if (sub === "state") await cmdRepairState(flags)
  else
    printError(
      "Usage: synth repair replay [--approve] or synth repair state [--approve]",
    )
}
