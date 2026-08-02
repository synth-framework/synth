// ============================================================
// MIGRATION: Legacy State Detection
// ============================================================
// Detect legacy Synth installations and classify what we found.
// ============================================================

import path from "node:path"
import * as sdk from "../sdk/index.js"
import type { MigrationArtifact, MigrationArtifactKind, MigrationDetectionResult, MigrationStateKind } from "./types.js"

const CURRENT_MANIFEST_SCHEMA = "synth-bootstrap-manifest-v1"

function isSynthDir(name: string): boolean {
  return name === ".synth"
}

function isSynthBackup(name: string): boolean {
  return name.startsWith(".synth_bk") || name.startsWith(".synth_backup")
}

function isSynthArchive(name: string): boolean {
  return name.startsWith(".synth_archive")
}

async function readManifestSchemaVersion(manifestPath: string): Promise<string | undefined> {
  const manifest = await sdk.json.readJsonMaybe<Record<string, unknown>>(manifestPath)
  return manifest && typeof manifest.schema === "string" ? manifest.schema : undefined
}

async function inspectSynthDir(root: string, dirName: string): Promise<MigrationArtifact | undefined> {
  const dirPath = path.join(root, dirName)
  if (!(await sdk.files.isDirectory(dirPath))) return undefined

  const manifestPath = path.join(dirPath, "manifest.json")
  let schemaVersion: string | undefined
  let readable = true
  let note: string | undefined

  try {
    schemaVersion = await readManifestSchemaVersion(manifestPath)
    if (schemaVersion !== CURRENT_MANIFEST_SCHEMA) {
      note = schemaVersion ? `schema ${schemaVersion}` : "unreadable or missing manifest"
    }
  } catch {
    readable = false
    note = "manifest unreadable"
  }

  let kind: MigrationArtifactKind
  if (isSynthDir(dirName)) kind = "synth-dir"
  else if (isSynthBackup(dirName)) kind = "synth-backup"
  else if (isSynthArchive(dirName)) kind = "synth-archive"
  else kind = "synth-dir"

  return {
    kind,
    path: dirPath,
    schemaVersion,
    readable,
    note,
  }
}

async function inspectUngovernedEventLog(root: string): Promise<MigrationArtifact | undefined> {
  const eventLogPath = sdk.paths.legacyDataDir(root)
  const filePath = path.join(eventLogPath, "event-log.jsonl")
  if (await sdk.files.exists(filePath)) {
    return {
      kind: "ungoverned-event-log",
      path: filePath,
      readable: true,
    }
  }
  return undefined
}

export async function detectLegacyState(root: string): Promise<MigrationDetectionResult> {
  const artifacts: MigrationArtifact[] = []
  const warnings: string[] = []

  // Inspect .synth/ and known backup/archive variants.
  let mainSynthArtifact: MigrationArtifact | undefined
  const entries = await sdk.files.listDirectory(root)
  for (const entry of entries) {
    if (isSynthDir(entry) || isSynthBackup(entry) || isSynthArchive(entry)) {
      const artifact = await inspectSynthDir(root, entry)
      if (artifact) {
        artifacts.push(artifact)
        if (entry === ".synth") mainSynthArtifact = artifact
      }
    }
  }

  // Inspect ungoverned data/event-log.jsonl.
  const ungovernedLog = await inspectUngovernedEventLog(root)
  if (ungovernedLog) artifacts.push(ungovernedLog)

  let stateKind: MigrationStateKind = "none"
  let recommendedPath: "archive" | "import" | "none" = "none"
  let reason = "No legacy Synth state detected."

  if (mainSynthArtifact) {
    if (mainSynthArtifact.schemaVersion === CURRENT_MANIFEST_SCHEMA) {
      stateKind = "initialized-v2"
      recommendedPath = "none"
      reason = "Existing Synth v2 project detected; no migration needed."
    } else {
      stateKind = "legacy"
      recommendedPath = "archive"
      reason = mainSynthArtifact.schemaVersion
        ? `Legacy Synth installation detected (schema ${mainSynthArtifact.schemaVersion}). Archive is recommended; import only if the event log must remain replayable.`
        : "Legacy Synth installation detected (unreadable or missing manifest). Archive is recommended."
    }
  } else if (artifacts.some((a) => a.kind === "synth-backup" || a.kind === "synth-archive")) {
    stateKind = "legacy"
    recommendedPath = "import"
    reason = "Archived Synth state detected; import can replay the legacy event log."
  } else if (ungovernedLog) {
    stateKind = "ungoverned"
    recommendedPath = "archive"
    reason = "Ungoverned event log detected; archive it and bootstrap a fresh project."
  }

  if (stateKind === "legacy" && !mainSynthArtifact && !ungovernedLog) {
    // Only backups/archives remain; prefer import but warn if manifest is missing.
    const hasManifest = artifacts.some((a) => a.kind === "synth-backup" || a.kind === "synth-archive")
    if (!hasManifest) {
      warnings.push("No manifest found in archived state; import may be lossy.")
    }
  }

  return {
    legacyStateDetected: stateKind !== "none" && stateKind !== "initialized-v2",
    stateKind,
    artifacts,
    recommendedPath,
    reason,
    warnings,
  }
}
