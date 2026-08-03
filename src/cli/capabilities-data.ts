// ============================================================
// CLI: Capabilities Data
// ============================================================
// Shared catalog of CLI capabilities expected by the operator and agent
// surface. This module exists so that `synth capabilities`, `synth status`,
// and `synth explain status` can reason about what the installed CLI can and
// cannot do without creating a circular import with the dispatcher.
// ============================================================

import { classifyInvocation } from "./command-safety.js"

export interface ExpectedCapability {
  id: string
  name: string
  requiredRuntimeCapability?: string
  requiredAdapter?: string
  requiredCommands?: string[]
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
    requiredCommands: ["synth docs generate"],
    commands: ["synth docs generate"],
  },
  {
    id: "event-log-query",
    name: "Event Log Query",
    requiredCommands: ["synth log --expedition <id>"],
    commands: ["synth log --expedition <id>"],
  },
]

/**
 * Return true if the expected capability is satisfied by the installed
 * runtime capabilities, adapters, or implemented CLI command surface.
 */
export function isCapabilityAvailable(
  expected: ExpectedCapability,
  installedCapabilities: Set<string>,
  installedAdapters: Set<string>,
  implementedCommands: Set<string>,
): boolean {
  if (expected.requiredRuntimeCapability) {
    return installedCapabilities.has(expected.requiredRuntimeCapability)
  }
  if (expected.requiredAdapter) {
    return installedAdapters.has(expected.requiredAdapter)
  }
  if (expected.requiredCommands && expected.requiredCommands.length > 0) {
    return expected.requiredCommands.every((cmd) => implementedCommands.has(cmd))
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

function buildMissingCapabilityReason(
  expected: ExpectedCapability,
  implementedCommands: Set<string>,
): string {
  const commands = formatCommandList(expected.commands)
  if (expected.requiredRuntimeCapability) {
    return `The "${expected.name}" runtime capability (${expected.requiredRuntimeCapability}) is not installed. Affected commands: ${commands}.`
  }
  if (expected.requiredAdapter) {
    return `The "${expected.requiredAdapter}" adapter required by "${expected.name}" is not installed. Affected commands: ${commands}.`
  }
  if (expected.requiredCommands && expected.requiredCommands.length > 0) {
    const missing = expected.requiredCommands.filter((cmd) => !implementedCommands.has(cmd))
    return `The "${expected.name}" command surface is missing one or more implemented commands (${missing.join(", ")}). Affected commands: ${commands}.`
  }
  return `The "${expected.name}" command surface is not yet implemented in this CLI version. Affected commands: ${commands}.`
}

export function buildCapabilityEntries(
  installedCapabilities: Set<string>,
  installedAdapters: Set<string>,
  implementedCommands: Set<string> = new Set(),
): CapabilityEntry[] {
  return EXPECTED_CAPABILITIES.map((expected) => {
    const available = isCapabilityAvailable(expected, installedCapabilities, installedAdapters, implementedCommands)
    const entry: CapabilityEntry = {
      id: expected.id,
      name: expected.name,
      status: available ? "available" : "unavailable",
      commands: expected.commands,
    }

    if (!available) {
      entry.reason = buildMissingCapabilityReason(expected, implementedCommands)
      return entry
    }

    if (expected.requiredRuntimeCapability) {
      entry.runtimeCapability = expected.requiredRuntimeCapability
    }
    if (expected.requiredAdapter) {
      entry.provider = expected.requiredAdapter
    }

    return entry
  })
}

// EXP-CAPTRANS-003: representative CLI invocations used to verify that a
// command-surface capability is actually wired in the dispatcher.
const COMMAND_IMPLEMENTATION_TESTS: Record<
  string,
  { rawArgs: string[]; positional: string[]; flags: Record<string, string | boolean>; expected: string }
> = {
  "synth docs generate": {
    rawArgs: ["docs", "generate"],
    positional: ["docs", "generate"],
    flags: {},
    expected: "docs generate",
  },
  "synth log --expedition <id>": {
    rawArgs: ["log", "--expedition", "<id>"],
    positional: ["log"],
    flags: { expedition: "<id>" },
    expected: "log",
  },
}

/**
 * Build the set of command-surface capabilities whose representative
 * invocations classify to a wired dispatcher handler.
 *
 * Exported so the runtime governance resolver can produce the same capability
 * projection used by `synth capabilities` and `synth status`.
 */
export function buildImplementedCommandSet(): Set<string> {
  const implemented = new Set<string>()
  for (const expected of EXPECTED_CAPABILITIES) {
    for (const cmd of expected.requiredCommands ?? []) {
      const test = COMMAND_IMPLEMENTATION_TESTS[cmd]
      if (!test) continue
      const classified = classifyInvocation(test.rawArgs, test.positional, test.flags)
      if (classified === test.expected) {
        implemented.add(cmd)
      }
    }
  }
  return implemented
}
