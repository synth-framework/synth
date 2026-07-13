// ============================================================
// DOMAIN: Project Graph Logic (Pure)
// ============================================================
// The project graph is a typed, persistent, directed multigraph.
// G = (V, E, T) where V = Objects, E = Relationships, T = Types.
// ============================================================

import type { CanonicalState, WorkItem, Plan, Milestone, Project } from "../types/index.js"

/** Graph node types */
export type GraphNodeType = "workItem" | "plan" | "milestone" | "project" | "execution"

/** Graph edge — relationship between nodes */
export type GraphEdge = {
  from: string      // source node id
  to: string        // target node id
  type: string      // relationship type (e.g., "contains", "depends_on", "belongs_to")
  metadata?: Record<string, unknown>
}

/** Graph node wrapper */
export type GraphNode = {
  id: string
  type: GraphNodeType
  entity: WorkItem | Plan | Milestone | Project | unknown
}

/** Project graph representation */
export type ProjectGraph = {
  nodes: Map<string, GraphNode>
  edges: GraphEdge[]
}

/** Build a project graph from canonical state */
export function buildGraph(state: CanonicalState): ProjectGraph {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []

  // Add project nodes
  for (const [id, project] of Object.entries(state.projects)) {
    nodes.set(id, { id, type: "project", entity: project })
    for (const planId of project.plans) {
      edges.push({ from: id, to: planId, type: "contains" })
    }
  }

  // Add plan nodes
  for (const [id, plan] of Object.entries(state.plans)) {
    nodes.set(id, { id, type: "plan", entity: plan })
    for (const msId of plan.milestones) {
      edges.push({ from: id, to: msId, type: "contains" })
    }
    for (const depId of plan.dependencies) {
      edges.push({ from: id, to: depId, type: "depends_on" })
    }
  }

  // Add milestone nodes
  for (const [id, milestone] of Object.entries(state.milestones)) {
    nodes.set(id, { id, type: "milestone", entity: milestone })
    edges.push({ from: id, to: milestone.planId, type: "belongs_to" })
    for (const workItemId of milestone.workItems) {
      edges.push({ from: id, to: workItemId, type: "contains" })
    }
  }

  // Add work item nodes
  for (const [id, workItem] of Object.entries(state.workItems)) {
    nodes.set(id, { id, type: "workItem", entity: workItem })
    for (const depId of workItem.dependencies) {
      edges.push({ from: id, to: depId, type: "depends_on" })
    }
  }

  return { nodes, edges }
}

/** Find all reachable nodes from a starting node via BFS */
export function findReachable(graph: ProjectGraph, startId: string): Set<string> {
  const visited = new Set<string>()
  const queue = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    // Find all outgoing edges
    const outgoing = graph.edges.filter((e) => e.from === current)
    for (const edge of outgoing) {
      if (!visited.has(edge.to)) {
        queue.push(edge.to)
      }
    }
  }

  return visited
}

/** Check if all objects in state are reachable from their project */
export function validateGraphConnectivity(state: CanonicalState): string[] {
  const violations: string[] = []
  const graph = buildGraph(state)

  for (const [projectId, project] of Object.entries(state.projects)) {
    const reachable = findReachable(graph, projectId)

    // Check plans are reachable
    for (const planId of project.plans) {
      if (!reachable.has(planId)) {
        violations.push(`Plan ${planId} is not reachable from project ${projectId}`)
      }
    }
  }

  // Check all work items belong to a milestone or plan
  for (const [workItemId] of Object.entries(state.workItems)) {
    const hasParent = graph.edges.some((e) => e.to === workItemId && (e.type === "contains"))
    if (!hasParent) {
      violations.push(`WorkItem ${workItemId} has no parent milestone or plan`)
    }
  }

  return violations
}

/** Detect cycles in the dependency graph */
export function detectCycles(graph: ProjectGraph): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  function dfs(nodeId: string): void {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)

    const outgoing = graph.edges.filter((e) => e.from === nodeId && e.type === "depends_on")
    for (const edge of outgoing) {
      if (!visited.has(edge.to)) {
        dfs(edge.to)
      } else if (recursionStack.has(edge.to)) {
        // Found a cycle
        const cycleStart = path.indexOf(edge.to)
        cycles.push(path.slice(cycleStart))
      }
    }

    path.pop()
    recursionStack.delete(nodeId)
  }

  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId)
    }
  }

  return cycles
}

/** Check if graph contains any cycles */
export function isGraphAcyclic(state: CanonicalState): boolean {
  const graph = buildGraph(state)
  const cycles = detectCycles(graph)
  return cycles.length === 0
}
