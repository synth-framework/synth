let agentTelemetry: Record<string, unknown> = {}
let humanMode = false

export function setAgentTelemetry(data: Record<string, unknown>) {
  agentTelemetry = data
}

export function setHumanMode(enabled: boolean) {
  humanMode = enabled
}

export function isHumanMode(): boolean {
  return humanMode
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
  if (humanMode) {
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
  if (humanMode) {
    const parts = [`Error: ${error}`]
    if (typeof details.suggestion === "string") parts.push(`Suggestion: ${details.suggestion}`)
    if (typeof details.nextStep === "string") parts.push(`Next step: ${details.nextStep}`)
    console.log(parts.join("\n"))
  } else {
    printJson({ status: "error", kind, error, ...details })
  }
  process.exit(code)
}
