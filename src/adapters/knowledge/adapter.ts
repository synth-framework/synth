// ============================================================
// ADAPTER: Knowledge Extraction — Intelligence Adapter
// ============================================================
// Consumes raw Observations and emits structured Knowledge
// Observations for Mission Studio.
//
// This adapter does not read files or external systems.
// It only transforms Observation[] into Observation[].
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
import type { KnowledgeExtractionAdapter, KnowledgeExtractionConfig } from "./types.js"

export class KnowledgeExtractionAdapterImpl implements KnowledgeExtractionAdapter {
  readonly metadata = {
    name: "knowledge-extraction",
    version: "1.0.0",
    kind: "knowledge-extraction" as const,
    category: "intelligence" as const,
    description: "Knowledge extraction intelligence adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: KnowledgeExtractionConfig
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

  private lowerConfidence(confidence: ObservationConfidence): ObservationConfidence {
    const order: ObservationConfidence[] = ["certain", "high", "medium", "low", "unknown"]
    const idx = order.indexOf(confidence)
    return idx >= order.length - 1 ? "unknown" : order[idx + 1]
  }

  private minConfidence(a: ObservationConfidence, b: ObservationConfidence): ObservationConfidence {
    const order: ObservationConfidence[] = ["certain", "high", "medium", "low", "unknown"]
    return order[Math.max(order.indexOf(a), order.indexOf(b))]
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as KnowledgeExtractionConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Knowledge extraction adapter not configured")
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
    const message = healthy ? "Knowledge extraction adapter is healthy" : "Knowledge extraction adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async extract(): Promise<ObservationBatch> {
    return this.extractFrom(this._config?.observations || [])
  }

  async extractFrom(observations: Observation[]): Promise<ObservationBatch> {
    const derived: Observation[] = []
    const errors: string[] = []
    const timestamp = Date.now()

    const sourceEvidence = (obs: Observation) => [
      {
        description: `Derived from observation ${obs.id}`,
        snippet: `${obs.category}: ${obs.subject}`,
        fingerprint: obs.id,
      },
    ]

    for (const obs of observations) {
      const base = {
        source: { adapter: "knowledge-extraction", locator: `derived-from-${obs.id}` },
        evidence: sourceEvidence(obs),
        timestamp,
        metadata: { sourceId: obs.id, sourceCategory: obs.category },
      }

      switch (obs.category) {
        case "intent": {
          derived.push({
            id: `obs-knowledge-mission-${this.hash(obs.id)}`,
            ...base,
            category: "mission" as ObservationCategory,
            subject: obs.subject,
            confidence: this.minConfidence("medium", obs.confidence),
          })
          break
        }

        case "capability": {
          derived.push({
            id: `obs-knowledge-capability-${this.hash(obs.id)}`,
            ...base,
            category: "capability" as ObservationCategory,
            subject: obs.subject,
            confidence: this.minConfidence("medium", obs.confidence),
          })
          break
        }

        case "language": {
          derived.push({
            id: `obs-knowledge-component-${this.hash(obs.id)}`,
            ...base,
            category: "component" as ObservationCategory,
            subject: `${obs.subject} runtime component`,
            confidence: this.lowerConfidence(obs.confidence),
          })
          break
        }

        case "dependency": {
          derived.push({
            id: `obs-knowledge-component-${this.hash(obs.id)}`,
            ...base,
            category: "component" as ObservationCategory,
            subject: `${obs.subject} integration`,
            confidence: this.lowerConfidence(obs.confidence),
          })
          break
        }

        case "constraint": {
          derived.push({
            id: `obs-knowledge-constraint-${this.hash(obs.id)}`,
            ...base,
            category: "constraint" as ObservationCategory,
            subject: obs.subject,
            confidence: obs.confidence,
          })
          break
        }

        case "unknown": {
          derived.push({
            id: `obs-knowledge-risk-${this.hash(obs.id)}`,
            ...base,
            category: "risk" as ObservationCategory,
            subject: `Unclassified knowledge: ${obs.subject}`,
            confidence: "low" as ObservationConfidence,
          })
          break
        }

        case "risk":
        case "mission":
        case "component":
          // Already knowledge-level; pass through unchanged
          derived.push(obs)
          break

        default:
          // Evidence categories are ignored at this layer
          break
      }
    }

    // Risk detection: conflicting missions
    const missions = derived.filter((o) => o.category === "mission")
    if (missions.length > 1) {
      derived.push({
        id: `obs-knowledge-risk-multiple-missions-${this.hash(missions.map((m) => m.id).join(","))}`,
        source: { adapter: "knowledge-extraction", locator: "conflict-detection" },
        category: "risk" as ObservationCategory,
        subject: "Multiple mission candidates detected",
        evidence: missions.map((m) => ({
          description: "Conflicting mission candidate",
          snippet: m.subject,
          fingerprint: m.id,
        })),
        confidence: "medium" as ObservationConfidence,
        timestamp,
        metadata: { missionCount: missions.length },
      })
    }

    return { observations: derived, errors }
  }
}

export function createKnowledgeExtractionAdapter(): KnowledgeExtractionAdapterImpl {
  return new KnowledgeExtractionAdapterImpl()
}
