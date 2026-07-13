// ============================================================
// ADAPTER: Dependency — Intelligence Adapter
// ============================================================
// Consumes Observations and emits dependency, component, and
// capability graph Observations for Mission Studio.
//
// This adapter does not read files or external systems.
// It only transforms Observation[] into graph Observation[].
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
import type { DependencyAdapter, DependencyAdapterConfig, Graph, GraphEdge, GraphNode } from "./types.js"

export class DependencyAdapterImpl implements DependencyAdapter {
  readonly metadata = {
    name: "dependency",
    version: "1.0.0",
    kind: "dependency" as const,
    category: "intelligence" as const,
    description: "Dependency graph intelligence adapter for Mission Studio",
  }

  private _state: AdapterState = "discovered"
  private _config?: DependencyAdapterConfig
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

  async discover(): Promise<AdapterState> {
    this._config = undefined
    this.setHealth("unknown", "Adapter discovered, not yet configured")
    return this.transition("discover", true, "discovered", "Adapter discovered")
  }

  async configure(config: Record<string, unknown>): Promise<AdapterState> {
    this._config = config as DependencyAdapterConfig
    this.setHealth("unknown", "Adapter configured, awaiting validation")
    return this.transition("configure", true, "configured", "Adapter configured")
  }

  async validate(): Promise<AdapterState> {
    if (!this._config) {
      this.setHealth("unhealthy", "Dependency adapter not configured")
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
    const message = healthy ? "Dependency adapter is healthy" : "Dependency adapter is in error state"
    this.setHealth(healthy ? "healthy" : "unhealthy", message)
    return this.transition("healthCheck", healthy, healthy ? "healthy" : "error", message)
  }

  async build(): Promise<ObservationBatch> {
    return this.buildFrom(this._config?.observations || [])
  }

  async buildFrom(observations: Observation[]): Promise<ObservationBatch> {
    const errors: string[] = []
    const timestamp = Date.now()

    const dependencyGraph = this.buildGraph(
      observations,
      "dependency",
      "depends-with",
      "Dependency Graph",
    )
    const componentGraph = this.buildGraph(
      observations,
      ["language", "component"],
      "related-to",
      "Component Graph",
    )
    const capabilityGraph = this.buildGraph(
      observations,
      "capability",
      "co-located-with",
      "Capability Graph",
    )

    const observationsOut: Observation[] = []
    for (const graph of [dependencyGraph, componentGraph, capabilityGraph]) {
      if (graph.nodes.length === 0) continue
      const graphJson = JSON.stringify(graph)
      observationsOut.push({
        id: `obs-graph-${this.hash(graph.name)}-${this.hash(graphJson)}`,
        source: { adapter: "dependency", locator: `${graph.name.toLowerCase().replace(/\s+/g, "-")}-graph` },
        category: "evidence" as ObservationCategory,
        subject: graph.name,
        evidence: [
          {
            description: `${graph.name} derived from observations`,
            snippet: graphJson,
            fingerprint: this.hash(graphJson),
          },
        ],
        confidence: "high" as ObservationConfidence,
        timestamp,
        metadata: { graph },
      })
    }

    return { observations: observationsOut, errors }
  }

  private buildGraph(
    observations: Observation[],
    categories: ObservationCategory | ObservationCategory[],
    relation: string,
    name: string,
  ): Graph {
    const categorySet = new Set(Array.isArray(categories) ? categories : [categories])
    const relevant = observations.filter((o) => categorySet.has(o.category))

    const nodeMap = new Map<string, GraphNode>()
    const bySource = new Map<string, Observation[]>()

    for (const obs of relevant) {
      const nodeId = this.hash(`${obs.category}:${obs.subject}`)
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, { id: nodeId, label: obs.subject, category: obs.category })
      }
      const sourceLocator = obs.source.locator || "unknown"
      const list = bySource.get(sourceLocator) || []
      list.push(obs)
      bySource.set(sourceLocator, list)
    }

    const edges: GraphEdge[] = []
    for (const group of bySource.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const source = this.hash(`${group[i].category}:${group[i].subject}`)
          const target = this.hash(`${group[j].category}:${group[j].subject}`)
          if (source === target) continue
          edges.push({ source, target, relation })
        }
      }
    }

    return {
      name,
      nodes: Array.from(nodeMap.values()),
      edges,
    }
  }
}

export function createDependencyAdapter(): DependencyAdapterImpl {
  return new DependencyAdapterImpl()
}
