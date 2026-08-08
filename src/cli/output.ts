// ============================================================
// SYNTH v2 — CLI Output Modes
// ============================================================
// Centralizes quiet/summary/human output modes so commands can
// emit structured JSON while still respecting operator preference.
// ============================================================

import fs from "fs"
import path from "path"
import { dataDir, legacyDataDir } from "../sdk/paths/index.js"

let quietMode = false
let summaryMode = false
let humanMode = false
let agentTelemetry: Record<string, unknown> = {}

export function setAgentTelemetry(data: Record<string, unknown>) {
  agentTelemetry = data
}

export function setHumanMode(enabled: boolean) {
  humanMode = enabled
}

export function isHumanMode(): boolean {
  return humanMode
}

export function setQuietMode(enabled: boolean) {
  quietMode = enabled
  if (enabled) {
    process.env.SYNTH_QUIET_LOGS = "1"
  }
}

export function isQuietMode(): boolean {
  return quietMode || process.env.SYNTH_QUIET_LOGS === "1"
}

export function setSummaryMode(enabled: boolean) {
  summaryMode = enabled
}

export function isSummaryMode(): boolean {
  return summaryMode
}

export interface ErrorDetails {
  /** Stable machine-readable error code. */
  code?: string
  /** Failure domain: validation, runtime, governance, configuration, io, etc. */
  category?: string
  /** Human-readable recovery hint. */
  suggestion?: string
  /** Link or path to relevant documentation. */
  documentation?: string
  /** Additional structured context; merged into the output object. */
  [key: string]: unknown
}

/**
 * Append a structured error record to a local CLI error log.
 *
 * This log is intentionally outside the durable event store: printError can be
 * called before bootstrap completes, so we cannot rely on the ExecutionGate or
 * canonical event log. The local log is replay-safe because it is derived from
 * CLI invocations and can be truncated or rotated by operators.
 *
 * Governed projects:  .synth/data/cli-errors.jsonl
 * Legacy projects:    data/cli-errors.jsonl
 */
export function logCliError(record: Record<string, unknown>): void {
  try {
    const cwd = process.cwd()
    const governedDir = dataDir(cwd)
    const legacyDir = legacyDataDir(cwd)
    const targetDir = fs.existsSync(governedDir) ? governedDir : legacyDir
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    const logPath = path.join(targetDir, "cli-errors.jsonl")
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      cwd,
      ...record,
    }) + "\n"
    fs.appendFileSync(logPath, line, "utf-8")
  } catch {
    // Best-effort: never let error logging crash the CLI.
  }
}

function renderSummary(obj: unknown): string {
  if (typeof obj !== "object" || obj === null) return String(obj)
  const data = obj as Record<string, unknown>
  const lines: string[] = []

  if (typeof data.status === "string") {
    lines.push(`status: ${data.status}`)
  }
  if (typeof data.kind === "string") {
    lines.push(`kind: ${data.kind}`)
  }
  if (typeof data.id === "string") {
    lines.push(`id: ${data.id}`)
  } else if (typeof data.draftId === "string") {
    lines.push(`draftId: ${data.draftId}`)
  } else if (typeof data.missionId === "string") {
    lines.push(`missionId: ${data.missionId}`)
  } else if (typeof data.expeditionId === "string") {
    lines.push(`expeditionId: ${data.expeditionId}`)
  }
  if (typeof data.nextStep === "string") {
    lines.push(`nextStep: ${data.nextStep}`)
  }
  if (Array.isArray(data.nextActions) && data.nextActions.length > 0) {
    const first = data.nextActions[0] as Record<string, unknown>
    if (typeof first.command === "string") {
      lines.push(`nextAction: ${first.command}`)
    }
  }

  if (lines.length === 0) {
    // Fallback: scalar summary of top-level fields
    const entries = Object.entries(data)
      .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
      .slice(0, 6)
    return entries.map(([k, v]) => `${k}: ${v}`).join("\n")
  }

  return lines.join("\n")
}

function renderHuman(obj: unknown): string {
  if (typeof obj !== "object" || obj === null) return String(obj)
  const data = obj as Record<string, unknown>

  // Status / operator briefing
  if (data.phase && typeof data.phase === "string") {
    const lines: string[] = []
    const projectName = typeof data.projectName === "string" ? data.projectName : undefined
    const summary = typeof data.summary === "string" ? data.summary : undefined
    lines.push(projectName ? `Project: ${projectName}` : `Status: ${summary ?? data.status ?? "unknown"}`)
    lines.push(`Phase: ${data.phase}`)
    const missions = Array.isArray(data.missions) ? data.missions : []
    const activeMission = missions.find((m: any) => m.status === "active")
    if (activeMission) {
      lines.push(`Active mission: ${activeMission.name} (${activeMission.id})`)
    }
    const expeditions = Array.isArray(data.expeditions) ? data.expeditions : []
    const activeExpedition = expeditions.find((e: any) => e.status === "executing" || e.status === "committed")
    if (activeExpedition) {
      lines.push(`Active expedition: ${activeExpedition.name} (${activeExpedition.id}) — ${activeExpedition.status}`)
    }
    const nextActions = Array.isArray(data.nextActions) ? data.nextActions : []
    if (nextActions.length > 0) {
      const top = nextActions[0]
      lines.push(`Next step: ${top.command}${top.reason ? ` — ${top.reason}` : ""}`)
    }
    const blockers = Array.isArray(data.blockers) ? data.blockers : []
    lines.push(blockers.length === 0 ? "No blockers." : `Blockers: ${blockers.length}`)
    return lines.join("\n")
  }

  // Validation plan
  if (data.kind === "ValidationPlan") {
    const run = Array.isArray(data.run) ? data.run : []
    const skip = Array.isArray(data.skip) ? data.skip : []
    return `Validation plan: ${run.length} to run, ${skip.length} to skip${data.reason ? `\nReason: ${data.reason}` : ""}`
  }

  // Generic ok result
  if (data.status === "ok" && typeof data.kind === "string") {
    return `${data.kind}: ok`
  }

  // Fallback: pretty key-value summary of top-level scalar fields
  const entries = Object.entries(data)
    .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .slice(0, 8)
  if (entries.length === 0) return JSON.stringify(data, null, 2)
  return entries.map(([k, v]) => `${k}: ${v}`).join("\n")
}

export function printJson(obj: unknown) {
  const output =
    typeof obj === "object" && obj !== null
      ? { ...(obj as Record<string, unknown>), ...agentTelemetry }
      : obj
  if (summaryMode) {
    console.log(renderSummary(output))
  } else if (humanMode) {
    console.log(renderHuman(output))
  } else {
    console.log(JSON.stringify(output, null, 2))
  }
}

/**
 * Emit a deterministic, machine-readable error and exit.
 *
 * Backward-compatible signatures:
 *   printError(message, kind, code)
 *   printError(message, { code, category, suggestion, documentation, ... }, code)
 *
 * Output shape (stable):
 *   { status: "error", kind: <code|string>, error: <message>, ...details }
 */
export function printError(error: string, kindOrDetails: string | ErrorDetails = "CLIError", code = 1): never {
  let kind = "CLIError"
  const details: ErrorDetails = {}
  if (typeof kindOrDetails === "string") {
    kind = kindOrDetails
  } else {
    Object.assign(details, kindOrDetails)
    if (typeof kindOrDetails.code === "string") {
      kind = kindOrDetails.code
    }
  }
  const output = summaryMode
    ? { status: "error", kind, error, ...details }
    : humanMode
      ? { status: "error", kind, error, ...details }
      : { status: "error", kind, error, ...details }
  logCliError({
    kind,
    error,
    exitCode: code,
    mode: summaryMode ? "summary" : humanMode ? "human" : "json",
    ...details,
  })
  if (summaryMode) {
    console.log(`status: error\nkind: ${kind}\nerror: ${error}`)
  } else if (humanMode) {
    const parts = [`Error: ${error}`]
    if (typeof details.suggestion === "string") parts.push(`Suggestion: ${details.suggestion}`)
    if (typeof details.nextStep === "string") parts.push(`Next step: ${details.nextStep}`)
    console.log(parts.join("\n"))
  } else {
    printJson({ status: "error", kind, error, ...details })
  }
  process.exit(code)
}
