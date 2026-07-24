// ============================================================
// ADAPTER: Document — Evidence Adapter
// ============================================================
// Reads local documents (Markdown, plain text, ADRs) and emits
// canonical Observations for Mission Studio.
//
// This adapter does not connect to an external system.
// It is read-only. It never mutates runtime state.
//
// PDF and DOCX are currently treated as evidence placeholders:
// the adapter reports their existence but does not parse binary
// content, avoiding heavy external dependencies.
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
import type { DocumentAdapter, DocumentConfig, DocumentFormat } from "./types.js"

export class DocumentAdapterImpl implements DocumentAdapter {
  readonly metadata = {
    name: "document",
    version: "1.0.0",
    kind: "document" as const,
    category: "integration" as const,
    description: "Document evidence adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: DocumentConfig
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

  private documentsDirectory(): string {
    return this._config?.documentsDirectory || path.join(process.cwd(), "docs")
  }

  private maxSnippetLength(): number {
    return this._config?.maxSnippetLength ?? 500
  }

  private listFiles(): string[] {
    if (this._config?.files) {
      return this._config.files.filter((f) => fs.existsSync(f))
    }
    const dir = this.documentsDirectory()
    if (!fs.existsSync(dir)) return []
    return this.walk(dir)
  }

  private walk(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    const files: string[] = []
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...this.walk(fullPath))
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }
    return files
  }

  private detectFormat(filePath: string): DocumentFormat {
    const ext = path.extname(filePath).toLowerCase()
    switch (ext) {
      case ".md":
        return "markdown"
      case ".txt":
        return "text"
      case ".adr":
        return "adr"
      case ".pdf":
        return "pdf"
      case ".docx":
        return "docx"
      default:
        return "unknown"
    }
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
    this._config = config as DocumentConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Document adapter not configured")
      return this.transition("validate", false, "error", "Adapter not configured")
    }
    const dir = this.documentsDirectory()
    const hasFiles = this._config.files || fs.existsSync(dir)
    if (!hasFiles) {
      this.setHealth("unhealthy", "Document directory or files not found")
      return this.transition("validate", false, "error", "No document source available")
    }
    this.setHealth("unknown", "Adapter validated, awaiting enablement")
    return this.transition("validate", true, "validated", "Adapter validated")
  }

  async enable(): Promise<AdapterState> {
    if (this._state === "disabled" || this._state === "discovered") {
      if (!this._config) {
        await this.configure({ documentsDirectory: path.join(process.cwd(), "docs"), maxSnippetLength: 500 })
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
    const message = healthy ? "Document adapter is healthy" : "Document adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async observe(): Promise<ObservationBatch> {
    const observations: Observation[] = []
    const errors: string[] = []

    const files = this.listFiles()
    for (const filePath of files) {
      const format = this.detectFormat(filePath)
      const relativePath = path.relative(process.cwd(), filePath)

      if (format === "markdown" || format === "text" || format === "adr") {
        const content = this.readText(filePath)
        if (content === undefined) {
          errors.push(`Failed to read ${relativePath}`)
          continue
        }
        const stat = fs.statSync(filePath)
        observations.push({
          id: `obs-document-${this.hash(relativePath)}`,
          source: { adapter: "document", locator: relativePath },
          category: "evidence" as ObservationCategory,
          subject: path.basename(filePath),
          evidence: [
            {
              description: `${format} document content`,
              snippet: this.snippet(content),
              fingerprint: this.hash(content),
            },
          ],
          confidence: "high" as ObservationConfidence,
          timestamp: stat.mtimeMs,
          metadata: { format, size: stat.size, path: relativePath },
        })
      } else if (format === "pdf" || format === "docx") {
        const stat = fs.statSync(filePath)
        observations.push({
          id: `obs-document-${this.hash(relativePath)}`,
          source: { adapter: "document", locator: relativePath },
          category: "evidence" as ObservationCategory,
          subject: path.basename(filePath),
          evidence: [
            {
              description: `${format} document detected; binary parsing not implemented`,
              fingerprint: this.hash(relativePath),
            },
          ],
          confidence: "unknown" as ObservationConfidence,
          timestamp: stat.mtimeMs,
          metadata: { format, size: stat.size, path: relativePath },
        })
      }
      // Unknown formats are silently ignored
    }

    return { observations, errors }
  }

}

export function createDocumentAdapter(): DocumentAdapterImpl {
  return new DocumentAdapterImpl()
}
