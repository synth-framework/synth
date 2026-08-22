// SYNTH-LOADER-002: standalone status-validation module.
//
// The `status` command's validation summary and confidence analysis are
// bootstrap-free: they only read the working tree and a capability map. This
// module is intentionally decoupled from synth.ts so the thin entrypoint can
// serve `status` WITHOUT importing the heavy synth.js graph (which eagerly
// pulls in core/bootstrap.js and the 13-step bootstrap).
import fs from "fs/promises"
import path from "path"
import { analyzeFiles, getWorkingTreeDiff, parseDiff } from "../governance/impact-analyzer.js"
import {
  buildValidationPlan,
  type CapabilityValidationMap,
  type ValidationPlan,
} from "../validation/planner.js"
import { loadTaskRegistry, type TaskRegistry } from "../task/task-registry.js"

export function buildConfidenceAnalysis(
  report: ReturnType<typeof analyzeFiles>,
  plan: ValidationPlan,
  effectiveRun: string[],
  availableScripts: string[],
  map?: CapabilityValidationMap,
) {
  const reasons: string[] = []
  const nextSteps: string[] = []

  if (plan.protectedAssetsTouched) {
    reasons.push("Protected Asset touched; full constitutional validation required.")
  } else if (report.affectedCapabilities.length === 0) {
    reasons.push("No affected capabilities detected.")
  } else {
    const capabilitySet = map?.capabilities ? new Set(Object.keys(map.capabilities)) : undefined
    const mapped = capabilitySet
      ? report.affectedCapabilities.filter((c) => capabilitySet.has(c))
      : report.affectedCapabilities.filter((c) => c !== "Unknown")
    const unmapped = capabilitySet
      ? report.affectedCapabilities.filter((c) => !capabilitySet.has(c))
      : report.affectedCapabilities.filter((c) => c === "Unknown")
    if (mapped.length > 0) {
      reasons.push(
        `${mapped.length} of ${report.affectedCapabilities.length} affected capabilities map to validation entries in docs/reference/capability-validation-map.json.`,
      )
    }
    if (unmapped.length > 0) {
      const unmappedList = unmapped.join(", ")
      reasons.push(
        `${unmapped.length} of ${report.affectedCapabilities.length} affected capabilities are not mapped to validation entries: ${unmappedList}.`,
      )
      nextSteps.push(
        "Add or expand capability entries in docs/reference/capability-validation-map.json, or add project-level validation scripts such as test, lint, typecheck, or govern.",
      )
    }
  }

  const hasValidationScript = availableScripts.some((s) => /^(test|lint|typecheck|validate|verify|check|govern)(:|$)/i.test(s))
  const hasTestsDirectory = report.affectedCapabilities.includes("Tests") || report.affectedClasses.includes("tests")
  if (!hasTestsDirectory && !hasValidationScript) {
    reasons.push("No tests/ directory or project-level validation script detected.")
    nextSteps.push("Add a tests/ directory or define npm scripts such as test, lint, typecheck, or govern.")
  } else if (!hasTestsDirectory && hasValidationScript) {
    reasons.push("No tests/ directory, but project-level validation scripts provide fallback coverage.")
  }

  if (effectiveRun.length === 0 && report.affectedCapabilities.length > 0) {
    reasons.push("No validation tasks could be selected for the affected capabilities.")
    nextSteps.push("Add matching validation scripts to package.json or capability-validation-map.json.")
  }

  if (plan.risk === "low" && effectiveRun.length > 0) {
    reasons.push("Validation plan covers affected changes with concrete checks.")
  }

  if (nextSteps.length === 0 && plan.confidence < 1.0) {
    nextSteps.push("Add capability-specific tests or expand the capability-validation-map.json mapping.")
  }

  return {
    score: plan.confidence,
    risk: plan.risk,
    promotionRisk: report.promotionRisk,
    reasons,
    nextSteps: nextSteps.length > 0 ? nextSteps : ["Confidence is high; no immediate action required."],
  }
}

export async function buildStatusValidationSummary(): Promise<Record<string, unknown> | undefined> {
  const diffText = getWorkingTreeDiff()
  const files = parseDiff(diffText)
  if (files.length === 0) {
    return { score: 1.0, risk: "low", reasons: ["No changed files detected."], nextSteps: ["No validation needed."] }
  }

  const report = analyzeFiles(files)
  const packagePath = path.resolve(process.cwd(), "package.json")
  let packageJson: { scripts?: Record<string, string> } = {}
  try {
    packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
  } catch {
    packageJson = {}
  }
  const availableScripts = Object.keys(packageJson.scripts || {})

  let taskRegistry: TaskRegistry | undefined
  try {
    taskRegistry = await loadTaskRegistry()
  } catch {
    taskRegistry = undefined
  }

  const mapPath = path.resolve(process.cwd(), "docs", "reference", "capability-validation-map.json")
  let map
  try {
    map = JSON.parse(await fs.readFile(mapPath, "utf-8"))
  } catch {
    return undefined
  }

  const plan = buildValidationPlan(report, map, { availableScripts, taskRegistry, profile: "pull-request" })
  const analysis = buildConfidenceAnalysis(report, plan, plan.run, availableScripts, map)
  return {
    score: analysis.score,
    risk: analysis.risk,
    promotionRisk: analysis.promotionRisk,
    reasons: analysis.reasons,
    nextSteps: analysis.nextSteps,
    command: "synth validate",
  }
}
