// ============================================================
// ENVIRONMENT: Node.js Observation Context
// ============================================================
// This module adapts Node.js APIs to the environment-agnostic
// ObservationContext interface. It is part of the Environment
// Layer and is the only module in this directory that depends
// directly on Node.js APIs.
//
// The Core must never import this module directly. It should
// receive an ObservationContext produced by the Environment
// Layer or by test fixtures.
// ============================================================

import { readFile as nodeReadFile, readdir, access, constants } from "node:fs/promises"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { platform, release } from "node:os"
import { resolve, join } from "node:path"
import type { ObservationContext } from "./types.js"

const execFileAsync = promisify(execFile)

async function safeReadFile(path: string): Promise<string | undefined> {
  try {
    const content = await nodeReadFile(path, "utf-8")
    return content
  } catch {
    return undefined
  }
}

async function safeListDirectory(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path)
    return entries
  } catch {
    return []
  }
}

async function safePathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

async function safeExecTool(command: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      timeout: 5000,
      windowsHide: true,
    })
    return stdout
  } catch {
    return undefined
  }
}

function readEnv(name: string): string | undefined {
  return process.env[name]
}

/** Create an ObservationContext backed by the local Node.js runtime */
export function createNodeObservationContext(basePath?: string): ObservationContext {
  const root = basePath ? resolve(basePath) : process.cwd()
  return {
    readFile: async (path: string) => safeReadFile(join(root, path)),
    listDirectory: async (path: string) => safeListDirectory(join(root, path)),
    pathExists: async (path: string) => safePathExists(join(root, path)),
    readEnv,
    execTool: safeExecTool,
    cwd: root,
  }
}

/** Environment metadata captured from the Node.js process */
export function getNodeEnvironmentMetadata(): { platform: string; platformVersion: string } {
  return {
    platform: platform(),
    platformVersion: release(),
  }
}
