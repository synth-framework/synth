// ============================================================
// CLI: synth migrate
// ============================================================
// Detect, plan, archive, and import legacy Synth state.
// All mutations flow through the ExecutionGate as replayable events.
// ============================================================

import fs from "fs/promises"
import path from "node:path"
import crypto from "crypto"
import { bootstrap } from "../core/bootstrap.js"
import { injectIdentityContext } from "./identity-context.js"
import { printJson, printError } from "./print.js"
import { captureIdentity } from "../identity/index.js"
import { detectLegacyState } from "../migration/detect.js"
import { buildMigrationPlan, resolveLegacyEventLogPath } from "../migration/plan.js"
import { runBootstrap } from "./bootstrap-apply.js"
import * as sdk from "../sdk/index.js"

async function bootstrapWithCapabilities(targetDir?: string) {
  const root = targetDir ? path.resolve(targetDir) : process.cwd()
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: sdk.paths.eventLogFile(root),
      statePath: sdk.paths.stateFile(root),
      checkpointPath: sdk.paths.checkpointsFile(root),
    },
  })
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) {
      ctx.runtime.registerCapability(cap)
    }
  }
  // EXP-IDENTITY-001: ensure every handleIntent call carries the CLI identity.
  injectIdentityContext(ctx.api)
  return ctx
}

function resolveTargetDir(args: string[]): string {
  return args[0] ? path.resolve(args[0]) : process.cwd()
}

export function namespaceHelp() {
  return {
    status: "ok",
    name: "synth",
    namespace: "migrate",
    description: "Detect, plan, archive, and import legacy Synth state",
    usage: "synth migrate <subcommand> [options]",
    subcommands: [
      { name: "synth migrate detect [path]", description: "Detect legacy Synth state (read-only)" },
      { name: "synth migrate plan [path] [--path archive|import]", description: "Build a read-only migration plan" },
      { name: "synth migrate archive [path] [--approve]", description: "Archive legacy .synth/ and bootstrap fresh" },
      { name: "synth migrate import [path] [--source <path>] [--approve]", description: "Import legacy events into the current project" },
    ],
  }
}

export async function cmdMigrateDetect(args: string[]) {
  const targetDir = resolveTargetDir(args)
  const detection = await detectLegacyState(targetDir)
  printJson({
    status: "ok",
    kind: "MigrationDetection",
    targetDir,
    ...detection,
  })
}

export async function cmdMigratePlan(args: string[], flags: Record<string, string | boolean>) {
  const targetDir = resolveTargetDir(args)
  const detection = await detectLegacyState(targetDir)
  const pathOverride = flags.path === "archive" || flags.path === "import" ? flags.path : undefined
  const plan = buildMigrationPlan(targetDir, detection, pathOverride ? { path: pathOverride } : undefined)
  printJson({
    status: "ok",
    kind: "MigrationPlan",
    targetDir,
    ...plan,
  })
}

export async function cmdMigrateArchive(args: string[], flags: Record<string, string | boolean>) {
  const targetDir = resolveTargetDir(args)
  const detection = await detectLegacyState(targetDir)

  if (!detection.legacyStateDetected) {
    printJson({
      status: "ok",
      kind: "MigrationArchive",
      targetDir,
      archived: false,
      reason: "No legacy Synth state detected.",
    })
    return
  }

  const plan = buildMigrationPlan(targetDir, detection, { path: "archive" })

  if (!flags.approve) {
    printJson({
      status: "pending-approval",
      kind: "MigrationArchive",
      targetDir,
      plan,
      nextSteps: ["Review the plan", "Run 'synth migrate archive --approve' to apply"],
    })
    return
  }

  const sourcePath = plan.sourcePath ?? sdk.paths.synthDir(targetDir)
  const archivePath = plan.archiveTarget ?? path.join(targetDir, `.synth_archive_${new Date().toISOString().replace(/[:.]/g, "-")}`)

  // Filesystem mutation: move the legacy directory out of the way.
  try {
    await fs.rename(sourcePath, archivePath)
  } catch (err) {
    printError(
      `Archive failed: ${err instanceof Error ? err.message : String(err)}`,
      { code: "ArchiveFailed", category: "migration" },
    )
    return
  }

  // Bootstrap a fresh Synth v2 project in the same directory.
  const bootstrapResult = await runBootstrap(targetDir, {
    approve: true,
    dryRun: false,
    withWebsite: false,
    withExample: false,
  })

  if (bootstrapResult.status !== "ok") {
    printJson({
      status: "error",
      kind: "MigrationArchive",
      targetDir,
      archived: true,
      archivePath,
      bootstrapStatus: bootstrapResult.status,
      governOutput: (bootstrapResult as Record<string, unknown>).governOutput,
      note: "Legacy state was archived but fresh bootstrap failed. Manual recovery may be required.",
    })
    return
  }

  // Record the archive as a replayable governance event.
  const identity = captureIdentity()
  const ctx = await bootstrapWithCapabilities(targetDir)
  const archiveId = crypto.randomUUID()
  const archiveResult = await ctx.api.handleIntent({
    capability: "MigrateArchive",
    actor: identity.agentId,
    payload: {
      archiveId,
      sourcePath,
      archivePath,
      reason: "Legacy Synth state archived before fresh bootstrap",
    },
    context: { identity },
  })

  printJson({
    status: archiveResult.status === "ok" ? "ok" : "error",
    kind: "MigrationArchive",
    targetDir,
    archived: true,
    archivePath,
    archiveId,
    archiveEvent: archiveResult.status === "ok" ? (archiveResult as Record<string, unknown>).transaction ?? null : null,
    bootstrapStatus: bootstrapResult.status,
    note: "Legacy state archived and fresh project bootstrapped. The archive event has been recorded.",
  })
}

export async function cmdMigrateImport(args: string[], flags: Record<string, string | boolean>) {
  const targetDir = resolveTargetDir(args)
  const detection = await detectLegacyState(targetDir)

  // Determine source path: explicit --source, or detected artifacts, or default legacy .synth.
  let sourcePath: string | undefined
  if (typeof flags.source === "string" && flags.source.length > 0) {
    sourcePath = path.resolve(targetDir, flags.source)
  } else {
    const sourceArtifact =
      detection.artifacts.find((a) => a.kind === "synth-backup" || a.kind === "synth-archive") ??
      detection.artifacts.find((a) => a.kind === "synth-dir") ??
      detection.artifacts.find((a) => a.kind === "ungoverned-event-log")
    sourcePath = sourceArtifact?.path
  }

  if (!sourcePath) {
    printError(
      "No legacy source found. Provide --source <path> or run detection first.",
      { code: "MigrationSourceMissing", category: "migration", suggestion: "synth migrate detect" },
    )
    return
  }

  const sourceKind = detection.artifacts.find((a) => a.path === sourcePath)?.kind === "ungoverned-event-log"
    ? "ungoverned-event-log"
    : "synth-dir"

  if (!flags.approve) {
    const eventLogPath = resolveLegacyEventLogPath(sourcePath, sourceKind)
    let importEventCount: number | undefined
    if (eventLogPath) {
      try {
        const text = await fs.readFile(eventLogPath, "utf-8")
        importEventCount = text.split("\n").filter((line) => line.trim().length > 0).length
      } catch {
        importEventCount = undefined
      }
    }

    printJson({
      status: "pending-approval",
      kind: "MigrationImport",
      targetDir,
      sourcePath,
      sourceKind,
      importEventCount,
      requiredApprovals: ["migrate-import"],
      nextSteps: [
        "synth approval request --operation migrate-import --reason '...'",
        "synth approval grant --request-id <id> --reason '...'",
        "synth migrate import --source <path> --approve",
      ],
    })
    return
  }

  const identity = captureIdentity()
  const ctx = await bootstrapWithCapabilities(targetDir)
  const importId = crypto.randomUUID()
  const importResult = await ctx.api.handleIntent({
    capability: "MigrateImport",
    actor: identity.agentId,
    payload: {
      importId,
      sourcePath,
      sourceKind,
    },
    context: { identity },
  })

  printJson({
    status: importResult.status === "ok" ? "ok" : "error",
    kind: "MigrationImport",
    targetDir,
    sourcePath,
    sourceKind,
    importId,
    importResult: importResult.status === "ok" ? (importResult as Record<string, unknown>).output ?? null : null,
    error: importResult.status !== "ok" ? (importResult as Record<string, unknown>).error ?? null : null,
  })
}
