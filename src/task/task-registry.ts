// ============================================================
// TASK REGISTRY (EXP-PROGRAM-034 / TASK-002)
// ============================================================
// Discover, validate, and index SYNTH task definitions from task
// files. The registry is the canonical input to the task graph.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { assertTask, type Task } from "./task-schema.js"

export type TaskRegistry = {
  tasks: Map<string, Task>
  ids: string[]
  groups: Map<string, string[]>
  tags: Map<string, string[]>
}

export type RegistryLoadOptions = {
  dirs?: string[]
}

/**
 * Load and validate task definitions from JSON files in the given directories.
 * Files must match `*.task.json`. Duplicate ids and unknown dependencies throw.
 */
export async function loadTaskRegistry(options: RegistryLoadOptions = {}): Promise<TaskRegistry> {
  const dirs = options.dirs ?? ["data/tasks", ".synth/tasks"]
  const tasks = new Map<string, Task>()
  const groups = new Map<string, string[]>()
  const tags = new Map<string, string[]>()

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
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch (err) {
        throw new Error(`Invalid JSON in ${filePath}: ${err instanceof Error ? err.message : String(err)}`)
      }

      const task = assertTask(parsed)

      if (tasks.has(task.id)) {
        throw new Error(`Duplicate task id "${task.id}" in ${filePath}`)
      }

      tasks.set(task.id, task)
    }
  }

  // Validate dependency references after all tasks are loaded.
  for (const task of tasks.values()) {
    for (const depId of task.dependsOn) {
      if (!tasks.has(depId)) {
        throw new Error(`Task "${task.id}" depends on unknown task "${depId}"`)
      }
    }

    const groupTasks = groups.get(task.group) ?? []
    groupTasks.push(task.id)
    groups.set(task.group, groupTasks)

    for (const tag of task.tags) {
      const tagTasks = tags.get(tag) ?? []
      tagTasks.push(task.id)
      tags.set(tag, tagTasks)
    }
  }

  const ids = Array.from(tasks.keys()).sort()

  return { tasks, ids, groups, tags }
}

/**
 * Return tasks in a specific group.
 */
export function getTasksByGroup(registry: TaskRegistry, group: string): Task[] {
  const ids = registry.groups.get(group) ?? []
  return ids.map((id) => registry.tasks.get(id)!).filter(Boolean)
}

/**
 * Return tasks with a specific tag.
 */
export function getTasksByTag(registry: TaskRegistry, tag: string): Task[] {
  const ids = registry.tags.get(tag) ?? []
  return ids.map((id) => registry.tasks.get(id)!).filter(Boolean)
}
