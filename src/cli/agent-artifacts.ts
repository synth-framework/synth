// ============================================================
// CLI: Agent Orientation Artifacts
// ============================================================
// Generates the small runtime orientation files that help agents
// resolve repository context without having to infer it from docs/.
// These are generated artifacts, not source-of-truth.
// ============================================================

import fs from "fs/promises"
import path from "path"
import type { CanonicalState } from "../types/index.js"
import type { ExecutionGate } from "../control/execution-gate.js"
import { writeAiMetadata } from "./ai-metadata.js"

/** True when the file already holds `value` once `generatedAt` is ignored. */
async function sameIgnoringTimestamp(file: string, value: Record<string, unknown>): Promise<boolean> {
  try {
    const existing = JSON.parse(await fs.readFile(file, "utf-8")) as Record<string, unknown>
    const strip = (v: Record<string, unknown>) => {
      const { generatedAt: _ignored, ...rest } = v
      return JSON.stringify(rest)
    }
    return strip(existing) === strip(value)
  } catch {
    return false
  }
}

/**
 * Write agent orientation artifacts.
 *
 * If `gate` is provided and governance authority exists, file writes are
 * routed through the ExecutionGate FilesystemWrite capability. Otherwise the
 * function falls back to direct filesystem writes (transitional behavior for
 * initialization paths where no expedition has been authorized yet).
 */
export async function writeAgentArtifacts(
  synthDir: string,
  projectName: string,
  state?: CanonicalState,
  manifest?: { name?: string; governanceVersion?: string },
  gate?: ExecutionGate,
) {
  const contractPath = path.join(synthDir, "AGENT_CONTRACT.md")
  const contextPath = path.join(synthDir, "context.json")

  const contract = `# SYNTH Agent Operating Contract

This repository is governed by SYNTH. Before performing work:

1. Resolve the active mission.
2. Resolve the active expedition.
3. Do not create plans outside an expedition.
4. Do not execute without authorization.
5. Every state change requires an event.
6. Accepted evidence does not equal completed work.
7. Do not begin another expedition until the current expedition is completed.
8. Preserve canonical state.
9. Prefer governed transitions over direct modifications.

When in doubt, run \`synth status\` and ask the human for the next step.
`

  const context = {
    repository_type: "synth_governed_project",
    projectName,
    governance_required: true,
    lifecycle_version: "v2",
    generatedAt: new Date().toISOString(),
  }

  // context.json is tracked. Rewrite it only when its content changes apart
  // from generatedAt, so re-running init does not create a commit of churn.
  const contextChanged = !(await sameIgnoringTimestamp(contextPath, context))

  if (gate) {
    await gate.execute({
      actor: "synth-cli",
      capability: "FilesystemWrite",
      payload: { path: contractPath, content: contract },
    })
    if (contextChanged) {
      await gate.execute({
        actor: "synth-cli",
        capability: "FilesystemWrite",
        payload: { path: contextPath, content: JSON.stringify(context, null, 2) },
      })
    }
  } else {
    await fs.writeFile(contractPath, contract, "utf-8")
    if (contextChanged) {
      await fs.writeFile(contextPath, JSON.stringify(context, null, 2), "utf-8")
    }
  }

  if (state) {
    await writeAiMetadata(synthDir, state, manifest ?? { name: projectName, governanceVersion: "2.3.0" })
  }
}
