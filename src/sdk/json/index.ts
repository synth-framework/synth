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
