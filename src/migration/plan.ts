// ============================================================
// MIGRATION: Planning
// ============================================================
// Build a read-only migration plan from a detection result.
// ============================================================

import path from "node:path"
import * as sdk from "../sdk/index.js"
import type { MigrationDetectionResult, MigrationPlan } from "./types.js"

function estimateImportEventCount(sourcePath: string | undefined): number | undefined {
  if (!sourcePath) return undefined
  try {
    const text = sdk.files.readFileSync(sourcePath)
    return text.split("\n").filter((line) => line.trim().length > 0).length
  } catch {
    return undefined
  }
}

export function buildMigrationPlan(
  root: string,
  detection: MigrationDetectionResult,
  overrides?: { path?: "archive" | "import" },
): MigrationPlan {
  const planPath = overrides?.path ?? detection.recommendedPath

  const base: MigrationPlan = {
    path: planPath,
    stateKind: detection.stateKind,
    artifacts: detection.artifacts,
    warnings: detection.warnings,
    reason: detection.reason,
  }

  if (planPath === "archive") {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const archiveTarget = path.join(root, `.synth_archive_${timestamp}`)
    return {
      ...base,
      archiveTarget,
      wouldRun: [
        `mv ${path.join(root, ".synth")} ${archiveTarget}`,
        "synth bootstrap --approve",
      ],
    }
  }

  if (planPath === "import") {
    const sourceArtifact =
      detection.artifacts.find((a) => a.kind === "synth-backup" || a.kind === "synth-archive") ??
      detection.artifacts.find((a) => a.kind === "synth-dir") ??
      detection.artifacts.find((a) => a.kind === "ungoverned-event-log")

    const sourcePath = sourceArtifact?.path
    const importEventCount = estimateImportEventCount(
      sourceArtifact?.kind === "ungoverned-event-log" ? sourcePath : sourcePath ? path.join(sourcePath, "data", "event-log.jsonl") : undefined,
    )

    return {
      ...base,
      sourcePath,
      importEventCount,
      requiredApprovals: ["migrate-import"],
      wouldRun: [
        "synth approval request --operation migrate-import --reason \"...\"",
        "synth approval grant --request-id <id> --reason \"...\"",
        "synth migrate import --approve",
      ],
    }
  }

  return base
}
