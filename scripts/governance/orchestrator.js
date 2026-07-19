// ============================================================
// INTELLIGENT GOVERNANCE ORCHESTRATOR (EXP-PROGRAM-030)
// ============================================================
// Ties together impact analysis, governance classes, validation planning,
// dependency-driven scheduling, proof caching, certification profiles,
// explanations, and benchmarking into a single deterministic orchestration
// layer for the `npm run govern` path.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { Scheduler } from "./scheduler.js"
import { buildDependencyGraph } from "./dependency-graph.js"
import { resolveChecks } from "./check-registry.js"
import {
  getFileGovernanceClass,
  getGovernanceClass,
  GOVERNANCE_CLASSES_VERSION,
} from "./governance-classes.js"
import { resolveProfile, resolveClassesForProfile, PROFILES_VERSION } from "./profiles.js"
import { explainReason, buildExplanationReport } from "./explain.js"
import { buildBenchmark } from "./benchmark.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, "..", "..")

/**
 * @typedef {Object} OrchestratorOptions
 * @property {string} [root]
 * @property {string[]} [changedFiles]
 * @property {boolean} [full]
 * @property {boolean} [dryRun]
 * @property {boolean} [explain]
 * @property {string} [profile]
 * @property {string} [packageJsonPath]
 * @property {number} [maxConcurrency]
 * @property {number} [timeoutMs]
 */

/**
 * Load package.json and the capability validation map.
 *
 * @param {string} root
 */
async function loadProjectContext(root) {
  const packagePath = path.join(root, "package.json")
  const mapPath = path.join(root, "docs", "reference", "capability-validation-map.json")

  const [packageRaw, mapRaw] = await Promise.all([
    fs.readFile(packagePath, "utf-8"),
    fs.readFile(mapPath, "utf-8").catch(() => "{}"),
  ])

  const packageJson = JSON.parse(packageRaw)
  const map = JSON.parse(mapRaw)

  return {
    packageJson,
    map,
    availableScripts: Object.keys(packageJson.scripts || {}),
  }
}

/**
 * Compute impacted governance classes from changed files.
 *
 * @param {string[]} changedFiles
 */
function computeImpactedClasses(changedFiles) {
  const classes = new Set(changedFiles.map(getFileGovernanceClass))
  return Array.from(classes).sort()
}

/**
 * Build a class-to-script mapping from the validation map.
 *
 * @param {Record<string, any>} map
 * @returns {Record<string, string[]>}
 */
function buildClassToScriptsMap(map) {
  /** @type {Record<string, Set<string>>} */
  const classToScripts = {}
  for (const [capability, entry] of Object.entries(map.capabilities || {})) {
    const cls = getGovernanceClass(capability)
    const scripts = new Set([
      ...(entry.unitTests || []),
      ...(entry.integrationTests || []),
      ...(entry.benchmarks || []),
      ...(entry.proofs || []),
    ])
    if (!classToScripts[cls]) classToScripts[cls] = new Set()
    for (const script of scripts) {
      classToScripts[cls].add(script)
    }
  }
  /** @type {Record<string, string[]>} */
  const result = {}
  for (const [cls, scripts] of Object.entries(classToScripts)) {
    result[cls] = Array.from(scripts).sort()
  }
  return result
}

/**
 * Detect protected assets touched by changed files using a simple path-based
 * heuristic. The canonical detector lives in src/governance/protected-assets.ts;
 * this lightweight version keeps the orchestrator runnable without a build
 * step.
 *
 * @param {string[]} changedFiles
 * @returns {string[]}
 */
function detectProtectedAssets(changedFiles) {
  const assets = new Set()
  for (const file of changedFiles) {
    const normalized = file.replace(/\\/g, "/")
    if (normalized.startsWith("src/mission-studio/")) assets.add("Mission Studio")
    if (normalized.startsWith("src/genesis/")) assets.add("Genesis")
    if (normalized.startsWith("src/core/replay") || normalized.startsWith("src/runtime/replay")) assets.add("Replay")
    if (normalized.startsWith("src/runtime/")) assets.add("Runtime")
    if (normalized.startsWith("src/control/")) assets.add("ExecutionGate")
    if (normalized.startsWith("src/types/event")) assets.add("Event Model")
    if (normalized.startsWith("src/capability/")) assets.add("Capability Model")
    if (normalized.startsWith("docs/architecture/constitution")) assets.add("Constitutional Baseline")
    if (normalized.startsWith("docs/adr/")) assets.add("Constitutional Baseline")
  }
  return Array.from(assets).sort()
}

/**
 * Run the governance orchestrator.
 *
 * @param {OrchestratorOptions} [options]
 * @returns {Promise<Object>}
 */
export async function runGovernanceOrchestrator(options = {}) {
  const root = options.root ?? REPO_ROOT
  const full = options.full ?? false
  const explain = options.explain ?? false
  const profileName = options.profile ?? "pull-request"

  const context = await loadProjectContext(root)
  const { availableScripts, map } = context

  const changedFiles = options.changedFiles ?? []
  const impactedClasses = computeImpactedClasses(changedFiles)
  const profile = resolveProfile(profileName)
  const requiredClasses = full ? profile.requiredClasses : resolveClassesForProfile(profileName, impactedClasses)
  const protectedAssets = detectProtectedAssets(changedFiles)
  const protectedAssetsTouched = protectedAssets.length > 0

  // Determine which scripts belong to which classes.
  const classToScripts = buildClassToScriptsMap(map)

  // Build the set of scripts required by the profile. When a protected asset
  // is touched or the profile does not allow skipping, require all scripts.
  const requireAll = full || !profile.allowSkip || protectedAssetsTouched
  const requiredScripts = new Set()
  const classesToRun = requireAll ? profile.requiredClasses : requiredClasses

  for (const cls of classesToRun) {
    for (const script of classToScripts[cls] || []) {
      requiredScripts.add(script)
    }
  }

  // Always include lint/typecheck when kernel/compiler/runtime classes are
  // required and the scripts exist.
  if (classesToRun.some((c) => ["compiler", "kernel", "runtime"].includes(c))) {
    if (availableScripts.includes("lint")) requiredScripts.add("lint")
    if (availableScripts.includes("typecheck")) requiredScripts.add("typecheck")
  }

  // Source-affecting classes require a build before dependent tests can run.
  if (
    classesToRun.some((c) => ["runtime", "kernel", "compiler", "release", "design", "knowledge"].includes(c)) &&
    availableScripts.includes("build")
  ) {
    requiredScripts.add("build")
  }

  // Use the existing Scheduler for dependency-driven scheduling and proof
  // caching. The scheduler already handles changed inputs, module membership,
  // downstream invalidation, and proof reuse.
  const scheduler = new Scheduler({
    changedFiles,
    root,
    full,
  })

  const allChecks = Array.from(new Set([
    ...requiredScripts,
    // Include the full pipeline scripts so the scheduler can reason about
    // downstream dependencies if they are registered.
    ...(availableScripts.includes("govern") ? ["govern"] : []),
    ...(availableScripts.includes("test:all") ? ["test:all"] : []),
    ...(availableScripts.includes("proof") ? ["proof"] : []),
  ]))

  const decisions = await scheduler.plan(allChecks)

  /** @type {Array<{checkId: string, action: "run" | "skip", reason: string, classes: string[]}>} */
  const entries = []
  const checkClasses = {}

  for (const decision of decisions) {
    const classes = [getGovernanceClass(decision.checkId)]
    checkClasses[decision.checkId] = classes[0]

    let action = decision.action
    let reason = decision.reason

    if (requiredScripts.has(decision.checkId)) {
      if (action !== "run") {
        action = "run"
        reason = "profile-required"
      }
    } else if (requireAll) {
      action = "run"
      reason = "profile-required"
    } else {
      action = "skip"
      reason = "no-class-impact"
    }

    entries.push({
      checkId: decision.checkId,
      action,
      reason: explainReason({
        checkId: decision.checkId,
        action,
        reason,
        changedInputs: decision.changedInputs,
        module: decision.module,
        classes,
        profile: profileName,
      }),
      classes,
    })
  }

  const run = entries.filter((e) => e.action === "run").map((e) => e.checkId)
  const skip = entries.filter((e) => e.action === "skip").map((e) => e.checkId)

  const graph = buildDependencyGraph(allChecks)

  const summary = {
    kind: "GovernOrchestrationSummary",
    schemaVersion: "1.0.0",
    mode: full ? "full" : "incremental",
    profile: profileName,
    governanceClassesVersion: GOVERNANCE_CLASSES_VERSION,
    profilesVersion: PROFILES_VERSION,
    changedFiles,
    affectedClasses: impactedClasses,
    requiredClasses: classesToRun,
    protectedAssets,
    protectedAssetsTouched,
    risk: protectedAssetsTouched ? "high" : impactedClasses.some((c) => ["runtime", "kernel", "compiler"].includes(c)) ? "high" : impactedClasses.length > 0 ? "medium" : "low",
    reason: protectedAssetsTouched
      ? `${protectedAssets.join(", ")} modified; full constitutional validation required.`
      : requireAll
        ? `Profile '${profileName}' requires full validation.`
        : `Profile '${profileName}' requires classes: ${classesToRun.join(", ") || "none"}.`,
    checkCount: entries.length,
    runCount: run.length,
    skipCount: skip.length,
    checks: entries.map((e) => ({
      checkId: e.checkId,
      action: e.action,
      reason: e.reason,
      classes: e.classes,
    })),
  }

  /** @type {Object | undefined} */
  let explanation
  if (explain) {
    explanation = buildExplanationReport({
      mode: summary.mode,
      profile: profileName,
      changedFiles,
      affectedCapabilities: [],
      affectedClasses: impactedClasses,
      entries: entries.map((e) => ({ checkId: e.checkId, action: e.action, reason: e.reason })),
    })
  }

  const benchmark = buildBenchmark(
    entries.map((e) => ({ checkId: e.checkId, action: e.action, durationMs: 0 })),
    { checkClasses },
  )

  return {
    summary,
    graph,
    explanation,
    benchmark,
    failed: false,
    plan: { run, skip },
  }
}
