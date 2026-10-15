// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import { checkGovernDelegation } from "./govern-delegation.js"
import { printJson, printError } from "./print.js"
import { runVerification } from "../verification/engine.js"
import { buildConfidenceAnalysis } from "./status-validation.js"
import { analyzeFiles, getWorkingTreeDiff, parseDiff } from "../governance/impact-analyzer.js"
import { buildValidationPlan, type CapabilityValidationMap } from "../validation/planner.js"
import { loadTaskRegistry, type TaskRegistry } from "../task/task-registry.js"
import { runTasks } from "../task/task-runner.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"
import { runInternalGovernance, runNpmScript } from "./command-governance.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdValidate(flags: Record<string, string | boolean>) {
  const fullMode = flags.full === true || flags.full === "true"
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"
  const explain = flags.explain === true || flags.explain === "true"
  const profile = typeof flags.profile === "string" ? flags.profile : "pull-request"

  // --full always runs the complete governance pipeline.
  if (fullMode) {
    const verdict = checkGovernDelegation(process.cwd())
    const delegated = verdict.allowed
    if (dryRun) {
      const condition = delegated ? "delegated" : verdict.condition
      printJson({
        status: "ok",
        kind: "ValidationPlan",
        files: [],
        affectedCapabilities: [],
        protectedAssets: [],
        risk: "high",
        run: ["govern"],
        skip: [],
        confidence: 1.0,
        protectedAssetsTouched: true,
        reason: "Full validation requested.",
        profile,
        confidenceAnalysis: {
          score: 1.0,
          risk: "high",
          promotionRisk: "high",
          reasons: ["Full validation requested; constitutional pipeline required."],
          nextSteps: ["Run the full governance pipeline (npm run govern or synth validate --full)."],
        },
        note: delegated
          ? "Dry-run: would delegate to npm run govern."
          : `Dry-run: would use internal governance pipeline (${condition}).`,
        govern: delegated
          ? { delegated, condition }
          : { delegated, condition, message: verdict.message },
      })
      return
    }

    return runGovernAndExit(verdict)
  }

  const diffText = typeof flags.diff === "string" ? flags.diff : getWorkingTreeDiff()
  const files = parseDiff(diffText)

  if (files.length === 0) {
    printJson({
      status: "ok",
      kind: "ValidationPlan",
      files: [],
      affectedCapabilities: [],
      protectedAssets: [],
      risk: "low",
      run: [],
      skip: [],
      confidence: 1.0,
      protectedAssetsTouched: false,
      reason: "No changed files detected.",
      confidenceAnalysis: {
        score: 1.0,
        risk: "low",
        promotionRisk: "low",
        reasons: ["No changed files detected."],
        nextSteps: ["No validation needed; make changes to trigger validation planning."],
      },
      note: dryRun ? "Dry-run: no changed files detected." : "No validation needed.",
    })
    return
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

  // Load the canonical task registry so the planner can discover and order
  // tasks from the task graph. Fall back to npm scripts if the registry is
  // unavailable (e.g., in a non-governed directory).
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
    printError(
      `Capability validation map not found at ${mapPath}. Run 'synth init' or verify the repository layout.`,
      {
        code: "CapabilityValidationMapMissing",
        category: "configuration",
        suggestion: "Run 'synth init' in a Synth repository or create docs/reference/capability-validation-map.json.",
        documentation: "docs/reference/capability-validation-map.json",
      },
    )
  }

  const plan = buildValidationPlan(report, map, { availableScripts, taskRegistry, profile })

  // Apply certification profile filtering unless protected assets were touched
  // or the profile requires full validation.
  const strictProfiles = new Set(["main-branch", "release"])
  const shouldFilterByProfile = !plan.protectedAssetsTouched && !strictProfiles.has(profile)
  let effectiveRun = plan.run
  let effectiveSkip = plan.skip
  if (shouldFilterByProfile) {
    const requiredClasses = new Set(plan.governanceClasses)
    const classToScripts = buildClassToScriptsMap(map)
    const requiredScripts = new Set<string>()
    const availableItems = taskRegistry ? taskRegistry.ids : availableScripts
    for (const cls of plan.governanceClasses) {
      for (const script of classToScripts[cls] || []) {
        if (availableItems.includes(script)) {
          requiredScripts.add(script)
        }
      }
    }
    effectiveRun = plan.run.filter((s) => requiredScripts.has(s))
    effectiveSkip = availableItems.filter((s) => !effectiveRun.includes(s))
    for (const script of effectiveSkip) {
      if (!plan.explanations[script]) {
        plan.explanations[script] = `Excluded by certification profile '${profile}'.`
      }
    }
  }

  const confidenceAnalysis = buildConfidenceAnalysis(report, plan, effectiveRun, availableScripts, map)

  if (dryRun) {
    const output: Record<string, unknown> = {
      status: "ok",
      kind: "ValidationPlan",
      ...report,
      ...plan,
      run: effectiveRun,
      skip: effectiveSkip,
      confidenceAnalysis,
      note: "Dry-run: plan computed but not executed.",
    }
    if (explain) {
      output.explanations = plan.explanations
    }
    printJson(output)
    return
  }

  // Execute the planned validations.
  const execution = await executeValidationPlan(effectiveRun, taskRegistry)

  const output: Record<string, unknown> = {
    status: execution.success ? "ok" : "error",
    kind: "ValidationResult",
    ...report,
    ...plan,
    run: effectiveRun,
    skip: effectiveSkip,
    execution,
    confidenceAnalysis,
    note: execution.success
      ? "All planned validations passed."
      : `Planned validation failed: ${execution.failedScript}`,
  }
  if (explain) {
    output.explanations = plan.explanations
  }
  printJson(output)

  if (!execution.success) {
    process.exit(1)
  }
}


export function buildClassToScriptsMap(map: CapabilityValidationMap): Record<string, string[]> {
  const classToScripts: Record<string, Set<string>> = {}
  for (const [capability, entryUntyped] of Object.entries(map.capabilities)) {
    const entry = entryUntyped as { governanceClass?: string; unitTests?: string[]; integrationTests?: string[]; benchmarks?: string[]; proofs?: string[] }
    const cls = entry.governanceClass ?? "tests"
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
  const result: Record<string, string[]> = {}
  for (const [cls, scripts] of Object.entries(classToScripts)) {
    result[cls] = Array.from(scripts).sort()
  }
  return result
}


export async function runGovernAndExit(verdict = checkGovernDelegation(process.cwd())): Promise<void> {
  if (!verdict.allowed) {
    if (verdict.condition === "missing-package-json" || verdict.condition === "missing-govern-script") {
      return runInternalGovernance(verdict.condition)
    }
    printError(verdict.message)
  }
  const result = await runNpmScript(["run", "govern"], verdict.childEnv, process.cwd())
  printJson({
    status: result.status === 0 ? "ok" : "error",
    kind: "GovernResult",
    delegated: true,
    condition: "delegated",
    exitCode: result.status,
    output: result.stdout,
    errors: result.stderr,
  })
  process.exit(result.status)
}


export interface ValidationExecution {
  success: boolean
  results: Array<{
    script: string
    status: number
    durationMs: number
    delegated?: boolean
    condition?: string
    message?: string
    output?: string
    errors?: string
  }>
  failedScript?: string
  totalDurationMs: number
}


export async function executeValidationPlan(scripts: string[], taskRegistry?: TaskRegistry): Promise<ValidationExecution> {
  const results: ValidationExecution["results"] = []
  const start = Date.now()

  // When a task registry is available, execute through the canonical task engine.
  // This preserves dependency ordering and makes the task model the source of truth.
  if (taskRegistry) {
    const report = await runTasks(taskRegistry, scripts, { cwd: process.cwd() })
    for (const r of report.results) {
      results.push({
        script: r.taskId,
        status: r.status,
        durationMs: r.durationMs,
        output: r.stdout,
        errors: r.stderr,
      })
    }
    return {
      success: report.status === "ok",
      results,
      failedScript: report.failedTaskId,
      totalDurationMs: report.totalDurationMs,
    }
  }

  // Legacy path: no task registry available, fall back to npm scripts.
  for (const script of scripts) {
    const scriptStart = Date.now()
    let childEnv: NodeJS.ProcessEnv | undefined
    if (script === "govern") {
      const verdict = checkGovernDelegation(process.cwd())
      if (!verdict.allowed) {
        if (verdict.condition === "missing-package-json" || verdict.condition === "missing-govern-script") {
          const report = await runVerification(process.cwd())
          results.push({
            script,
            status: report.status === "error" ? 1 : 0,
            durationMs: Date.now() - scriptStart,
            delegated: false,
            condition: verdict.condition,
            message: verdict.message,
          })
          if (report.status === "error") {
            return {
              success: false,
              results,
              failedScript: script,
              totalDurationMs: Date.now() - start,
            }
          }
          continue
        }
        console.error(verdict.message)
        results.push({ script, status: 1, durationMs: Date.now() - scriptStart })
        return {
          success: false,
          results,
          failedScript: script,
          totalDurationMs: Date.now() - start,
        }
      }
      childEnv = verdict.childEnv
    }
    const args = script === "govern" ? ["run", "govern"] : ["run", script]
    const result = await runNpmScript(args, childEnv ?? process.env, process.cwd())
    const durationMs = Date.now() - scriptStart
    results.push({
      script,
      status: result.status,
      durationMs,
      output: result.stdout,
      errors: result.stderr,
    })

    if (result.status !== 0) {
      return {
        success: false,
        results,
        failedScript: script,
        totalDurationMs: Date.now() - start,
      }
    }
  }

  return {
    success: true,
    results,
    totalDurationMs: Date.now() - start,
  }
}


export async function cmdValidateHelp() {
  printJson(namespaceHelp("validate", "Analyze changes, plan validations, and execute them", [
    { name: "synth validate", description: "Run the adaptive validator on the current working tree" },
    { name: "synth validate --dry-run", description: "Preview the validation plan without executing" },
    { name: "synth validate --full", description: "Run the complete canonical governance pipeline" },
    { name: "synth validate dependencies", description: "Verify expedition charter dependency resolution" },
    { name: "synth validate artifact --type <type>", description: "Validate governance artifacts (expedition, mission)" },
  ]))
}


// ============================================================
// EXP-GATE-013: Dependency validation command
// ============================================================
export async function cmdValidateDependencies(flags: Record<string, string | boolean>) {
  const {
    parseDependencyRecord,
    checkUpstreamDependencies,
    parseCharterDirectory,
  } = await import("../governance/dependency-graph.js")

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const records = await parseCharterDirectory(charterDir)

  if (records.length === 0) {
    printJson({ status: "ok", kind: "DependencyCheck", dependencies: [], note: "No expedition charters found." })
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await ctx.runtime.getState()

  const results = records.map((r) => checkUpstreamDependencies(r.expeditionId, state, records))

  const blocked = results.filter((r) => r.status !== "resolved")

  printJson({
    status: blocked.length > 0 ? "warning" : "ok",
    kind: "DependencyCheck",
    total: results.length,
    blocked: blocked.length,
    resolved: results.length - blocked.length,
    dependencies: results,
    note: blocked.length > 0
      ? `${blocked.length} expedition(s) have unresolved upstream dependencies.`
      : "All dependencies are resolved.",
  })
}


// ============================================================
// EXP-REFINE-016: Artifact validation command
// ============================================================
export async function cmdValidateArtifact(flags: Record<string, string | boolean>) {
  const artifactType = typeof flags.type === "string" ? flags.type : ""

  if (!artifactType) {
    printError(
      "--type is required. Options: expedition, mission, refined-intent, alignment-contract",
      {
        code: "ArtifactTypeRequired",
        category: "validation",
        suggestion: "Provide --type expedition, --type mission, --type refined-intent, or --type alignment-contract.",
        documentation: "docs/reference/artifact-types.md",
      },
    )
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await ctx.runtime.getState()

  let valid = true
  const checks: { name: string; passed: boolean; detail: string }[] = []

  switch (artifactType) {
    case "expedition": {
      const expeditions = state.expeditions || {}
      const ids = Object.keys(expeditions)
      checks.push({ name: "expeditions-exist", passed: ids.length > 0, detail: `${ids.length} expedition(s) found` })

      for (const [id, exp] of Object.entries(expeditions)) {
        checks.push({ name: `expedition-${id}-has-mission`, passed: !!exp.missionId, detail: `Mission: ${exp.missionId || "missing"}` })
        checks.push({ name: `expedition-${id}-has-goal`, passed: !!exp.goal, detail: `Goal: ${exp.goal || "missing"}` })
        checks.push({ name: `expedition-${id}-has-status`, passed: !!exp.status, detail: `Status: ${exp.status}` })
      }
      break
    }

    case "mission": {
      const missions = state.missions || {}
      const ids = Object.keys(missions)
      checks.push({ name: "missions-exist", passed: ids.length > 0, detail: `${ids.length} mission(s) found` })

      for (const [id, mission] of Object.entries(missions)) {
        checks.push({ name: `mission-${id}-has-name`, passed: !!mission.name, detail: `Name: ${mission.name || "missing"}` })
        checks.push({ name: `mission-${id}-has-purpose`, passed: !!mission.purpose, detail: `Purpose: ${mission.purpose || "missing"}` })
        checks.push({ name: `mission-${id}-has-status`, passed: !!mission.status, detail: `Status: ${mission.status}` })
      }
      break
    }

    default:
      printError(
        `Unknown artifact type: ${artifactType}. Supported: expedition, mission`,
        {
          code: "ArtifactTypeUnknown",
          category: "validation",
          suggestion: "Use --type expedition or --type mission.",
          documentation: "docs/reference/artifact-types.md",
        },
      )
  }

  const failed = checks.filter((c) => !c.passed)
  valid = failed.length === 0

  printJson({
    status: valid ? "ok" : "error",
    kind: "ArtifactValidation",
    artifactType,
    totalChecks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failed: failed.length,
    checks,
    valid,
  })

  if (!valid) process.exit(1)
}

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  if (sub === "dependencies") await cmdValidateDependencies(flags)
  else if (sub === "artifact") await cmdValidateArtifact(flags)
  else await cmdValidate(flags)
}
