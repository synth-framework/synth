// ============================================================
// ADAPTER: Objective Builder — Planning Adapter
// ============================================================
// Consumes Observations and emits objective Observations.
//
// This adapter does not read files or external systems.
// It only inspects Observation[] for expedition and objective
// signals.
// ============================================================

import crypto from "crypto"
import type {
  AdapterState,
  AdapterHealth,
  AdapterHealthState,
  Observation,
  ObservationBatch,
  ObservationCategory,
  ObservationConfidence,
} from "../../types/index.js"
import type { ObjectiveBuilderAdapter, ObjectiveBuilderConfig } from "./types.js"

type ObjectivePhase = {
  phase: string
  verb: string
}

export class ObjectiveBuilderAdapterImpl implements ObjectiveBuilderAdapter {
  readonly metadata = {
    name: "objective-builder",
    version: "1.0.0",
    kind: "objective-builder" as const,
    category: "planning" as const,
    description: "Objective builder planning adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: ObjectiveBuilderConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }

  private phases: ObjectivePhase[] = [
    { phase: "design", verb: "Design" },
    { phase: "implement", verb: "Implement" },
    { phase: "validate", verb: "Validate" },
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
    return crypto.createHash("sha256").update(input).digest("hex").slice(0, 12)
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as ObjectiveBuilderConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Objective builder adapter not configured")
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
    const message = healthy ? "Objective builder adapter is healthy" : "Objective builder adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async build(): Promise<ObservationBatch> {
    return this.buildFrom(this._config?.observations || [])
  }

  async buildFrom(observations: Observation[]): Promise<ObservationBatch> {
    const errors: string[] = []
    const timestamp = Date.now()
    const objectives: Observation[] = []
    const seen = new Set<string>()

    for (const obs of observations) {
      if (obs.category === "objective") {
        const key = this.hash(`${obs.subject}-${obs.evidence.map((e) => e.snippet).join(",")}`)
        if (seen.has(key)) continue
        seen.add(key)
        objectives.push({
          ...obs,
          id: obs.id || `obs-objective-${key}`,
          source: { adapter: "objective-builder", locator: `preserved-${obs.source.adapter}` },
          timestamp,
        })
        continue
      }

      if (obs.category === "expedition") {
        const baseName = obs.subject.replace(/\s*Expedition$/i, "").trim()
        for (const { phase, verb } of this.phases) {
          const title = `${verb} ${baseName}`
          const key = this.hash(`expedition-${obs.id}-${phase}`)
          if (seen.has(key)) continue
          seen.add(key)
          objectives.push({
            id: `obs-objective-${key}`,
            source: { adapter: "objective-builder", locator: `expedition-${obs.id}` },
            category: "objective" as ObservationCategory,
            subject: title,
            evidence: [
              {
                description: `Derived from expedition observation (${phase})`,
                snippet: obs.subject,
                fingerprint: this.hash(obs.subject),
              },
            ],
            confidence: "medium" as ObservationConfidence,
            timestamp,
            metadata: { sourceExpeditionId: obs.id, phase, expeditionSubject: obs.subject },
          })
        }
      }
    }

    return { observations: objectives, errors }
  }
}

export function createObjectiveBuilderAdapter(): ObjectiveBuilderAdapterImpl {
  return new ObjectiveBuilderAdapterImpl()
}
