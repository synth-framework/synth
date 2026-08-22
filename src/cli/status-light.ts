// SYNTH-LOADER-002: light `status` handler.
//
// Serves `synth status` WITHOUT importing the heavy synth.js graph. It only
// pulls in bootstrap-free modules (ai-metadata, status-briefing,
// status-validation), so it skips both the eager core/bootstrap import and the
// 13-step bootstrap that every heavy command pays for.
import * as sdk from "../sdk/index.js"
import { refreshAiMetadata } from "./ai-metadata.js"
import { buildOperatorBriefing } from "./status-briefing.js"
import { buildStatusValidationSummary } from "./status-validation.js"
import { printJson } from "./print.js"

export async function runStatus(): Promise<void> {
  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const synthDir = sdk.paths.synthDir(sdk.workspace.root())
  await refreshAiMetadata(synthDir)

  const briefing = await buildOperatorBriefing(process.cwd())
  const validation = await buildStatusValidationSummary()
  if (briefing.status === "ok" && validation) {
    ;(briefing as Record<string, unknown>).validation = validation
  }

  printJson(briefing)
  if (briefing.status === "error") {
    process.exit(1)
  }
}
