// ============================================================
// ENVIRONMENT: Process & Tool Capability
// ============================================================
// Process and Tool capability provider interfaces and local
// machine reference implementation. The Core must never import
// child_process directly; all process and tool execution flows
// through these capabilities.
// ============================================================

import { spawn } from "node:child_process"
import { access } from "node:fs/promises"
import { constants } from "node:fs"
import { delimiter, join } from "node:path"

/** Process execution request */
export interface ProcessRequest {
  readonly command: string
  readonly args?: string[]
  readonly cwd?: string
  readonly env?: Record<string, string>
  readonly stdin?: string
  readonly timeoutMs?: number
}

/** Process execution result. Failures are data, never exceptions. */
export interface ProcessResult {
  readonly command: string
  readonly args: string[]
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
  readonly durationMs: number
  readonly timedOut: boolean
}

/** Process capability provider interface */
export interface ProcessProvider {
  readonly name: string
  readonly version: string
  run(request: ProcessRequest): Promise<ProcessResult>
}

/** Options for tool execution */
export interface ToolRunOptions {
  readonly cwd?: string
  readonly env?: Record<string, string>
  readonly stdin?: string
  readonly timeoutMs?: number
}

/** Tool capability provider interface */
export interface ToolProvider {
  readonly name: string
  readonly version: string
  isAvailable(tool: string): Promise<boolean>
  locate(tool: string): Promise<string | undefined>
  runTool(tool: string, args?: string[], options?: ToolRunOptions): Promise<ProcessResult>
}

/**
 * Local shell provider using Node.js child_process.spawn.
 * Executes commands with explicit argument arrays and no shell
 * interpolation. Satisfies both Process and Tool capabilities.
 */
export class LocalShellProvider implements ProcessProvider, ToolProvider {
  readonly name = "local-shell"
  readonly version = "1.0.0"

  run(request: ProcessRequest): Promise<ProcessResult> {
    const args = request.args ?? []
    const started = Date.now()
    return new Promise((resolvePromise) => {
      let stdout = ""
      let stderr = ""
      let timedOut = false
      let settled = false

      const child = spawn(request.command, args, {
        cwd: request.cwd,
        env: request.env ? { ...process.env, ...request.env } : process.env,
        stdio: [request.stdin !== undefined ? "pipe" : "ignore", "pipe", "pipe"],
      })

      let timer: ReturnType<typeof setTimeout> | undefined
      if (request.timeoutMs && request.timeoutMs > 0) {
        timer = setTimeout(() => {
          timedOut = true
          child.kill("SIGKILL")
        }, request.timeoutMs)
      }

      const finish = (exitCode: number, extraStderr = ""): void => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        resolvePromise({
          command: request.command,
          args,
          exitCode,
          stdout,
          stderr: stderr + extraStderr,
          durationMs: Date.now() - started,
          timedOut,
        })
      }

      child.stdout?.on("data", (chunk) => { stdout += chunk.toString() })
      child.stderr?.on("data", (chunk) => { stderr += chunk.toString() })
      child.on("error", (err) => finish(-1, String(err)))
      child.on("close", (code) => finish(code ?? -1))

      if (request.stdin !== undefined && child.stdin) {
        // Write stdin payload and close the stream in one call.
        child.stdin.end(request.stdin)
      }
    })
  }

  async isAvailable(tool: string): Promise<boolean> {
    return (await this.locate(tool)) !== undefined
  }

  async locate(tool: string): Promise<string | undefined> {
    const pathEnv = process.env.PATH ?? ""
    const extensions = process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
      : [""]
    for (const dir of pathEnv.split(delimiter)) {
      if (!dir) continue
      for (const ext of extensions) {
        const candidate = join(dir, tool + ext)
        try {
          await access(candidate, constants.X_OK)
          return candidate
        } catch {
          // keep searching
        }
      }
    }
    return undefined
  }

  runTool(tool: string, args: string[] = [], options?: ToolRunOptions): Promise<ProcessResult> {
    return this.run({ command: tool, args, ...options })
  }
}

export function createLocalShellProvider(): LocalShellProvider {
  return new LocalShellProvider()
}
