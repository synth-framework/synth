// ============================================================
// SYNTH Impact Analyzer
// ============================================================
// Determines the blast radius of a change set so that the Validation
// Planner can compile the minimum sound validation plan.
// ============================================================

import { spawnSync } from "child_process"
import { detectProtectedAssets } from "./protected-assets.js"

export type RiskLevel = "low" | "medium" | "high"

export interface ImpactReport {
  files: string[]
  affectedCapabilities: string[]
  protectedAssets: string[]
  risk: RiskLevel
}

export interface FileClassification {
  capability: string
  protectedAsset?: string
  risk: RiskLevel
}

interface MappingRule {
  pattern: RegExp
  capability: string | ((match: RegExpMatchArray) => string)
  protectedAsset?: string
  risk?: RiskLevel
}

const DEFAULT_RULES: MappingRule[] = [
  // Protected Assets — highest escalation
  { pattern: /^src\/mission-studio\//, capability: "MissionStudio", protectedAsset: "Mission Studio", risk: "high" },
  { pattern: /^src\/genesis\//, capability: "Genesis", protectedAsset: "Genesis", risk: "high" },
  { pattern: /^src\/core\/replay/, capability: "Replay", protectedAsset: "Replay", risk: "high" },
  { pattern: /^src\/runtime\//, capability: "Runtime", protectedAsset: "Runtime", risk: "high" },
  { pattern: /^src\/control\//, capability: "ExecutionGate", protectedAsset: "ExecutionGate", risk: "high" },
  { pattern: /^src\/types\/event/, capability: "EventModel", protectedAsset: "Event Model", risk: "high" },
  { pattern: /^src\/capability\//, capability: "CapabilityModel", protectedAsset: "Capability Model", risk: "high" },
  { pattern: /^docs\/architecture\/constitution/, capability: "Constitution", protectedAsset: "Constitutional Baseline", risk: "high" },
  { pattern: /^docs\/adr\//, capability: "ArchitectureDecisionRecords", protectedAsset: "Constitutional Baseline", risk: "high" },

  // Core execution infrastructure
  { pattern: /^src\/core\//, capability: "Core", risk: "high" },
  { pattern: /^src\/domain\//, capability: "Domain", risk: "high" },
  { pattern: /^src\/policy\//, capability: "Policy", risk: "high" },
  { pattern: /^src\/command\//, capability: "CommandBus", risk: "high" },

  // Adapters and medium-risk subsystems
  { pattern: /^src\/adapters\/([^/]+)\//, capability: (m) => `${toPascalCase(m[1])}Adapter`, risk: "medium" },
  { pattern: /^src\/adapters\//, capability: "AdapterRegistry", risk: "medium" },
  { pattern: /^src\/api\//, capability: "SynthAPI", risk: "medium" },
  { pattern: /^src\/validation\//, capability: "Validation", risk: "medium" },
  { pattern: /^src\/governance\/protected-assets/, capability: "ProtectedAssets", risk: "medium" },
  { pattern: /^src\/governance\//, capability: "Governance", risk: "medium" },
  { pattern: /^src\/workspace\//, capability: "Workspace", risk: "medium" },
  { pattern: /^src\/planning\//, capability: "Planning", risk: "medium" },
  { pattern: /^src\/compiler\//, capability: "Compiler", risk: "medium" },
  { pattern: /^src\/observability\//, capability: "Observability", risk: "medium" },
  { pattern: /^src\/cli\//, capability: "CLI", risk: "medium" },
  { pattern: /^src\/documentation\//, capability: "DocumentationProjection", risk: "medium" },

  // Low-risk surface
  { pattern: /^docs\//, capability: "Documentation", risk: "low" },
  { pattern: /^website\//, capability: "Website", risk: "low" },
  { pattern: /^tests\//, capability: "Tests", risk: "low" },
  { pattern: /^scripts\//, capability: "Scripts", risk: "low" },
  { pattern: /^examples\//, capability: "Examples", risk: "low" },
  { pattern: /^\.github\//, capability: "GitHubActions", risk: "low" },
  { pattern: /^\.githooks\//, capability: "GitHooks", risk: "low" },
  { pattern: /^README\.md$/i, capability: "Documentation", risk: "low" },
  { pattern: /^CONTRIBUTING\.md$/i, capability: "Documentation", risk: "low" },
  { pattern: /^CHANGELOG\.md$/i, capability: "Documentation", risk: "low" },
  { pattern: /^SECURITY\.md$/i, capability: "Documentation", risk: "low" },
  { pattern: /^CODE_OF_CONDUCT\.md$/i, capability: "Documentation", risk: "low" },
  { pattern: /^LICENSE$/i, capability: "Documentation", risk: "low" },
  { pattern: /^\.gitignore$/i, capability: "RepositoryConfig", risk: "low" },
]

const FALLBACK_CLASSIFICATION: FileClassification = {
  capability: "Unknown",
  risk: "medium",
}

function toPascalCase(input: string): string {
  return input
    .split(/[-_]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("")
}

function classifyFile(filePath: string): FileClassification {
  for (const rule of DEFAULT_RULES) {
    const match = filePath.match(rule.pattern)
    if (match) {
      const capability = typeof rule.capability === "function" ? rule.capability(match) : rule.capability
      return {
        capability,
        protectedAsset: rule.protectedAsset,
        risk: rule.risk ?? "medium",
      }
    }
  }
  return FALLBACK_CLASSIFICATION
}

export function analyzeFiles(files: string[]): ImpactReport {
  const affectedCapabilities = new Set<string>()
  let maxRisk: RiskLevel = "low"

  for (const file of files) {
    const classification = classifyFile(file)
    affectedCapabilities.add(classification.capability)
    if (riskRank(classification.risk) > riskRank(maxRisk)) {
      maxRisk = classification.risk
    }
  }

  // Detect Protected Assets using the canonical catalog (ADR-004).
  const protectedAssets = detectProtectedAssets(files)

  // Any Protected Asset touched forces high risk regardless of other files.
  if (protectedAssets.length > 0) {
    maxRisk = "high"
  }

  return {
    files: Array.from(new Set(files)).sort(),
    affectedCapabilities: Array.from(affectedCapabilities).sort(),
    protectedAssets,
    risk: maxRisk,
  }
}

function riskRank(risk: RiskLevel): number {
  switch (risk) {
    case "low":
      return 1
    case "medium":
      return 2
    case "high":
      return 3
  }
}

export function parseDiff(diffText: string): string[] {
  const files: string[] = []
  for (const line of diffText.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Rename lines: "R100\told\tnew" — use the destination path.
    const renameMatch = trimmed.match(/^R\d+\s+\S+\s+(.+)$/)
    if (renameMatch) {
      files.push(renameMatch[1])
      continue
    }

    // git diff --name-status output: "M\tpath" or "A\tpath" or "D\tpath"
    const nameStatusMatch = trimmed.match(/^[AMDTCU]\d*\s+(.+)$/)
    if (nameStatusMatch) {
      // Skip deleted files — they no longer exist to validate.
      if (trimmed.startsWith("D")) continue
      files.push(nameStatusMatch[1])
      continue
    }

    // git diff --name-only output: just the path
    if (!trimmed.includes("\t") && !trimmed.startsWith("diff --git")) {
      files.push(trimmed)
    }
  }
  return Array.from(new Set(files))
}

export function getWorkingTreeDiff(): string {
  const result = spawnSync("git", ["diff", "--name-status", "HEAD"], {
    encoding: "utf-8",
    timeout: 30000,
  })
  return result.stdout || ""
}

export function getChangedFilesFromDiff(diffText?: string): string[] {
  const text = diffText ?? getWorkingTreeDiff()
  return parseDiff(text)
}

export function analyzeDiff(diffText?: string): ImpactReport {
  const files = getChangedFilesFromDiff(diffText)
  return analyzeFiles(files)
}
