// ============================================================
// SDK: Manifest
// ============================================================
// Canonical manifest access. Reading and writing the SYNTH manifest
// flows through here; path ownership remains with `sdk.paths`.
// ============================================================

import { manifestPath, hasManifest } from "../paths/index.js"
import { readJson, readJsonMaybe, writeJson } from "../json/index.js"

export async function readManifest<T = Record<string, unknown>>(root: string): Promise<T> {
  return readJson<T>(manifestPath(root))
}

export async function readManifestMaybe<T = Record<string, unknown>>(root: string): Promise<T | undefined> {
  return readJsonMaybe<T>(manifestPath(root))
}

export async function writeManifest(root: string, manifest: unknown): Promise<void> {
  return writeJson(manifestPath(root), manifest)
}

export function manifestExists(root: string): boolean {
  return hasManifest(root)
}
