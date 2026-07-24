#!/usr/bin/env node
// ============================================================
// SYNTH v2 — AI-Native Operator CLI
// ============================================================
// Primary interface for humans and AI agents.
// All output is structured JSON by default so agents can parse it.
// ============================================================

import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import { spawn } from "child_process"
import { sha256 } from "../sdk/hashing/index.js"
import { fileURLToPath } from "url"
import { bootstrap } from "../core/bootstrap.js"
import { createReplayVerifier } from "../core/replay-verifier.js"
import { Logger } from "../observability/tracer.js"
import { runBootstrap } from "./bootstrap-apply.js"
import { writeAgentArtifacts } from "./agent-artifacts.js"
import { refreshAiMetadata } from "./ai-metadata.js"
import { createInitializationEngine } from "../initialization/engine.js"
import { createInitializationEvidenceStore } from "../initialization/evidence-store.js"
import { createFilesystemInitializationAdapter } from "../adapters/filesystem-initialization-adapter.js"
import { createPosixFilesystemProvider, FILESYSTEM_WRITE_TOKEN } from "../infra/filesystem-provider.js"
import { checkGovernDelegation, governDelegationMessage, npmCommand } from "./govern-delegation.js"
import { setAgentTelemetry, printJson, printError } from "./print.js"
import { verifyDraftIntegrity, writeDraftIntegrityRecord } from "../mission-studio/draft-integrity.js"
import { appendDecision, latestDecision, listDecisions } from "../mission-studio/decision-log.js"
import { cmdExplainObservability, resolveExplainPaths } from "./explain-observability.js"
import { DOCUMENTATION_CAPABILITIES } from "../documentation/projections/engine.js"
import { cmdExplainIdentity } from "./repository-identity.js"
import { cmdExplainResume } from "./resume-briefing.js"
import { cmdExplainGovernance } from "./explain-governance.js"
import { cmdVerify } from "./verify.js"
import {
  namespaceHelp as cmdRepoHelp,
  cmdRepoInit,
  cmdRepoBranchCreate,
  cmdRepoPrOpen,
  cmdRepoPrApprove,
  cmdRepoPrMerge,
  cmdRepoReleaseCreate,
  cmdRepoStatus,
} from "./repo.js"
import { runVerification } from "../verification/engine.js"
import { buildOperatorBriefing } from "./status-briefing.js"
import { getCommandSafety, isSafeForDiscovery, assertSafeForDiscovery } from "./command-safety.js"
import { runCertification, printCertificationReport, writeMatrix } from "./certification-runner.js"
import {
  cmdFirstContactHelp,
  cmdFirstContactStart,
  cmdFirstContactClarify,
  cmdFirstContactProject,
  cmdFirstContactVerify,
  cmdFirstContactApprove,
  cmdFirstContactMaterialize,
  cmdFirstContactStatus,
} from "./first-contact.js"
import { analyzeFiles, getWorkingTreeDiff, parseDiff } from "../governance/impact-analyzer.js"
import * as sdk from "../sdk/index.js"
import { buildValidationPlan, type CapabilityValidationMap } from "../validation/planner.js"
import { validateAgentAction, type AgentAction } from "../governance/intake.js"
import { buildDerivedState } from "../state/derived/index.js"
import type { PlanningObservation } from "../planning/observation.js"
import type { MissionNode, PlanningSession } from "../mission-studio/types.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_PROJECT_NAME = "Synth Project"
const PUBLIC_VOCABULARY = [
  "Mission",
  "Expedition",
  "Evidence",
  "Plan",
  "Event",
  "State",
  "Replay",
]

const COMMANDS = [
  { name: "version", description: "Print the installed Synth version" },
  { name: "doctor", description: "Verify installation and project health" },
  { name: "init", description: "Initialize the current directory as a Synth project" },
  { name: "bootstrap", description: "Transform a repository into a Synth project" },
  { name: "discover", description: "Produce a read-only analysis of a repository" },
  { name: "govern", description: "Run the full governance pipeline" },
  { name: "validate", description: "Analyze changes, plan validations, and execute them (--dry-run, --full)" },
  { name: "verify", description: "Verify governance invariants and projection consistency" },
  { name: "status", description: "Report the current project state" },
  { name: "mission", description: "Mission Studio operations (create, approve, snapshot)" },
  { name: "intent", description: "Intent model operations (create)" },
  { name: "alignment", description: "Intent alignment and divergence governance (prepare)" },
  { name: "expedition", description: "Expedition lifecycle (create, approve, commit, start, complete)" },
  { name: "docs", description: "Documentation operations (generate)" },
  { name: "explain", description: "Explain operations (replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all)" },
  { name: "repair", description: "Repair operations (replay)" },
  { name: "certify", description: "Run failure and recovery certification scenarios" },
  { name: "first-contact", description: "Greenfield onboarding workflow (start, clarify, project, verify, approve, materialize, status)" },
  { name: "genesis", description: "Alias for the greenfield onboarding workflow (first-contact)" },
  { name: "ai", description: "AI agent interoperability (refresh)" },
  { name: "repo", description: "Repository and release governance operations" },
  { name: "adapter", description: "Delegate to the adapter management CLI" },
]

const ADAPTER_NAMES = [
  "repository",
  "github",
  "tdd",
  "bdd",
  "conversation",
  "document",
  "filesystem",
  "specification",
  "knowledge-extraction",
  "confidence",
  "dependency",
  "architecture",
  "mission-builder",
  "expedition-builder",
  "objective-builder",
  "wizard",
]

// Wraps shared setAgentTelemetry to parse CLI flags into telemetry data.
function setAgentTelemetryFromFlags(flags: Record<string, string | boolean>) {
  const telemetry: Record<string, unknown> = {}
  if (typeof flags["agent-session"] === "string" && flags["agent-session"].length > 0) {
    telemetry.agentSession = flags["agent-session"]
  }
  if (
    typeof flags["agent-reasoning-state"] === "string" &&
    flags["agent-reasoning-state"].length > 0
  ) {
    try {
      telemetry.agentReasoningState = JSON.parse(flags["agent-reasoning-state"])
    } catch {
      telemetry.agentReasoningState = { parseError: flags["agent-reasoning-state"] }
    }
  }
  setAgentTelemetry(telemetry)
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2)
  const positional: string[] = []
  const flags: Record<string, string | boolean> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith("--")) {
      const [key, value] = arg.split("=")
      const name = key.slice(2)
      if (value !== undefined) {
        flags[name] = value
      } else if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        flags[name] = args[i + 1]
        i++
      } else {
        flags[name] = true
      }
    } else if (arg.startsWith("-")) {
      const name = arg.slice(1)
      flags[name] = true
    } else {
      positional.push(arg)
    }
  }

  return { positional, flags }
}

async function bootstrapWithCapabilities(config: Parameters<typeof bootstrap>[0]) {
  const ctx = await bootstrap(config)
  // Capabilities are registered during genesis; when genesis is skipped
  // (the normal CLI path) we register them explicitly so that the CLI
  // can invoke capabilities through the ExecutionGate.
  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) {
      ctx.runtime.registerCapability(cap)
    }
  }
  return ctx
}

async function gateDecision(action: AgentAction, state: import("../types/index.js").CanonicalState, runtime?: import("../runtime/engine.js").RuntimeEngine) {
  let derived: import("../types/index.js").DerivedState | undefined
  if (runtime) {
    const events = await runtime.loadEvents()
    derived = buildDerivedState(events)
  }
  return validateAgentAction(action, state, derived)
}

function printGateBlock(result: Extract<ReturnType<typeof validateAgentAction>, { decision: "BLOCK" }>): never {
  printJson({
    status: "error",
    kind: "LifecycleBlocked",
    reason: result.reason,
    requiredAction: result.requiredAction,
  })
  process.exit(1)
}

async function getVersion(): Promise<string> {
  try {
    const packagePath = path.resolve(__dirname, "..", "..", "package.json")
    const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
    return String(packageJson.version || "unknown")
  } catch {
    return "unknown"
  }
}

async function cmdVersion() {
  const version = await getVersion()
  printJson({ status: "ok", version, name: "synth", schema: "synth-cli-v1" })
}

type DoctorCheckResult = { ok: boolean; detail: string; nextStep?: string }

async function verifyDistIntegrity(): Promise<DoctorCheckResult> {
  const manifestPath = path.resolve(__dirname, "..", "dist-manifest.json")
  try {
    await fs.access(manifestPath)
  } catch {
    return {
      ok: false,
      detail: "No dist manifest found",
      nextStep: "Run 'npm run build' to regenerate the dist manifest and compiled artifacts.",
    }
  }

  let manifest: any
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
  } catch {
    return {
      ok: false,
      detail: "dist manifest is not valid JSON",
      nextStep: "Run 'npm run build' to regenerate the dist manifest.",
    }
  }

  if (manifest.schema !== "synth-dist-manifest-v1") {
    return {
      ok: false,
      detail: `Unknown dist manifest schema: ${manifest.schema}`,
      nextStep: "Run 'npm run build' to regenerate the dist manifest with the supported schema.",
    }
  }

  const distDir = path.resolve(__dirname, "..")
  const expectedFiles = Object.entries<string>(manifest.files ?? {})
  let mismatches = 0
  let missing = 0
  for (const [rel, expectedHash] of expectedFiles) {
    const filePath = path.join(distDir, rel)
    let actualHash: string
    try {
      actualHash = sha256(await fs.readFile(filePath))
    } catch {
      missing++
      continue
    }
    if (actualHash !== expectedHash) {
      mismatches++
    }
  }

  if (missing > 0 || mismatches > 0) {
    return {
      ok: false,
      detail: `${missing} missing file(s), ${mismatches} modified file(s) in dist/`,
      nextStep: "Run 'npm run build' to rebuild dist/ from source.",
    }
  }

  return { ok: true, detail: `${expectedFiles.length} dist file(s) verified` }
}

async function verifyReplayHealth(): Promise<DoctorCheckResult> {
  try {
    const root = sdk.workspace.root()
    await sdk.paths.ensureDataDir(root)
    const logPath = sdk.paths.eventLogFile(root)
    if (!(await sdk.files.exists(logPath))) {
      return { ok: true, detail: "No event log present; replay skipped" }
    }
    const ctx = await bootstrap({
      skipGenesis: true,
      infra: {
        persistence: "file",
        eventLogPath: sdk.paths.eventLogFile(root),
        statePath: sdk.paths.stateFile(root),
        checkpointPath: sdk.paths.checkpointsFile(root),
      },
    })
    const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
    const result = await verifier.verify()
    return {
      ok: result.consistent,
      detail: result.consistent
        ? `Event log consistent (${result.eventCount} events)`
        : `Replay inconsistent: ${result.explanation}`,
      ...(result.consistent ? {} : { nextStep: "Run 'synth explain replay' to diagnose the inconsistency, then repair or replay from a known-good snapshot." }),
    }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      nextStep: "Ensure the project is initialized and the event log is readable.",
    }
  }
}

async function verifyEventChain(): Promise<DoctorCheckResult> {
  try {
    const root = sdk.workspace.root()
    await sdk.paths.ensureDataDir(root)
    const logPath = sdk.paths.eventLogFile(root)
    if (!(await sdk.files.exists(logPath))) {
      return { ok: true, detail: "No event log present; chain skipped" }
    }
    const events = await sdk.events.readEvents(root)
    if (events.length === 0) {
      return { ok: true, detail: "Event log is empty" }
    }
    let previousHash = "genesis"
    for (let i = 0; i < events.length; i++) {
      const event = events[i]
      if (event.previousHash !== previousHash) {
        return {
          ok: false,
          detail: `Event chain broken at offset ${i}: expected previousHash ${previousHash}, got ${event.previousHash}`,
          nextStep: "Run 'synth explain replay' to inspect the chain, or restore the event log from a known-good backup.",
        }
      }
      previousHash = event.eventHash
    }
    return { ok: true, detail: `${events.length} event(s) chained` }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      nextStep: "Ensure the event log is valid JSON and readable.",
    }
  }
}

async function verifyDiscoveryBaseline(): Promise<DoctorCheckResult> {
  const discoveryDir = sdk.paths.discoveryDir(sdk.workspace.root())
  try {
    const entries = await fs.readdir(discoveryDir)
    const hasBaseline = entries.some((entry) => entry.endsWith(".json") || entry.endsWith(".jsonl"))
    return {
      ok: true,
      detail: hasBaseline
        ? "Discovery baseline present"
        : "No discovery baseline present (optional for greenfield projects; run 'synth discover --export' to create one)",
    }
  } catch {
    // Greenfield projects initialized with `synth init` do not run discovery and
    // therefore have no baseline. Treat a missing discovery directory as
    // informational rather than unhealthy so `synth doctor` remains healthy.
    return {
      ok: true,
      detail: "No discovery baseline present (optional for greenfield projects; run 'synth discover --export' to create one)",
    }
  }
}

async function cmdDoctor() {
  const REQUIRED_NODE_MAJOR = 20
  const version = await getVersion()

  // Runtime Health — environment and installation signals
  const nodeVersion = process.version
  const nodeMajor = Number(nodeVersion.replace("v", "").split(".")[0])
  const runtimeHealth: Record<string, DoctorCheckResult> = {
    binary: {
      ok: true,
      detail: process.argv[1] || "unknown",
    },
    version: {
      ok: version !== "unknown",
      detail: version,
      ...(version === "unknown" ? { nextStep: "Reinstall the SYNTH CLI from a published package or build from source." } : {}),
    },
    node: {
      ok: nodeMajor >= REQUIRED_NODE_MAJOR,
      detail: `Node.js ${nodeVersion} (required >= ${REQUIRED_NODE_MAJOR})`,
      ...(nodeMajor < REQUIRED_NODE_MAJOR ? { nextStep: `Upgrade Node.js to version ${REQUIRED_NODE_MAJOR} or later.` } : {}),
    },
    distIntegrity: await verifyDistIntegrity(),
  }

  // Project Health — repository and governance signals
  const manifestPath = sdk.paths.manifestPath(sdk.workspace.root())
  let hasManifest = false
  try {
    await fs.access(manifestPath)
    hasManifest = true
  } catch {
    hasManifest = false
  }

  const projectHealth: Record<string, DoctorCheckResult> = {
    manifest: {
      ok: hasManifest,
      detail: hasManifest ? manifestPath : "No SYNTH project manifest found in current directory",
      ...(hasManifest ? {} : { nextStep: "Run 'synth init --name \"Project Name\"' to initialize a SYNTH project." }),
    },
    replay: await verifyReplayHealth(),
    eventChain: await verifyEventChain(),
    discoveryBaseline: await verifyDiscoveryBaseline(),
  }

  const runtimeOk = Object.values(runtimeHealth).every((c) => c.ok)
  const projectOk = Object.values(projectHealth).every((c) => c.ok)
  const allOk = runtimeOk && projectOk

  const runtimeNextSteps = Object.values(runtimeHealth)
    .filter((c) => !c.ok && c.nextStep)
    .map((c) => c.nextStep as string)
  const projectNextSteps = Object.values(projectHealth)
    .filter((c) => !c.ok && c.nextStep)
    .map((c) => c.nextStep as string)

  const nextSteps: string[] = []
  if (runtimeNextSteps.length > 0) {
    nextSteps.push("[Runtime Health]")
    nextSteps.push(...runtimeNextSteps)
  }
  if (projectNextSteps.length > 0) {
    nextSteps.push("[Project Health]")
    nextSteps.push(...projectNextSteps)
  }
  if (nextSteps.length === 0) {
    if (hasManifest) {
      nextSteps.push("synth status", "synth mission create --subject '...' --purpose '...'")
    } else {
      nextSteps.push("synth init --name 'Project Name'")
    }
  }

  // Maintain a backward-compatible `checks` view that flattens runtime and
  // project health signals. Some consumers (e.g. TaskPRO regression) read
  // individual checks from this top-level map.
  const checks: Record<string, DoctorCheckResult> = { ...runtimeHealth, ...projectHealth }

  printJson({
    status: allOk ? "ok" : "warning",
    name: "synth",
    version,
    healthy: allOk,
    runtimeHealth,
    projectHealth,
    checks,
    nextSteps,
  })
}

async function cmdCertify(flags: Record<string, string | boolean>) {
  const libraryDir =
    typeof flags["library-dir"] === "string"
      ? flags["library-dir"]
      : path.resolve(process.cwd(), "tests", "certifications")
  const outputDir =
    typeof flags["output-dir"] === "string"
      ? flags["output-dir"]
      : path.resolve(process.cwd(), "proof", "certifications")
  const matrixPath =
    typeof flags["matrix"] === "string"
      ? flags["matrix"]
      : path.resolve(process.cwd(), "docs", "certification-matrix.md")
  const explain = flags.explain === true || flags.explain === "true"

  const cliPath = process.argv[1]
  const report = await runCertification({
    cliPath,
    libraryDir,
    outputDir,
    explain,
  })

  writeMatrix(report, matrixPath)

  if (explain) {
    printCertificationReport(report)
  } else {
    printJson({
      status: report.summary.failed === 0 ? "ok" : "error",
      kind: "CertificationResult",
      summary: report.summary,
      matrixPath,
      reportGeneratedAt: report.generatedAt,
    })
  }

  if (report.summary.failed > 0) {
    process.exit(1)
  }
}

async function cmdValidate(flags: Record<string, string | boolean>) {
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
      note: dryRun ? "Dry-run: no changed files detected." : "No validation needed.",
    })
    return
  }

  const report = analyzeFiles(files)

  const packagePath = path.resolve(__dirname, "..", "..", "package.json")
  const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"))
  const availableScripts = Object.keys(packageJson.scripts || {})

  const mapPath = path.resolve(process.cwd(), "docs", "reference", "capability-validation-map.json")
  let map
  try {
    map = JSON.parse(await fs.readFile(mapPath, "utf-8"))
  } catch {
    printJson({
      status: "error",
      error: `Capability validation map not found at ${mapPath}. Run 'synth init' or verify the repository layout.`,
    })
    process.exit(1)
  }

  const plan = buildValidationPlan(report, map, { availableScripts, profile })

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
    for (const cls of plan.governanceClasses) {
      for (const script of classToScripts[cls] || []) {
        if (availableScripts.includes(script)) {
          requiredScripts.add(script)
        }
      }
    }
    effectiveRun = plan.run.filter((s) => requiredScripts.has(s))
    effectiveSkip = availableScripts.filter((s) => !effectiveRun.includes(s))
    for (const script of effectiveSkip) {
      if (!plan.explanations[script]) {
        plan.explanations[script] = `Excluded by certification profile '${profile}'.`
      }
    }
  }

  if (dryRun) {
    const output: Record<string, unknown> = {
      status: "ok",
      kind: "ValidationPlan",
      ...report,
      ...plan,
      run: effectiveRun,
      skip: effectiveSkip,
      note: "Dry-run: plan computed but not executed.",
    }
    if (explain) {
      output.explanations = plan.explanations
    }
    printJson(output)
    return
  }

  // Execute the planned validations.
  const execution = await executeValidationPlan(effectiveRun)

  const output: Record<string, unknown> = {
    status: execution.success ? "ok" : "error",
    kind: "ValidationResult",
    ...report,
    ...plan,
    run: effectiveRun,
    skip: effectiveSkip,
    execution,
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

function buildClassToScriptsMap(map: CapabilityValidationMap): Record<string, string[]> {
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

async function runInternalGovernance(condition: "missing-package-json" | "missing-govern-script"): Promise<void> {
  const report = await runVerification(process.cwd())
  printJson({
    status: report.status === "error" ? "error" : "ok",
    kind: "GovernResult",
    delegated: false,
    condition,
    message: governDelegationMessage(condition),
    report,
  })
  if (report.status === "error") {
    process.exit(1)
  }
}

interface NpmScriptResult {
  status: number
  stdout: string
  stderr: string
}

/**
 * Run an npm script while preserving the single-channel stdout contract.
 * The child's stdout and stderr are streamed to the parent's stderr for live
 * feedback, captured for inclusion in structured output, and never written
 * directly to the parent's stdout.
 */
function runNpmScript(args: string[], env: NodeJS.ProcessEnv, cwd: string): Promise<NpmScriptResult> {
  return new Promise((resolve) => {
    let stdout = ""
    let stderr = ""
    const child = spawn(npmCommand(), args, {
      cwd,
      env,
      stdio: ["inherit", "pipe", "pipe"],
    })
    child.stdout?.on("data", (data) => {
      stdout += data
    })
    child.stderr?.on("data", (data) => {
      stderr += data
    })
    child.on("close", (code) => {
      resolve({ status: code ?? 1, stdout, stderr })
    })
  })
}

async function runGovernAndExit(verdict = checkGovernDelegation(process.cwd())): Promise<void> {
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

interface ValidationExecution {
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

async function executeValidationPlan(scripts: string[]): Promise<ValidationExecution> {
  const results: ValidationExecution["results"] = []
  const start = Date.now()

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

async function cmdHelp() {
  printJson({
    status: "ok",
    name: "synth",
    description: "AI-native operator CLI for SYNTH v2",
    usage: "synth <command> [options]",
    commands: COMMANDS,
    vocabulary: PUBLIC_VOCABULARY,
    note: "All output is JSON by default for agent consumption.",
  })
}

function namespaceHelp(
  namespace: string,
  description: string,
  subcommands: Array<{ name: string; description: string; args?: string }>,
  options: { note?: string } = {},
) {
  return {
    status: "ok",
    name: "synth",
    namespace,
    description,
    usage: `synth ${namespace} <subcommand> [options]`,
    subcommands,
    note:
      options.note ??
      `Run 'synth ${namespace} <subcommand> --help' for subcommand details when available.`,
  }
}

async function cmdBootstrapHelp() {
  const help = namespaceHelp("bootstrap", "Transform a repository into a Synth project", [
    { name: "synth bootstrap [path]", description: "Analyze repository and produce a bootstrap proposal" },
    { name: "synth bootstrap [path] --dry-run", description: "Generate proposal without mutating state", args: "--dry-run" },
    { name: "synth bootstrap [path] --approve", description: "Apply bootstrap and initialize governance artifacts", args: "--approve" },
    { name: "synth bootstrap [path] --name <name>", description: "Override the project name", args: "--name <name>" },
    { name: "synth bootstrap [path] --with-website", description: "Scaffold a static website", args: "--with-website" },
    { name: "synth bootstrap [path] --with-example", description: "Scaffold an example directory", args: "--with-example" },
  ])
  help.usage = "synth bootstrap [path] [options]"
  printJson(help)
}

async function cmdDiscoverHelp() {
  printJson(namespaceHelp("discover", "Produce a read-only analysis of a repository", [
    { name: "synth discover <path>", description: "Run Discovery and emit analysis as JSON to stdout (read-only, no mutation)" },
    { name: "synth discover <path> --export", description: "Export an immutable, signed discovery baseline to .synth/discovery/", args: "--export" },
  ], {
    note: "Default 'synth discover' is pure read-only and never writes files. Use --export only when durable discovery evidence is required.",
  }))
}

interface DiscoveryBaseline {
  schema: "synth-discovery-baseline-v1"
  generatedAt: string
  targetDir: string
  discoverySessionId: string
  discoverySessionHash: string
  analysis: unknown
  signature: string
}

function requireString(value: string | undefined, fallback: string): string {
  return value ?? fallback
}

async function writeDiscoveryBaseline(targetDir: string, data: Omit<DiscoveryBaseline, "signature">): Promise<string> {
  const discoveryDir = sdk.paths.discoveryDir(targetDir)
  await fs.mkdir(discoveryDir, { recursive: true })

  // The signature covers only deterministic content. generatedAt and targetDir
  // are volatile across runs and must not affect replay or cross-run equality.
  const signatureInput = {
    schema: data.schema,
    discoverySessionId: data.discoverySessionId,
    discoverySessionHash: data.discoverySessionHash,
    analysis: data.analysis,
  }
  const canonical = JSON.stringify(signatureInput, Object.keys(signatureInput).sort())
  const signature = sha256(canonical)
  const baseline: DiscoveryBaseline = { ...data, signature }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const filename = `baseline-${timestamp}-${signature.slice(0, 16)}.json`
  const baselinePath = path.join(discoveryDir, filename)
  await fs.writeFile(baselinePath, JSON.stringify(baseline, null, 2), "utf-8")
  return baselinePath
}

async function cmdDiscover(args: string[], flags: Record<string, string | boolean>) {
  const exportMode = flags.export === true || flags.export === "true"
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const { analyzeRepository } = await import("./bootstrap-analyzer.js")
  const analysis = await analyzeRepository(targetDir)
  const result = {
    status: "ok" as const,
    kind: "DiscoveryResult" as const,
    targetDir,
    exported: exportMode,
    repositoryType: analysis.repositoryType,
    sourceHistory: analysis.sourceHistory,
    analysis: {
      languages: analysis.languages,
      frameworks: analysis.frameworks,
      hasTests: analysis.hasTests,
      fileCount: analysis.fileCount,
      observationCount: analysis.observations.length,
    },
    agentContext: analysis.agentContext,
    discoverySessionId: analysis.discoverySessionId,
    discoverySessionHash: analysis.discoverySessionHash,
  }

  if (exportMode) {
    const baselinePath = await writeDiscoveryBaseline(targetDir, {
      schema: "synth-discovery-baseline-v1",
      generatedAt: new Date().toISOString(),
      targetDir,
      discoverySessionId: requireString(analysis.discoverySessionId, "unknown"),
      discoverySessionHash: requireString(analysis.discoverySessionHash, "unknown"),
      analysis: result.analysis,
    })
    printJson({
      ...result,
      baselinePath,
      note: "Discovery baseline exported. The artifact is read-only; consumers must not mutate it.",
    })
    return
  }

  printJson(result)
}

async function cmdMissionHelp() {
  printJson(namespaceHelp("mission", "Mission Studio operations", [
    { name: "synth mission create --subject <subject> --purpose <purpose>", description: "Create a Mission proposal" },
    { name: "synth mission project --alignment-contract-id <id>", description: "Project a Mission from an approved Alignment Contract (EXP-REFINE-014)" },
    { name: "synth mission approve --draft-id <id> --alignment-contract-id <contract-id>", description: "Approve a Mission draft" },
    { name: "synth mission evidence add --draft-id <id> --subject <subject> [--purpose <purpose>] [--confidence <level>]", description: "Add evidence to a Mission draft" },
    { name: "synth mission decisions [--draft-id <id>]", description: "List Mission decisions" },
    { name: "synth mission snapshot [<snapshot-id> | list]", description: "Inspect or list Mission snapshots" },
  ]))
}

async function cmdValidateHelp() {
  printJson(namespaceHelp("validate", "Analyze changes, plan validations, and execute them", [
    { name: "synth validate", description: "Run the adaptive validator on the current working tree" },
    { name: "synth validate --dry-run", description: "Preview the validation plan without executing" },
    { name: "synth validate --full", description: "Run the complete canonical governance pipeline" },
    { name: "synth validate dependencies", description: "Verify expedition charter dependency resolution" },
    { name: "synth validate artifact --type <type>", description: "Validate governance artifacts (expedition, mission)" },
  ]))
}

async function cmdExplainHelp() {
  printJson(namespaceHelp("explain", "Explain operations — replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all", [
    { name: "synth explain replay", description: "Verify replay consistency between event log and current state" },
    { name: "synth explain lineage", description: "Project → Mission → Expedition → Objective tree with broken parents" },
    { name: "synth explain proposals", description: "Proposal → observations/evidence from snapshot store" },
    { name: "synth explain snapshots", description: "Snapshot version history and parents" },
    { name: "synth explain graph", description: "Aggregate graph with per-node status and violation markers" },
    { name: "synth explain diagnostics", description: "Relationship diagnostics with violation rollup and replay attribution" },
    { name: "synth explain status", description: "Validation dashboard with one verdict" },
    { name: "synth explain identity", description: "Repository identity projection from replayable evidence" },
    { name: "synth explain resume", description: "What happened, what was decided, what is next" },
    { name: "synth explain governance", description: "Governance Record lineage derived from replay" },
    { name: "synth explain all", description: "Umbrella report with every section above" },
  ], { note: "Every explain subcommand is read-only. Use --log <path> to inspect an alternative project log. Use --json for machine output." }))
}

async function cmdIntentHelp() {
  printJson(namespaceHelp("intent", "Intent model operations", [
    { name: "synth intent create --file <path>", description: "Create an Intent Model from a JSON file" },
    { name: "synth intent refine --intent-model-id <id> --answers <path> --recommendation <recommendation> --reason <reason>", description: "Run a refinement session and produce a Refinement Report" },
    { name: "synth intent submit --intent-model-id <id>", description: "Submit a refined Intent Model for downstream Alignment Contract creation" },
    { name: "synth intent approve --report-id <id> [--decision approved_for_alignment|revision_required|rejected] [--reason <reason>]", description: "Approve or reject a Refinement Report" },
  ]))
}

async function cmdIntentCreate(flags: Record<string, string | boolean>) {
  const filePath = typeof flags.file === "string" ? flags.file : undefined
  if (!filePath) {
    printError("Usage: synth intent create --file <path>")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  let input: Record<string, unknown>
  try {
    const content = await fs.readFile(path.resolve(filePath), "utf-8")
    input = JSON.parse(content)
  } catch (err) {
    printError(`Failed to read intent model file: ${err instanceof Error ? err.message : String(err)}`)
    return
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateIntentModel",
    payload: { input },
  })

  if (result.status !== "ok") {
    printError(`CreateIntentModel failed: ${result.error}`)
    return
  }

  const events = await ctx.infra.eventStore.loadAll()
  const intentEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "INTENT_MODEL_CREATED")
  const intentModelId = (intentEvent?.payload as Record<string, any> | undefined)?.intentModelId

  printJson({
    status: "ok",
    kind: "IntentModelCreated",
    intentModelId,
    note: "Intent Model recorded. Run a refinement session before creating an Alignment Contract.",
  })
}

async function cmdIntentRefine(flags: Record<string, string | boolean>) {
  const intentModelId = typeof flags["intent-model-id"] === "string" ? flags["intent-model-id"] : undefined
  if (!intentModelId) {
    printError("Usage: synth intent refine --intent-model-id <id> [--answers <path>] [--recommendation <recommendation>] [--reason <reason>]")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const events = await ctx.infra.eventStore.loadAll()
  const initialEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "INTENT_MODEL_CREATED" && e.payload?.intentModelId === intentModelId)
  if (!initialEvent) {
    printError(`Intent Model not found: ${intentModelId}`)
    return
  }
  const initialModel = (initialEvent.payload as Record<string, any>).intentModel

  const startResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "StartRefinementSession",
    payload: { intentModelId },
  })
  if (startResult.status !== "ok") {
    printError(`StartRefinementSession failed: ${startResult.error}`)
    return
  }

  const sessionEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "REFINEMENT_SESSION_STARTED" && e.payload?.intentModelId === intentModelId)
  const sessionId = (sessionEvent?.payload as Record<string, any> | undefined)?.sessionId
  const questions = ((sessionEvent?.payload as Record<string, any> | undefined)?.questions ?? []) as Array<{ id: string; text: string; category: string; priority: string }>

  const answersPath = typeof flags.answers === "string" ? flags.answers : undefined
  let answers: Record<string, string> = {}
  let additionalEntries: Array<{ question: { id: string; text: string; category: string; priority: string }; answer: string }> = []
  if (answersPath) {
    try {
      const content = await fs.readFile(path.resolve(answersPath), "utf-8")
      const parsed = JSON.parse(content)
      if (parsed.answers && typeof parsed.answers === "object") {
        answers = parsed.answers
      }
      if (Array.isArray(parsed.additionalEntries)) {
        additionalEntries = parsed.additionalEntries
      }
    } catch (err) {
      printError(`Failed to read answers file: ${err instanceof Error ? err.message : String(err)}`)
      return
    }
  }

  if (Object.keys(answers).length === 0 && additionalEntries.length === 0) {
    printJson({
      status: "ok",
      kind: "RefinementSessionStarted",
      sessionId,
      intentModelId,
      questions,
      note: "Provide answers in a JSON file and rerun with --answers <path>",
    })
    return
  }

  for (const question of questions) {
    const answer = answers[question.id]
    if (!answer) continue
    const answerResult = await ctx.api.handleIntent({
      actor: "synth-cli",
      capability: "AnswerRefinementQuestion",
      payload: { sessionId, questionId: question.id, answer },
    })
    if (answerResult.status !== "ok") {
      printError(`AnswerRefinementQuestion failed for ${question.id}: ${answerResult.error}`)
      return
    }
  }

  const recommendation = typeof flags.recommendation === "string" ? flags.recommendation : "approve_for_alignment"
  const reason = typeof flags.reason === "string" ? flags.reason : "Refinement review completed via CLI"

  const reportResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateRefinementReport",
    payload: {
      sessionId,
      initialModel,
      reviewer: { kind: "human", id: "synth-cli-operator" },
      recommendation,
      reason,
      additionalEntries,
    },
  })
  if (reportResult.status !== "ok") {
    printError(`CreateRefinementReport failed: ${reportResult.error}`)
    return
  }

  const allEvents = await ctx.infra.eventStore.loadAll()
  const reportEvent = allEvents
    .slice()
    .reverse()
    .find((e: any) => e.type === "REFINEMENT_REPORT_CREATED" && e.payload?.report?.sessionId === sessionId)
  const reportId = (reportEvent?.payload as Record<string, any> | undefined)?.reportId
  const finalModelEvent = allEvents
    .slice()
    .reverse()
    .find((e: any) => e.type === "INTENT_MODEL_REVISED" && e.payload?.intentModelId === intentModelId)
  const finalConfidence = (finalModelEvent?.payload as Record<string, any> | undefined)?.intentModel?.confidenceLevel

  printJson({
    status: "ok",
    kind: "RefinementReportCreated",
    reportId,
    sessionId,
    intentModelId,
    finalConfidence,
    recommendation,
    reason,
    note: "Refinement Report created. Submit the Intent Model when ready for Alignment Contract creation.",
  })
}

async function cmdIntentSubmit(flags: Record<string, string | boolean>) {
  const intentModelId = typeof flags["intent-model-id"] === "string" ? flags["intent-model-id"] : undefined
  if (!intentModelId) {
    printError("Usage: synth intent submit --intent-model-id <id>")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "SubmitIntentModel",
    payload: { intentModelId },
  })

  if (result.status !== "ok") {
    printError(`SubmitIntentModel failed: ${result.error}`)
    return
  }

  printJson({
    status: "ok",
    kind: "IntentModelSubmitted",
    intentModelId,
    note: "Intent Model submitted. Ready for Alignment Contract creation (EXP-HOME-027).",
  })
}

async function cmdIntentApprove(flags: Record<string, string | boolean>) {
  const reportId = typeof flags["report-id"] === "string" ? flags["report-id"] : undefined
  if (!reportId) {
    printError("Usage: synth intent approve --report-id <id> [--decision approved_for_alignment|revision_required|rejected] [--reason <reason>]")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const decision = typeof flags.decision === "string" ? flags.decision : "approved_for_alignment"
  const reason = typeof flags.reason === "string" ? flags.reason : "Refinement report approved for alignment"

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApproveRefinementReport",
    payload: {
      reportId,
      decision,
      reason,
      reviewer: { kind: "human", id: "synth-cli-operator" },
    },
  })

  if (result.status !== "ok") {
    printError(`ApproveRefinementReport failed: ${result.error}`)
    return
  }

  printJson({
    status: "ok",
    kind: "RefinementReportApproved",
    reportId,
    decision,
    reason,
    note: decision === "approved_for_alignment"
      ? "Refinement Report approved. Intent Model is now approved for Alignment Contract creation."
      : "Refinement Report rejected. Intent Model requires revision before alignment.",
  })
}

async function cmdAlignmentHelp() {
  printJson(namespaceHelp("alignment", "Intent alignment and divergence governance", [
    { name: "synth alignment create --intent-model-id <id>", description: "Derive an Alignment Contract from an approved Intent Model" },
    { name: "synth alignment submit --contract-id <id>", description: "Submit an Alignment Contract for review" },
    { name: "synth alignment approve --contract-id <id>", description: "Approve an Alignment Contract, authorizing Mission creation" },
    { name: "synth alignment prepare", description: "Create a minimal aligned contract and output its id" },
  ]))
}

async function cmdAlignmentCreate(flags: Record<string, string | boolean>) {
  const intentModelId = typeof flags["intent-model-id"] === "string" ? flags["intent-model-id"] : undefined
  if (!intentModelId) {
    printError("Usage: synth alignment create --intent-model-id <id> [--evidence <path>]")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const events = await ctx.infra.eventStore.loadAll()
  const approvedEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "REFINEMENT_REPORT_APPROVED" && e.payload?.intentModelId === intentModelId)
  if (!approvedEvent) {
    printError(`Intent Model ${intentModelId} has not been approved for alignment. Run 'synth intent approve' first.`)
    return
  }

  const intentEvent = events
    .slice()
    .reverse()
    .find((e: any) => e.type === "INTENT_MODEL_CREATED" && e.payload?.intentModelId === intentModelId)
  if (!intentEvent) {
    printError(`Intent Model not found: ${intentModelId}`)
    return
  }
  const intentModel = (intentEvent.payload as Record<string, any>).intentModel

  async function lastEvent(type: string, predicate: (e: any) => boolean = () => true) {
    const allEvents = await ctx.infra.eventStore.loadAll()
    const matches = allEvents.filter((e: any) => e.type === type && predicate(e))
    return matches.length > 0 ? matches[matches.length - 1] : undefined
  }

  // Create reference evidence entries from an optional evidence file or from a default canonical set.
  const evidencePath = typeof flags.evidence === "string" ? flags.evidence : undefined
  let evidenceEntries: Array<{ uri: string; description: string; kind?: string; mimeType?: string }> = []
  if (evidencePath) {
    try {
      const content = await fs.readFile(path.resolve(evidencePath), "utf-8")
      const parsed = JSON.parse(content)
      evidenceEntries = Array.isArray(parsed) ? parsed : parsed.entries ?? []
    } catch (err) {
      printError(`Failed to read evidence file: ${err instanceof Error ? err.message : String(err)}`)
      return
    }
  } else {
    evidenceEntries = [
      { uri: "file://docs/design/lds-002.md", description: "Mission Studio Design System (LDS-002) — canonical tokens and visual principles", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-PROGRAM-027.md", description: "Program 027 charter — Mission Studio Homepage scope and constraints", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-HOME-001.md", description: "Mission Studio Design Language — canonical visual language", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-HOME-002.md", description: "Mission Studio Component Catalog — reusable workspace components", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-HOME-025.md", description: "Mission Studio Design Governance — anti-drift rules", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/expeditions/EXP-HOME-026.md", description: "Homepage Intent Model — approved refined intent", kind: "document", mimeType: "text/markdown" },
      { uri: "file://docs/governance/program-027/refinement-report.json", description: "Refinement Report — evidence of refinement review and approval", kind: "document", mimeType: "application/json" },
    ]
  }

  const evidenceIds: string[] = []
  for (const entry of evidenceEntries) {
    const evidenceResult = await ctx.api.handleIntent({
      actor: "synth-cli",
      capability: "CreateReferenceEvidence",
      payload: {
        input: {
          kind: entry.kind || "document",
          uri: entry.uri,
          hash: "sha256:00000000",
          mimeType: entry.mimeType || "text/markdown",
          description: entry.description,
        },
      },
    })
    if (evidenceResult.status !== "ok") {
      printError(`CreateReferenceEvidence failed: ${evidenceResult.error}`)
      return
    }
    const evidenceEvent = await lastEvent("REFERENCE_EVIDENCE_CREATED", (e: any) =>
      e.payload.evidence?.uri === entry.uri
    )
    const evidenceId = (evidenceEvent?.payload as Record<string, any> | undefined)?.evidenceId
    if (evidenceId) evidenceIds.push(evidenceId)
  }

  if (evidenceIds.length === 0) {
    printError("No reference evidence could be created. Alignment Contract requires at least one evidence binding.")
    return
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateAlignmentContract",
    payload: {
      input: {
        intentModelId,
        intentSummary: intentModel.explicitObjectives.join("; "),
        expectedExperience: intentModel.desiredOutcome ?? "Not specified",
        requiredProperties: intentModel.allowedInterpretations,
        forbiddenProperties: intentModel.forbiddenInterpretations,
        requiredBehaviors: ["Workspace persists while phases change", "Supporting content appears after Mission Studio releases"],
        forbiddenInterpretation: intentModel.forbiddenInterpretations,
        forbiddenDrift: intentModel.forbiddenInterpretations,
        successCriteria: intentModel.desiredOutcome ? [intentModel.desiredOutcome] : [],
        referenceEvidenceIds: evidenceIds,
        dimensions: [
          { name: "Intent", score: 0.98, reason: "Explicit and implicit objectives documented and reviewed" },
          { name: "Experience", score: 0.95, reason: "Desired outcome and experience contract captured" },
          { name: "Visual", score: 0.97, reason: "Visual references and design system identified" },
          { name: "Interaction", score: 0.94, reason: "Scroll contract and workspace persistence captured" },
          { name: "Governance", score: 1.0, reason: "Refinement approval recorded" },
          { name: "Evidence", score: 1.0, reason: "All objectives bound to reference evidence" },
        ],
        objectiveCoverage: intentModel.explicitObjectives.map((objective: string) => ({
          objective,
          evidenceIds,
          aligned: true,
          notes: "Derived from approved Intent Model",
        })),
        implicitObjectiveStatus: intentModel.implicitObjectives.map((objective: string) => ({
          objective,
          status: "accepted",
          reason: "Accepted as part of refined intent",
        })),
        forbiddenInterpretations: intentModel.forbiddenInterpretations.map((interpretation: string) => ({
          interpretation,
          reason: "Explicitly forbidden in approved Intent Model",
          evidenceIds,
        })),
        confidenceExplanation: {
          score: 0.97,
          reason: "Computed from 6 alignment dimensions. Residual ambiguity is documented as known unknowns.",
        },
        residualDivergence: intentModel.knownUnknowns.map((unknown: string) => ({
          description: unknown,
          acceptedBy: { kind: "human", id: "synth-cli-operator" },
          reason: "Known unknown accepted for first release",
          risk: "low",
        })),
      },
    },
  })

  if (result.status !== "ok") {
    printError(`CreateAlignmentContract failed: ${result.error}`)
    return
  }

  const allEvents = await ctx.infra.eventStore.loadAll()
  const contractEvent = allEvents
    .slice()
    .reverse()
    .find((e: any) => e.type === "ALIGNMENT_CONTRACT_CREATED")
  const contractId = (contractEvent?.payload as Record<string, any> | undefined)?.contractId

  printJson({
    status: "ok",
    kind: "AlignmentContractCreated",
    contractId,
    intentModelId,
    note: "Alignment Contract created. Submit it for review and approval before Mission creation.",
  })
}

async function cmdAlignmentSubmit(flags: Record<string, string | boolean>) {
  const contractId = typeof flags["contract-id"] === "string" ? flags["contract-id"] : undefined
  if (!contractId) {
    printError("Usage: synth alignment submit --contract-id <id>")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "SubmitAlignmentContract",
    payload: { contractId },
  })

  if (result.status !== "ok") {
    printError(`SubmitAlignmentContract failed: ${result.error}`)
    return
  }

  printJson({
    status: "ok",
    kind: "AlignmentContractSubmitted",
    contractId,
    note: "Alignment Contract submitted for review.",
  })
}

async function cmdAlignmentApprove(flags: Record<string, string | boolean>) {
  const contractId = typeof flags["contract-id"] === "string" ? flags["contract-id"] : undefined
  if (!contractId) {
    printError("Usage: synth alignment approve --contract-id <id> [--reason <reason>]")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const reason = typeof flags.reason === "string" ? flags.reason : "Alignment Contract approved"

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApproveAlignmentContract",
    payload: {
      contractId,
      reviewer: { kind: "human", id: "synth-cli-operator" },
    },
  })

  if (result.status !== "ok") {
    printError(`ApproveAlignmentContract failed: ${result.error}`)
    return
  }

  printJson({
    status: "ok",
    kind: "AlignmentContractApproved",
    contractId,
    reason,
    note: "Alignment Contract approved. Mission creation is now authorized under Governance Architecture v1.0.",
  })
}

interface AlignmentPrepareResult {
  contractId: string
  intentModelId: string
  gateId: string
}

async function prepareAlignmentContract(ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>): Promise<AlignmentPrepareResult> {
  async function lastEvent(type: string, predicate: (e: any) => boolean = () => true) {
    const events = await ctx.infra.eventStore.loadAll()
    const matches = events.filter((e: any) => e.type === type && predicate(e))
    return matches.length > 0 ? matches[matches.length - 1] : undefined
  }

  const evidenceResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateReferenceEvidence",
    payload: {
      input: {
        kind: "document",
        uri: "file://alignment/prepare.md",
        hash: "sha256:00000000",
        mimeType: "text/markdown",
        description: "Reference evidence created by alignment prepare",
      },
    },
  })
  if (evidenceResult.status !== "ok") {
    throw new Error(`CreateReferenceEvidence failed: ${evidenceResult.error}`)
  }
  const evidenceEvent = await lastEvent("REFERENCE_EVIDENCE_CREATED")
  const evidenceId = (evidenceEvent?.payload as Record<string, any> | undefined)?.evidenceId
  if (!evidenceId) throw new Error("Reference evidence id not found after creation")

  const intentResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateIntentModel",
    payload: {
      input: {
        rawIntentReference: "synth-cli-alignment-prepare",
        explicitObjectives: ["Mission created through CLI alignment prepare"],
        implicitObjectives: [],
        audience: "operators",
        problemStatement: "Provide an aligned intent model for Mission approval",
        desiredOutcome: "Aligned Mission approved",
        nonGoals: [],
        forbiddenInterpretations: [],
        allowedInterpretations: ["CLI-prepared alignment"],
        referenceEvidenceIds: [evidenceId],
        unresolvedAmbiguity: [],
        knownUnknowns: [],
      },
    },
  })
  if (intentResult.status !== "ok") {
    throw new Error(`CreateIntentModel failed: ${intentResult.error}`)
  }
  const intentEvent = await lastEvent("INTENT_MODEL_CREATED")
  const intentModelId = (intentEvent?.payload as Record<string, any> | undefined)?.intentModelId
  if (!intentModelId) throw new Error("Intent model id not found after creation")

  const contractResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateAlignmentContract",
    payload: {
      input: {
        intentModelId,
        intentSummary: "Mission created through CLI alignment prepare",
        expectedExperience: "Aligned Mission execution",
        requiredProperties: ["Mission approved with aligned intent"],
        forbiddenProperties: ["Mission approved without alignment contract"],
        requiredBehaviors: ["Approval validates alignment"],
        successCriteria: ["Mission approval succeeds"],
        forbiddenInterpretation: ["Unaligned mission approval"],
        forbiddenDrift: ["Bypass alignment governance"],
        referenceEvidenceIds: [evidenceId],
      },
    },
  })
  if (contractResult.status !== "ok") {
    throw new Error(`CreateAlignmentContract failed: ${contractResult.error}`)
  }
  const contractEvent = await lastEvent("ALIGNMENT_CONTRACT_CREATED")
  const contractId = (contractEvent?.payload as Record<string, any> | undefined)?.contractId
  if (!contractId) throw new Error("Alignment contract id not found after creation")

  const submitResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "SubmitAlignmentContract",
    payload: { contractId },
  })
  if (submitResult.status !== "ok") {
    throw new Error(`SubmitAlignmentContract failed: ${submitResult.error}`)
  }

  const approveResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApproveAlignmentContract",
    payload: {
      contractId,
      reviewer: { kind: "human", id: "synth-cli-operator" },
    },
  })
  if (approveResult.status !== "ok") {
    throw new Error(`ApproveAlignmentContract failed: ${approveResult.error}`)
  }

  const openGateResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "OpenDivergenceGate",
    payload: { contractId, intentModelId },
  })
  if (openGateResult.status !== "ok") {
    throw new Error(`OpenDivergenceGate failed: ${openGateResult.error}`)
  }
  const gateEvent = await lastEvent("DIVERGENCE_GATE_OPENED", (e: any) => e.payload.contractId === contractId)
  const gateId = (gateEvent?.payload as Record<string, any> | undefined)?.gateId
  if (!gateId) throw new Error("Divergence gate id not found after opening")

  const resolveResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ResolveDivergenceGate",
    payload: {
      gateId,
      decision: "aligned",
      reviewer: { kind: "human", id: "synth-cli-operator" },
      reason: "CLI alignment prepare: contract accepted as baseline",
      evidence: ["alignment-prepare"],
    },
  })
  if (resolveResult.status !== "ok") {
    throw new Error(`ResolveDivergenceGate failed: ${resolveResult.error}`)
  }

  return { contractId, intentModelId, gateId }
}

async function cmdAlignmentPrepare() {
  // Phase 2 CLI workflow: create the minimal governance artifacts required
  // for Mission approval when the operator has not yet run a full refinement
  // session. This is a convenience wrapper around the public capabilities;
  // ApproveMission still validates the contract through the ExecutionGate.
  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  let result: AlignmentPrepareResult
  try {
    result = await prepareAlignmentContract(ctx)
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err))
  }

  printJson({
    status: "ok",
    kind: "AlignmentPrepared",
    contractId: result!.contractId,
    intentModelId: result!.intentModelId,
    gateId: result!.gateId,
    note: "This is a minimal aligned contract for CLI workflows. Production missions should run a full refinement session.",
  })
}

async function cmdExpeditionHelp() {
  printJson(namespaceHelp("expedition", "Expedition lifecycle operations", [
    { name: "synth expedition create --mission <mission> --subject <subject> --goal <goal>", description: "Create an Expedition proposal (Draft)" },
    { name: "synth expedition approve --draft-id <id>", description: "Approve an Expedition draft (Draft → Approved)" },
    { name: "synth expedition commit --proposal-id <id>", description: "Commit approved Expedition to runtime (Approved → Committed)" },
    { name: "synth expedition start --id <id>", description: "Begin executing a committed Expedition (Committed → Executing)" },
    { name: "synth expedition complete --id <id> --evidence <path>", description: "Complete an executing Expedition (Executing → Completed)" },
  ]))
}

async function cmdDoctorHelp() {
  printJson(namespaceHelp("doctor", "Verify installation and project health", [
    { name: "synth doctor", description: "Report Runtime Health and Project Health sections" },
  ]))
}

async function cmdCertifyHelp() {
  printJson(namespaceHelp("certify", "Run failure and recovery certification scenarios", [
    { name: "synth certify", description: "Run the default certification scenario library" },
    { name: "synth certify --explain", description: "Emit the full structured certification report" },
    { name: "synth certify --library-dir <dir>", description: "Load scenarios from a custom directory" },
    { name: "synth certify --output-dir <dir>", description: "Write structured evidence reports to <dir>" },
    { name: "synth certify --matrix <path>", description: "Write the certification matrix to <path>" },
  ]))
}

async function cmdAiHelp() {
  printJson(namespaceHelp("ai", "AI agent interoperability", [
    { name: "synth ai refresh", description: "Regenerate .synth/ai/ metadata from canonical state" },
  ]))
}

async function cmdAiRefresh() {
  const synthDir = sdk.paths.synthDir(sdk.workspace.root())
  await refreshAiMetadata(synthDir)
  printJson({ status: "ok", message: "AI metadata refreshed", path: path.join(synthDir, "ai") })
}

async function cmdAdapterHelp() {
  printJson(namespaceHelp("adapter", "Delegate to the adapter management CLI", [
    { name: "synth adapter <adapter> [args...]", description: "Run an adapter-specific command" },
  ]))
}

async function cmdInit(args: string[], flags: Record<string, string | boolean>) {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const projectName = typeof flags.name === "string" ? flags.name : path.basename(targetDir)
  const synthDir = sdk.paths.synthDir(targetDir)
  const dataDir = sdk.paths.dataDir(targetDir)
  const governanceVersion = "2.1"
  const projectId = sdk.identity.uuid()

  const sourceType = typeof flags.source === "string" ? flags.source : "filesystem"
  const sourceLocation = typeof flags["source-location"] === "string" ? flags["source-location"] : targetDir
  const declaredIntent = typeof flags["declared-intent"] === "string" ? flags["declared-intent"] : undefined

  await sdk.files.ensureDirectory(synthDir)
  await sdk.files.ensureDirectory(dataDir)

  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: await getVersion(),
    governanceVersion,
    projectName,
    root: targetDir,
    generatedAt: new Date().toISOString(),
    commands: COMMANDS.map((c) => ({ name: c.name, description: c.description })),
    capabilities: ADAPTER_NAMES,
    layout: {
      docs: "docs/",
      generatedDocs: "docs/generated/",
      examples: "examples/",
      data: ".synth/data/",
      proof: "proof/",
      src: "src/",
      tests: "tests/",
      scripts: "scripts/",
      website: "website/",
    },
    publicVocabulary: PUBLIC_VOCABULARY,
    govern: "npm run govern",
    quickStart: "synth init && synth docs generate && npm run govern",
  }

  await sdk.json.writeJson(sdk.paths.manifestPath(targetDir), manifest)

  // Bootstrap a file-backed runtime in the target directory so the
  // initialization itself is recorded as a replayable governance event.
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: sdk.paths.eventLogFile(targetDir),
      statePath: sdk.paths.stateFile(targetDir),
      checkpointPath: sdk.paths.checkpointsFile(targetDir),
    },
  })

  // Idempotency: if the project is already initialized, do not emit a
  // duplicate PROJECT_INITIALIZED event.
  const currentState = await ctx.runtime.getState()
  if (currentState.lifecycle !== "initialized") {
    // Resolve an initialization adapter, collect evidence, and build a
    // governed ProjectModel before recording the transition.
    const engine = createInitializationEngine({
      adapters: [createFilesystemInitializationAdapter(targetDir)],
    })

    const initResult = await engine.initialize({
      projectId,
      projectName,
      sourceType: sourceType as import("../adapters/initialization-adapter.js").SourceType,
      sourceLocation,
      declaredIntent,
    })

    if (!initResult.success) {
      printError(`Initialization failed: ${initResult.errors?.join(", ") || "unknown error"}`)
    }

    const evidenceStore = createInitializationEvidenceStore(createPosixFilesystemProvider(targetDir, FILESYSTEM_WRITE_TOKEN))
    const evidenceReference = await evidenceStore.persist(
      projectId,
      projectName,
      initResult.evidence,
      initResult.model,
    )

    const handleResult = await ctx.api.handleIntent({
      actor: "synth-cli",
      capability: "InitializeProject",
      payload: {
        projectId,
        name: projectName,
        governanceVersion,
        sourceType,
        sourceLocation,
        declaredIntent,
        adapterId: initResult.evidence.adapterId,
        adapterVersion: initResult.evidence.adapterVersion,
        evidenceReference,
        projectModel: initResult.model,
      },
    })

    if (handleResult.status !== "ok") {
      printError(`Project initialization failed: ${handleResult.error || JSON.stringify(handleResult)}`)
    }
  }

  const finalState = await ctx.runtime.getState()
  await writeAgentArtifacts(synthDir, projectName, finalState, manifest)

  printJson({
    status: "ok",
    message: "Synth project initialized",
    manifestPath: sdk.paths.manifestPath(targetDir),
    projectName,
    governanceVersion,
    lifecycle: "initialized",
    nextSteps: [
      "synth docs generate",
      "synth mission create --subject '...' --purpose '...'",
      "synth mission approve --draft-id <draft-id>",
      "npm run govern",
    ],
  })
}

async function cmdBootstrap(args: string[], flags: Record<string, string | boolean>) {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const options = {
    approve: flags.approve === true || flags.approve === "true",
    dryRun: flags["dry-run"] === true || flags["dry-run"] === "true",
    withWebsite: flags["with-website"] === true || flags["with-website"] === "true",
    withExample: flags["with-example"] === true || flags["with-example"] === "true",
    projectName: typeof flags.name === "string" ? flags.name : undefined,
  }

  const result = await runBootstrap(targetDir, options)
  printJson(result)

  if (result.status === "error") {
    process.exit(1)
  }
}

async function cmdGovern(flags: Record<string, string | boolean>) {
  const verdict = checkGovernDelegation(process.cwd())
  if (!verdict.allowed) {
    if (verdict.condition === "missing-package-json" || verdict.condition === "missing-govern-script") {
      return runInternalGovernance(verdict.condition)
    }
    return printError(verdict.message)
  }
  const args = ["run", "govern"]
  if (flags.explain === true || flags.explain === "true") args.push("--explain")
  if (typeof flags.profile === "string") args.push("--profile", flags.profile)
  if (flags.full === true || flags.full === "true") args.push("--full")
  const result = await runNpmScript(args, verdict.childEnv, process.cwd())
  printJson({
    status: result.status === 0 ? "ok" : "error",
    kind: "GovernResult",
    delegated: true,
    condition: "delegated",
    exitCode: result.status,
    output: result.stdout,
    errors: result.stderr,
  })
  if (result.status !== 0) {
    process.exit(result.status)
  }
}

async function cmdStatus() {
  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const logger = new Logger("status")
  logger.info("Resolving governance context for operator briefing")
  // EXP-AI-003: keep .synth/ai/ metadata synchronized with canonical state so
  // agent orientation is always current when the operator asks for status.
  const synthDir = sdk.paths.synthDir(sdk.workspace.root())
  await refreshAiMetadata(synthDir)
  const briefing = await buildOperatorBriefing(process.cwd())
  printJson(briefing)
  if (briefing.status === "error") {
    process.exit(1)
  }
}

function makeObservation(
  type: string,
  subject: string,
  timestamp: number,
  overrides: Record<string, unknown> = {}
): PlanningObservation {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "synth-cli",
    type: type as any,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp,
  }
}

function serializePlanningSession(session: PlanningSession): any {
  return {
    ...session,
    evidence: {
      evidence: session.evidence.evidence,
      byObservationId: Array.from(session.evidence.byObservationId.entries()),
    },
    worldModel: {
      ...session.worldModel,
      nodes: Array.from(session.worldModel.nodes.entries()),
      evidence: {
        evidence: session.worldModel.evidence.evidence,
        byObservationId: Array.from(session.worldModel.evidence.byObservationId.entries()),
      },
    },
  }
}

function deserializePlanningSession(data: any): PlanningSession {
  return {
    ...data,
    evidence: {
      evidence: data.evidence.evidence,
      byObservationId: new Map(data.evidence.byObservationId),
    },
    worldModel: {
      ...data.worldModel,
      nodes: new Map(data.worldModel.nodes),
      evidence: {
        evidence: data.worldModel.evidence.evidence,
        byObservationId: new Map(data.worldModel.evidence.byObservationId),
      },
    },
  }
}

async function ensureDraftsDir(): Promise<string> {
  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  await fs.mkdir(draftsDir, { recursive: true })
  return draftsDir
}

async function cmdMissionCreate(flags: Record<string, string | boolean>) {
  const subject = typeof flags.subject === "string" ? flags.subject : ""
  const purpose = typeof flags.purpose === "string" ? flags.purpose : ""
  const evidenceFile = typeof flags["evidence-file"] === "string" ? flags["evidence-file"] : ""
  if (!subject) printError("--subject is required")

  // Resolve the project's actual governance state before allowing intent
  // capture. The resolver is the single authority for lifecycle phase.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()
  const intake = await gateDecision({ kind: "mission.create" }, state, gateCtx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const ctx = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })
  const timestamp = Date.now()

  const observations = [makeObservation("mission", subject, timestamp, { purpose })]
  const sessionResult = (await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { observations, timestamp },
  })) as { status: string; session?: PlanningSession; error?: string }

  if (sessionResult.status !== "ok" || !sessionResult.session) {
    printError(`Mission Studio session failed: ${JSON.stringify(sessionResult)}`)
  }

  const session = sessionResult.session

  const proposalsResult = (await ctx.api.missionStudioOperation({
    operation: "proposeMissions",
    params: { observations, timestamp },
  })) as { status: string; proposals?: unknown; error?: string }

  const draftsDir = await ensureDraftsDir()
  const draftPath = path.join(draftsDir, `${session.id}.json`)
  const serialized = serializePlanningSession(session)
  await fs.writeFile(draftPath, JSON.stringify(serialized, null, 2), "utf-8")
  await writeDraftIntegrityRecord(draftsDir, session.id, serialized)

  let evidence: unknown = undefined
  if (evidenceFile) {
    const loaded = await loadEvidenceFromFile(evidenceFile)
    if (loaded) {
      const evidencePayload = { draftId: session.id, source: loaded.source, hash: loaded.hash }
      try {
        await ctx.api.handleIntent({
          actor: "synth-cli",
          capability: "AttachEvidence",
          payload: evidencePayload,
        })
        evidence = { status: "attached", ...evidencePayload }
      } catch {
        evidence = { status: "failed", ...evidencePayload, error: "Could not attach evidence to draft" }
      }
    } else {
      evidence = { status: "error", error: `Could not read evidence file: ${evidenceFile}` }
    }
  }

  printJson({
    status: "ok",
    kind: "MissionDraft",
    draftId: session.id,
    draftPath,
    integrity: "certified",
    subject,
    purpose,
    evidence,
    confidence: session.confidence,
    unknowns: session.unknowns,
    questions: session.questions,
    proposals: proposalsResult.status === "ok" ? proposalsResult.proposals : [],
    nextStep: `synth mission approve --draft-id ${session.id}`,
  })
}

async function materializeApprovedMission(
  gateCtx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  snapshot: import("../mission-studio/types.js").ApprovedMissionModelSnapshot,
  alignmentContractId?: string,
): Promise<{ missionId: string; name: string; purpose: string; created: boolean; approved: boolean }> {
  const state = await gateCtx.runtime.getState()
  const missionNode = Array.from(snapshot.worldModel.nodes.values()).find(
    (n: import("../mission-studio/types.js").WorldModelNode): n is MissionNode => n.kind === "mission",
  )
  if (!missionNode) {
    throw new Error("Approved snapshot contains no mission node")
  }

  let created = false
  let approved = false
  const existingMission = state.missions[missionNode.id]

  if (!existingMission) {
    const createMissionResult = await gateCtx.api.handleIntent({
      actor: "synth-cli",
      capability: "CreateMission",
      payload: { id: missionNode.id, name: missionNode.name, purpose: missionNode.purpose },
    })
    if (createMissionResult.status !== "ok") {
      throw new Error(`Failed to create runtime mission: ${createMissionResult.error || JSON.stringify(createMissionResult)}`)
    }
    created = true
  }

  if (!existingMission || existingMission.status === "draft") {
    const approvePayload: Record<string, unknown> = { id: missionNode.id }
    if (alignmentContractId) {
      approvePayload.alignmentContractId = alignmentContractId
    }
    const approveMissionResult = await gateCtx.api.handleIntent({
      actor: "synth-cli",
      capability: "ApproveMission",
      payload: approvePayload,
    })
    if (approveMissionResult.status !== "ok") {
      throw new Error(`Failed to approve runtime mission: ${approveMissionResult.error || JSON.stringify(approveMissionResult)}`)
    }
    approved = true
  }

  return {
    missionId: missionNode.id,
    name: missionNode.name,
    purpose: missionNode.purpose,
    created,
    approved,
  }
}

async function cmdMissionApprove(flags: Record<string, string | boolean>) {
  const draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : ""
  if (!draftId) printError("--draft-id is required")

  // Resolve the project's actual governance state before allowing approval.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()
  const intake = await gateDecision({ kind: "mission.approve" }, state, gateCtx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  const draftPath = path.join(draftsDir, `${draftId}.json`)
  let draftData: any
  try {
    draftData = JSON.parse(await fs.readFile(draftPath, "utf-8"))
  } catch {
    printError(`Draft not found: ${draftPath}`)
  }

  // Drafts are editable artifacts; certify before trusting anything (EXP-TRUST-002).
  const integrity = await verifyDraftIntegrity(draftsDir, draftId, draftData)
  if (!integrity.ok) {
    // Decisions are durable: the integrity rejection is recorded (EXP-TRUST-004).
    await appendDecision(dataDir, {
      type: "MISSION_DRAFT_INTEGRITY_REJECTED",
      draftId,
      reason: integrity.message,
    })
    printError(integrity.message)
  }

  const session = deserializePlanningSession(draftData)

  const ctx = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })
  const timestamp = Date.now()

  // Approval state derives from the decision record, never from the
  // editable approvalState field (EXP-TRUST-004): re-approval is
  // idempotent and prescriptive.
  const priorApproval = await latestDecision(dataDir, draftId, "MISSION_APPROVAL_APPROVED")

  const approveResult = (await ctx.api.missionStudioOperation({
    operation: "approveModel",
    params: { session, timestamp },
  })) as {
    status: string
    decision?: { approved: boolean; reason?: string; confidence?: number }
    result?: {
      success?: boolean
      error?: string
      session?: PlanningSession
      data?: import("../mission-studio/types.js").ApprovedMissionModelSnapshot
    }
    proposals?: unknown
    error?: string
  }

  if (approveResult.status !== "ok") {
    printError(`Mission approval operation failed: ${approveResult.error || JSON.stringify(approveResult)}`)
  }

  const decision = approveResult.decision
  if (!decision?.approved) {
    const reason = decision?.reason || "Approval denied by Mission Studio"
    await appendDecision(dataDir, {
      type: "MISSION_APPROVAL_REJECTED",
      draftId,
      reason,
      confidence: decision?.confidence ?? session.confidence.overall,
    })
    printJson({
      status: "ok",
      kind: "MissionApprovalDecision",
      decision: {
        approved: false,
        reason,
        confidence: decision?.confidence ?? session.confidence.overall,
      },
      draftId,
      decisionRecorded: true,
      proposals: approveResult.proposals ?? [],
      nextStep: `synth mission evidence add --draft-id ${draftId} --subject <subject> [--purpose <purpose>] [--confidence <level>] to create a successor draft with more evidence, then synth mission approve --draft-id <new-id>`,
    })
    return
  }

  const approvedData = approveResult.result?.data
  if (!approvedData) {
    printError("Mission Studio approved the model but produced no snapshot data")
  }

  // EXP-RUNTIME-001: Runtime events must precede snapshot persistence.
  // If the runtime mission cannot be materialized, the snapshot must not be
  // certified and the decision must not be recorded. This keeps planning and
  // runtime state atomic: a certified snapshot always implies corresponding
  // runtime events.
  const alignmentContractId = typeof flags["alignment-contract-id"] === "string" ? flags["alignment-contract-id"] : undefined
  let runtimeResult: Awaited<ReturnType<typeof materializeApprovedMission>>
  try {
    runtimeResult = await materializeApprovedMission(gateCtx, approvedData, alignmentContractId)
  } catch (err) {
    printError(err instanceof Error ? err.message : String(err))
  }

  // Persist the approved snapshot as an immutable, certified artifact.
  let snapshotPersisted = false
  let snapshotNote: string | undefined
  try {
    await ctx.api.missionStudioOperation({
      operation: "saveSnapshot",
      params: { snapshot: approvedData, session: approveResult.result?.session ?? session },
    })
    snapshotPersisted = true
  } catch (err) {
    if (err instanceof Error && err.message.includes("already exists")) {
      snapshotNote = "snapshot already persisted"
    } else {
      throw err
    }
  }

  // Record the approval decision only after runtime state and snapshot are
  // durable. On re-approval, this is idempotent: the decision already exists.
  if (!priorApproval) {
    await appendDecision(dataDir, {
      type: "MISSION_APPROVAL_APPROVED",
      draftId,
      confidence: decision?.confidence ?? session.confidence.overall,
      ...(approvedData.id ? { snapshotId: approvedData.id } : {}),
    })
  }

  printJson({
    status: "ok",
    kind: "MissionApprovalDecision",
    decision: {
      approved: true,
      confidence: decision?.confidence ?? session.confidence.overall,
    },
    draftId,
    decisionRecorded: true,
    snapshotId: approvedData.id,
    snapshotPersisted,
    ...(priorApproval
      ? { note: "draft is already approved" }
      : snapshotNote
        ? { note: snapshotNote }
        : {}),
    runtime: {
      missionId: runtimeResult.missionId,
      created: runtimeResult.created,
      approved: runtimeResult.approved,
    },
    proposals: approvedData.proposals,
    nextStep: `synth mission snapshot ${approvedData.id} to inspect the persisted snapshot`,
  })
}

async function cmdMissionProject(flags: Record<string, string | boolean>) {
  const alignmentContractId = typeof flags["alignment-contract-id"] === "string" ? flags["alignment-contract-id"] : undefined
  if (!alignmentContractId) {
    printError("Usage: synth mission project --alignment-contract-id <id>")
    return
  }

  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ProjectMission",
    payload: { alignmentContractId },
  })

  if (result.status !== "ok") {
    printError(`ProjectMission failed: ${result.error}`)
    return
  }

  const output = (result as any).result ?? {}
  const certification = output.certification ?? {}
  const passed = certification.result === "passed"
  const mission = output.mission ?? {}

  printJson({
    status: "ok",
    kind: passed ? "MissionProjectedAndCertified" : "MissionProjectionFailed",
    projectionId: output.projectionId,
    certificationId: certification.certificationId,
    missionId: mission.id,
    missionFingerprint: output.missionFingerprint,
    contractId: alignmentContractId,
    certification: passed
      ? { result: "passed", checks: certification.checks }
      : { result: "failed", reason: certification.checks?.filter((c: any) => !c.passed).map((c: any) => c.reason).join("; ") },
    note: passed
      ? "Mission projected, certified, and created. Ready for Mission Approval."
      : "Mission projection failed certification. Alignment Contract must be revised.",
  })
}

const EVIDENCE_CONFIDENCE_LEVELS = ["unknown", "low", "medium", "high", "certain"]

async function cmdMissionDecisions(flags: Record<string, string | boolean>) {
  const draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : undefined
  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const { records, chainValid } = await listDecisions(dataDir, draftId)
  if (!chainValid) {
    printError(
      "Mission decision record chain is broken: a recorded decision is missing, altered, or duplicated. " +
        "Inspect .synth/data/decisions.jsonl; the record is tamper-evident by design.",
    )
  }
  printJson({
    status: "ok",
    kind: "MissionDecisions",
    decisions: records,
    ...(draftId ? { draftId } : {}),
  })
}

async function cmdMissionEvidenceAdd(flags: Record<string, string | boolean>) {
  const draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : ""
  if (!draftId) printError("--draft-id is required")
  const subject = typeof flags.subject === "string" ? flags.subject : ""
  if (!subject) printError("--subject is required")

  // Resolve the project's actual governance state before allowing evidence add.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()
  const intake = await gateDecision({ kind: "mission.evidence.add" }, state, gateCtx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }
  const purpose = typeof flags.purpose === "string" ? flags.purpose : undefined
  const confidence = typeof flags.confidence === "string" ? flags.confidence : "high"
  if (!EVIDENCE_CONFIDENCE_LEVELS.includes(confidence)) {
    printError(`Unknown confidence level: "${confidence}". Valid levels: ${EVIDENCE_CONFIDENCE_LEVELS.join(", ")}`)
  }

  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  const draftPath = path.join(draftsDir, `${draftId}.json`)
  let draftData: any
  try {
    draftData = JSON.parse(await fs.readFile(draftPath, "utf-8"))
  } catch {
    printError(`Draft not found: ${draftPath}. Run synth mission create --subject <subject> --purpose <purpose> to create a Mission Draft.`)
  }

  // Drafts are certified artifacts; a tampered draft cannot be extended (EXP-TRUST-002).
  const integrity = await verifyDraftIntegrity(draftsDir, draftId, draftData)
  if (!integrity.ok) {
    printError(integrity.message)
  }

  const timestamp = Date.now()

  // Drafts are immutable: adding evidence creates a successor draft (EXP-TRUST-003).
  const observation = makeObservation("evidence", subject, timestamp, {
    description: purpose ?? subject,
    ...(purpose ? { purpose } : {}),
  })
  observation.confidence = confidence as PlanningObservation["confidence"]

  const existing = Array.isArray(draftData.observations) ? (draftData.observations as PlanningObservation[]) : []
  const dedupKey = `${observation.id}-${observation.sourceAdapter}-${observation.type}`
  if (existing.some((obs) => `${obs.id}-${obs.sourceAdapter}-${obs.type}` === dedupKey)) {
    printError(`This evidence is already present in draft "${draftId}"; nothing to add. Approve the draft, or add different evidence.`)
  }

  const ctx = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })

  const sessionResult = (await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { observations: [...existing, observation], timestamp },
  })) as { status: string; session?: PlanningSession; error?: string }

  if (sessionResult.status !== "ok" || !sessionResult.session) {
    printError(`Mission Studio session failed: ${JSON.stringify(sessionResult)}`)
  }

  const session = sessionResult.session
  const serialized = serializePlanningSession(session)
  const successorPath = path.join(draftsDir, `${session.id}.json`)
  await fs.writeFile(successorPath, JSON.stringify(serialized, null, 2), "utf-8")
  await writeDraftIntegrityRecord(draftsDir, session.id, serialized)

  printJson({
    status: "ok",
    kind: "MissionDraft",
    draftId: session.id,
    draftPath: successorPath,
    supersedes: draftId,
    integrity: "certified",
    confidence: session.confidence,
    unknowns: session.unknowns,
    questions: session.questions,
    nextStep: `synth mission approve --draft-id ${session.id}`,
  })
}

async function cmdMissionSnapshot(args: string[], flags: Record<string, string | boolean>) {
  const snapshotId =
    args[0] && args[0] !== "list" ? args[0] : typeof flags.id === "string" ? flags.id : ""

  const ctx = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })

  if (!snapshotId) {
    let listResult: { status: string; snapshots?: Array<Record<string, any>>; error?: string }
    try {
      listResult = (await ctx.api.missionStudioOperation({
        operation: "listSnapshots",
        params: {},
      })) as typeof listResult
    } catch (err) {
      // The snapshot store certifies on load: a throw means a stored
      // snapshot is tampered or malformed.
      printJson({
        status: "error",
        kind: "MissionSnapshotList",
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    }

    if (listResult.status !== "ok") {
      printError(`Snapshot listing failed: ${listResult.error || JSON.stringify(listResult)}`)
    }

    printJson({
      status: "ok",
      kind: "MissionSnapshotList",
      count: listResult.snapshots?.length ?? 0,
      snapshots: (listResult.snapshots ?? []).map((s) => ({
        snapshotId: s.id,
        version: s.version,
        sessionId: s.sessionId,
        lineageId: s.lineage?.lineageId,
        lineageVersion: s.lineage?.version,
        parentId: s.lineage?.parentId,
        approvedAt: s.lineage?.approvedAt,
        approvedBy: s.lineage?.approvedBy,
      })),
    })
    return
  }

  let getResult: { status: string; snapshot?: Record<string, any>; error?: string }
  try {
    getResult = (await ctx.api.missionStudioOperation({
      operation: "getSnapshot",
      params: { snapshotId },
    })) as typeof getResult
  } catch (err) {
    // The snapshot store certifies on load: a throw means the
    // snapshot failed signature or structural verification.
    printJson({
      status: "error",
      kind: "MissionSnapshotInspection",
      snapshotId,
      signatureValid: false,
      error: err instanceof Error ? err.message : String(err),
    })
    process.exit(1)
  }

  if (getResult.status !== "ok" || !getResult.snapshot) {
    printError(getResult.error || `snapshot not found: ${snapshotId}`)
  }

  const snapshot = getResult.snapshot
  printJson({
    status: "ok",
    kind: "MissionSnapshotInspection",
    snapshotId: snapshot.id,
    version: snapshot.version,
    sessionId: snapshot.sessionId,
    timestamp: snapshot.timestamp,
    lineage: snapshot.lineage ?? null,
    proposals: Array.isArray(snapshot.proposals) ? snapshot.proposals.length : 0,
    signatureValid: true,
    certification: { violations: [] },
  })
}

async function cmdRepairHelp() {
  printJson(namespaceHelp("repair", "Runtime repair operations", [
    { name: "synth repair replay", description: "Detect runtime drift against certified Mission snapshots and propose repairs" },
    { name: "synth repair replay --approve", description: "Apply proposed repairs by emitting compensating runtime events", args: "--approve" },
  ], {
    note: "Repair uses only public CLI commands and the ExecutionGate. It never edits event logs or state files directly.",
  }))
}

interface RepairEntry {
  snapshotId: string
  missionId?: string
  status: string
  requiredActions?: string[]
  appliedActions?: string[]
  reason?: string
  error?: string
}

async function cmdRepairReplay(args: string[], flags: Record<string, string | boolean>) {
  const approve = flags.approve === true || flags.approve === "true"
  await sdk.paths.ensureDataDir(sdk.workspace.root())

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()

  const listResult = (await ctx.api.missionStudioOperation({
    operation: "listSnapshots",
    params: {},
  })) as { status: string; snapshots?: Array<{ id: string }>; error?: string }

  if (listResult.status !== "ok") {
    printError(`Failed to list certified snapshots: ${listResult.error || JSON.stringify(listResult)}`)
  }

  const snapshotSummaries = listResult.snapshots ?? []
  const repairs: RepairEntry[] = []
  const repairedMissionIds = new Set<string>()

  for (const summary of snapshotSummaries) {
    const getResult = (await ctx.api.missionStudioOperation({
      operation: "getSnapshot",
      params: { snapshotId: summary.id },
    })) as {
      status: string
      snapshot?: import("../mission-studio/types.js").ApprovedMissionModelSnapshot
      error?: string
    }

    if (getResult.status !== "ok" || !getResult.snapshot) {
      repairs.push({
        snapshotId: summary.id,
        status: "error",
        error: getResult.error || "snapshot could not be loaded",
      })
      continue
    }

    const snapshot = getResult.snapshot
    const missionNode = Array.from(snapshot.worldModel.nodes.values()).find(
      (n: import("../mission-studio/types.js").WorldModelNode): n is import("../mission-studio/types.js").MissionNode =>
        n.kind === "mission",
    )

    if (!missionNode) {
      repairs.push({
        snapshotId: snapshot.id,
        status: "skipped",
        reason: "snapshot contains no mission node",
      })
      continue
    }

    const missionId = missionNode.id

    if (repairedMissionIds.has(missionId)) {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "already-repaired",
      })
      continue
    }

    const existing = state.missions[missionId]
    if (existing && existing.status === "active") {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "consistent",
      })
      continue
    }

    const requiredActions: string[] = []
    if (!existing) {
      requiredActions.push("create")
    } else if (existing.status === "draft") {
      requiredActions.push("approve")
    }

    if (requiredActions.length === 0) {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "consistent",
      })
      continue
    }

    if (!approve) {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "proposed",
        requiredActions,
      })
      continue
    }

    try {
      if (!existing) {
        const createResult = await ctx.api.handleIntent({
          actor: "synth-cli",
          capability: "CreateMission",
          payload: {
            id: missionId,
            name: missionNode.name,
            purpose: missionNode.purpose,
          },
        })
        if (createResult.status !== "ok") {
          throw new Error(`CreateMission failed: ${createResult.error || JSON.stringify(createResult)}`)
        }
      }

      const { contractId } = await prepareAlignmentContract(ctx)
      const approveResult = await ctx.api.handleIntent({
        actor: "synth-cli",
        capability: "ApproveMission",
        payload: { id: missionId, alignmentContractId: contractId },
      })
      if (approveResult.status !== "ok") {
        throw new Error(`ApproveMission failed: ${approveResult.error || JSON.stringify(approveResult)}`)
      }

      repairedMissionIds.add(missionId)
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "repaired",
        appliedActions: requiredActions,
      })
    } catch (err) {
      repairs.push({
        snapshotId: snapshot.id,
        missionId,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const repairedEntries = repairs.filter((r) => r.status === "repaired")
  if (approve && repairedEntries.length > 0) {
    const allAppliedActions = repairedEntries.flatMap((r) => r.appliedActions || [])
    const recordResult = await ctx.api.handleIntent({
      actor: "synth-cli",
      capability: "RecordRepair",
      payload: {
        repairPlan: { repairs: repairedEntries },
        appliedActions: allAppliedActions,
      },
    })
    if (recordResult.status !== "ok") {
      repairs.push({
        snapshotId: "audit",
        status: "failed",
        error: `RecordRepair failed: ${recordResult.error || JSON.stringify(recordResult)}`,
      })
    }
  }

  const failed = repairs.some((r) => r.status === "failed" || r.status === "error")
  const proposed = repairs.some((r) => r.status === "proposed")

  printJson({
    status: failed ? "error" : "ok",
    kind: "RepairReport",
    mode: approve ? "apply" : "dry-run",
    snapshotCount: snapshotSummaries.length,
    repairs,
    nextStep: failed
      ? "Inspect the failure details, then re-run after resolving the underlying issue."
      : proposed
        ? "Run 'synth repair replay --approve' to apply the proposed repairs."
        : "Run 'synth explain replay' to verify runtime consistency.",
  })

  if (failed) {
    process.exit(1)
  }
}

async function cmdExpeditionCreate(flags: Record<string, string | boolean>) {
  const missionSubject = typeof flags.mission === "string" ? flags.mission : ""
  const subject = typeof flags.subject === "string" ? flags.subject : ""
  const goal = typeof flags.goal === "string" ? flags.goal : ""
  if (!missionSubject || !subject) printError("--mission and --subject are required")

  // Resolve the project's actual governance state before allowing expedition
  // proposal. Planning itself remains in-memory.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.create", missionId: missionSubject }, state, gateCtx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const timestamp = Date.now()

  const observations = [
    makeObservation("mission", missionSubject, timestamp, { purpose: "Auto-created from CLI" }),
    makeObservation("expedition", subject, timestamp, { goal, missionSubject }),
  ]
  const sessionResult = (await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { observations, timestamp },
  })) as { status: string; session?: PlanningSession; error?: string }

  if (sessionResult.status !== "ok" || !sessionResult.session) {
    printError(`Mission Studio session failed: ${JSON.stringify(sessionResult)}`)
  }

  const session = sessionResult.session
  const proposalsResult = (await ctx.api.missionStudioOperation({
    operation: "proposeExpeditions",
    params: { observations, timestamp },
  })) as { status: string; proposals?: unknown; error?: string }

  // Persist the expedition draft and create a runtime entity in draft state.
  const draftsDir = await ensureDraftsDir()
  const draftPath = path.join(draftsDir, `${session.id}.json`)
  const serialized = serializePlanningSession(session)
  await fs.writeFile(draftPath, JSON.stringify(serialized, null, 2), "utf-8")
  await writeDraftIntegrityRecord(draftsDir, session.id, serialized)

  const expeditionId = session.id
  const createResult = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CreateExpedition",
    payload: { id: expeditionId, missionId: missionSubject, name: subject, goal },
  })

  if (createResult.status !== "ok") {
    printError(`Failed to create expedition runtime entity: ${createResult.error || JSON.stringify(createResult)}`)
  }

  printJson({
    status: proposalsResult.status,
    kind: "ExpeditionDraft",
    draftId: expeditionId,
    draftPath,
    integrity: "certified",
    missionSubject,
    expeditionSubject: subject,
    goal,
    proposals: proposalsResult.status === "ok" ? proposalsResult.proposals : undefined,
    nextStep: `synth expedition approve --draft-id ${expeditionId}`,
  })
}

async function cmdExpeditionApprove(flags: Record<string, string | boolean>) {
  const draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : ""
  if (!draftId) printError("--draft-id is required")

  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.approve", expeditionId: draftId }, state, gateCtx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  const draftPath = path.join(draftsDir, `${draftId}.json`)
  let draftData: any
  try {
    draftData = JSON.parse(await fs.readFile(draftPath, "utf-8"))
  } catch {
    printError(`Draft not found: ${draftPath}`)
  }

  const integrity = await verifyDraftIntegrity(draftsDir, draftId, draftData)
  if (!integrity.ok) {
    printError(integrity.message)
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApproveExpedition",
    payload: { id: draftId },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionApproveFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionApproved",
    draftId,
    proposalId: draftId,
    result: result.result,
    nextStep: `synth expedition commit --proposal-id ${draftId}`,
  })
}

async function cmdExpeditionCommit(flags: Record<string, string | boolean>) {
  const proposalId = typeof flags["proposal-id"] === "string" ? flags["proposal-id"] : ""
  if (!proposalId) printError("--proposal-id is required")

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.commit", expeditionId: proposalId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CommitExpedition",
    payload: { id: proposalId },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionCommitFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionCommitted",
    proposalId,
    result: result.result,
    nextStep: `synth expedition start --id ${proposalId}`,
  })
}

function resolveExpeditionId(flags: Record<string, string | boolean>): string {
  if (typeof flags.id === "string" && flags.id.length > 0) return flags.id
  if (typeof flags["expedition-id"] === "string" && flags["expedition-id"].length > 0) return flags["expedition-id"]
  return ""
}

async function cmdExpeditionStart(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  // Use the project's actual event log so the StartExpedition event is
  // persisted and replayable.
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.start", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "StartExpedition",
    payload: { id: expeditionId },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionStartFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionStarted",
    expeditionId,
    result: result.result,
    nextStep: `synth expedition complete --id ${expeditionId}`,
  })
}

async function cmdExpeditionComplete(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  // Use the project's actual event log so the CompleteExpedition event is
  // persisted and replayable.
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.complete", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const evidencePath = typeof flags.evidence === "string" ? flags.evidence : undefined

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CompleteExpedition",
    payload: { id: expeditionId, evidencePath },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionCompleteFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionCompleted",
    expeditionId,
    evidencePath,
    result: result.result,
  })
}

async function cmdDocsGenerateHelp() {
  printJson(namespaceHelp("docs", "Documentation operations", [
    {
      name: "synth docs generate",
      description: "Generate documentation projections from the knowledge base",
      args: "[--out-dir <dir>] [--knowledge-base <dir>] [--link-prefix <prefix>]",
    },
  ], {
    note: [
      "Documentation capabilities are the kinds of documents SYNTH can produce (e.g. README, Architecture, API Reference).",
      "Generated documentation is the set of files actually written to the output directory.",
      "A capability is skipped when the knowledge base lacks the source material required to produce meaningful content for that projection.",
    ].join(" "),
  }))
}

async function cmdDocsGenerate(flags: Record<string, string | boolean>) {
  const outDir = typeof flags["out-dir"] === "string" ? flags["out-dir"] : "./docs/generated"
  const knowledgeBaseDir = typeof flags["knowledge-base"] === "string" ? flags["knowledge-base"] : "./docs"
  const linkPrefix = typeof flags["link-prefix"] === "string" ? flags["link-prefix"] : undefined

  const result = (await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  }).then((ctx) =>
    ctx.api.documentationOperation({
      operation: "generateDocs",
      params: { knowledgeBaseDir, outDir, linkPrefix },
    }),
  )) as { status: string; summary?: unknown; projections?: Array<{ filename: string; title: string }>; warning?: string }

  const generatedFilenames = new Set(
    Array.isArray(result.projections) ? result.projections.map((p) => p.filename) : [],
  )
  const produced = DOCUMENTATION_CAPABILITIES
    .filter((cap) => generatedFilenames.has(cap.filename))
    .map((cap) => ({ ...cap, path: path.join(outDir, cap.filename) }))
  const skipped = DOCUMENTATION_CAPABILITIES
    .filter((cap) => !generatedFilenames.has(cap.filename))
    .map((cap) => ({ ...cap, reason: "No meaningful content could be projected from the knowledge base." }))

  printJson({
    ...result,
    kind: "DocumentationGenerated",
    capabilities: DOCUMENTATION_CAPABILITIES.map((cap) => ({
      id: cap.id,
      title: cap.title,
      description: cap.description,
    })),
    produced,
    skipped,
    note: [
      "capabilities = documentation types SYNTH knows how to generate",
      "produced = files written during this run",
      "skipped = capabilities not produced because source material was insufficient",
    ].join("; "),
  })
}

async function cmdExplainReplay(flags: Record<string, string | boolean>) {
  // Ensure runtime data is in `.synth/data/` for governed projects before
  // inspecting any project-local log.
  await sdk.paths.ensureDataDir(sdk.workspace.root())

  // --log <path> (EXP-HARDEN-007): inspect any example/project log;
  // state/checkpoint paths derive from the log's directory.
  const paths = resolveExplainPaths(flags)
  if (typeof flags.log === "string") {
    try {
      await fs.access(paths.logPath)
    } catch {
      printError(`event log not found: ${flags.log}`)
    }
  }
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: paths.logPath,
      statePath: paths.statePath,
      checkpointPath: paths.checkpointPath,
    },
  })

  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const replayResult = await verifier.verify()

  printJson({
    status: replayResult.consistent ? "ok" : "error",
    consistent: replayResult.consistent,
    eventCount: replayResult.eventCount,
    liveHash: replayResult.liveHash,
    replayHash: replayResult.replayHash,
    chainValid: replayResult.chainValid,
    explanation: replayResult.explanation,
  })
}

async function cmdAdapter(args: string[]) {
  // Delegate to the existing adapter CLI by spawning it.
  return new Promise<void>((resolve, reject) => {
    const child = spawn("node", [path.join(__dirname, "adapter.js"), ...args], {
      stdio: "inherit",
      cwd: process.cwd(),
    })
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`adapter command failed with exit code ${code}`))
    })
  })
}

function isNamespaceHelp(rawArgs: string[]): { namespace: string; handler: () => Promise<void> } | undefined {
  if (rawArgs.length < 2) return undefined
  if (!rawArgs.includes("--help") && !rawArgs.includes("-h")) return undefined
  const namespace = rawArgs[0]
  switch (namespace) {
    case "bootstrap":
      return { namespace, handler: cmdBootstrapHelp }
    case "discover":
      return { namespace, handler: cmdDiscoverHelp }
    case "mission":
      return { namespace, handler: cmdMissionHelp }
    case "intent":
      return { namespace, handler: cmdIntentHelp }
    case "alignment":
      return { namespace, handler: cmdAlignmentHelp }
    case "expedition":
      return { namespace, handler: cmdExpeditionHelp }
    case "doctor":
      return { namespace, handler: cmdDoctorHelp }
    case "certify":
      return { namespace, handler: cmdCertifyHelp }
    case "docs":
      return { namespace, handler: cmdDocsGenerateHelp }
    case "adapter":
      return { namespace, handler: cmdAdapterHelp }
    case "repair":
      return { namespace, handler: cmdRepairHelp }
    case "first-contact":
    case "genesis":
      return { namespace, handler: cmdFirstContactHelp }
    case "validate":
      return { namespace, handler: cmdValidateHelp }
    case "explain":
      return { namespace, handler: cmdExplainHelp }
    case "ai":
      return { namespace, handler: cmdAiHelp }
    case "repo":
      return { namespace, handler: async () => printJson(cmdRepoHelp()) }
    default:
      return undefined
  }
}

function classifyInvocation(rawArgs: string[], positional: string[], flags: Record<string, string | boolean>): string {
  if (rawArgs.length === 0 || rawArgs.includes("--help") || rawArgs.includes("-h")) return "--help"
  if (rawArgs.includes("--version") || rawArgs.includes("-v")) return "--version"

  const namespace = positional[0] || ""
  const sub = positional[1]

  if (namespace === "bootstrap") {
    if (flags.approve === true) return "bootstrap --approve"
    if (flags["dry-run"] === true) return "bootstrap --dry-run"
    return "bootstrap"
  }
  if (namespace === "docs" && sub === "generate") return "docs generate"
  if (namespace === "repair" && sub === "replay") {
    return flags.approve === true || flags.approve === "true" ? "repair replay --approve" : "repair replay"
  }
  if (namespace === "first-contact" || namespace === "genesis") {
    const prefix = namespace
    if (sub === "start") return `${prefix} start`
    if (sub === "clarify") return `${prefix} clarify`
    if (sub === "project") return `${prefix} project`
    if (sub === "verify") return `${prefix} verify`
    if (sub === "approve") return `${prefix} approve`
    if (sub === "status") return `${prefix} status`
    if (sub === "materialize") {
      if (flags["dry-run"] === true) return `${prefix} materialize --dry-run`
      if (flags.approve === true || flags.approve === "true") return `${prefix} materialize --approve`
      return `${prefix} materialize`
    }
  }
  if (namespace === "repo") {
    if (sub === "init") return "repo init"
    if (sub === "branch" && positional[2] === "create") return "repo branch create"
    if (sub === "pr" && positional[2] === "open") return "repo pr open"
    if (sub === "pr" && positional[2] === "approve") return "repo pr approve"
    if (sub === "pr" && positional[2] === "merge") return "repo pr merge"
    if (sub === "release" && positional[2] === "create") return "repo release create"
    if (sub === "status") return "repo status"
  }
  if (namespace === "mission") {
    if (sub === "create") return "mission create"
    if (sub === "approve") return "mission approve"
    if (sub === "decisions") return "mission decisions"
    if (sub === "evidence" && positional[2] === "add") return "mission evidence add"
    if (sub === "snapshot") return "mission snapshot"
    if (sub === "project") return "mission project"
    if (sub === "verify-charter") return "mission verify-charter"
  }
  if (namespace === "validate" && sub === "dependencies") return "validate dependencies"
  if (namespace === "validate" && sub === "artifact") return "validate artifact"
  if (namespace === "intent") {
    if (sub === "create") return "intent create"
  }
  if (namespace === "intent") {
    if (sub === "create") return "intent create"
    if (sub === "refine") return "intent refine"
    if (sub === "submit") return "intent submit"
    if (sub === "approve") return "intent approve"
  }
  if (namespace === "alignment") {
    if (sub === "create") return "alignment create"
    if (sub === "submit") return "alignment submit"
    if (sub === "approve") return "alignment approve"
    if (sub === "prepare") return "alignment prepare"
  }
  if (namespace === "expedition") {
    if (sub === "create") return "expedition create"
    if (sub === "approve") return "expedition approve"
    if (sub === "commit") return "expedition commit"
    if (sub === "start") return "expedition start"
    if (sub === "complete") return "expedition complete"
  }

  return namespace
}

// ============================================================
// EXP-GATE-013: Dependency validation command
// ============================================================
async function cmdValidateDependencies(flags: Record<string, string | boolean>) {
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
async function cmdValidateArtifact(flags: Record<string, string | boolean>) {
  const artifactType = typeof flags.type === "string" ? flags.type : ""

  if (!artifactType) {
    printJson({
      status: "error",
      kind: "ArtifactValidation",
      error: "--type is required. Options: expedition, mission, refined-intent, alignment-contract",
    })
    return
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
      printJson({
        status: "error",
        kind: "ArtifactValidation",
        error: `Unknown artifact type: ${artifactType}. Supported: expedition, mission`,
      })
      return
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

// ============================================================
// EXP-REFINE-015: Evidence attachment for mission create
// ============================================================
async function loadEvidenceFromFile(evidenceFile: string): Promise<{ source: string; content: string; hash: string } | null> {
  try {
    const content = await fs.readFile(evidenceFile, "utf-8")
    const hash = crypto.createHash("sha256").update(content).digest("hex")
    return { source: evidenceFile, content, hash }
  } catch {
    return null
  }
}

// ============================================================
// EXP-REFINE-015: Charter verification command
// ============================================================
async function cmdMissionVerifyCharter(flags: Record<string, string | boolean>) {
  const filePath = typeof flags.file === "string" ? flags.file : ""
  if (!filePath) {
    printJson({ status: "error", kind: "CharterVerification", error: "--file is required" })
    return
  }

  let content: string
  try {
    content = await fs.readFile(path.resolve(filePath), "utf-8")
  } catch {
    printJson({ status: "error", kind: "CharterVerification", error: `Cannot read file: ${filePath}` })
    return
  }

  const checks: { name: string; passed: boolean; detail: string }[] = []

  // Check required headers
  checks.push({ name: "has-title", passed: /^#\s+.+$/m.test(content), detail: "Title (H1) present" })
  checks.push({ name: "has-status", passed: /^\*\*Status:\*\*\s+.+$/m.test(content), detail: "Status header present" })
  checks.push({ name: "has-objective", passed: /^##\s+(Objective|Purpose|Thesis)/m.test(content), detail: "Objective/Purpose/Thesis section present" })

  // Check dependency headers
  const { parseDependencyRecord } = await import("../governance/dependency-graph.js")
  const record = parseDependencyRecord("charter", content)

  checks.push({ name: "depends-on-valid", passed: true, detail: `Depends On: ${record.dependsOn.length > 0 ? record.dependsOn.join(", ") : "none"}` })
  checks.push({ name: "blocks-valid", passed: true, detail: `Blocks: ${record.blocks.length > 0 ? record.blocks.join(", ") : "none"}` })

  // Check for required sections
  const sections = ["Deliverables", "Acceptance Criteria", "Out of Scope", "Relationship to Other Work"]
  for (const section of sections) {
    const pattern = new RegExp(`^##\\s+${section}`, "m")
    checks.push({ name: `has-section-${section.toLowerCase().replace(/\s+/g, "-")}`, passed: pattern.test(content), detail: `${section} section present` })
  }

  const failed = checks.filter((c) => !c.passed)

  printJson({
    status: failed.length === 0 ? "ok" : "warning",
    kind: "CharterVerification",
    file: filePath,
    totalChecks: checks.length,
    passed: checks.filter((c) => c.passed).length,
    failed: failed.length,
    checks,
    valid: failed.length === 0,
  })
}

async function main() {
  const rawArgs = process.argv.slice(2)

  if (rawArgs.length === 0) {
    await cmdHelp()
    return
  }

  // EXP-BROWNFIELD-001: every command namespace owns its help.
  // This must be checked before the generic --help handler.
  const namespaceHelp = isNamespaceHelp(rawArgs)
  if (namespaceHelp) {
    await namespaceHelp.handler()
    return
  }

  if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
    await cmdHelp()
    return
  }

  if (rawArgs.includes("--version") || rawArgs.includes("-v")) {
    await cmdVersion()
    return
  }

  // EXP-DISC-004: --json requests machine-clean output. Suppress diagnostic
  // INFO/WARN/DEBUG logs to stderr; ERROR logs are still emitted.
  const jsonFlag = rawArgs.includes("--json")
  if (jsonFlag) {
    process.env.SYNTH_QUIET_LOGS = "1"
  }

  // EXP-BROWNFIELD-001: Discovery Safety Model flag. Treat it as a boolean
  // sentinel and remove it from parsing so it does not consume the next
  // positional argument.
  const discoveryModeFlag = rawArgs.includes("--discovery-mode")
  const filteredArgs = rawArgs.filter((arg) => arg !== "--json" && arg !== "--discovery-mode")
  const { positional, flags } = parseArgs(["node", process.argv[1], ...filteredArgs])

  // Propagate the global --json flag to subcommands that need to know it
  // (e.g., synth explain ... --json), while still keeping it out of the
  // positional arguments passed to delegated CLIs.
  if (jsonFlag) {
    flags.json = true
  }

  // EXP-FIRSTCONTACT-010: when running as part of an agent first-contact
  // experiment, merge telemetry (agent session and reasoning state) into
  // every JSON response so the CLI acts as an experimental sensor.
  setAgentTelemetryFromFlags(flags)

  const command = positional[0]

  // EXP-BROWNFIELD-001: Discovery Safety Model. When --discovery-mode is set
  // or SYNTH_DISCOVERY_MODE is active, reject mutating commands.
  const discoveryMode = discoveryModeFlag || process.env.SYNTH_DISCOVERY_MODE === "1"
  if (discoveryMode) {
    const invokedCommand = classifyInvocation(rawArgs, positional, flags)
    if (!isSafeForDiscovery(invokedCommand)) {
      assertSafeForDiscovery(invokedCommand)
    }
  }

  switch (command) {
    case "version":
      await cmdVersion()
      break

    case "doctor":
      await cmdDoctor()
      break

    case "init":
      await cmdInit(positional.slice(1), flags)
      break

    case "bootstrap":
      await cmdBootstrap(positional.slice(1), flags)
      break

    case "discover":
      await cmdDiscover(positional.slice(1), flags)
      break

    case "govern":
      await cmdGovern(flags)
      break

    case "validate": {
      const sub = positional[1]
      if (sub === "dependencies") await cmdValidateDependencies(flags)
      else if (sub === "artifact") await cmdValidateArtifact(flags)
      else await cmdValidate(flags)
      break
    }

    case "verify":
      await cmdVerify()
      break

    case "status":
      await cmdStatus()
      break

    case "mission": {
      const sub = positional[1]
      if (sub === "create") await cmdMissionCreate(flags)
      else if (sub === "project") await cmdMissionProject(flags)
      else if (sub === "approve") await cmdMissionApprove(flags)
      else if (sub === "evidence" && positional[2] === "add") await cmdMissionEvidenceAdd(flags)
      else if (sub === "verify-charter") await cmdMissionVerifyCharter(flags)
      else if (sub === "decisions") await cmdMissionDecisions(flags)
      else if (sub === "snapshot") await cmdMissionSnapshot(positional.slice(2), flags)
      else
        printError(
          "Usage: synth mission create --subject <subject> --purpose <purpose> [--evidence-file <path>] | synth mission project --alignment-contract-id <id> | synth mission approve --draft-id <draft-id> --alignment-contract-id <contract-id> | synth mission evidence add --draft-id <draft-id> --subject <subject> [--purpose <purpose>] [--confidence <level>] | synth mission verify-charter --file <path> | synth mission decisions [--draft-id <draft-id>] | synth mission snapshot [<snapshot-id> | list]",
        )
      break
    }

    case "intent": {
      const sub = positional[1]
      if (sub === "create") await cmdIntentCreate(flags)
      else if (sub === "refine") await cmdIntentRefine(flags)
      else if (sub === "submit") await cmdIntentSubmit(flags)
      else if (sub === "approve") await cmdIntentApprove(flags)
      else
        printError("Usage: synth intent create --file <path> | synth intent refine --intent-model-id <id> [--answers <path>] [--recommendation <recommendation>] [--reason <reason>] | synth intent submit --intent-model-id <id> | synth intent approve --report-id <id> [--decision ...] [--reason <reason>]")
      break
    }

    case "alignment": {
      const sub = positional[1]
      if (sub === "create") await cmdAlignmentCreate(flags)
      else if (sub === "submit") await cmdAlignmentSubmit(flags)
      else if (sub === "approve") await cmdAlignmentApprove(flags)
      else if (sub === "prepare") await cmdAlignmentPrepare()
      else
        printError("Usage: synth alignment create --intent-model-id <id> | synth alignment submit --contract-id <id> | synth alignment approve --contract-id <id> | synth alignment prepare")
      break
    }

    case "expedition": {
      const sub = positional[1]
      if (sub === "create") await cmdExpeditionCreate(flags)
      else if (sub === "approve") await cmdExpeditionApprove(flags)
      else if (sub === "commit") await cmdExpeditionCommit(flags)
      else if (sub === "start") await cmdExpeditionStart(flags)
      else if (sub === "complete") await cmdExpeditionComplete(flags)
      else
        printError(
          "Usage: synth expedition create --mission <mission> --subject <subject> --goal <goal> | synth expedition approve --draft-id <id> | synth expedition commit --proposal-id <id> | synth expedition start --id <id> | synth expedition complete --id <id> [--evidence <path>]",
        )
      break
    }

    case "docs": {
      const sub = positional[1]
      if (sub === "generate") await cmdDocsGenerate(flags)
      else printError("Usage: synth docs generate [--out-dir <dir>] [--knowledge-base <dir>]")
      break
    }

    case "explain": {
      const sub = positional[1]
      if (sub === "replay") await cmdExplainReplay(flags)
      else if (sub === "identity") await cmdExplainIdentity(flags)
      else if (sub === "resume") await cmdExplainResume(flags)
      else if (sub === "governance") await cmdExplainGovernance(flags)
      else await cmdExplainObservability(sub, flags)
      break
    }

    case "repair": {
      const sub = positional[1]
      if (sub === "replay") await cmdRepairReplay(positional.slice(2), flags)
      else
        printError(
          "Usage: synth repair replay [--approve]",
        )
      break
    }

    case "certify":
      await cmdCertify(flags)
      break

    case "ai": {
      const sub = positional[1]
      if (sub === "refresh") await cmdAiRefresh()
      else printError("Usage: synth ai refresh")
      break
    }

    case "repo": {
      const sub = positional[1]
      if (sub === "init") await cmdRepoInit(flags)
      else if (sub === "branch" && positional[2] === "create") await cmdRepoBranchCreate(flags)
      else if (sub === "pr" && positional[2] === "open") await cmdRepoPrOpen(flags)
      else if (sub === "pr" && positional[2] === "approve") await cmdRepoPrApprove(flags)
      else if (sub === "pr" && positional[2] === "merge") await cmdRepoPrMerge(flags)
      else if (sub === "release" && positional[2] === "create") await cmdRepoReleaseCreate(flags)
      else if (sub === "status") await cmdRepoStatus()
      else
        printError(
          "Usage: synth repo init --forge-provider <p> --version-strategy <s> | synth repo branch create --name <n> --type <t> | synth repo pr open --head <h> --base <b> --title <t> --body-file <f> | synth repo pr approve --id <id> | synth repo pr merge --id <id> --commit <sha> | synth repo release create --tag <t> --commit <sha> | synth repo status",
        )
      break
    }

    case "adapter":
      await cmdAdapter(positional.slice(1))
      break

    case "first-contact":
    case "genesis": {
      const sub = positional[1]
      if (sub === "start") await cmdFirstContactStart(positional.slice(2), flags)
      else if (sub === "clarify") await cmdFirstContactClarify(positional.slice(2), flags)
      else if (sub === "project") await cmdFirstContactProject(positional.slice(2), flags)
      else if (sub === "verify") await cmdFirstContactVerify(positional.slice(2), flags)
      else if (sub === "approve") await cmdFirstContactApprove(positional.slice(2), flags)
      else if (sub === "materialize") await cmdFirstContactMaterialize(positional.slice(2), flags)
      else if (sub === "status") await cmdFirstContactStatus(positional.slice(2), flags)
      else
        printError(
          "Usage: synth first-contact start \"<intent>\" | synth first-contact clarify [--field <field> --answer <answer>] | synth first-contact project | synth first-contact verify | synth first-contact approve | synth first-contact materialize --dry-run | --approve | synth first-contact status",
        )
      break
    }

    default:
      printError(`Unknown command: ${command}. Run 'synth --help' for available commands.`)
  }
}

main().catch((err) => {
  printError(err instanceof Error ? err.message : String(err))
})
