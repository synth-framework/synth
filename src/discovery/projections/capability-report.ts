// ============================================================
// DISCOVERY PROJECTION: Capability Report
// ============================================================
// Agent-facing projection of discovery evidence (ADR-016).
// Every constitutional capability family appears explicitly —
// unsupported families are stated, never omitted — so AI agents
// plan against evidence instead of environmental assumptions.
// ============================================================

import type {
  CapabilityFamily,
  DiscoveryConfidence,
  DiscoveryEvidence,
} from "../types.js"

/** All constitutional capability families (ADR-006 §2) */
export const CAPABILITY_FAMILIES: readonly CapabilityFamily[] = [
  "Environment",
  "Workspace",
  "Filesystem",
  "Revision",
  "Process",
  "Tool",
  "Runtime",
  "Package",
  "Network",
  "Forge",
  "Secrets",
  "Identity",
]

/** One capability family's planning-relevant status */
export type CapabilityReportEntry = {
  family: CapabilityFamily
  status: "supported" | "degraded" | "unsupported"
  provider?: string
  confidence: DiscoveryConfidence
  reason: string
}

/** Agent-facing capability report projection */
export type CapabilityReport = {
  schema: "synth-capability-report-v1"
  generatedAt: number
  environment: {
    platform: string
    classification: DiscoveryEvidence["environment"]["classification"]
  }
  capabilities: CapabilityReportEntry[]
  unavailable: CapabilityFamily[]
  assumptions: string[]
  guidance: string[]
}

/** Constitutional planning guidance embedded in every report */
export const CAPABILITY_PLANNING_GUIDANCE: readonly string[] = [
  "Plan against this report, not against environmental assumptions.",
  "Do not assume Git, npm, GitHub, or any specific tool unless it appears as supported above.",
  "If a required capability is degraded or unsupported, select an alternative approach or provider before planning.",
  "Regenerate this report after any environment change; it is a projection of discovery evidence.",
]

/** Project a Capability Report from discovery evidence */
export function buildCapabilityReport(evidence: DiscoveryEvidence, generatedAt: number = Date.now()): CapabilityReport {
  const compatibilityByFamily = new Map(evidence.compatibility.map((c) => [c.family, c]))
  const providerByFamily = new Map(evidence.providers.map((p) => [p.family, p]))
  const capabilityByFamily = new Map(evidence.capabilities.map((c) => [c.family, c]))

  const capabilities: CapabilityReportEntry[] = CAPABILITY_FAMILIES.map((family) => {
    const compatibility = compatibilityByFamily.get(family)
    const provider = providerByFamily.get(family)
    const capability = capabilityByFamily.get(family)

    if (!compatibility) {
      return {
        family,
        status: "unsupported",
        confidence: "none",
        reason: "No discovery evidence for this capability family",
      }
    }

    const providerName = provider && provider.providerName !== "none" ? provider.providerName : undefined
    return {
      family,
      status: compatibility.decision === "configured" ? "supported" : compatibility.decision,
      provider: providerName,
      confidence: capability?.confidence ?? "none",
      reason: compatibility.reason,
    }
  })

  return {
    schema: "synth-capability-report-v1",
    generatedAt,
    environment: {
      platform: evidence.environment.platform,
      classification: evidence.environment.classification,
    },
    capabilities,
    unavailable: capabilities.filter((c) => c.status !== "supported").map((c) => c.family),
    assumptions: evidence.assumptions.map((a) => a.assumption),
    guidance: [...CAPABILITY_PLANNING_GUIDANCE],
  }
}

function renderRow(entry: CapabilityReportEntry): string {
  return `| ${entry.family} | ${entry.status} | ${entry.provider ?? "—"} | ${entry.confidence} | ${entry.reason} |`
}

/** Render the report as agent-consumable markdown */
export function renderCapabilityReportMarkdown(report: CapabilityReport): string {
  const supported = report.capabilities.filter((c) => c.status === "supported")
  const unavailable = report.capabilities.filter((c) => c.status !== "supported")

  const lines: string[] = [
    "# Environment Capability Report",
    "",
    `- **Schema:** ${report.schema}`,
    `- **Environment:** ${report.environment.platform} (${report.environment.classification})`,
    `- **Generated:** ${new Date(report.generatedAt).toISOString()}`,
    "",
    "## Available Capabilities",
    "",
  ]

  if (supported.length === 0) {
    lines.push("No capabilities are currently supported in this environment.", "")
  } else {
    lines.push("| Capability | Status | Provider | Confidence | Reason |", "|---|---|---|---|---|")
    for (const entry of supported) lines.push(renderRow(entry))
    lines.push("")
  }

  lines.push("## Unavailable or Degraded Capabilities", "")
  if (unavailable.length === 0) {
    lines.push("All capability families are supported.", "")
  } else {
    lines.push("| Capability | Status | Reason |", "|---|---|---|")
    for (const entry of unavailable) lines.push(`| ${entry.family} | ${entry.status} | ${entry.reason} |`)
    lines.push("")
  }

  lines.push("## Environmental Assumptions", "")
  if (report.assumptions.length === 0) {
    lines.push("No environmental assumptions recorded.", "")
  } else {
    for (const assumption of report.assumptions) lines.push(`- ${assumption}`)
    lines.push("")
  }

  lines.push("## Planning Guidance", "")
  for (const rule of report.guidance) lines.push(`- ${rule}`)
  lines.push("")

  return lines.join("\n")
}
