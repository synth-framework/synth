// SYNTH-LOADER-002: light `status` handler.
//
// Serves `synth status` WITHOUT importing the heavy synth.js graph. It only
// pulls in bootstrap-free modules (ai-metadata, status-briefing,
// status-validation), so it skips both the eager core/bootstrap import and the
// 13-step bootstrap that every heavy command pays for.
//
// EXP-AI-003 superseded (ADR-055 §2.8): `status` is a pure read and must not
// regenerate .synth/ai/. Use `synth ai refresh` for explicit regeneration.
import { ensureDataDir } from "../sdk/paths/runtime.js"
import { root } from "../sdk/workspace/root.js"
import { buildOperatorBriefing } from "./status-briefing.js"
import { buildStatusValidationSummary } from "./status-validation.js"
import { printJson } from "./print.js"

export async function runStatus(): Promise<void> {
  await ensureDataDir(root())

  // Independent read-only projections: overlap their I/O without skipping
  // validation on dirty trees or caching state between invocations.
  const [briefing, validation] = await Promise.all([
    buildOperatorBriefing(process.cwd()),
    buildStatusValidationSummary(),
  ])
  if (briefing.status === "ok" && validation) {
    ;(briefing as Record<string, unknown>).validation = validation
  }

  printJson(briefing)
  if (briefing.status === "error") {
    process.exit(1)
  }
}
