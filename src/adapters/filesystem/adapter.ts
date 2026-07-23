// ============================================================
// ADAPTER: Filesystem — Evidence Adapter
// ============================================================
// Reads arbitrary local directories and files and emits canonical
// Observations for Mission Studio.
//
// This adapter does not connect to an external system and does not
// require Git. It is read-only and never mutates runtime state.
// ============================================================

import fs from "fs"
import path from "path"
import { shortHash } from "../../sdk/hashing/index.js"
import type {
  AdapterState,
  AdapterHealth,
  AdapterHealthState,
  Observation,
  ObservationBatch,
  ObservationCategory,
  ObservationConfidence,
} from "../../types/index.js"
import type { FilesystemAdapter, FilesystemConfig } from "./types.js"

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".adr",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".sql",
  ".xml",
  ".csv",
  ".tsv",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
])

export class FilesystemAdapterImpl implements FilesystemAdapter {
  readonly metadata = {
    name: "filesystem",
    version: "1.0.0",
    kind: "filesystem" as const,
    category: "integration" as const,
    description: "Filesystem evidence adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: FilesystemConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }

  get state(): AdapterState {
    return this._state
  }

  get health(): AdapterHealth {
    return this._health
  }

  private setHealth(state: AdapterHealthState, message: string, diagnostics?: Record<string, unknown>): void {
    this._health = { state, message, diagnostics }
  }

  private transition(
    transition: string,
    success: boolean,
    state: AdapterState,
    message: string,
  ): AdapterState {
    if (success) this._state = state
    else this._state = "error"
    return this._state
  }

  private rootDirectory(): string {
    return this._config?.rootDirectory || process.cwd()
  }

  private maxSnippetLength(): number {
    return this._config?.maxSnippetLength ?? 500
  }

  private includeHidden(): boolean {
    return this._config?.includeHidden ?? false
  }

  private listFiles(): string[] {
    if (this._config?.files) {
      return this._config.files.filter((f) => fs.existsSync(f))
    }
    const dir = this.rootDirectory()
    if (!fs.existsSync(dir)) return []
    return this.walk(dir)
  }

  private walk(dir: string): string[] {
    const results: string[] = []
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!this.includeHidden() && entry.name.startsWith(".")) continue
      if (["node_modules", ".git", "dist", "build", ".synth", "coverage"].includes(entry.name)) continue

      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...this.walk(fullPath))
      } else if (entry.isFile()) {
        results.push(fullPath)
      }
    }
    return results
  }

  private isText(filePath: string): boolean {
    return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())
  }

  private readText(filePath: string): string | undefined {
    try {
      return fs.readFileSync(filePath, "utf-8")
    } catch {
      return undefined
    }
  }

  private snippet(text: string): string {
    const cleaned = text.replace(/\s+/g, " ").trim()
    if (cleaned.length <= this.maxSnippetLength()) return cleaned
    return cleaned.slice(0, this.maxSnippetLength()) + "..."
  }

  private hash(input: string): string {
    return shortHash(input)
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as FilesystemConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Filesystem adapter not configured")
      return this.transition("validate", false, "error", "Adapter not configured")
    }
    const dir = this.rootDirectory()
    const hasFiles = this._config.files || fs.existsSync(dir)
    if (!hasFiles) {
      this.setHealth("unhealthy", "Filesystem root directory or files not found")
      return this.transition("validate", false, "error", "No filesystem source available")
    }
    this.setHealth("unknown", "Adapter validated, awaiting enablement")
    return this.transition("validate", true, "validated", "Adapter validated")
  }

  async enable(): Promise<AdapterState> {
    if (this._state === "disabled" || this._state === "discovered") {
      if (!this._config) {
        await this.configure({ rootDirectory: process.cwd(), maxSnippetLength: 500, includeHidden: false })
      }
    }
    this.setHealth("unknown", "Adapter enabled, awaiting health check")
    return this.transition("enable", true, "enabled", "Adapter enabled")
  }

  async disable(): Promise<AdapterState> {
    this.setHealth("disabled", "Adapter disabled")
    return this.transition("disable", true, "disabled", "Adapter disabled")
  }

  async healthCheck(): Promise<AdapterState> {
    const healthy = this._state !== "error"
    const message = healthy ? "Filesystem adapter is healthy" : "Filesystem adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async observe(): Promise<ObservationBatch> {
    const observations: Observation[] = []
    const errors: string[] = []
    const timestamp = Date.now()

    const files = this.listFiles()
    for (const filePath of files) {
      const relativePath = path.relative(process.cwd(), filePath)
      const stat = fs.statSync(filePath)

      if (this.isText(filePath)) {
        const content = this.readText(filePath)
        if (content === undefined) {
          errors.push(`Failed to read ${relativePath}`)
          continue
        }
        observations.push({
          id: `obs-filesystem-${this.hash(relativePath)}`,
          source: { adapter: "filesystem", locator: relativePath },
          category: "evidence" as ObservationCategory,
          subject: path.basename(filePath),
          evidence: [
            {
              description: "Filesystem text file content",
              snippet: this.snippet(content),
              fingerprint: this.hash(content),
            },
          ],
          confidence: "high" as ObservationConfidence,
          timestamp: stat.mtimeMs,
          metadata: { path: relativePath, size: stat.size, kind: "text" },
        })
      } else {
        observations.push({
          id: `obs-filesystem-${this.hash(relativePath)}`,
          source: { adapter: "filesystem", locator: relativePath },
          category: "evidence" as ObservationCategory,
          subject: path.basename(filePath),
          evidence: [
            {
              description: "Filesystem binary or non-text file detected",
              fingerprint: this.hash(relativePath),
            },
          ],
          confidence: "unknown" as ObservationConfidence,
          timestamp: stat.mtimeMs,
          metadata: { path: relativePath, size: stat.size, kind: "binary" },
        })
      }
    }

    return { observations, errors }
  }
}

export function createFilesystemAdapter(): FilesystemAdapterImpl {
  return new FilesystemAdapterImpl()
}
