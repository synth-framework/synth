// ============================================================
// GENERIC DEPENDENCY-GRAPH PRIMITIVE
// ============================================================
// A type-parameterized DAG abstraction consumed by multiple SYNTH
// programs. It exposes only graph operations; domain semantics live in
// the consumers.
//
// Authority: docs/design/shared-dependency-graph.md
// ============================================================

export type EdgeType = "depends_on" | "contains" | "belongs_to" | string

export type GraphEdge = {
  from: string
  to: string
  type: EdgeType
  metadata?: Record<string, unknown>
}

export type GraphNode<T> = {
  id: string
  payload: T
  metadata?: Record<string, unknown>
}

export type Graph<T> = {
  nodes: Map<string, GraphNode<T>>
  edges: GraphEdge[]
}

export type AdjacencyLists = {
  inbound: Map<string, Set<string>>
  outbound: Map<string, Set<string>>
}

export type TopologicalSortResult =
  | { ok: true; order: string[] }
  | { ok: false; cycle: string[] }

/**
 * Build inbound and outbound adjacency lists from a graph.
 * Only `depends_on` edges are traversed by default; pass `edgeTypes` to
 * include other edge types.
 */
export function buildAdjacencyLists(
  graph: Graph<unknown>,
  edgeTypes: EdgeType[] = ["depends_on"],
): AdjacencyLists {
  const inbound = new Map<string, Set<string>>()
  const outbound = new Map<string, Set<string>>()

  for (const nodeId of graph.nodes.keys()) {
    inbound.set(nodeId, new Set())
    outbound.set(nodeId, new Set())
  }

  const types = new Set(edgeTypes)
  for (const edge of graph.edges) {
    if (!types.has(edge.type)) continue
    if (!graph.nodes.has(edge.from) || !graph.nodes.has(edge.to)) continue
    outbound.get(edge.from)!.add(edge.to)
    inbound.get(edge.to)!.add(edge.from)
  }

  return { inbound, outbound }
}

/**
 * Return all node ids reachable from `startId` via outgoing edges of the
 * given types. Defaults to `depends_on` edges.
 */
export function reachableFrom<T>(
  graph: Graph<T>,
  startId: string,
  edgeTypes: EdgeType[] = ["depends_on"],
): Set<string> {
  if (!graph.nodes.has(startId)) return new Set()

  const { outbound } = buildAdjacencyLists(graph, edgeTypes)
  const visited = new Set<string>()
  const queue = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)

    for (const next of outbound.get(current) ?? []) {
      if (!visited.has(next)) {
        queue.push(next)
      }
    }
  }

  return visited
}

/**
 * Detect all elementary cycles reachable from the graph nodes.
 * Cycles are returned in the order they are first discovered, and nodes
 * within a cycle are ordered by first discovery.
 */
export function detectCycles<T>(
  graph: Graph<T>,
  edgeTypes: EdgeType[] = ["depends_on"],
): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []
  const { outbound } = buildAdjacencyLists(graph, edgeTypes)

  function dfs(nodeId: string): void {
    visited.add(nodeId)
    recursionStack.add(nodeId)
    path.push(nodeId)

    for (const nextId of outbound.get(nodeId) ?? []) {
      if (!visited.has(nextId)) {
        dfs(nextId)
      } else if (recursionStack.has(nextId)) {
        const cycleStart = path.indexOf(nextId)
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

/**
 * Return true if the graph contains no cycles over the given edge types.
 */
export function isAcyclic<T>(
  graph: Graph<T>,
  edgeTypes: EdgeType[] = ["depends_on"],
): boolean {
  return detectCycles(graph, edgeTypes).length === 0
}

/**
 * Return a topologically sorted list of node ids, or the first cycle found.
 * Only `depends_on` edges are considered by default.
 */
export function topologicalSort<T>(
  graph: Graph<T>,
  edgeTypes: EdgeType[] = ["depends_on"],
): TopologicalSortResult {
  const { inbound, outbound } = buildAdjacencyLists(graph, edgeTypes)

  // Kahn's algorithm with deterministic ordering.
  const inDegree = new Map<string, number>()
  for (const [id, deps] of inbound) {
    inDegree.set(id, deps.size)
  }

  const queue = Array.from(graph.nodes.keys())
    .filter((id) => inDegree.get(id) === 0)
    .sort()

  const order: string[] = []

  while (queue.length > 0) {
    // Sort queue to keep output deterministic.
    queue.sort()
    const current = queue.shift()!
    order.push(current)

    for (const next of outbound.get(current) ?? []) {
      const newDegree = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, newDegree)
      if (newDegree === 0) {
        queue.push(next)
      }
    }
  }

  if (order.length !== graph.nodes.size) {
    const cycle = detectCycles(graph, edgeTypes)[0] ?? []
    return { ok: false, cycle }
  }

  return { ok: true, order }
}
