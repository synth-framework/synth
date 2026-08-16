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
 * Build a graph from an array of node payloads and directed edges.
 * The builder validates that every edge references an existing node id and
 * that node ids are unique.
 */
export function buildGraph<T>({
  nodes,
  edges,
}: {
  nodes: { id: string; payload: T; metadata?: Record<string, unknown> }[]
  edges: { from: string; to: string; type: EdgeType; metadata?: Record<string, unknown> }[]
}): Graph<T> {
  const nodeMap = new Map<string, GraphNode<T>>()

  for (const node of nodes) {
    if (nodeMap.has(node.id)) {
      throw new Error(`Duplicate node id in graph: ${node.id}`)
    }
    nodeMap.set(node.id, {
      id: node.id,
      payload: node.payload,
      metadata: node.metadata,
    })
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.from) || !nodeMap.has(edge.to)) {
      throw new Error(
        `Edge references unknown node: ${edge.from} -> ${edge.to}`,
      )
    }
  }

  return { nodes: nodeMap, edges }
}

/**
 * Return true if the edge should be included for the given edge types.
 * When no types are specified, all edges are included.
 */
function edgeMatches(
  edge: GraphEdge,
  edgeTypes: EdgeType[] | undefined,
): boolean {
  if (edgeTypes === undefined || edgeTypes.length === 0) {
    return true
  }
  const allowed = new Set(edgeTypes)
  return allowed.has(edge.type)
}

/**
 * Build inbound and outbound adjacency lists from a graph.
 * Pass `edgeTypes` to restrict traversal to specific edge types; otherwise
 * all edges are included.
 */
function buildAdjacencyLists(
  graph: Graph<unknown>,
  edgeTypes?: EdgeType[],
): AdjacencyLists {
  const inbound = new Map<string, Set<string>>()
  const outbound = new Map<string, Set<string>>()

  for (const nodeId of graph.nodes.keys()) {
    inbound.set(nodeId, new Set())
    outbound.set(nodeId, new Set())
  }

  for (const edge of graph.edges) {
    if (!edgeMatches(edge, edgeTypes)) continue
    if (!graph.nodes.has(edge.from) || !graph.nodes.has(edge.to)) continue
    outbound.get(edge.from)!.add(edge.to)
    inbound.get(edge.to)!.add(edge.from)
  }

  return { inbound, outbound }
}

/**
 * Return all node ids reachable from `startId` via outgoing edges.
 * Pass `edgeTypes` to restrict traversal; otherwise all edges are included.
 * Reachability is computed breadth-first, ordered by first discovery.
 */
export function reachableFrom<T>(
  graph: Graph<T>,
  startId: string,
  edgeTypes?: EdgeType[],
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
 * Detect cycles in the graph.
 * Cycles are returned in the order they are first discovered, and nodes
 * within a cycle are ordered by first discovery during traversal.
 * Pass `edgeTypes` to restrict traversal; otherwise all edges are included.
 */
export function detectCycles<T>(
  graph: Graph<T>,
  edgeTypes?: EdgeType[],
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
 * When no edge types are specified, all edges are checked.
 */
export function isAcyclic<T>(
  graph: Graph<T>,
  edgeTypes?: EdgeType[],
): boolean {
  return detectCycles(graph, edgeTypes).length === 0
}

/**
 * Return a topologically sorted list of node ids, or the first cycle found.
 * When multiple nodes are eligible, the node that appears earliest in the
 * input order (node or edge discovery order) is emitted first.
 * Pass `edgeTypes` to restrict traversal; otherwise all edges are included.
 */
export function topologicalSort<T>(
  graph: Graph<T>,
  edgeTypes?: EdgeType[],
): TopologicalSortResult {
  const { inbound, outbound } = buildAdjacencyLists(graph, edgeTypes)

  // Kahn's algorithm with deterministic ordering based on input order.
  const inDegree = new Map<string, number>()
  for (const id of graph.nodes.keys()) {
    inDegree.set(id, inbound.get(id)!.size)
  }

  const queue: string[] = []
  for (const id of graph.nodes.keys()) {
    if (inDegree.get(id) === 0) {
      queue.push(id)
    }
  }

  const order: string[] = []

  while (queue.length > 0) {
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
