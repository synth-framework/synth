// ============================================================
// TASK SCHEMA (EXP-PROGRAM-034 / TASK-001)
// ============================================================
// Canonical task schema and runtime validation for SYNTH tasks.
// ============================================================

export type TaskLifecycle = "proposed" | "accepted" | "deprecated" | "removed"

export type Task = {
  id: string
  description: string
  command: string
  group: string
  dependsOn: string[]
  tags: string[]
  estimatedDurationMs: number
  capabilities: string[]
  lifecycle?: TaskLifecycle
}

export type TaskValidationError = {
  path: string
  message: string
}

export type TaskValidationResult =
  | { ok: true }
  | { ok: false; errors: TaskValidationError[] }

const REQUIRED_FIELDS: (keyof Task)[] = [
  "id",
  "description",
  "command",
  "group",
  "dependsOn",
  "tags",
  "estimatedDurationMs",
  "capabilities",
]

const VALID_LIFECYCLES: TaskLifecycle[] = ["proposed", "accepted", "deprecated", "removed"]

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

/**
 * Validate an unknown object against the canonical task schema.
 */
export function validateTask(task: unknown): TaskValidationResult {
  const errors: TaskValidationError[] = []

  if (task === null || typeof task !== "object") {
    return { ok: false, errors: [{ path: "", message: "Task must be an object" }] }
  }

  const t = task as Record<string, unknown>

  for (const field of REQUIRED_FIELDS) {
    if (!(field in t)) {
      errors.push({ path: field, message: `Missing required field: ${field}` })
    }
  }

  if ("id" in t && !isNonEmptyString(t.id)) {
    errors.push({ path: "id", message: "id must be a non-empty string" })
  }

  if ("description" in t && !isNonEmptyString(t.description)) {
    errors.push({ path: "description", message: "description must be a non-empty string" })
  }

  if ("command" in t && !isNonEmptyString(t.command)) {
    errors.push({ path: "command", message: "command must be a non-empty string" })
  }

  if ("group" in t && !isNonEmptyString(t.group)) {
    errors.push({ path: "group", message: "group must be a non-empty string" })
  }

  if ("dependsOn" in t && !isStringArray(t.dependsOn)) {
    errors.push({ path: "dependsOn", message: "dependsOn must be an array of strings" })
  }

  if ("tags" in t && !isStringArray(t.tags)) {
    errors.push({ path: "tags", message: "tags must be an array of strings" })
  }

  if ("capabilities" in t && !isStringArray(t.capabilities)) {
    errors.push({ path: "capabilities", message: "capabilities must be an array of strings" })
  }

  if ("estimatedDurationMs" in t) {
    if (typeof t.estimatedDurationMs !== "number" || !Number.isFinite(t.estimatedDurationMs) || t.estimatedDurationMs < 0) {
      errors.push({ path: "estimatedDurationMs", message: "estimatedDurationMs must be a non-negative finite number" })
    }
  }

  if ("lifecycle" in t && t.lifecycle !== undefined) {
    if (!VALID_LIFECYCLES.includes(t.lifecycle as TaskLifecycle)) {
      errors.push({ path: "lifecycle", message: `lifecycle must be one of ${VALID_LIFECYCLES.join(", ")}` })
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true }
}

/**
 * Assert that a value is a valid Task. Throws on failure.
 */
export function assertTask(task: unknown): Task {
  const result = validateTask(task)
  if (!result.ok) {
    const messages = result.errors.map((e) => `${e.path}: ${e.message}`).join("; ")
    throw new Error(`Invalid task: ${messages}`)
  }
  return task as Task
}
