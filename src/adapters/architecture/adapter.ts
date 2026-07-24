// ============================================================
// ADAPTER: Architecture — Intelligence Adapter
// ============================================================
// Consumes Observations and infers architectural style
// Observations for Mission Studio.
//
// This adapter does not read files or external systems.
// It only inspects Observation[] for architectural signals.
// ============================================================

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
import type { ArchitectureAdapter, ArchitectureAdapterConfig, ArchitectureStyle } from "./types.js"

type SignalRule = {
  style: ArchitectureStyle
  keywords: string[]
  weight: number
}

export class ArchitectureAdapterImpl implements ArchitectureAdapter {
  readonly metadata = {
    name: "architecture",
    version: "1.0.0",
    kind: "architecture" as const,
    category: "intelligence" as const,
    description: "Architecture inference intelligence adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: ArchitectureAdapterConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }

  private rules: SignalRule[] = [
    { style: "hexagonal", keywords: ["hexagonal", "port", "adapter", "driving", "driven"], weight: 1 },
    { style: "ddd", keywords: ["aggregate", "entity", "value object", "bounded context", "domain-driven"], weight: 1 },
    { style: "mvc", keywords: ["mvc", "model", "view", "controller"], weight: 1 },
    { style: "layered", keywords: ["domain/", "application/", "infrastructure/", "presentation/", "ui/"], weight: 1 },
    { style: "microservices", keywords: ["microservice", "service", "gateway", "api"], weight: 1 },
  ]

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

  private hash(input: string): string {
    return shortHash(input)
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as ArchitectureAdapterConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Architecture adapter not configured")
      return this.transition("validate", false, "error", "Adapter not configured")
    }
    this.setHealth("unknown", "Adapter validated, awaiting enablement")
    return this.transition("validate", true, "validated", "Adapter validated")
  }

  async enable(): Promise<AdapterState> {
    if (this._state === "disabled" || this._state === "discovered") {
      if (!this._config) {
        await this.configure({ observations: [] })
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
    const message = healthy ? "Architecture adapter is healthy" : "Architecture adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async infer(): Promise<ObservationBatch> {
    return this.inferFrom(this._config?.observations || [])
  }

  async inferFrom(observations: Observation[]): Promise<ObservationBatch> {
    const errors: string[] = []
    const timestamp = Date.now()
    const styleScores = new Map<ArchitectureStyle, { count: number; signals: string[] }>()

    for (const rule of this.rules) {
      styleScores.set(rule.style, { count: 0, signals: [] })
    }

    for (const obs of observations) {
      const haystack = this.haystack(obs)
      for (const rule of this.rules) {
        for (const keyword of rule.keywords) {
          if (haystack.includes(keyword.toLowerCase())) {
            const entry = styleScores.get(rule.style)!
            entry.count += rule.weight
            if (!entry.signals.includes(keyword)) {
              entry.signals.push(keyword)
            }
          }
        }
      }
    }

    const derived: Observation[] = []
    for (const [style, { count, signals }] of styleScores.entries()) {
      if (count === 0) continue
      const confidence = this.confidenceFromCount(count)
      const titleCaseStyle = style.charAt(0).toUpperCase() + style.slice(1)
      derived.push({
        id: `obs-architecture-${style}-${this.hash(signals.join(","))}`,
        source: { adapter: "architecture", locator: `inferred-${style}` },
        category: "architecture" as ObservationCategory,
        subject: `${titleCaseStyle} Architecture`,
        evidence: [
          {
            description: `Detected ${style} architecture signals`,
            snippet: signals.join(", "),
            fingerprint: this.hash(signals.join(",")),
          },
        ],
        confidence,
        timestamp,
        metadata: { style, signals, score: count },
      })
    }

    return { observations: derived, errors }
  }

  private haystack(obs: Observation): string {
    const parts = [obs.subject]
    for (const ev of obs.evidence || []) {
      if (ev.description) parts.push(ev.description)
      if (ev.snippet) parts.push(ev.snippet)
    }
    if (obs.metadata?.path) parts.push(String(obs.metadata.path))
    return parts.join(" ").toLowerCase()
  }

  private confidenceFromCount(count: number): ObservationConfidence {
    if (count >= 4) return "high"
    if (count >= 2) return "medium"
    return "low"
  }
}

export function createArchitectureAdapter(): ArchitectureAdapterImpl {
  return new ArchitectureAdapterImpl()
}
