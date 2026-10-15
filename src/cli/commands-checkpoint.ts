// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import { printJson } from "./print.js"
import { buildOperatorBriefing } from "./status-briefing.js"
import { branchNameCandidates } from "../repository/branch-taxonomy.js"
import { enrichExecutionBranchContext, type ExecutionNameRecords } from "../repository/branch-policy.js"
import * as sdk from "../sdk/index.js"
import { verifyReplayHealth } from "./command-replay-health.js"
import { namespaceHelp } from "./command-help.js"


// Checkpoint branch step (ECOSYSTEM-001): resolve whether the current branch
// satisfies the executing expedition's canonical branch via the repository
// adapter. When the configured policy is off (default) or the VCS has no
// branch concept, this degrades to observation and never blocks.
export async function resolveCheckpointBranch(
  rootDir: string,
  executingExpeditions: Array<{ id: string; missionId: string; name?: string; missionName?: string }>,
): Promise<{ ok: boolean; detail: string; currentBranch?: string; requiredBranch?: string; nextStep?: string }> {
  const { createGitRepositoryAdapter } = await import("../adapters/repository/git.js")
  const adapter = createGitRepositoryAdapter({ path: rootDir })
  const status = await adapter.status()

  if (executingExpeditions.length === 0) {
    return { ok: true, detail: "No executing expedition to verify execution branch", currentBranch: status.branch }
  }

  // ADR-056: a recorded binding is the answer, and it is consulted before the
  // canonical taxonomy — otherwise a declared operator branch (an Arena session
  // checkout, say) is reported as a violation of a branch the operator never
  // asked for, and the pre-flight checkpoint blocks work it should authorize.
  const records = (await sdk.state.readState(rootDir).catch(() => undefined)) as ExecutionNameRecords | undefined

  // Match the current branch to the executing expedition it belongs to: first
  // by recorded binding, then by canonical name, so multiple executing
  // expeditions resolve to the right one.
  const match =
    executingExpeditions.find((e) => {
      const bound = records?.expeditions?.[e.id]?.executionBranch
      return typeof bound === "string" && bound.length > 0 && bound === status.branch
    }) ??
    executingExpeditions.find((e) => {
      try {
        const names = branchNameCandidates("expedition", {
          mission: { id: e.missionId, name: e.missionName },
          expedition: { id: e.id, name: e.name },
        })
        return names.includes(status.branch)
      } catch {
        return false
      }
    }) ??
    executingExpeditions[0]

  const result = await adapter.validateExecutionBranch(
    "expedition",
    enrichExecutionBranchContext("expedition", match.id, records, {
      expeditionId: match.id,
      missionId: match.missionId,
      expeditionName: match.name,
      missionName: match.missionName,
    }),
  )
  return {
    ok: result.ok,
    detail: result.reason || (result.ok ? "Execution branch satisfies the declared policy" : "Execution branch policy violated"),
    currentBranch: status.branch,
    ...(result.requiredBranch ? { requiredBranch: result.requiredBranch } : {}),
    ...(result.ok
      ? {}
      : {
          nextStep: result.requiredBranch
            ? `Switch to the canonical expedition branch: git checkout ${result.requiredBranch}`
            : "Check the declared branch policy in .synth/config.yaml",
        }),
  }
}


export async function cmdCheckpoint() {
  await sdk.paths.ensureDataDir(sdk.workspace.root())

  // Step 1: synth status projection.
  const briefing = await buildOperatorBriefing(process.cwd())
  const statusOk = briefing.status === "ok"

  // Step 2: replay consistency.
  const replay = await verifyReplayHealth()

  // Step 3: active executing expedition.
  const executingExpeditions =
    briefing.status === "ok"
      ? briefing.activeExpeditions
          .filter((e) => e.status === "executing")
          .map((e) => ({
            ...e,
            missionName: briefing.missions.find((m) => m.id === e.missionId)?.name,
          }))
      : []
  const hasExecutingExpedition = executingExpeditions.length > 0

  // Step 4: execution branch policy (ECOSYSTEM-001). The checkpoint confirms
  // that the current branch satisfies the executing expedition's canonical
  // branch. When the declared policy is off (default) or the VCS has no branch
  // concept, this step degrades to observation and never blocks.
  const branch = await resolveCheckpointBranch(process.cwd(), executingExpeditions)

  const steps = {
    status: {
      ok: statusOk,
      detail: statusOk ? "Governance context resolved" : "Failed to resolve governance context",
      ...(statusOk ? {} : { nextStep: "Run 'synth status' to diagnose the governance context." }),
    },
    replay: {
      ok: replay.ok,
      detail: replay.detail,
      ...(replay.ok ? {} : { nextStep: replay.nextStep }),
    },
    executingExpedition: {
      ok: hasExecutingExpedition,
      detail: hasExecutingExpedition
        ? executingExpeditions.map((e) => `${e.id} (${e.name})`).join(", ")
        : "No expedition is at executing status",
      ...(hasExecutingExpedition
        ? {}
        : { nextStep: "Run 'synth expedition start --id <id>' to authorize implementation work." }),
    },
    executionBranch: {
      ok: branch.ok,
      detail: branch.detail,
      ...(branch.requiredBranch ? { requiredBranch: branch.requiredBranch } : {}),
      ...(branch.ok ? {} : { nextStep: branch.nextStep }),
    },
  }

  const allOk = statusOk && replay.ok && hasExecutingExpedition && branch.ok
  const nextSteps: string[] = []
  for (const step of Object.values(steps)) {
    if (!step.ok && step.nextStep) {
      nextSteps.push(step.nextStep)
    }
  }
  if (allOk) {
    nextSteps.push("You may begin implementation work covered by the executing expedition.")
  }

  printJson({
    status: allOk ? "ok" : "blocked",
    kind: "AgentCheckpoint",
    steps,
    executingExpeditionIds: executingExpeditions.map((e) => e.id),
    currentBranch: branch.currentBranch,
    nextSteps,
  })

  if (!allOk) {
    process.exit(1)
  }
}


export async function cmdCheckpointHelp() {
  printJson(namespaceHelp("checkpoint", "Run pre-flight checkpoint before implementation work", [
    { name: "synth checkpoint", description: "Confirm status, replay consistency, and an executing expedition before work" },
  ]))
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdCheckpoint()
}
