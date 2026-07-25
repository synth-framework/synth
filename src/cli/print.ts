let agentTelemetry: Record<string, unknown> = {}

export function setAgentTelemetry(data: Record<string, unknown>) {
  agentTelemetry = data
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

export function printJson(obj: unknown) {
  const output =
    typeof obj === "object" && obj !== null
      ? { ...(obj as Record<string, unknown>), ...agentTelemetry }
      : obj
  console.log(JSON.stringify(output, null, 2))
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
  printJson({ status: "error", kind, error, ...details })
  process.exit(code)
}
