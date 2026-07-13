// ============================================================
// ADAPTER: Conversation — Evidence Adapter
// ============================================================
// Reads natural-language conversation turns and emits canonical
// Observations for Mission Studio.
//
// This adapter does not connect to an external system.
// It is read-only. It never mutates runtime state.
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
import type { ConversationAdapter, ConversationConfig, ConversationRole, ConversationTurn } from "./types.js"

export class ConversationAdapterImpl implements ConversationAdapter {
  readonly metadata = {
    name: "conversation",
    version: "1.0.0",
    kind: "conversation" as const,
    category: "integration" as const,
    description: "Natural-language evidence adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: ConversationConfig
  private _health: AdapterHealth = { state: "unknown", message: "Adapter not yet health-checked" }
  private _turns: ConversationTurn[] = []

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

  private actorName(): string {
    return this._config?.actorName || "Operator"
  }

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this._turns = []
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as ConversationConfig
    if (this._config.turns) {
      this._turns = [...this._config.turns]
    }
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Conversation adapter not configured")
      return this.transition("validate", false, "error", "Adapter not configured")
    }
    this.setHealth("unknown", "Adapter validated, awaiting enablement")
    return this.transition("validate", true, "validated", "Adapter validated")
  }

  async enable(): Promise<AdapterState> {
    if (this._state === "disabled" || this._state === "discovered") {
      await this.configure({ actorName: this.actorName(), turns: [] })
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
    const message = healthy ? "Conversation adapter is healthy" : "Conversation adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  submitTurn(role: ConversationRole, text: string): void {
    this._turns.push({ role, text, timestamp: Date.now() })
  }

  async observe(): Promise<ObservationBatch> {
    const observations: Observation[] = []

    for (const turn of this._turns) {
      if (turn.role !== "operator") continue
      const extracted = this.extractObservations(turn)
      observations.push(...extracted)
    }

    return {
      observations,
      errors: [],
    }
  }

  private extractObservations(turn: ConversationTurn): Observation[] {
    const text = turn.text.trim()
    if (!text) return []

    const result: Observation[] = []
    const base = {
      source: {
        adapter: "conversation",
        locator: `turn-${this.hash(text)}`,
      },
      evidence: [
        {
          description: "Operator conversation turn",
          snippet: text,
          fingerprint: this.hash(text),
        },
      ],
      timestamp: turn.timestamp,
      metadata: { role: turn.role },
    }

    // Intent: build/create/make something
    const buildMatch = text.match(/\b(build|create|make|develop)\s+(?:a|an|the)?\s*([^.]+)/i)
    if (buildMatch) {
      const subject = this.cleanSubject(buildMatch[2])
      result.push({
        ...base,
        id: `obs-intent-${this.hash(text)}`,
        category: "intent" as ObservationCategory,
        subject,
        confidence: "high" as ObservationConfidence,
      })
    }

    // Actor reference: "As a [actor]"
    const actorMatch = text.match(/as a[n]?\s+([a-zA-Z\s]+),?/i)
    if (actorMatch) {
      result.push({
        ...base,
        id: `obs-actor-${this.hash(text)}`,
        category: "actor" as ObservationCategory,
        subject: actorMatch[1].trim(),
        confidence: "high" as ObservationConfidence,
      })
    }

    // Constraint: "must", "should", "need to"
    const constraintMatches = text.match(/\b(must|should|need to|has to|required to)\b[^.]+/gi) || []
    for (const constraint of constraintMatches) {
      result.push({
        ...base,
        id: `obs-constraint-${this.hash(constraint)}`,
        category: "constraint" as ObservationCategory,
        subject: this.cleanSubject(constraint),
        confidence: "medium" as ObservationConfidence,
      })
    }

    // Fallback: if no patterns matched, emit an unknown observation so nothing is silently lost
    if (result.length === 0) {
      result.push({
        ...base,
        id: `obs-unknown-${this.hash(text)}`,
        category: "unknown" as ObservationCategory,
        subject: this.cleanSubject(text),
        confidence: "low" as ObservationConfidence,
      })
    }

    return result
  }

  private cleanSubject(raw: string): string {
    return raw
      .replace(/^(a|an|the|to)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim()
  }

  private hash(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex").slice(0, 12)
  }
}

export function createConversationAdapter(): ConversationAdapterImpl {
  return new ConversationAdapterImpl()
}
