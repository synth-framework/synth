// ============================================================
// SDK: Filesystem Primitives
// ============================================================
// Canonical, stateless filesystem operations. This module owns every
// direct Node.js fs interaction that is not already wrapped by a kernel
// store. Kernel stores may delegate here, but they retain authority over
// their own files.
// ============================================================

import {
  readFile as nodeReadFile,
  writeFile as nodeWriteFile,
  appendFile as nodeAppendFile,
  readdir as nodeReaddir,
  access as nodeAccess,
  mkdir as nodeMkdir,
  rm as nodeRm,
  stat as nodeStat,
  constants as fsConstants,
} from "node:fs/promises"
import {
  readFileSync as nodeReadFileSync,
  existsSync as nodeExistsSync,
  mkdirSync as nodeMkdirSync,
} from "node:fs"
import path from "node:path"

// ---- Async primitives ------------------------------------------------

export async function readFile(filePath: string): Promise<string> {
  return await nodeReadFile(filePath, "utf-8")
}

export async function readFileMaybe(filePath: string): Promise<string | undefined> {
  try {
    return await nodeReadFile(filePath, "utf-8")
  } catch {
    return undefined
  }
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await nodeMkdir(path.dirname(filePath), { recursive: true })
  await nodeWriteFile(filePath, content, "utf-8")
}

export async function appendFile(filePath: string, content: string): Promise<void> {
  await nodeMkdir(path.dirname(filePath), { recursive: true })
  await nodeAppendFile(filePath, content, "utf-8")
}

export async function ensureDirectory(dirPath: string): Promise<void> {
  await nodeMkdir(dirPath, { recursive: true })
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await nodeAccess(filePath, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const info = await nodeStat(filePath)
    return info.isDirectory()
  } catch {
    return false
  }
}

export async function listDirectory(dirPath: string): Promise<string[]> {
  try {
    return await nodeReaddir(dirPath)
  } catch {
    return []
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await nodeRm(filePath)
  } catch {
    // ignore missing files
  }
}

// ---- Sync primitives -------------------------------------------------

export function readFileSync(filePath: string): string {
  return nodeReadFileSync(filePath, "utf-8")
}

export function readFileMaybeSync(filePath: string): string | undefined {
  try {
    return nodeReadFileSync(filePath, "utf-8")
  } catch {
    return undefined
  }
}

export function existsSync(filePath: string): boolean {
  return nodeExistsSync(filePath)
}

export function ensureDirectorySync(dirPath: string): void {
  nodeMkdirSync(dirPath, { recursive: true })
}
