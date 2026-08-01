// ============================================================
// TASK RUNNER (EXP-PROGRAM-034 / TASK-003)
// ============================================================
// Executes SYNTH tasks with dependency-aware scheduling. This is
// the canonical execution bridge between the task model and the
// host shell. It does not replace the ExecutionGate for governance
// events; it only runs task commands.
// ============================================================

import { spawn } from "child_process"
import path from "path"
import type { TaskRegistry } from "./task-registry.js"
import type { Task } from "./task-schema.js"
import { taskExecutionOrder } from "./task-graph.js"

export type TaskRunResult = {
  taskId: string
  status: number
  durationMs: number
  stdout: string
  stderr: string
}

export type TaskRunPlan = {
  taskIds: string[]
  tasks: Task[]
  dryRun: boolean
}

export type TaskRunReport = {
  status: "ok" | "error"
  dryRun: boolean
  results: TaskRunResult[]
  failedTaskId?: string
  totalDurationMs: number
}

function resolveSynthCli(): string {
  // Use the currently running synth CLI entry point if available; otherwise fall
  // back to the local dist path. This lets tasks dispatch to the same binary in
  // both development and installed contexts without relying on PATH.
  if (process.argv[1] && process.argv[1].endsWith("synth.js")) {
    return path.resolve(process.argv[1])
  }
  return path.resolve(process.cwd(), "dist", "cli", "synth.js")
}

function resolveTaskCommand(command: string): string {
  // Framework tasks use `synth <subcommand>` so they work from PATH in normal
  // operator usage. In tests or when synth is not on PATH, rewrite the command
  // to use the current binary explicitly.
  if (command.startsWith("synth ")) {
    return `node ${resolveSynthCli()} ${command.slice("synth ".length)}`
  }
  return command
}

/**
 * Run a shell command and capture stdout/stderr.
 */
function runCommand(command: string, cwd: string): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = ""
    let stderr = ""
    const resolvedCommand = resolveTaskCommand(command)
    const child = spawn(resolvedCommand, [], {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    })
    child.stdout.on("data", (data) => {
      stdout += data
    })
    child.stderr.on("data", (data) => {
      stderr += data
    })
    child.on("close", (code) => {
      resolve({ status: code ?? 1, stdout, stderr })
    })
  })
}

/**
 * Build a run plan for one or more target task ids. Dependencies are resolved
 * and ordered so each task runs after its upstream dependencies.
 */
export function buildRunPlan(registry: TaskRegistry, targetIds: string[]): TaskRunPlan {
  const orderResult = taskExecutionOrder(registry)
  if (!orderResult.ok) {
    throw new Error(`Cannot plan execution: cycle detected (${orderResult.cycle.join(" -> ")})`)
  }

  const targetSet = new Set(targetIds)
  const required = new Set<string>()

  function collect(id: string) {
    if (required.has(id)) return
    const task = registry.tasks.get(id)
    if (!task) return
    required.add(id)
    for (const depId of task.dependsOn) {
      collect(depId)
    }
  }

  for (const id of targetIds) {
    if (!registry.tasks.has(id)) {
      throw new Error(`Task "${id}" not found`)
    }
    collect(id)
  }

  // The topological order from taskExecutionOrder has dependencies first.
  const taskIds = orderResult.order.filter((t) => required.has(t.id)).map((t) => t.id)
  const tasks = taskIds.map((id) => registry.tasks.get(id)!)

  return { taskIds, tasks, dryRun: false }
}

/**
 * Execute a run plan. When dryRun is true, commands are not executed.
 */
export async function executeRunPlan(plan: TaskRunPlan, cwd: string): Promise<TaskRunReport> {
  const results: TaskRunResult[] = []
  const start = Date.now()

  if (plan.dryRun) {
    return {
      status: "ok",
      dryRun: true,
      results: plan.tasks.map((t) => ({
        taskId: t.id,
        status: 0,
        durationMs: 0,
        stdout: "",
        stderr: "",
      })),
      totalDurationMs: Date.now() - start,
    }
  }

  for (const task of plan.tasks) {
    const taskStart = Date.now()
    const { status, stdout, stderr } = await runCommand(task.command, cwd)
    const durationMs = Date.now() - taskStart

    results.push({ taskId: task.id, status, durationMs, stdout, stderr })

    if (status !== 0) {
      return {
        status: "error",
        dryRun: false,
        results,
        failedTaskId: task.id,
        totalDurationMs: Date.now() - start,
      }
    }
  }

  return {
    status: "ok",
    dryRun: false,
    results,
    totalDurationMs: Date.now() - start,
  }
}

/**
 * Run one or more tasks by id.
 */
export async function runTasks(
  registry: TaskRegistry,
  targetIds: string[],
  options: { dryRun?: boolean; cwd?: string } = {},
): Promise<TaskRunReport> {
  const plan = buildRunPlan(registry, targetIds)
  plan.dryRun = options.dryRun ?? false
  return executeRunPlan(plan, options.cwd ?? process.cwd())
}

/**
 * Run all tasks in a group. Each task is executed with its own dependencies.
 */
export async function runTaskGroup(
  registry: TaskRegistry,
  group: string,
  options: { dryRun?: boolean; cwd?: string } = {},
): Promise<TaskRunReport> {
  const groupTasks: Task[] = []
  for (const task of registry.tasks.values()) {
    if (task.group === group) {
      groupTasks.push(task)
    }
  }
  if (groupTasks.length === 0) {
    throw new Error(`No tasks found in group "${group}"`)
  }

  groupTasks.sort((a, b) => a.id.localeCompare(b.id))

  const allResults: TaskRunResult[] = []
  const start = Date.now()

  for (const task of groupTasks) {
    const report = await runTasks(registry, [task.id], options)
    allResults.push(...report.results)
    if (report.status === "error") {
      return {
        status: "error",
        dryRun: options.dryRun ?? false,
        results: allResults,
        failedTaskId: report.failedTaskId,
        totalDurationMs: Date.now() - start,
      }
    }
  }

  return {
    status: "ok",
    dryRun: options.dryRun ?? false,
    results: allResults,
    totalDurationMs: Date.now() - start,
  }
}
