// ============================================================
// SDK: Process Execution
// ============================================================
// Canonical subprocess primitives with deterministic result shapes.
// Replaces scattered `execSync`, `spawnSync`, and `spawn` usage.
// ============================================================

import {
  execSync as nodeExecSync,
  spawn as nodeSpawn,
  spawnSync as nodeSpawnSync,
} from "node:child_process"

export interface ProcessResult {
  status: number | null
  stdout: string
  stderr: string
}

export interface ProcessOptions {
  cwd?: string
  timeout?: number
  env?: NodeJS.ProcessEnv
  stdio?: any
}

export function execSync(command: string, options?: ProcessOptions): string {
  return nodeExecSync(command, { encoding: "utf-8", ...options })
}

export function spawnSync(command: string, args: string[] = [], options?: ProcessOptions): ProcessResult {
  const result = nodeSpawnSync(command, args, { encoding: "utf-8", ...options })
  return {
    status: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  }
}

export function spawn(command: string, args: string[] = [], options?: ProcessOptions): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = nodeSpawn(command, args, options)
    let stdout = ""
    let stderr = ""

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8")
    })
    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8")
    })

    child.on("error", (err) => reject(err))
    child.on("close", (status) => resolve({ status: status ?? 0, stdout, stderr }))
  })
}
