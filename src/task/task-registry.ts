// ============================================================
// TASK REGISTRY (EXP-PROGRAM-034 / TASK-002)
// ============================================================
// Discover, validate, and index SYNTH task definitions from task
// files. The registry is the canonical input to the task graph.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { assertTask, type Task } from "./task-schema.js"
import { createDefaultAdapterCatalog } from "../adapters/adapter-catalog.js"

export type TaskRegistry = {
  tasks: Map<string, Task>
  ids: string[]
  groups: Map<string, string[]>
  tags: Map<string, string[]>
}

export type RegistryLoadOptions = {
  dirs?: string[]
  frameworkDirs?: string[]
}

function defaultFrameworkTasksDir(): string {
  // Resolve dist/tasks/ relative to the compiled registry module.
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(__dirname, "..", "tasks")
}

/**
 * Load and validate task definitions from JSON files in the given directories.
 * Files must match `*.task.json`. Duplicate ids and unknown dependencies throw.
 *
 * Framework-owned tasks are discovered from the installation directory (dist/tasks/)
 * in addition to project-level tasks (data/tasks/ and .synth/tasks/). Project-level
 * tasks take precedence over framework tasks if ids collide.
 */
export async function loadTaskRegistry(options: RegistryLoadOptions = {}): Promise<TaskRegistry> {
  const projectDirs = options.dirs ?? ["data/tasks", ".synth/tasks"]
  const frameworkDirs = options.frameworkDirs ?? [defaultFrameworkTasksDir()]
  const dirs = [...frameworkDirs, ...projectDirs]
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

      if (task.adapterHints && task.adapterHints.length > 0) {
        const catalog = createDefaultAdapterCatalog()
        for (const hint of task.adapterHints) {
          const descriptor = catalog.resolve(hint)
          if (!descriptor) {
            throw new Error(`Task "${task.id}" references unknown adapter hint: ${hint}`)
          }
        }
      }

      // Later directories override earlier ones. This lets project-level tasks
      // (data/tasks/, .synth/tasks/) replace framework-owned defaults.
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

/**
 * Find adapter IDs that satisfy a capability for a given runtime and language.
 *
 * This helper lets the planning engine ask "which adapter can do X?" without
 * hardcoding adapter names. Results are ranked by catalog relevance scores.
 */
export function findAdaptersForCapability(
  capability: string,
  runtime?: string,
  language?: string,
): string[] {
  const catalog = createDefaultAdapterCatalog()
  const descriptors = catalog.query({
    capability,
    ...(runtime ? { runtime } : {}),
    ...(language ? { language } : {}),
  })
  return descriptors.map((d) => d.id)
}

/**
 * Validate that every adapter hint on every task resolves to a known catalog
 * descriptor. Returns a list of problems; empty means valid.
 */
export function validateTaskAdapterHints(registry: TaskRegistry): string[] {
  const catalog = createDefaultAdapterCatalog()
  const problems: string[] = []
  for (const task of registry.tasks.values()) {
    if (!task.adapterHints) continue
    for (const hint of task.adapterHints) {
      if (!catalog.resolve(hint)) {
        problems.push(`Task "${task.id}" references unknown adapter hint: ${hint}`)
      }
    }
  }
  return problems
}
