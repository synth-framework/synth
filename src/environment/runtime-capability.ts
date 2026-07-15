// ============================================================
// ENVIRONMENT: Runtime & Package Capability
// ============================================================
// Runtime and Package capability provider interfaces and
// Node.js / npm reference implementations. These providers
// compose the Tool capability (ADR-011); they never touch
// child_process directly. The Core must never invoke node,
// npm, or other runtime/package executables directly.
// ============================================================

import type { ProcessResult, ToolProvider } from "./process-capability.js"
import { LocalShellProvider } from "./process-capability.js"

/** Detected runtime information */
export interface RuntimeInfo {
  readonly name: string
  readonly version?: string
  readonly path?: string
}

/** Runtime capability provider interface */
export interface RuntimeProvider {
  readonly name: string
  readonly version: string
  detectRuntime(runtime: string): Promise<RuntimeInfo | undefined>
  listRuntimes(runtimes?: string[]): Promise<RuntimeInfo[]>
}

/** Package operation request */
export interface PackageRequest {
  readonly packages: string[]
  readonly cwd?: string
  readonly timeoutMs?: number
}

/** Installed package information */
export interface PackageInfo {
  readonly name: string
  readonly version: string
}

/** Package capability provider interface */
export interface PackageProvider {
  readonly name: string
  readonly version: string
  install(request: PackageRequest): Promise<ProcessResult>
  remove(request: PackageRequest): Promise<ProcessResult>
  listInstalled(cwd?: string): Promise<PackageInfo[]>
}

/**
 * Runtime provider that detects runtimes through the Tool
 * capability: locate the executable, then query `--version`.
 */
export class NodeRuntimeProvider implements RuntimeProvider {
  readonly name = "node-runtime"
  readonly version = "1.0.0"
  private readonly tools: ToolProvider

  constructor(tools: ToolProvider = new LocalShellProvider()) {
    this.tools = tools
  }

  async detectRuntime(runtime: string): Promise<RuntimeInfo | undefined> {
    const path = await this.tools.locate(runtime)
    if (!path) return undefined
    const result = await this.tools.runTool(runtime, ["--version"], { timeoutMs: 10000 })
    if (result.exitCode !== 0) return { name: runtime, path }
    return { name: runtime, version: result.stdout.trim(), path }
  }

  async listRuntimes(runtimes: string[] = ["node", "npm"]): Promise<RuntimeInfo[]> {
    const found: RuntimeInfo[] = []
    for (const runtime of runtimes) {
      const info = await this.detectRuntime(runtime)
      if (info) found.push(info)
    }
    return found
  }
}

/** npm package provider implemented through the Tool capability */
export class NpmPackageProvider implements PackageProvider {
  readonly name = "npm-package"
  readonly version = "1.0.0"
  private readonly tools: ToolProvider

  constructor(tools: ToolProvider = new LocalShellProvider()) {
    this.tools = tools
  }

  install(request: PackageRequest): Promise<ProcessResult> {
    return this.tools.runTool("npm", ["install", ...request.packages], {
      cwd: request.cwd,
      timeoutMs: request.timeoutMs ?? 120000,
    })
  }

  remove(request: PackageRequest): Promise<ProcessResult> {
    return this.tools.runTool("npm", ["uninstall", ...request.packages], {
      cwd: request.cwd,
      timeoutMs: request.timeoutMs ?? 120000,
    })
  }

  async listInstalled(cwd?: string): Promise<PackageInfo[]> {
    const result = await this.tools.runTool("npm", ["ls", "--depth=0", "--json"], {
      cwd,
      timeoutMs: 30000,
    })
    try {
      const parsed = JSON.parse(result.stdout) as {
        dependencies?: Record<string, { version?: string }>
      }
      const dependencies = parsed.dependencies ?? {}
      return Object.entries(dependencies).map(([name, info]) => ({
        name,
        version: info.version ?? "unknown",
      }))
    } catch {
      return []
    }
  }
}

export function createNodeRuntimeProvider(tools?: ToolProvider): RuntimeProvider {
  return new NodeRuntimeProvider(tools)
}

export function createNpmPackageProvider(tools?: ToolProvider): PackageProvider {
  return new NpmPackageProvider(tools)
}
