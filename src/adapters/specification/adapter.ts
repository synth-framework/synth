// ============================================================
// ADAPTER: Specification — Evidence Adapter
// ============================================================
// Reads machine-readable specifications (OpenAPI, AsyncAPI,
// GraphQL, Protocol Buffers, JSON Schema) and emits canonical
// Observations for Mission Studio.
//
// This adapter is read-only and never mutates runtime state.
// ============================================================

import fs from "fs"
import path from "path"
import { shortHash } from "../../sdk/hashing/index.js"
import { load as loadYaml } from "js-yaml"
import type {
  AdapterState,
  AdapterHealth,
  AdapterHealthState,
  Observation,
  ObservationBatch,
  ObservationCategory,
  ObservationConfidence,
} from "../../types/index.js"
import type { SpecificationAdapter, SpecificationConfig, SpecificationFormat } from "./types.js"

export class SpecificationAdapterImpl implements SpecificationAdapter {
  readonly metadata = {
    name: "specification",
    version: "1.0.0",
    kind: "specification" as const,
    category: "integration" as const,
    description: "Specification evidence adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: SpecificationConfig
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

  private specificationsDirectory(): string {
    return this._config?.specificationsDirectory || path.join(process.cwd(), "specs")
  }

  private maxSnippetLength(): number {
    return this._config?.maxSnippetLength ?? 500
  }

  private listFiles(): string[] {
    if (this._config?.files) {
      return this._config.files.filter((f) => fs.existsSync(f))
    }
    const dir = this.specificationsDirectory()
    if (!fs.existsSync(dir)) return []
    return this.walk(dir)
  }

  private walk(dir: string): string[] {
    const results: string[] = []
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        results.push(...this.walk(fullPath))
      } else if (entry.isFile()) {
        results.push(fullPath)
      }
    }
    return results
  }

  private detectFormat(filePath: string): SpecificationFormat {
    const base = path.basename(filePath).toLowerCase()
    const ext = path.extname(filePath).toLowerCase()
    if (base.includes("openapi")) return "openapi"
    if (base.includes("asyncapi")) return "asyncapi"
    if (base.endsWith(".schema.json") || base.endsWith(".schema")) return "jsonschema"
    if (ext === ".graphql" || ext === ".gql") return "graphql"
    if (ext === ".proto") return "protobuf"
    if (ext === ".json" || ext === ".yaml" || ext === ".yml") return "unknown"
    return "unknown"
  }

  private readText(filePath: string): string | undefined {
    try {
      return fs.readFileSync(filePath, "utf-8")
    } catch {
      return undefined
    }
  }

  private parse(filePath: string, text: string): unknown {
    const ext = path.extname(filePath).toLowerCase()
    if (ext === ".json") return JSON.parse(text)
    if (ext === ".yaml" || ext === ".yml") return loadYaml(text)
    return text
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
    this._config = config as SpecificationConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Specification adapter not configured")
      return this.transition("validate", false, "error", "Adapter not configured")
    }
    const dir = this.specificationsDirectory()
    const hasFiles = this._config.files || fs.existsSync(dir)
    if (!hasFiles) {
      this.setHealth("unhealthy", "Specification directory or files not found")
      return this.transition("validate", false, "error", "No specification source available")
    }
    this.setHealth("unknown", "Adapter validated, awaiting enablement")
    return this.transition("validate", true, "validated", "Adapter validated")
  }

  async enable(): Promise<AdapterState> {
    if (this._state === "disabled" || this._state === "discovered") {
      if (!this._config) {
        await this.configure({ specificationsDirectory: path.join(process.cwd(), "specs"), maxSnippetLength: 500 })
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
    const message = healthy ? "Specification adapter is healthy" : "Specification adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async observe(): Promise<ObservationBatch> {
    const observations: Observation[] = []
    const errors: string[] = []
    const timestamp = Date.now()

    const files = this.listFiles()
    for (const filePath of files) {
      const format = this.detectFormat(filePath)
      const relativePath = path.relative(process.cwd(), filePath)
      const stat = fs.statSync(filePath)
      const text = this.readText(filePath)

      if (text === undefined) {
        errors.push(`Failed to read ${relativePath}`)
        continue
      }

      const baseObservation = {
        source: { adapter: "specification", locator: relativePath },
        timestamp: stat.mtimeMs,
        metadata: { format, path: relativePath, size: stat.size },
      }

      let parsed: unknown = undefined
      let parseError: string | undefined
      try {
        parsed = this.parse(filePath, text)
      } catch (err: any) {
        parseError = err.message
      }

      // Document-level evidence observation
      const version = this.extractVersion(parsed, format)
      observations.push({
        id: `obs-spec-doc-${this.hash(relativePath)}`,
        ...baseObservation,
        category: "evidence" as ObservationCategory,
        subject: path.basename(filePath),
        evidence: [
          {
            description: `${format} specification detected`,
            snippet: parseError ? undefined : this.snippet(text),
            fingerprint: this.hash(text),
          },
        ],
        confidence: parseError ? ("low" as ObservationConfidence) : ("high" as ObservationConfidence),
        metadata: { ...baseObservation.metadata, version, parseError },
      })

      if (parseError) {
        errors.push(`Failed to parse ${relativePath}: ${parseError}`)
        continue
      }

      // Capability observations
      const capabilities = this.extractCapabilities(parsed, format)
      for (const cap of capabilities) {
        observations.push({
          id: `obs-spec-cap-${this.hash(cap.identifier)}`,
          ...baseObservation,
          category: "capability" as ObservationCategory,
          subject: cap.name,
          evidence: [
            {
              description: `Capability declared in ${format} specification`,
              snippet: cap.identifier,
              fingerprint: this.hash(cap.identifier),
            },
          ],
          confidence: "high" as ObservationConfidence,
          metadata: { ...baseObservation.metadata, ...cap.metadata },
        })
      }
    }

    return { observations, errors }
  }

  private extractVersion(parsed: unknown, format: SpecificationFormat): string | undefined {
    if (typeof parsed !== "object" || parsed === null) return undefined
    const record = parsed as Record<string, unknown>
    if (format === "openapi" || format === "asyncapi") {
      return typeof record.openapi === "string" ? record.openapi
        : typeof record.asyncapi === "string" ? record.asyncapi
        : typeof record.swagger === "string" ? record.swagger
        : undefined
    }
    return undefined
  }

  private extractCapabilities(
    parsed: unknown,
    format: SpecificationFormat,
  ): Array<{ identifier: string; name: string; metadata: Record<string, unknown> }> {
    const caps: Array<{ identifier: string; name: string; metadata: Record<string, unknown> }> = []

    if (format === "openapi") {
      const doc = parsed as Record<string, any>
      const paths = doc.paths || {}
      for (const [route, methods] of Object.entries(paths)) {
        if (typeof methods !== "object" || methods === null) continue
        for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
          if (typeof operation !== "object" || operation === null) continue
          const operationId = operation.operationId || `${method.toUpperCase()} ${route}`
          caps.push({
            identifier: `${route}#${method}`,
            name: operationId,
            metadata: { method: method.toUpperCase(), path: route, operationId },
          })
        }
      }
    }

    if (format === "asyncapi") {
      const doc = parsed as Record<string, any>
      const channels = doc.channels || {}
      for (const [channelName, channel] of Object.entries(channels)) {
        if (typeof channel !== "object" || channel === null) continue
        const operations = (channel as Record<string, any>).operations || {}
        for (const [opName, op] of Object.entries(operations)) {
          if (typeof op !== "object" || op === null) continue
          caps.push({
            identifier: `${channelName}::${opName}`,
            name: opName,
            metadata: { channel: channelName, operation: opName },
          })
        }
      }
    }

    if (format === "graphql") {
      const text = String(parsed)
      const typeRegex = /type\s+(\w+)\s*\{([^}]*)\}/g
      let match: RegExpExecArray | null
      while ((match = typeRegex.exec(text)) !== null) {
        const typeName = match[1]
        const body = match[2]
        const fieldRegex = /(\w+)\s*(?:\([^)]*\))?\s*:/g
        let fieldMatch: RegExpExecArray | null
        while ((fieldMatch = fieldRegex.exec(body)) !== null) {
          caps.push({
            identifier: `${typeName}.${fieldMatch[1]}`,
            name: `${typeName}.${fieldMatch[1]}`,
            metadata: { type: typeName, field: fieldMatch[1] },
          })
        }
      }
    }

    if (format === "protobuf") {
      const text = String(parsed)
      const serviceRegex = /service\s+(\w+)\s*\{([^}]*)\}/g
      let match: RegExpExecArray | null
      while ((match = serviceRegex.exec(text)) !== null) {
        const serviceName = match[1]
        const body = match[2]
        const rpcRegex = /rpc\s+(\w+)\s*\(/g
        let rpcMatch: RegExpExecArray | null
        while ((rpcMatch = rpcRegex.exec(body)) !== null) {
          caps.push({
            identifier: `${serviceName}.${rpcMatch[1]}`,
            name: `${serviceName}.${rpcMatch[1]}`,
            metadata: { service: serviceName, rpc: rpcMatch[1] },
          })
        }
      }
    }

    return caps
  }
}

export function createSpecificationAdapter(): SpecificationAdapterImpl {
  return new SpecificationAdapterImpl()
}
