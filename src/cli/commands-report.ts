// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import { printJson, printError } from "./print.js"
import { buildOperatorBriefing } from "./status-briefing.js"
import { resolveGovernanceContext, isGovernanceResolutionFailure } from "../runtime/governance-resolver.js"
import * as sdk from "../sdk/index.js"
import { inferMissionProgram } from "./command-program-inference.js"


// ============================================================
// Global human-readable project report
// ============================================================
export async function cmdReport(flags: Record<string, string | boolean>) {
  const briefing = await buildOperatorBriefing(process.cwd())
  if (briefing.status === "error") {
    printError(briefing.diagnostic, {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: briefing.recovery,
    })
    return
  }

  const resolved = await resolveGovernanceContext(process.cwd())
  if (isGovernanceResolutionFailure(resolved)) {
    printError("Could not resolve governance context.", {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: "Run 'synth explain replay' to diagnose state issues.",
    })
    return
  }

  let projectName = "Synth Project"
  try {
    const manifest = JSON.parse(await fs.readFile(sdk.paths.manifestPath(process.cwd()), "utf-8"))
    if (typeof manifest.projectName === "string" && manifest.projectName.length > 0) {
      projectName = manifest.projectName
    }
  } catch {
    // Fall back to default project name.
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const state = resolved.authoritative.replayedState
  const activeExpedition = briefing.activeExpeditions[0] ?? null
  // Prefer the mission that owns the executing expedition; otherwise the first active mission.
  const activeMissionId = activeExpedition ? state.expeditions[activeExpedition.id]?.missionId : null
  const activeMission =
    (activeMissionId ? briefing.missions.find((m) => m.id === activeMissionId) : undefined) ??
    briefing.missions.find((m) => m.status === "active") ??
    null
  const missionPurpose = activeMission ? state.missions[activeMission.id]?.purpose : ""
  const activeMissionProgram = activeMission ? await inferMissionProgram(charterDir, activeMission.id, resolved) : undefined
  const expeditionGoal = activeExpedition ? state.expeditions[activeExpedition.id]?.goal : ""

  const human = flags.human === true || flags.human === "true"
  if (human) {
    const blockerText =
      briefing.blockers.length === 0
        ? "None"
        : briefing.blockers.map((b) => `  • ${b.description}`).join("\n")
    const nextStepText =
      briefing.nextActions.length === 0
        ? "No pending actions."
        : `  ${briefing.nextActions[0].command}${briefing.nextActions[0].reason ? ` — ${briefing.nextActions[0].reason}` : ""}`
    const missionText = activeMission
      ? `Mission: ${activeMission.name} (${activeMission.id})\nStatus: ${activeMission.status}${activeMissionProgram ? `\nProgram: ${activeMissionProgram.id} — ${activeMissionProgram.name}` : ""}${missionPurpose ? `\nPurpose:\n  ${missionPurpose}` : ""}`
      : "Mission: none active"
    const expeditionText = activeExpedition
      ? `Expedition: ${activeExpedition.name} (${activeExpedition.id}) — ${activeExpedition.status}${expeditionGoal ? `\nGoal:\n  ${expeditionGoal}` : ""}`
      : "Expedition: none executing"

    console.log(
      `Project: ${projectName}\n` +
      `Phase: ${briefing.phase}\n` +
      `Event count: ${briefing.eventCount}\n\n` +
      `${missionText}\n\n` +
      `${expeditionText}\n\n` +
      `Blockers:\n${blockerText}\n\n` +
      `Next step:\n${nextStepText}`,
    )
    return
  }

  printJson({
    status: "ok",
    kind: "ProjectReport",
    projectName,
    phase: briefing.phase,
    summary: briefing.summary,
    mission: activeMission
      ? {
          id: activeMission.id,
          name: activeMission.name,
          status: activeMission.status,
          purpose: missionPurpose,
          program: activeMissionProgram || undefined,
        }
      : null,
    expedition: activeExpedition
      ? {
          id: activeExpedition.id,
          name: activeExpedition.name,
          status: activeExpedition.status,
          goal: expeditionGoal,
        }
      : null,
    blockers: briefing.blockers,
    nextActions: briefing.nextActions,
    eventCount: briefing.eventCount,
  })
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  await cmdReport(flags)
}
