// ============================================================
// CLI: Capabilities Data
// ============================================================
// Shared, dependency-free catalog of CLI capabilities expected by
// the operator and agent surface. This module exists so that both
// `synth capabilities` and `synth explain status` can reason about
// what the installed CLI can and cannot do without creating a
// circular import with the dispatcher.
// ============================================================

export interface ExpectedCapability {
  id: string
  name: string
  requiredRuntimeCapability?: string
  requiredAdapter?: string
  commands: string[]
}

export type CapabilityEntry = {
  id: string
  name: string
  status: "available" | "unavailable"
  commands: string[]
  reason?: string
  runtimeCapability?: string
  provider?: string
}

// EXP-CAPTRANS-001: curated expected capabilities used to surface gaps
// between what the CLI advertises and what is actually installed.
export const EXPECTED_CAPABILITIES: ExpectedCapability[] = [
  {
    id: "convergence-certification",
    name: "Convergence Certification",
    requiredRuntimeCapability: "CertifyConvergence",
    commands: ["synth expedition certify", "synth expedition complete"],
  },
  {
    id: "mission-management",
    name: "Mission Management",
    requiredRuntimeCapability: "CreateMission",
    commands: ["synth mission create", "synth mission approve"],
  },
  {
    id: "expedition-lifecycle",
    name: "Expedition Lifecycle",
    requiredRuntimeCapability: "CreateExpedition",
    commands: [
      "synth expedition create",
      "synth expedition approve",
      "synth expedition commit",
      "synth expedition start",
      "synth expedition complete",
    ],
  },
  {
    id: "repository-adapter",
    name: "Repository Adapter",
    requiredAdapter: "repository",
    commands: ["synth adapter list", "synth adapter commit", "synth adapter create-branch"],
  },
  {
    id: "documentation-generation",
    name: "Documentation Generation",
    commands: ["synth docs generate"],
  },
  {
    id: "event-log-query",
    name: "Event Log Query",
    commands: ["synth log --expedition <id>"],
  },
]

/**
 * Return true if the expected capability is satisfied by the installed
 * runtime capabilities and adapters.
 */
export function isCapabilityAvailable(
  expected: ExpectedCapability,
  installedCapabilities: Set<string>,
  installedAdapters: Set<string>,
): boolean {
  if (expected.requiredRuntimeCapability) {
    return installedCapabilities.has(expected.requiredRuntimeCapability)
  }
  if (expected.requiredAdapter) {
    return installedAdapters.has(expected.requiredAdapter)
  }
  // Capabilities that exist only as a planned command surface and have no
  // runtime backing are reported as unavailable until implemented.
  return false
}

/**
 * Build the capability report entries consumed by `synth capabilities` and
 * by diagnostic commands such as `synth explain status`.
 */
function formatCommandList(commands: string[]): string {
  return commands.length === 1 ? commands[0] : commands.join(", ")
}

function buildMissingCapabilityReason(expected: ExpectedCapability): string {
  const commands = formatCommandList(expected.commands)
  if (expected.requiredRuntimeCapability) {
    return `The "${expected.name}" runtime capability (${expected.requiredRuntimeCapability}) is not installed. Affected commands: ${commands}.`
  }
  if (expected.requiredAdapter) {
    return `The "${expected.requiredAdapter}" adapter required by "${expected.name}" is not installed. Affected commands: ${commands}.`
  }
  return `The "${expected.name}" command surface is not yet implemented in this CLI version. Affected commands: ${commands}.`
}

export function buildCapabilityEntries(
  installedCapabilities: Set<string>,
  installedAdapters: Set<string>,
): CapabilityEntry[] {
  return EXPECTED_CAPABILITIES.map((expected) => {
    const entry: CapabilityEntry = {
      id: expected.id,
      name: expected.name,
      status: "available",
      commands: expected.commands,
    }

    if (expected.requiredRuntimeCapability) {
      if (!installedCapabilities.has(expected.requiredRuntimeCapability)) {
        entry.status = "unavailable"
        entry.reason = buildMissingCapabilityReason(expected)
      } else {
        entry.runtimeCapability = expected.requiredRuntimeCapability
      }
    }

    if (expected.requiredAdapter) {
      if (!installedAdapters.has(expected.requiredAdapter)) {
        entry.status = "unavailable"
        entry.reason = buildMissingCapabilityReason(expected)
      } else {
        entry.provider = expected.requiredAdapter
      }
    }

    if (!expected.requiredRuntimeCapability && !expected.requiredAdapter) {
      entry.status = "unavailable"
      entry.reason = buildMissingCapabilityReason(expected)
    }

    return entry
  })
}
