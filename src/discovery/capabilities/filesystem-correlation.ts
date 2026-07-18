// ============================================================
// DISCOVERY CAPABILITY: Filesystem Correlation
// ============================================================
// Contributes correlation rules for filesystem observations.
//
// The core correlator is source-agnostic. This capability registers
// rules that interpret filesystem-specific observations into evidence
// claims.
// ============================================================

import type { ConfidenceScore, CorrelationCapability, CorrelationRule } from "../types.js"

function deterministicConfidence(
  value: number,
  reason: string,
): ConfidenceScore {
  let label: ConfidenceScore["label"] = "none"
  if (value >= 0.95) label = "certain"
  else if (value >= 0.8) label = "high"
  else if (value >= 0.5) label = "medium"
  else if (value >= 0.2) label = "low"

  return {
    value,
    label,
    kind: "deterministic",
    reason,
  }
}

export const FILESYSTEM_CORRELATION_CAPABILITY_ID = "discovery:filesystem-correlation"
export const FILESYSTEM_CORRELATION_CAPABILITY_VERSION = "1.0.0"

/**
 * Create the filesystem correlation capability.
 *
 * Registers rules that transform filesystem observations into evidence
 * claims consumed by downstream projections.
 */
export function createFilesystemCorrelationCapability(): CorrelationCapability {
  return {
    id: FILESYSTEM_CORRELATION_CAPABILITY_ID,
    version: FILESYSTEM_CORRELATION_CAPABILITY_VERSION,

    registerRules(): CorrelationRule[] {
      return [
        {
          id: "filesystem:source-directory",
          priority: 100,
          requiredFacts: ["filesystem directory exists"],
          assertion: "Source directory observed",
          confidence: deterministicConfidence(1.0, "Filesystem directory exists"),
        },
        {
          id: "filesystem:implementation-directory",
          priority: 95,
          requiredFacts: ["directory exists"],
          payloadConstraints: { "directory exists": { kind: "implementation" } },
          assertion: "Implementation directory observed",
          confidence: deterministicConfidence(1.0, "Implementation directory exists"),
        },
        {
          id: "filesystem:tests-directory",
          priority: 95,
          requiredFacts: ["directory exists"],
          payloadConstraints: { "directory exists": { kind: "tests" } },
          assertion: "Tests directory observed",
          confidence: deterministicConfidence(1.0, "Tests directory exists"),
        },
        {
          id: "filesystem:docs-directory",
          priority: 95,
          requiredFacts: ["directory exists"],
          payloadConstraints: { "directory exists": { kind: "docs" } },
          assertion: "Docs directory observed",
          confidence: deterministicConfidence(1.0, "Docs directory exists"),
        },
        {
          id: "filesystem:architecture-directory",
          priority: 95,
          requiredFacts: ["directory exists"],
          payloadConstraints: { "directory exists": { kind: "architecture" } },
          assertion: "Architecture documentation present",
          confidence: deterministicConfidence(1.0, "Architecture directory exists"),
        },
        {
          id: "filesystem:node-manifest",
          priority: 90,
          requiredFacts: ["manifest detected"],
          payloadConstraints: { "manifest detected": { type: "node" } },
          assertion: "Node.js project manifest present",
          confidence: deterministicConfidence(1.0, "package.json manifest detected"),
        },
        {
          id: "filesystem:documentation",
          priority: 80,
          requiredFacts: ["file exists"],
          payloadConstraints: { "file exists": { kind: "readme" } },
          assertion: "Documentation present",
          confidence: deterministicConfidence(1.0, "README.md exists"),
        },
      ]
    },
  }
}
