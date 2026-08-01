// ============================================================
// TASK GRAPH (EXP-PROGRAM-034 / TASK-004)
// ============================================================
// Builds a dependency graph over SYNTH tasks using the shared
// dependency-graph primitive. This module does not execute tasks;
// it only provides graph operations: cycle detection, topological
// ordering, and impact analysis.
// ============================================================

import fs from "fs/promises"
import path from "path"
import {
  detectCycles,
  topologicalSort,
  reachableFrom,
  type Graph,
  type GraphNode,
  type GraphEdge,
} from "../graph/dependency-graph.js"

export type Task = {
  id: string
  description: string
  command: string
  group: string
  dependsOn: string[]
  tags: string[]
  estimatedDurationMs: number
  capabilities: string[]
}

export type TaskGraph = Graph<Task>

/**
 * Load task definitions from JSON files in the given directories.
 * Files must match `*.task.json`. Duplicate ids throw.
 */
export async function loadTasks(dirs: string[]): Promise<Task[]> {
  const tasks: Task[] = []
  const seen = new Set<string>()

  for (const dir of dirs) {
    let entries: string[]
    try {
      entries = await fs.readdir(dir)
    } catch {
      continue
    }

    for (const entry of entries) {
      if (!entry.endsWith(".task.json")) continue
      const filePath = path.join(dir, entry)
      const raw = await fs.readFile(filePath, "utf-8")
      const task = JSON.parse(raw) as Task

      if (seen.has(task.id)) {
        throw new Error(`Duplicate task id: ${task.id}`)
      }
      seen.add(task.id)
      tasks.push(task)
    }
  }

  return tasks
}

/**
 * Build a task dependency graph from task definitions.
 * Edges are `depends_on` from task to upstream task.
 */
export function buildTaskGraph(tasks: Task[]): TaskGraph {
  const nodes = new Map<string, GraphNode<Task>>()
  const edges: GraphEdge[] = []

  for (const task of tasks) {
    nodes.set(task.id, { id: task.id, payload: task })
  }

  for (const task of tasks) {
    for (const depId of task.dependsOn) {
      if (!nodes.has(depId)) {
        throw new Error(`Task ${task.id} depends on unknown task ${depId}`)
      }
      edges.push({ from: task.id, to: depId, type: "depends_on" })
    }
  }

  return { nodes, edges }
}

/**
 * Detect dependency cycles among tasks.
 */
export function detectTaskCycles(tasks: Task[]): string[][] {
  const graph = buildTaskGraph(tasks)
  return detectCycles(graph)
}

/**
 * Return a topologically sorted list of task ids, or the first cycle found.
 */
export function taskExecutionOrder(
  tasks: Task[],
): { ok: true; order: Task[] } | { ok: false; cycle: string[] } {
  const graph = buildTaskGraph(tasks)
  const result = topologicalSort(graph)

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
  tasks: Task[],
  changedTaskIds: string[],
): Task[] {
  // Downstream impact requires following edges in the reverse direction:
  // tasks that transitively depend on the changed tasks.
  const graph = buildTaskGraph(tasks)
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
    for (const reachableId of reachableFrom(reverseGraph, id)) {
      affectedIds.add(reachableId)
    }
  }

  return Array.from(affectedIds)
    .sort()
    .map((id) => graph.nodes.get(id)!)
    .map((node) => node.payload)
}
