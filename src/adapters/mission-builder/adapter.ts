// ============================================================
// ADAPTER: Mission Builder — Planning Adapter
// ============================================================
// Consumes Observations and emits mission Observations.
//
// This adapter does not read files or external systems.
// It only inspects Observation[] for intent, mission, and
// capability signals.
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
import type { MissionBuilderAdapter, MissionBuilderConfig } from "./types.js"

export class MissionBuilderAdapterImpl implements MissionBuilderAdapter {
  readonly metadata = {
    name: "mission-builder",
    version: "1.0.0",
    kind: "mission-builder" as const,
    category: "planning" as const,
    description: "Mission builder planning adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: MissionBuilderConfig
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

  private hash(input: string): string {
    return shortHash(input)
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as MissionBuilderConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Mission builder adapter not configured")
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
    const message = healthy ? "Mission builder adapter is healthy" : "Mission builder adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async build(): Promise<ObservationBatch> {
    return this.buildFrom(this._config?.observations || [])
  }

  async buildFrom(observations: Observation[]): Promise<ObservationBatch> {
    const errors: string[] = []
    const timestamp = Date.now()
    const missions: Observation[] = []
    const seen = new Set<string>()

    for (const obs of observations) {
      if (obs.category === "mission") {
        const key = this.hash(`${obs.subject}-${obs.evidence.map((e) => e.snippet).join(",")}`)
        if (seen.has(key)) continue
        seen.add(key)
        missions.push({
          ...obs,
          id: obs.id || `obs-mission-${key}`,
          source: { adapter: "mission-builder", locator: `preserved-${obs.source.adapter}` },
          timestamp,
        })
        continue
      }

      if (obs.category === "intent") {
        const title = this.titleFromSubject(obs.subject)
        const key = this.hash(`intent-${title}`)
        if (seen.has(key)) continue
        seen.add(key)
        missions.push({
          id: `obs-mission-${key}`,
          source: { adapter: "mission-builder", locator: `intent-${obs.id}` },
          category: "mission" as ObservationCategory,
          subject: title,
          evidence: [
            {
              description: "Derived from intent observation",
              snippet: obs.subject,
              fingerprint: this.hash(obs.subject),
            },
          ],
          confidence: this.confidenceFromObservation(obs),
          timestamp,
          metadata: { sourceObservationId: obs.id, goal: obs.subject },
        })
      }
    }

    if (missions.length === 0) {
      const capabilities = observations.filter((o) => o.category === "capability")
      if (capabilities.length > 0) {
        const subjects = capabilities.map((o) => o.subject).join(", ")
        const key = this.hash(`capabilities-${subjects}`)
        missions.push({
          id: `obs-mission-${key}`,
          source: { adapter: "mission-builder", locator: "capabilities" },
          category: "mission" as ObservationCategory,
          subject: `Enable ${capabilities[0].subject}`,
          evidence: [
            {
              description: "Derived from capability observations",
              snippet: subjects,
              fingerprint: this.hash(subjects),
            },
          ],
          confidence: "medium",
          timestamp,
          metadata: { derivedFromCapabilities: subjects },
        })
      }
    }

    return { observations: missions, errors }
  }

  private titleFromSubject(subject: string): string {
    const normalized = subject.trim()
    if (/^build /i.test(normalized)) {
      return normalized.replace(/^build /i, "Build ")
    }
    if (/^create /i.test(normalized)) {
      return normalized.replace(/^create /i, "Create ")
    }
    return `Mission: ${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`
  }

  private confidenceFromObservation(obs: Observation): ObservationConfidence {
    return obs.confidence === "low" ? "medium" : obs.confidence
  }
}

export function createMissionBuilderAdapter(): MissionBuilderAdapterImpl {
  return new MissionBuilderAdapterImpl()
}
