// ============================================================
// CLI: Distribution Commands
// ============================================================
// Generates platform-specific artifacts from the Canonical AI
// Capability Model. All outputs are projections; the model is
// the single source of truth.
//
// EXP-DIST-002, EXP-DIST-005, EXP-DIST-006, EXP-DIST-007
// ============================================================

import fs from "fs/promises"
import path from "path"
import { getCapabilityModel, type AiCapabilityModel } from "../distribution/capability-model.js"
import { listProjectionTargets, project, type ProjectionTarget } from "../distribution/projection-engine.js"

function printJson(obj: unknown) {
  console.log(JSON.stringify(obj, null, 2))
}

function printError(error: string, code = 1): never {
  printJson({ status: "error", error })
  process.exit(code)
}

export function namespaceHelp() {
  return {
    status: "ok",
    name: "synth",
    namespace: "distribute",
    description: "Project SYNTH capabilities into platform-specific distribution artifacts",
    usage: "synth distribute <subcommand> [options]",
    subcommands: [
      { name: "synth distribute list-targets", description: "List available projection targets" },
      { name: "synth distribute project --target <t> [--out-dir <dir>]", description: "Generate a single projection", args: "--target <chatgpt-skill|claude-skill|...> [--out-dir <dir>]" },
      { name: "synth distribute project-all --out-dir <dir>", description: "Generate all projections into a directory", args: "--out-dir <dir>" },
      { name: "synth distribute model", description: "Emit the Canonical AI Capability Model as JSON" },
    ],
    note: "All generated artifacts are projections from the Canonical AI Capability Model.",
  }
}

export async function cmdDistributeListTargets() {
  const targets = listProjectionTargets()
  printJson({
    status: "ok",
    kind: "DistributionTargets",
    targets,
    count: targets.length,
  })
}

export async function cmdDistributeProject(flags: Record<string, string | boolean>) {
  const target = typeof flags.target === "string" ? (flags.target as ProjectionTarget) : undefined
  const outDir = typeof flags["out-dir"] === "string" ? flags["out-dir"] : ".synth/distribution"

  if (!target) printError("--target is required")

  const model = getCapabilityModel()
  const result = project(model, target)

  await fs.mkdir(outDir, { recursive: true })
  const outputPath = path.join(outDir, result.filename)
  await fs.writeFile(outputPath, result.content, "utf-8")

  printJson({
    status: "ok",
    kind: "DistributionProjection",
    target,
    outputPath,
    filename: result.filename,
    contentType: result.contentType,
  })
}

export async function cmdDistributeProjectAll(flags: Record<string, string | boolean>) {
  const outDir = typeof flags["out-dir"] === "string" ? flags["out-dir"] : ".synth/distribution"
  const model = getCapabilityModel()
  const targets = listProjectionTargets()

  await fs.mkdir(outDir, { recursive: true })
  const outputs: Array<{ target: string; filename: string; outputPath: string }> = []

  for (const target of targets) {
    const result = project(model, target)
    const outputPath = path.join(outDir, result.filename)
    await fs.writeFile(outputPath, result.content, "utf-8")
    outputs.push({ target, filename: result.filename, outputPath })
  }

  printJson({
    status: "ok",
    kind: "DistributionProjectionAll",
    outDir,
    count: outputs.length,
    outputs,
  })
}

export async function cmdDistributeModel() {
  const model = getCapabilityModel()
  printJson({
    status: "ok",
    kind: "AiCapabilityModel",
    ...model,
  })
}
