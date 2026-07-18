// ============================================================
// INFRA: Runtime Data Directory Migration
// ============================================================
// One-time, lossless migration of legacy repo-root `data/` into
// `.synth/data/` for governed projects (EXP-ENV-013).
//
// The event log is the durable authority; migration happens before any
// replay so the canonical state can always be reconstructed from the
// moved log.
// ============================================================

import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"
import { getManifestPath, getRuntimeDataDir, getLegacyDataDir, hasManifest } from "./paths.js"

const MIGRATION_MARKER = ".synth-data-migrated-v1"

const MIGRATED_ENTRIES = [
  "event-log.jsonl",
  "canonical-state.json",
  "checkpoints.json",
  "decisions.jsonl",
  "drafts",
  "snapshots",
  "event-stream",
]

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function sha256File(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  return createHash("sha256").update(buffer).digest("hex")
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    const stat = await fs.stat(target)
    return stat.isDirectory()
  } catch {
    return false
  }
}

/**
 * Ensure the runtime data directory exists and return its absolute path.
 *
 * - If `.synth/data/` already exists, return it.
 * - If `.synth/manifest.json` exists but `.synth/data/` does not and a
 *   legacy `data/` exists, atomically move the recognized runtime entries
 *   into `.synth/data/`, write a migration marker, and update the manifest
 *   `layout.data` field.
 * - If a manifest exists but neither directory exists, create `.synth/data/`.
 * - If no manifest exists, return the legacy `data/` path without creating
 *   `.synth/`.
 */
export async function ensureRuntimeDataDir(cwd: string): Promise<string> {
  const manifestPath = getManifestPath(cwd)
  const runtimeDir = getRuntimeDataDir(cwd)
  const legacyDir = getLegacyDataDir(cwd)
  const hasManifestFile = hasManifest(cwd)

  // Already migrated or created by a recent command.
  if (await pathExists(runtimeDir)) {
    return runtimeDir
  }

  // No project manifest: stay on the legacy path. This keeps the SYNTH
  // source repository and other ungoverned trees working without `.synth/`.
  if (!hasManifestFile) {
    return legacyDir
  }

  // Manifest exists but no runtime directory yet. Create it.
  await fs.mkdir(runtimeDir, { recursive: true })

  // Migrate legacy runtime data if present.
  if (await pathExists(legacyDir)) {
    for (const entry of MIGRATED_ENTRIES) {
      const source = path.join(legacyDir, entry)
      if (!(await pathExists(source))) continue
      const dest = path.join(runtimeDir, entry)

      // Verify byte-level integrity for the canonical event log.
      if (entry === "event-log.jsonl") {
        const beforeHash = await sha256File(source)
        await fs.rename(source, dest)
        const afterHash = await sha256File(dest)
        if (beforeHash !== afterHash) {
          throw new Error(
            `Migration integrity check failed for event-log.jsonl: hash changed during move (${beforeHash} -> ${afterHash})`
          )
        }
        continue
      }

      await fs.rename(source, dest)
    }

    // Preserve discovery evidence if present (optional runtime artifact).
    const discoverySource = path.join(legacyDir, "discovery-evidence.json")
    const discoveryDest = path.join(runtimeDir, "discovery-evidence.json")
    if (await pathExists(discoverySource)) {
      await fs.rename(discoverySource, discoveryDest)
    }

    await fs.writeFile(path.join(runtimeDir, MIGRATION_MARKER), "", "utf-8")

    // Update manifest layout.data to reflect the new runtime location.
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
      if (manifest.layout && typeof manifest.layout === "object") {
        manifest.layout.data = ".synth/data/"
      } else {
        manifest.layout = { data: ".synth/data/" }
      }
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8")
    } catch {
      // Manifest update is best-effort; the runtime directory is already
      // authoritative regardless of what the manifest says.
    }
  }

  return runtimeDir
}
