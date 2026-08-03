// ============================================================
// TASK GRAPH (EXP-PROGRAM-034 / TASK-004)
// ============================================================
// Builds a dependency graph over SYNTH tasks using the shared
// dependency-graph primitive. This module does not execute tasks;
// it only provides graph operations: cycle detection, topological
// ordering, and impact analysis.
// ============================================================

import {
  detectCycles,
  topologicalSort,
  reachableFrom,
  type EdgeType,
  type Graph,
  type GraphNode,
  type GraphEdge,
} from "../graph/dependency-graph.js"
import { loadTaskRegistry, type TaskRegistry } from "./task-registry.js"
import type { Task } from "./task-schema.js"

export type { Task } from "./task-schema.js"
export type TaskGraph = Graph<Task>

/**
 * Build a task dependency graph from a task registry.
 * Edges are `depends_on` from task to upstream task.
 */
export function buildTaskGraph(registry: TaskRegistry): TaskGraph {
  const nodes = new Map<string, GraphNode<Task>>()
  const edges: GraphEdge[] = []

  for (const task of registry.tasks.values()) {
    nodes.set(task.id, { id: task.id, payload: task })
  }

  for (const task of registry.tasks.values()) {
    for (const depId of task.dependsOn) {
      // Registry already validated that depId exists.
      edges.push({ from: task.id, to: depId, type: "depends_on" })
    }
  }

  return { nodes, edges }
}

/**
 * Detect dependency cycles among tasks in the registry.
 */
const DEPENDS_ON: EdgeType[] = ["depends_on"]

export function detectTaskCycles(registry: TaskRegistry): string[][] {
  const graph = buildTaskGraph(registry)
  return detectCycles(graph, DEPENDS_ON)
}

/**
 * Return a topologically sorted list of tasks, or the first cycle found.
 */
export function taskExecutionOrder(
  registry: TaskRegistry,
): { ok: true; order: Task[] } | { ok: false; cycle: string[] } {
  const graph = buildTaskGraph(registry)
  const result = topologicalSort(graph, DEPENDS_ON)

  if (!result.ok) {
    return result
  }

  // The shared primitive orders dependents before dependencies because our
  // edges point from task to upstream task. Reverse so dependencies execute
  // before the tasks that depend on them.
  const reversedIds = result.order.slice().reverse()

  const taskOrder: Task[] = []
  for (const id of reversedIds) {
    const node = graph.nodes.get(id)
    if (node) {
      taskOrder.push(node.payload)
    }
  }

  return { ok: true, order: taskOrder }
}

/**
 * Return all tasks reachable from the given starting task ids via
 * dependency edges (i.e. downstream impact).
 */
export function findAffectedTasks(
  registry: TaskRegistry,
  changedTaskIds: string[],
): Task[] {
  const graph = buildTaskGraph(registry)
  // Downstream impact requires following edges in the reverse direction:
  // tasks that transitively depend on the changed tasks.
  const reverseEdges: GraphEdge[] = graph.edges.map((e) => ({
    from: e.to,
    to: e.from,
    type: e.type,
    metadata: e.metadata,
  }))
  const reverseGraph: TaskGraph = { nodes: graph.nodes, edges: reverseEdges }
  const affectedIds = new Set<string>()

  for (const id of changedTaskIds) {
    if (!reverseGraph.nodes.has(id)) continue
    for (const reachableId of reachableFrom(reverseGraph, id, DEPENDS_ON)) {
      affectedIds.add(reachableId)
    }
  }

  return Array.from(affectedIds)
    .sort()
    .map((id) => graph.nodes.get(id)!)
    .map((node) => node.payload)
}

/**
 * Legacy compatibility: load tasks directly from directories and build a registry.
 * Prefer `loadTaskRegistry` for new code.
 */
export async function loadTasks(dirs: string[]): Promise<TaskRegistry> {
  return loadTaskRegistry({ dirs })
}
