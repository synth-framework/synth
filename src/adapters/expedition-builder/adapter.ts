// ============================================================
// ADAPTER: Expedition Builder — Planning Adapter
// ============================================================
// Consumes Observations and emits expedition Observations.
//
// This adapter does not read files or external systems.
// It only inspects Observation[] for mission and expedition
// signals.
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
import type { ExpeditionBuilderAdapter, ExpeditionBuilderConfig } from "./types.js"

export class ExpeditionBuilderAdapterImpl implements ExpeditionBuilderAdapter {
  readonly metadata = {
    name: "expedition-builder",
    version: "1.0.0",
    kind: "expedition-builder" as const,
    category: "planning" as const,
    description: "Expedition builder planning adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: ExpeditionBuilderConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }

  private themes = ["Payments", "Invoicing", "CRM", "Onboarding", "Auth", "Reporting", "API", "Mobile", "Web"]

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
    this._config = config as ExpeditionBuilderConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Expedition builder adapter not configured")
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
    const message = healthy ? "Expedition builder adapter is healthy" : "Expedition builder adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async build(): Promise<ObservationBatch> {
    return this.buildFrom(this._config?.observations || [])
  }

  async buildFrom(observations: Observation[]): Promise<ObservationBatch> {
    const errors: string[] = []
    const timestamp = Date.now()
    const expeditions: Observation[] = []
    const seen = new Set<string>()

    for (const obs of observations) {
      if (obs.category === "expedition") {
        const key = this.hash(`${obs.subject}-${obs.evidence.map((e) => e.snippet).join(",")}`)
        if (seen.has(key)) continue
        seen.add(key)
        expeditions.push({
          ...obs,
          id: obs.id || `obs-expedition-${key}`,
          source: { adapter: "expedition-builder", locator: `preserved-${obs.source.adapter}` },
          timestamp,
        })
        continue
      }

      if (obs.category === "mission") {
        const themes = this.extractThemes(obs)
        if (themes.length === 0) {
          themes.push("Foundation")
        }
        for (const theme of themes) {
          const title = `${theme} Expedition`
          const key = this.hash(`mission-${obs.id}-${theme}`)
          if (seen.has(key)) continue
          seen.add(key)
          expeditions.push({
            id: `obs-expedition-${key}`,
            source: { adapter: "expedition-builder", locator: `mission-${obs.id}` },
            category: "expedition" as ObservationCategory,
            subject: title,
            evidence: [
              {
                description: "Derived from mission observation",
                snippet: obs.subject,
                fingerprint: this.hash(obs.subject),
              },
            ],
            confidence: themes.length > 1 ? "medium" : "high",
            timestamp,
            metadata: { sourceMissionId: obs.id, theme, missionSubject: obs.subject },
          })
        }
      }
    }

    return { observations: expeditions, errors }
  }

  private extractThemes(obs: Observation): string[] {
    const haystack = [obs.subject, ...obs.evidence.map((e) => e.snippet || "")].join(" ")
    const found = this.themes.filter((theme) =>
      haystack.toLowerCase().includes(theme.toLowerCase()),
    )
    return found.length > 0 ? found : []
  }
}

export function createExpeditionBuilderAdapter(): ExpeditionBuilderAdapterImpl {
  return new ExpeditionBuilderAdapterImpl()
}
