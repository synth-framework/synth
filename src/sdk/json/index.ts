// ============================================================
// SDK: JSON Serialization
// ============================================================
// Canonical JSON read/write primitives. Replaces the scattered
// `JSON.parse(await fs.readFile(...))` and `JSON.stringify(..., null, 2)`
// patterns across the codebase.
// ============================================================

import { readFileMaybe, writeFile } from "../files/index.js"

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFileMaybe(filePath)
  if (raw === undefined) {
    throw new Error(`JSON file not found: ${filePath}`)
  }
  return JSON.parse(raw) as T
}

export async function readJsonMaybe<T>(filePath: string): Promise<T | undefined> {
  const raw = await readFileMaybe(filePath)
  if (raw === undefined) {
    return undefined
  }
  return JSON.parse(raw) as T
}

export async function writeJson(filePath: string, data: unknown, space = 2): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, space))
}

export async function writeJsonNewline(filePath: string, data: unknown, space = 2): Promise<void> {
  await writeFile(filePath, JSON.stringify(data, null, space) + "\n")
}

export function parseJson<T>(raw: string): T {
  return JSON.parse(raw) as T
}

export function stringifyJson(data: unknown, space = 2): string {
  return JSON.stringify(data, null, space)
}

/** Recursively sort object keys for stable, deterministic serialization. */
export function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((obj as Record<string, unknown>)[key])
  }
  return sorted
}

/** Stable JSON stringify: sorted keys, no extra whitespace. */
export function stableStringify(obj: unknown): string {
  return JSON.stringify(sortKeys(obj))
}
