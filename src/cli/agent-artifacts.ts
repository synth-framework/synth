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

  if (gate) {
    await gate.execute({
      actor: "synth-cli",
      capability: "FilesystemWrite",
      payload: { path: contractPath, content: contract },
    })
    await gate.execute({
      actor: "synth-cli",
      capability: "FilesystemWrite",
      payload: { path: contextPath, content: JSON.stringify(context, null, 2) },
    })
  } else {
    await fs.writeFile(contractPath, contract, "utf-8")
    await fs.writeFile(contextPath, JSON.stringify(context, null, 2), "utf-8")
  }

  if (state) {
    await writeAiMetadata(synthDir, state, manifest ?? { name: projectName, governanceVersion: "2.3.0" })
  }
}
