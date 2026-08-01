// ============================================================
// TASK CLI (EXP-PROGRAM-034 / TASK-003)
// ============================================================
// Read-only and diagnostic surface for the canonical SYNTH task
// engine. Does not execute tasks; see EXP-TASK-005+ for execution.
// ============================================================

import path from "path"
import { loadTaskRegistry, type TaskRegistry } from "../task/task-registry.js"
import {
  buildTaskGraph,
  detectTaskCycles,
  type TaskGraph,
} from "../task/task-graph.js"
import type { Task } from "../task/task-schema.js"
import { printError, printJson } from "./print.js"

export function namespaceHelp() {
  return {
    status: "ok" as const,
    name: "synth",
    namespace: "task",
    description: "Canonical task orchestration (read-only and diagnostic)",
    usage: "synth task <subcommand> [options]",
    subcommands: [
      { name: "synth task list", description: "List all discovered tasks" },
      { name: "synth task list --group <group>", description: "Filter tasks by group", args: "--group <group>" },
      { name: "synth task list --tag <tag>", description: "Filter tasks by tag", args: "--tag <tag>" },
      { name: "synth task explain <id>", description: "Explain a task and its dependency context", args: "<id>" },
      { name: "synth task graph", description: "Emit task dependency graph as JSON" },
      { name: "synth task graph --format dot", description: "Emit task dependency graph in Graphviz DOT format", args: "--format dot" },
      { name: "synth task graph --format mermaid", description: "Emit task dependency graph as a Mermaid flowchart", args: "--format mermaid" },
      { name: "synth task doctor", description: "Diagnose task registry health (cycles, orphans, deprecated)" },
    ],
    note: "Task execution is not implemented here; use npm scripts or wait for EXP-TASK-005.",
  }
}

export async function cmdTaskHelp() {
  printJson(namespaceHelp())
}

async function loadRegistry(): Promise<TaskRegistry> {
  return loadTaskRegistry({
    dirs: [path.resolve(process.cwd(), "data", "tasks"), path.resolve(process.cwd(), ".synth", "tasks")],
  })
}

function taskSummary(task: Task) {
  return {
    id: task.id,
    description: task.description,
    group: task.group,
    tags: task.tags,
    lifecycle: task.lifecycle ?? "accepted",
  }
}

export async function cmdTaskList(flags: Record<string, string | boolean>) {
  const registry = await loadRegistry()
  let tasks = Array.from(registry.tasks.values())

  const groupFilter = typeof flags.group === "string" ? flags.group : undefined
  const tagFilter = typeof flags.tag === "string" ? flags.tag : undefined

  if (groupFilter) {
    tasks = tasks.filter((t) => t.group === groupFilter)
  }

  if (tagFilter) {
    tasks = tasks.filter((t) => t.tags.includes(tagFilter))
  }

  tasks.sort((a, b) => a.id.localeCompare(b.id))

  printJson({
    status: "ok",
    kind: "TaskList",
    count: tasks.length,
    filters: {
      ...(groupFilter ? { group: groupFilter } : {}),
      ...(tagFilter ? { tag: tagFilter } : {}),
    },
    tasks: tasks.map(taskSummary),
  })
}

function findConsumers(registry: TaskRegistry, taskId: string): string[] {
  const consumers: string[] = []
  for (const task of registry.tasks.values()) {
    if (task.dependsOn.includes(taskId)) {
      consumers.push(task.id)
    }
  }
  return consumers.sort()
}

function countTransitiveDeps(registry: TaskRegistry, taskId: string, visited = new Set<string>()): number {
  if (visited.has(taskId)) return 0
  visited.add(taskId)
  const task = registry.tasks.get(taskId)
  if (!task) return 0
  let count = task.dependsOn.length
  for (const depId of task.dependsOn) {
    count += countTransitiveDeps(registry, depId, visited)
  }
  return count
}

export async function cmdTaskExplain(args: string[], flags: Record<string, string | boolean>) {
  const id = args[0] || ""
  if (!id) {
    printError("Usage: synth task explain <id>", {
      code: "TaskIdRequired",
      category: "validation",
      suggestion: "Provide a task id, e.g. 'synth task explain build'.",
    })
  }

  const registry = await loadRegistry()
  const task = registry.tasks.get(id)
  if (!task) {
    printError(`Task "${id}" not found.`, {
      code: "TaskNotFound",
      category: "validation",
      suggestion: "Run 'synth task list' to see available tasks.",
    })
  }

  const consumers = findConsumers(registry, id)
  const transitiveDepCount = countTransitiveDeps(registry, id)

  printJson({
    status: "ok",
    kind: "TaskExplanation",
    task: {
      id: task.id,
      description: task.description,
      command: task.command,
      group: task.group,
      dependsOn: task.dependsOn,
      tags: task.tags,
      estimatedDurationMs: task.estimatedDurationMs,
      capabilities: task.capabilities,
      lifecycle: task.lifecycle ?? "accepted",
    },
    context: {
      consumers,
      transitiveDependencyCount: transitiveDepCount,
      hasCycles: detectTaskCycles(registry).length > 0,
    },
  })
}

function graphToJson(registry: TaskRegistry, graph: TaskGraph) {
  const nodes = Array.from(graph.nodes.values()).map((n) => taskSummary(n.payload))
  const edges = graph.edges.map((e) => ({ from: e.from, to: e.to, type: e.type }))
  return { nodes, edges }
}

function graphToDot(registry: TaskRegistry, graph: TaskGraph): string {
  const lines = ["digraph tasks {"]
  for (const node of graph.nodes.values()) {
    const label = `${node.id}\\n${node.payload.group}`
    lines.push(`  "${node.id}" [label="${label}"];`)
  }
  for (const edge of graph.edges) {
    lines.push(`  "${edge.from}" -> "${edge.to}";`)
  }
  lines.push("}")
  return lines.join("\n")
}

function graphToMermaid(registry: TaskRegistry, graph: TaskGraph): string {
  const lines = ["flowchart TD"]
  for (const node of graph.nodes.values()) {
    lines.push(`  ${node.id}["${node.id}: ${node.payload.group}"]`)
  }
  for (const edge of graph.edges) {
    lines.push(`  ${edge.from} --> ${edge.to}`)
  }
  return lines.join("\n")
}

export async function cmdTaskGraph(args: string[], flags: Record<string, string | boolean>) {
  const format = typeof flags.format === "string" ? flags.format : "json"
  const validFormats = ["json", "dot", "mermaid"]
  if (!validFormats.includes(format)) {
    printError(`Unknown format "${format}". Supported: ${validFormats.join(", ")}`, {
      code: "TaskGraphFormatUnknown",
      category: "validation",
      suggestion: "Use --format json, --format dot, or --format mermaid.",
    })
  }

  const registry = await loadRegistry()
  const graph = buildTaskGraph(registry)

  switch (format) {
    case "dot":
      console.log(graphToDot(registry, graph))
      break
    case "mermaid":
      console.log(graphToMermaid(registry, graph))
      break
    default:
      printJson({
        status: "ok",
        kind: "TaskGraph",
        format,
        ...graphToJson(registry, graph),
      })
  }
}

export async function cmdTaskDoctor(flags: Record<string, string | boolean>) {
  const checks: { name: string; ok: boolean; detail: string }[] = []
  let registry: TaskRegistry | undefined

  try {
    registry = await loadRegistry()
    checks.push({ name: "registry-load", ok: true, detail: `${registry.tasks.size} task(s) loaded` })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    checks.push({ name: "registry-load", ok: false, detail: message })
  }

  if (!registry) {
    const failed = checks.filter((c) => !c.ok)
    printJson({
      status: "error",
      kind: "TaskDoctor",
      healthy: false,
      checks,
      issues: failed.map((c) => c.detail),
    })
    process.exit(1)
  }

  // Cycle detection
  const cycles = detectTaskCycles(registry)
  checks.push({
    name: "cycle-detection",
    ok: cycles.length === 0,
    detail: cycles.length === 0 ? "No dependency cycles" : `Cycles: ${cycles.map((c) => c.join(" -> ")).join("; ")}`,
  })

  // Orphan detection: tasks with no consumer and no dependencies.
  // Deprecated/removed tasks are intentionally not part of active orchestration,
  // so they are excluded from orphan reporting.
  const orphans: string[] = []
  for (const task of registry.tasks.values()) {
    if (task.lifecycle === "deprecated" || task.lifecycle === "removed") continue
    const hasConsumer = findConsumers(registry, task.id).length > 0
    if (!hasConsumer && task.dependsOn.length === 0 && task.group !== "release") {
      orphans.push(task.id)
    }
  }
  checks.push({
    name: "orphan-tasks",
    ok: orphans.length === 0,
    detail: orphans.length === 0 ? "No orphaned tasks" : `Orphaned: ${orphans.join(", ")}`,
  })

  // Deprecated tasks
  const deprecated: string[] = []
  for (const task of registry.tasks.values()) {
    if (task.lifecycle === "deprecated" || task.lifecycle === "removed") {
      deprecated.push(task.id)
    }
  }
  checks.push({
    name: "deprecated-tasks",
    ok: true,
    detail: deprecated.length === 0 ? "No deprecated tasks" : `Deprecated/removed: ${deprecated.join(", ")}`,
  })

  const issues = checks.filter((c) => !c.ok).map((c) => c.detail)
  printJson({
    status: issues.length === 0 ? "ok" : "warning",
    kind: "TaskDoctor",
    healthy: issues.length === 0,
    checks,
    issues,
  })

  if (issues.length > 0) {
    process.exit(1)
  }
}

export async function cmdTask(args: string[], flags: Record<string, string | boolean>) {
  const sub = args[0]
  switch (sub) {
    case "list":
      await cmdTaskList(flags)
      break
    case "explain":
      await cmdTaskExplain(args.slice(1), flags)
      break
    case "graph":
      await cmdTaskGraph(args.slice(1), flags)
      break
    case "doctor":
      await cmdTaskDoctor(flags)
      break
    case "--help":
    case "-h":
    case undefined:
      cmdTaskHelp()
      break
    default:
      printError(
        `Unknown subcommand: ${sub}. Usage: synth task list [--group <group>] [--tag <tag>] | synth task explain <id> | synth task graph [--format json|dot|mermaid] | synth task doctor`,
        { code: "TaskSubcommandUnknown", category: "validation" },
      )
  }
}
