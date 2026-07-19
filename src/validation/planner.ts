// ============================================================
// SYNTH Validation Planner
// ============================================================
// Compiles a minimum sound validation plan from an impact report and
// the capability-to-test mapping. Preserves the constitutional
// guarantee that Protected Asset changes trigger full governance.
// ============================================================

import type { ImpactReport, RiskLevel } from "../governance/impact-analyzer.js"

export type GovernanceClass = "documentation" | "knowledge" | "runtime" | "kernel" | "compiler" | "release" | "design" | "tests"

export interface CapabilityValidationEntry {
  unitTests: string[]
  integrationTests: string[]
  benchmarks: string[]
  proofs: string[]
  lintScope: string[]
  typecheckScope: string[]
  protectedAsset?: string
  governanceClass?: GovernanceClass
}

export interface CapabilityValidationMap {
  schema: string
  description?: string
  lintScope: string[]
  typecheckScope: string[]
  capabilities: Record<string, CapabilityValidationEntry>
}

export interface ValidationPlan {
  run: string[]
  skip: string[]
  confidence: number
  protectedAssetsTouched: boolean
  risk: RiskLevel
  reason: string
  governanceClasses: GovernanceClass[]
  explanations: Record<string, string>
  profile?: string
}

export interface PlannerOptions {
  /** All npm scripts available in the project. */
  availableScripts: string[]
  /** Name of the full governance script. */
  fullGovernScript?: string
  /** Script name for lint. */
  lintScript?: string
  /** Script name for typecheck. */
  typecheckScript?: string
  /** Certification profile. */
  profile?: string
}

const SCRIPT_ORDER = [
  "lint",
  "typecheck",
  "unitTests",
  "integrationTests",
  "benchmarks",
  "proofs",
]

const GOVERNANCE_CLASS_ORDER: GovernanceClass[] = [
  "documentation",
  "knowledge",
  "runtime",
  "kernel",
  "compiler",
  "release",
  "design",
  "tests",
]

function getGovernanceClass(capability: string): GovernanceClass {
  const normalized = capability.toLowerCase()
  if (normalized.includes("documentation") || normalized.includes("website") || normalized === "examples") return "documentation"
  if (
    normalized.includes("knowledge") ||
    normalized.includes("domain") ||
    normalized.includes("genesis") ||
    normalized.includes("mission") ||
    normalized.includes("expedition") ||
    normalized.includes("planning") ||
    normalized.includes("objective") ||
    normalized.includes("wizard")
  ) {
    return "knowledge"
  }
  if (
    normalized.includes("runtime") ||
    normalized.includes("replay") ||
    normalized.includes("event") ||
    normalized.includes("execution") ||
    normalized.includes("command") ||
    normalized.includes("core")
  ) {
    return "runtime"
  }
  if (normalized.includes("kernel") || normalized.includes("capability") || normalized.includes("policy") || normalized.includes("observability") || normalized.includes("control")) {
    return "kernel"
  }
  if (normalized.includes("compiler") || (normalized.includes("adapter") && !normalized.includes("github"))) return "compiler"
  if (normalized.includes("release") || normalized.includes("github") || normalized.includes("repository") || normalized.includes("installer") || normalized.includes("versioning")) {
    return "release"
  }
  if (normalized.includes("studio") || normalized.includes("design") || normalized.includes("workspace")) return "design"
  return "tests"
}

function getGovernanceClasses(capabilities: string[], map: CapabilityValidationMap): GovernanceClass[] {
  const classes = new Set<GovernanceClass>()
  for (const capability of capabilities) {
    const entry = map.capabilities[capability]
    if (entry?.governanceClass) {
      classes.add(entry.governanceClass)
    } else {
      classes.add(getGovernanceClass(capability))
    }
  }
  return GOVERNANCE_CLASS_ORDER.filter((c) => classes.has(c))
}

function getAffectedGovernanceClasses(report: ImpactReport, map: CapabilityValidationMap): GovernanceClass[] {
  return getGovernanceClasses(report.affectedCapabilities, map)
}

function explainSkip(script: string, reason: string): string {
  if (reason.includes("Protected Asset")) return reason
  return `No affected capability requires '${script}'.`
}

function collectScripts(
  capabilities: string[],
  map: CapabilityValidationMap,
  field: keyof CapabilityValidationEntry,
): string[] {
  const scripts = new Set<string>()
  for (const capability of capabilities) {
    const entry = map.capabilities[capability]
    if (!entry) continue
    const values = entry[field]
    if (Array.isArray(values)) {
      for (const script of values) {
        scripts.add(script)
      }
    }
  }
  return Array.from(scripts)
}

function hasScope(capabilities: string[], map: CapabilityValidationMap, scopeField: "lintScope" | "typecheckScope"): boolean {
  for (const capability of capabilities) {
    const entry = map.capabilities[capability]
    if (!entry) continue
    const scope = entry[scopeField]
    if (Array.isArray(scope) && scope.length > 0) return true
  }
  return false
}

function orderScripts(scripts: string[], options: PlannerOptions): string[] {
  const { lintScript = "lint", typecheckScript = "typecheck" } = options
  const input = new Set(scripts)

  const ordered: string[] = []
  const seen = new Set<string>()

  const add = (script: string) => {
    if (!script || seen.has(script)) return
    if (!input.has(script)) return
    if (!options.availableScripts.includes(script)) return
    ordered.push(script)
    seen.add(script)
  }

  // 1. Lint
  add(lintScript)

  // 2. Typecheck
  add(typecheckScript)

  // 3. Unit tests
  for (const script of scripts) {
    if (script.startsWith("test:") && !script.includes("integration") && script !== lintScript && script !== typecheckScript) {
      add(script)
    }
  }

  // 4. Integration tests
  for (const script of scripts) {
    if (script.startsWith("test:") && script.includes("integration")) {
      add(script)
    }
  }

  // 5. Benchmarks
  for (const script of scripts) {
    if (script.includes("benchmark")) {
      add(script)
    }
  }

  // 6. Proofs / governance audits
  for (const script of scripts) {
    if (
      script.includes("proof") ||
      script.includes("audit") ||
      script.includes("freeze") ||
      script.includes("govern")
    ) {
      add(script)
    }
  }

  // 7. Any remaining scripts in input order
  for (const script of scripts) {
    add(script)
  }

  return ordered
}

function computeConfidence(
  affectedCapabilities: string[],
  mappedCapabilities: string[],
  protectedAssetsTouched: boolean,
): number {
  if (protectedAssetsTouched) return 1.0
  if (affectedCapabilities.length === 0) return 1.0

  const mappedCount = mappedCapabilities.length
  const total = affectedCapabilities.length
  const coverage = total === 0 ? 1 : mappedCount / total

  // Confidence is high when coverage is high; scale to avoid implying certainty.
  return Math.round(Math.min(0.99, 0.85 + coverage * 0.14) * 100) / 100
}

function getFullGovernPlan(options: PlannerOptions, touchedAssets?: string[]): ValidationPlan {
  const { availableScripts, fullGovernScript = "govern" } = options

  const run = availableScripts.includes(fullGovernScript)
    ? [fullGovernScript]
    : ["npm run test:all", "npm run proof"]

  const skip = availableScripts.filter((s) => !run.includes(s))

  const assetText =
    touchedAssets && touchedAssets.length > 0
      ? touchedAssets.length === 1
        ? touchedAssets[0]
        : touchedAssets.join(", ")
      : "Protected Asset"

  const explanations: Record<string, string> = {}
  for (const script of run) {
    explanations[script] = `${assetText} modified; full constitutional validation required.`
  }
  for (const script of skip) {
    explanations[script] = explainSkip(script, assetText)
  }

  return {
    run,
    skip,
    confidence: 1.0,
    protectedAssetsTouched: true,
    risk: "high",
    reason: `${assetText} modified; full constitutional validation required.`,
    governanceClasses: GOVERNANCE_CLASS_ORDER,
    explanations,
    profile: options.profile,
  }
}

export function buildValidationPlan(
  report: ImpactReport,
  map: CapabilityValidationMap,
  options: PlannerOptions,
): ValidationPlan {
  const { availableScripts, lintScript = "lint", typecheckScript = "typecheck" } = options

  // Protected Asset escalation: full govern plan.
  if (report.protectedAssets.length > 0) {
    return getFullGovernPlan(options, report.protectedAssets)
  }

  // If no capabilities were detected, run a minimal sanity check.
  if (report.affectedCapabilities.length === 0) {
    const run = ["test"].filter((s) => availableScripts.includes(s))
    const skip = availableScripts.filter((s) => !run.includes(s))
    const explanations: Record<string, string> = {}
    for (const script of run) {
      explanations[script] = "No affected capabilities detected; running minimal sanity check."
    }
    for (const script of skip) {
      explanations[script] = "No affected capabilities detected; minimal sanity check sufficient."
    }
    return {
      run,
      skip,
      confidence: 1.0,
      protectedAssetsTouched: false,
      risk: report.risk,
      reason: "No affected capabilities detected; running minimal sanity check.",
      governanceClasses: [],
      explanations,
      profile: options.profile,
    }
  }

  const scripts = new Set<string>()

  if (hasScope(report.affectedCapabilities, map, "lintScope") && availableScripts.includes(lintScript)) {
    scripts.add(lintScript)
  }

  if (hasScope(report.affectedCapabilities, map, "typecheckScope") && availableScripts.includes(typecheckScript)) {
    scripts.add(typecheckScript)
  }

  for (const field of ["unitTests", "integrationTests", "benchmarks", "proofs"] as const) {
    for (const script of collectScripts(report.affectedCapabilities, map, field)) {
      scripts.add(script)
    }
  }

  const affectedClasses = getAffectedGovernanceClasses(report, map)
  const orderedRun = orderScripts(Array.from(scripts), options)
  const skip = availableScripts.filter((s) => !orderedRun.includes(s))

  const mappedCapabilities = report.affectedCapabilities.filter((c) => c in map.capabilities)
  const confidence = computeConfidence(report.affectedCapabilities, mappedCapabilities, false)

  const reason =
    report.affectedCapabilities.length === 1
      ? `Change affects ${report.affectedCapabilities[0]}; running mapped validations.`
      : `Change affects ${report.affectedCapabilities.length} capabilities; running mapped validations.`

  const explanations: Record<string, string> = {}
  for (const script of orderedRun) {
    explanations[script] = reason
  }
  for (const script of skip) {
    explanations[script] = explainSkip(script, reason)
  }

  return {
    run: orderedRun,
    skip,
    confidence,
    protectedAssetsTouched: false,
    risk: report.risk,
    reason,
    governanceClasses: affectedClasses,
    explanations,
    profile: options.profile,
  }
}
