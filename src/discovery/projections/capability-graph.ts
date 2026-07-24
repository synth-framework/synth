// ============================================================
// DISCOVERY PROJECTION: Capability Graph
// ============================================================
// Canonical graph model for capabilities and providers. The graph
// is built from a capability catalog and discovery evidence, then
// resolved into provider paths.
//
// This module contains no environment-specific imports.
// ============================================================

import type {
  CapabilityFamily,
  CapabilityGraph,
  CapabilityGraphEdge,
  CapabilityGraphNode,
  CapabilityNode,
  DiscoveryConfidence,
  DiscoveryEvidence,
  ProviderNode,
  ProviderPath,
  ResolutionFailure,
  ResolutionResult,
} from "../types.js"

/** Default capability catalog supported by SYNTH */
export const CAPABILITY_CATALOG: CapabilityNode[] = [
  { id: "cap:Environment", kind: "capability", family: "Environment", version: "1.0.0", required: false, metadata: { description: "Execution environment classification" } },
  { id: "cap:Workspace", kind: "capability", family: "Workspace", version: "1.0.0", required: false, metadata: { description: "Project workspace structure" } },
  { id: "cap:Filesystem", kind: "capability", family: "Filesystem", version: "1.0.0", required: true, metadata: { description: "File reading, writing, and path operations" } },
  { id: "cap:Revision", kind: "capability", family: "Revision", version: "1.0.0", required: false, metadata: { description: "Revision control system interaction" } },
  { id: "cap:Process", kind: "capability", family: "Process", version: "1.0.0", required: false, metadata: { description: "Subprocess execution" } },
  { id: "cap:Tool", kind: "capability", family: "Tool", version: "1.0.0", required: false, metadata: { description: "External tool availability" } },
  { id: "cap:Runtime", kind: "capability", family: "Runtime", version: "1.0.0", required: false, metadata: { description: "Language runtime availability" } },
  { id: "cap:Package", kind: "capability", family: "Package", version: "1.0.0", required: false, metadata: { description: "Package manager interaction" } },
  { id: "cap:Network", kind: "capability", family: "Network", version: "1.0.0", required: false, metadata: { description: "Network reachability and transport" } },
  { id: "cap:Forge", kind: "capability", family: "Forge", version: "1.0.0", required: false, metadata: { description: "Hosting platform interaction" } },
  { id: "cap:Secrets", kind: "capability", family: "Secrets", version: "1.0.0", required: false, metadata: { description: "Secret storage and retrieval" } },
  { id: "cap:Identity", kind: "capability", family: "Identity", version: "1.0.0", required: false, metadata: { description: "Authentication and authorization context" } },
]

/** Known capability dependencies */
export const CAPABILITY_DEPENDENCIES: Array<{ source: CapabilityFamily; target: CapabilityFamily }> = [
  { source: "Revision", target: "Filesystem" },
  { source: "Package", target: "Filesystem" },
  { source: "Package", target: "Runtime" },
  { source: "Process", target: "Runtime" },
  { source: "Tool", target: "Process" },
  { source: "Forge", target: "Revision" },
  { source: "Forge", target: "Network" },
  { source: "Secrets", target: "Identity" },
]

function capabilityId(family: CapabilityFamily): string {
  return `cap:${family}`
}

function providerId(name: string): string {
  return `prov:${name}`
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.id.localeCompare(b.id))
}

export class CapabilityGraphBuilder {
  private nodes = new Map<string, CapabilityGraphNode>()
  private edges: CapabilityGraphEdge[] = []
  private evidence?: DiscoveryEvidence

  constructor(catalog: CapabilityNode[] = CAPABILITY_CATALOG) {
    for (const cap of catalog) {
      this.nodes.set(cap.id, cap)
    }
    for (const dep of CAPABILITY_DEPENDENCIES) {
      this.edges.push({
        id: `edge:req:${dep.source}:${dep.target}`,
        source: capabilityId(dep.source),
        target: capabilityId(dep.target),
        kind: "requires",
      })
    }
  }

  withEvidence(evidence: DiscoveryEvidence): CapabilityGraphBuilder {
    this.evidence = evidence
    for (const provider of evidence.providers) {
      if (provider.providerName === "none") continue
      const id = providerId(provider.providerName)
      if (!this.nodes.has(id)) {
        this.nodes.set(id, {
          id,
          kind: "provider",
          name: provider.providerName,
          version: "1.0.0",
          capabilities: [capabilityId(provider.family)],
          priority: provider.confidence === "certain" ? 200 : provider.confidence === "high" ? 100 : 50,
          metadata: { confidence: provider.confidence },
        })
      } else {
        const existing = this.nodes.get(id) as ProviderNode
        const capId = capabilityId(provider.family)
        if (!existing.capabilities.includes(capId)) {
          existing.capabilities.push(capId)
        }
      }
      this.edges.push({
        id: `edge:sat:${provider.providerName}:${provider.family}`,
        source: id,
        target: capabilityId(provider.family),
        kind: "satisfies",
        metadata: { confidence: provider.confidence, reason: provider.reason },
      })
    }
    return this
  }

  build(timestamp?: number): CapabilityGraph {
    const evidence = this.evidence
    const nodes = sortById(Array.from(this.nodes.values()))
    const edges = sortById(this.edges)
    const resolver = new CapabilityResolver(nodes, edges)
    const resolution: CapabilityGraph["resolution"] = {}
    for (const node of nodes) {
      if (node.kind === "capability") {
        const result = resolver.resolve(node.id)
        if (result.success) {
          resolution[node.id] = result.path
        }
      }
    }
    return {
      schema: "synth-capability-graph-v1",
      version: "1.0.0",
      timestamp: timestamp ?? evidence?.timestamp ?? Date.now(),
      nodes,
      edges,
      resolution,
    }
  }
}

export class CapabilityResolver {
  private nodes = new Map<string, CapabilityGraphNode>()
  private outgoing = new Map<string, CapabilityGraphEdge[]>()
  private incoming = new Map<string, CapabilityGraphEdge[]>()

  constructor(nodes: CapabilityGraphNode[], edges: CapabilityGraphEdge[]) {
    for (const node of nodes) {
      this.nodes.set(node.id, node)
    }
    for (const edge of edges) {
      const out = this.outgoing.get(edge.source) || []
      out.push(edge)
      this.outgoing.set(edge.source, out)
      const inc = this.incoming.get(edge.target) || []
      inc.push(edge)
      this.incoming.set(edge.target, inc)
    }
  }

  resolve(capabilityId: string, visiting = new Set<string>()): ResolutionResult {
    if (visiting.has(capabilityId)) {
      return {
        success: false,
        failures: [{ capabilityId, reason: "Circular capability dependency detected" }],
      }
    }
    visiting.add(capabilityId)

    const cap = this.nodes.get(capabilityId)
    if (!cap || cap.kind !== "capability") {
      return {
        success: false,
        failures: [{ capabilityId, reason: `Capability ${capabilityId} not found` }],
      }
    }

    const satisfying = (this.incoming.get(capabilityId) || [])
      .filter((e) => e.kind === "satisfies")
      .map((e) => this.nodes.get(e.source))
      .filter((n): n is ProviderNode => n?.kind === "provider")

    if (satisfying.length === 0) {
      return {
        success: false,
        failures: [{ capabilityId, reason: "No provider satisfies this capability" }],
      }
    }

    const sorted = sortProviders(satisfying)
    const chosen = sorted[0]

    const requiredEdges = (this.outgoing.get(capabilityId) || []).filter((e) => e.kind === "requires")
    const dependencies: ProviderPath[] = []
    const failures: ResolutionFailure[] = []

    for (const edge of requiredEdges) {
      const depResult = this.resolve(edge.target, new Set(visiting))
      if (depResult.success) {
        dependencies.push(depResult.path)
      } else {
        failures.push(...depResult.failures)
      }
    }

    if (failures.length > 0 && cap.required) {
      return { success: false, failures }
    }

    visiting.delete(capabilityId)

    return {
      success: true,
      path: {
        capabilityId,
        providerId: chosen.id,
        providerName: chosen.name,
        confidence: chosen.metadata.confidence ?? "medium",
        reason: `Selected provider ${chosen.name} by priority ${chosen.priority}`,
        dependencies,
      },
    }
  }
}

function sortProviders(providers: ProviderNode[]): ProviderNode[] {
  const confidenceRank: Record<DiscoveryConfidence, number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
    certain: 4,
  }
  return [...providers].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    const ca = confidenceRank[a.metadata.confidence ?? "medium"]
    const cb = confidenceRank[b.metadata.confidence ?? "medium"]
    if (cb !== ca) return cb - ca
    return a.name.localeCompare(b.name)
  })
}

export function createCapabilityGraph(evidence: DiscoveryEvidence): CapabilityGraph {
  return new CapabilityGraphBuilder().withEvidence(evidence).build()
}

export function createCapabilityGraphResolver(graph: CapabilityGraph): CapabilityResolver {
  return new CapabilityResolver(graph.nodes, graph.edges)
}
