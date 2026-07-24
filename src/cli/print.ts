let agentTelemetry: Record<string, unknown> = {}

export function setAgentTelemetry(data: Record<string, unknown>) {
  agentTelemetry = data
}

export function printJson(obj: unknown) {
  const output =
    typeof obj === "object" && obj !== null
      ? { ...(obj as Record<string, unknown>), ...agentTelemetry }
      : obj
  console.log(JSON.stringify(output, null, 2))
}

export function printError(error: string, kind = "CLIError", code = 1): never {
  printJson({ status: "error", kind, error })
  process.exit(code)
}
