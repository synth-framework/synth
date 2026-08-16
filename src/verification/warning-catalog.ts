// ============================================================
// VERIFICATION ENGINE: Warning Catalog
// ============================================================
// Stable warning codes and actionable fixes for persistent CLI
// warnings. Each entry provides a deterministic recovery path.
// ============================================================

export type WarningEntry = {
  code: string
  message: string
  severity: "warning" | "error"
  fixCommand?: string
  manualStep?: string
}

const CATALOG: Record<string, WarningEntry> = {
  "WARN-DOCS-001": {
    code: "WARN-DOCS-001",
    message: "Generated documentation '{{file}}' lacks required provenance metadata.",
    severity: "warning",
    fixCommand: "synth docs generate --provenance",
  },
}

function getWarningEntry(code: string): WarningEntry | undefined {
  return CATALOG[code]
}

export function formatWarningMessage(code: string, variables: Record<string, string>): WarningEntry | undefined {
  const entry = CATALOG[code]
  if (!entry) return undefined
  let message = entry.message
  for (const [key, value] of Object.entries(variables)) {
    message = message.replaceAll(`{{${key}}}`, value)
  }
  return { ...entry, message }
}
