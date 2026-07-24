// ============================================================
// ADAPTER: Wizard — Planning Adapter
// ============================================================
// Consumes Observations and emits wizard Observations.
//
// This adapter does not read files or external systems. It only
// inspects Observation[] for objective signals and turns each
// objective into an interactive wizard step with actions:
// approve, reject, merge, split, refine.
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
import type { WizardAdapter, WizardAction, WizardConfig } from "./types.js"

export class WizardAdapterImpl implements WizardAdapter {
  readonly metadata = {
    name: "wizard",
    version: "1.0.0",
    kind: "wizard" as const,
    category: "planning" as const,
    description: "Wizard planning adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: WizardConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }

  private defaultActions: WizardAction[] = ["approve", "reject", "merge", "split", "refine"]

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
    this._config = config as WizardConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Wizard adapter not configured")
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
    const message = healthy ? "Wizard adapter is healthy" : "Wizard adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async build(): Promise<ObservationBatch> {
    return this.buildFrom(this._config?.observations || [])
  }

  async buildFrom(observations: Observation[]): Promise<ObservationBatch> {
    const errors: string[] = []
    const timestamp = Date.now()
    const wizards: Observation[] = []
    const seen = new Set<string>()
    const actions = this._config?.actions || this.defaultActions

    for (const obs of observations) {
      if (obs.category === "wizard") {
        const key = this.hash(`${obs.subject}-${obs.evidence.map((e) => e.snippet).join(",")}`)
        if (seen.has(key)) continue
        seen.add(key)
        wizards.push({
          ...obs,
          id: obs.id || `obs-wizard-${key}`,
          source: { adapter: "wizard", locator: `preserved-${obs.source.adapter}` },
          timestamp,
        })
        continue
      }

      if (obs.category === "objective") {
        const title = `Review: ${obs.subject}`
        const key = this.hash(`objective-${obs.id}`)
        if (seen.has(key)) continue
        seen.add(key)
        wizards.push({
          id: `obs-wizard-${key}`,
          source: { adapter: "wizard", locator: `objective-${obs.id}` },
          category: "wizard" as ObservationCategory,
          subject: title,
          evidence: [
            {
              description: "Derived from objective observation",
              snippet: obs.subject,
              fingerprint: this.hash(obs.subject),
            },
          ],
          confidence: "medium" as ObservationConfidence,
          timestamp,
          metadata: {
            sourceObjectiveId: obs.id,
            objectiveSubject: obs.subject,
            actions,
            phase: obs.metadata?.phase,
          },
        })
      }
    }

    return { observations: wizards, errors }
  }
}

export function createWizardAdapter(): WizardAdapterImpl {
  return new WizardAdapterImpl()
}
