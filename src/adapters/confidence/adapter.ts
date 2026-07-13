// ============================================================
// ADAPTER: Confidence — Intelligence Adapter
// ============================================================
// Consumes Observations and emits a structured confidence
// report as an Observation for Mission Studio.
//
// This adapter does not read files or external systems.
// It only evaluates Observation[].
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
import type { ConfidenceAdapter, ConfidenceAdapterConfig, ConfidenceReport } from "./types.js"

export class ConfidenceAdapterImpl implements ConfidenceAdapter {
  readonly metadata = {
    name: "confidence",
    version: "1.0.0",
    kind: "confidence" as const,
    category: "intelligence" as const,
    description: "Confidence evaluation intelligence adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: ConfidenceAdapterConfig
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
    return crypto.createHash("sha256").update(input).digest("hex").slice(0, 12)
  }

  private confidenceScore(confidence: ObservationConfidence): number {
    switch (confidence) {
      case "certain":
        return 1.0
      case "high":
        return 0.8
      case "medium":
        return 0.5
      case "low":
        return 0.2
      case "unknown":
      default:
        return 0.0
    }
  }

  private levelFromScore(score: number): string {
    if (score >= 0.9) return "certain"
    if (score >= 0.7) return "high"
    if (score >= 0.4) return "medium"
    if (score >= 0.1) return "low"
    return "unknown"
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as ConfidenceAdapterConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Confidence adapter not configured")
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
    const message = healthy ? "Confidence adapter is healthy" : "Confidence adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async evaluate(): Promise<ObservationBatch> {
    return this.evaluateFrom(this._config?.observations || [])
  }

  async evaluateFrom(observations: Observation[]): Promise<ObservationBatch> {
    const errors: string[] = []
    const timestamp = Date.now()

    const score =
      observations.length === 0
        ? 0
        : observations.reduce((sum, o) => sum + this.confidenceScore(o.confidence), 0) / observations.length

    const missingEvidence: string[] = []
    for (const obs of observations) {
      if (!obs.evidence || obs.evidence.length === 0) {
        missingEvidence.push(`${obs.category}:${obs.subject} has no evidence`)
      } else if (obs.evidence.some((e) => !e.description || e.description.trim().length === 0)) {
        missingEvidence.push(`${obs.category}:${obs.subject} has evidence without description`)
      }
      if (obs.confidence === "low" || obs.confidence === "unknown") {
        missingEvidence.push(`${obs.category}:${obs.subject} has low/unknown confidence`)
      }
    }

    const ambiguities: string[] = []
    const bySubject: Map<string, Observation[]> = new Map()
    for (const obs of observations) {
      const list = bySubject.get(obs.subject) || []
      list.push(obs)
      bySubject.set(obs.subject, list)
    }
    for (const [subject, list] of bySubject.entries()) {
      if (list.length > 1) {
        const categories = new Set(list.map((o) => o.category))
        if (categories.size > 1) {
          ambiguities.push(`Subject "${subject}" appears in multiple categories: ${Array.from(categories).join(", ")}`)
        }
      }
    }

    const conflicts: string[] = []
    const constraints = observations.filter((o) => o.category === "constraint")
    for (let i = 0; i < constraints.length; i++) {
      for (let j = i + 1; j < constraints.length; j++) {
        const a = constraints[i].subject.toLowerCase()
        const b = constraints[j].subject.toLowerCase()
        if (a === b) continue
        // Simple conflict heuristic: both prescribe a choice ("use X" / "use Y") or share a keyword
        const bothPrescribe = a.includes("use") && b.includes("use")
        const commonKeywords = this.extractKeywords(a).filter((k) => this.extractKeywords(b).includes(k))
        if (bothPrescribe || commonKeywords.length > 0) {
          conflicts.push(`Potential conflict between constraints: "${constraints[i].subject}" and "${constraints[j].subject}"`)
        }
      }
    }

    const report: ConfidenceReport = {
      score: Math.round(score * 100) / 100,
      level: this.levelFromScore(score),
      observationCount: observations.length,
      missingEvidence: Array.from(new Set(missingEvidence)),
      ambiguities: Array.from(new Set(ambiguities)),
      conflicts: Array.from(new Set(conflicts)),
    }

    const reportJson = JSON.stringify(report)

    const observation: Observation = {
      id: `obs-confidence-report-${this.hash(reportJson)}`,
      source: { adapter: "confidence", locator: "confidence-report" },
      category: "evidence" as ObservationCategory,
      subject: "Confidence Report",
      evidence: [
        {
          description: "Confidence evaluation report",
          snippet: reportJson,
          fingerprint: this.hash(reportJson),
        },
      ],
      confidence: (report.level as ObservationConfidence) || "unknown",
      timestamp,
      metadata: { ...report },
    }

    return { observations: [observation], errors }
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
      .filter((w) => !["must", "should", "will", "with", "from", "have", "this", "that", "use"].includes(w))
  }
}

export function createConfidenceAdapter(): ConfidenceAdapterImpl {
  return new ConfidenceAdapterImpl()
}
