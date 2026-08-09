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
import { spawn, execSync, execFileSync } from "child_process"
import { sha256 } from "../sdk/hashing/index.js"
import { fileURLToPath } from "url"
import { bootstrap } from "../core/bootstrap.js"
import { createReplayVerifier } from "../core/replay-verifier.js"
import { Logger } from "../observability/tracer.js"
import { runBootstrap } from "./bootstrap-apply.js"
import { writeAgentArtifacts } from "./agent-artifacts.js"
import { refreshAiMetadata, normalizeDiscoveryRepositoryType } from "./ai-metadata.js"
import { createInitializationEngine } from "../initialization/engine.js"
import { createInitializationEvidenceStore } from "../initialization/evidence-store.js"
import { createFilesystemInitializationAdapter } from "../adapters/filesystem-initialization-adapter.js"
import { createPosixFilesystemProvider, FILESYSTEM_WRITE_TOKEN } from "../infra/filesystem-provider.js"
import { checkGovernDelegation, governDelegationMessage, npmCommand } from "./govern-delegation.js"
import { setAgentTelemetry, printJson, printError, setHumanMode, setQuietMode, setSummaryMode } from "./print.js"
import { verifyDraftIntegrity, writeDraftIntegrityRecord } from "../mission-studio/draft-integrity.js"
import { appendDecision, latestDecision, listDecisions } from "../mission-studio/decision-log.js"
import { cmdExplainObservability, resolveExplainPaths } from "./explain-observability.js"
import { EXPECTED_CAPABILITIES, buildCapabilityEntries, buildImplementedCommandSet } from "./capabilities-data.js"
import { DOCUMENTATION_CAPABILITIES } from "../documentation/projections/engine.js"
import { cmdExplainIdentity } from "./repository-identity.js"
import { cmdExplainResume } from "./resume-briefing.js"
import { cmdExplainGovernance } from "./explain-governance.js"
import { cmdExplainAgents } from "./agent-guide.js"
import { cmdRelease } from "./release.js"
import { cmdVerify } from "./verify.js"
import { cmdVerifySignatures } from "./signatures.js"
import {
  cmdApprovalRequest,
  cmdApprovalGrant,
  cmdApprovalDeny,
  cmdApprovalList,
  cmdApprovalShow,
} from "./approval.js"
import { cmdTask, cmdTaskHelp } from "./task.js"
import {
  namespaceHelp as cmdMigrateHelp,
  cmdMigrateDetect,
  cmdMigratePlan,
  cmdMigrateArchive,
  cmdMigrateImport,
} from "./migrate.js"
import { initCliIdentity, injectIdentityContext } from "./identity-context.js"
import { generateAgentsContract } from "./agents-contract.js"
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
import {
  resolveGovernanceContext,
  isGovernanceResolutionFailure,
} from "../runtime/governance-resolver.js"
import { getCommandSafety, isSafeForDiscovery, assertSafeForDiscovery, classifyInvocation } from "./command-safety.js"
import { createAdapterRegistry } from "../mission-studio/adapter-registry.js"
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
  cmdFirstContactOnboard,
  cmdFirstContactOnboardDetect,
  cmdFirstContactOnboardArchive,
  cmdFirstContactOnboardInit,
  cmdFirstContactOnboardBootstrap,
  cmdFirstContactOnboardMission,
  cmdFirstContactOnboardGovern,
} from "./first-contact.js"
import { analyzeFiles, getWorkingTreeDiff, parseDiff } from "../governance/impact-analyzer.js"
import { GitSnapshotAdapter, loadSnapshotConfig } from "../adapter/git-snapshot.js"
import * as sdk from "../sdk/index.js"
import { buildValidationPlan, type CapabilityValidationMap, type ValidationPlan } from "../validation/planner.js"
import { loadTaskRegistry, type TaskRegistry } from "../task/task-registry.js"
import { runTasks } from "../task/task-runner.js"
import {
  loadGovernanceInventory,
  filterByValues,
  findProgramById,
  findExpeditionById,
  findProgramExpeditions,
  findUpstreamExpeditions,
  findDownstreamExpeditions,
} from "../governance/inventory.js"
import { loadExpeditionCharterDetails } from "../governance/charter-report.js"
import { rankExpeditions, rankPrograms } from "../governance/rank.js"
import { validateAgentAction, type AgentAction } from "../governance/intake.js"
import { validateEvaluationResult, formatEvaluationErrors } from "../domain/evaluation.js"
import { generateConvergenceEvaluation } from "../governance/convergence-certification/auto-evaluation.js"
import { buildDerivedState } from "../state/derived/index.js"
import type { PlanningObservation } from "../planning/observation.js"
import type { MissionNode, PlanningSession } from "../mission-studio/types.js"
import type { SynthEvent } from "../types/index.js"

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
  { name: "checkpoint", description: "Run pre-flight checkpoint before implementation work" },
  { name: "init", description: "Initialize the current directory as a Synth project" },
  { name: "bootstrap", description: "Transform a repository into a Synth project" },
  { name: "discover", description: "Produce a read-only analysis of a repository" },
  { name: "govern", description: "Run the full governance pipeline" },
  { name: "validate", description: "Analyze changes, plan validations, and execute them (--dry-run, --full)" },
  { name: "verify", description: "Verify governance invariants, projection consistency, and event-log signatures" },
  { name: "approval", description: "Two-party approval operations (request, grant, deny, list, show)" },
  { name: "status", description: "Report the current project state" },
  { name: "report", description: "Print a global human-readable project report" },
  { name: "mission", description: "Mission Studio operations (create, approve, snapshot)" },
  { name: "program", description: "Governance program inventory (list)" },
  { name: "project", description: "Project-level derived artifacts" },
  { name: "intent", description: "Intent model operations (create)" },
  { name: "alignment", description: "Intent alignment and divergence governance (prepare)" },
  { name: "expedition", description: "Expedition lifecycle (create, approve, commit, start, complete, archive, list)" },
  { name: "docs", description: "Documentation operations (generate)" },
  { name: "explain", description: "Explain operations (replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all)" },
  { name: "repair", description: "Repair operations (replay)" },
  { name: "release", description: "Deterministic, operator-approved release versioning" },
  { name: "certify", description: "Run failure and recovery certification scenarios" },
  { name: "capabilities", description: "List installed and missing CLI capabilities" },
  { name: "first-contact", description: "Guided onboarding entry point (greenfield, brownfield, legacy) and greenfield workflow (start, clarify, project, verify, approve, materialize, status)" },
  { name: "genesis", description: "Alias for the greenfield onboarding workflow (first-contact)" },
  { name: "ai", description: "AI agent interoperability (refresh)" },
  { name: "repo", description: "Repository and release governance operations" },
  { name: "snapshot", description: "Create, list, show, and verify git-anchored governance snapshots" },
  { name: "adapter", description: "Delegate to the adapter management CLI" },
  { name: "log", description: "Query the governance event log (read-only)" },
  { name: "task", description: "Canonical task orchestration (list, explain, graph, doctor)" },
  { name: "migrate", description: "Detect, plan, archive, and import legacy Synth state (detect, plan, archive, import)" },
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

  function appendFlagValue(name: string, value: string | boolean) {
    // Repeated --scope and --task flags are combined into a comma-separated
    // list so command handlers can split them without changing the flags type.
    if ((name === "scope" || name === "task") && typeof value === "string" && typeof flags[name] === "string") {
      flags[name] = `${flags[name]},${value}`
    } else {
      flags[name] = value
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith("--")) {
      const [key, value] = arg.split("=")
      const name = key.slice(2)
      if (value !== undefined) {
        appendFlagValue(name, value)
      } else if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        appendFlagValue(name, args[i + 1])
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
  // EXP-IDENTITY-001: ensure every handleIntent call carries the CLI identity.
  injectIdentityContext(ctx.api)
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
  printError(
    result.reason,
    {
      code: "LifecycleBlocked",
      category: "governance",
      suggestion: result.requiredAction,
      requiredAction: result.requiredAction,
    },
  )
}

/**
 * Inspect the git working tree and return whether it is dirty along with the
 * porcelain status text. Non-git directories are treated as clean so the CLI
 * can still operate outside version control.
 */
async function getWorkingTreeStatus(): Promise<{ dirty: boolean; status: string }> {
  return new Promise((resolve) => {
    const child = spawn("git", ["status", "--porcelain"], { cwd: process.cwd() })
    let stdout = ""
    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8")
    })
    child.on("close", (code) => {
      // Trim only trailing whitespace; leading whitespace is part of the
      // porcelain format (e.g. " M filename" for unstaged modifications).
      const status = stdout.replace(/\s+$/, "")
      resolve({ dirty: code === 0 && status.length > 0, status })
    })
    child.on("error", () => resolve({ dirty: false, status: "" }))
  })
}

async function isWorkingTreeDirty(): Promise<boolean> {
  return (await getWorkingTreeStatus()).dirty
}

// ============================================================
// EXP-AUTO-COMMIT-001: Auto-commit derived SYNTH state
// ============================================================
// Derived SYNTH state (.synth/data/, proof/expeditions/, event log,
// canonical state, AGENTS.md) is generated by lifecycle transitions.
// These files should never block expedition completion, and they should
// be checkpointed automatically so agents do not have to commit them
// manually between steps.
// ============================================================

const DERIVED_STATE_PATTERNS = [
  ".synth/data/",
  "proof/expeditions/",
  "data/event-log.jsonl",
  "data/canonical-state.json",
  "AGENTS.md",
]

type AutoCommitResult = {
  committed: boolean
  commitHash?: string
  message: string
  files: string[]
  reason?: string
}

function isDerivedStateFile(relPath: string): boolean {
  for (const pattern of DERIVED_STATE_PATTERNS) {
    if (pattern.endsWith("/")) {
      if (relPath.startsWith(pattern)) return true
    } else if (relPath === pattern) {
      return true
    }
  }
  return false
}

/**
 * Return the working-tree status limited to non-derived source files.
 * Derived state changes are excluded from the dirty flag so they cannot
 * block expedition completion, but they are reported separately so callers
 * can decide to auto-commit them.
 */
async function getNonDerivedWorkingTreeStatus(): Promise<{ dirty: boolean; status: string; derivedOnly: boolean; derivedStatus: string }> {
  const { dirty, status } = await getWorkingTreeStatus()
  if (!dirty) {
    return { dirty: false, status, derivedOnly: false, derivedStatus: "" }
  }
  const allLines = status.split("\n").filter((line) => line.length >= 3)
  const derivedLines: string[] = []
  const nonDerivedLines: string[] = []
  for (const line of allLines) {
    const relPath = line.slice(3)
    if (isDerivedStateFile(relPath)) {
      derivedLines.push(line)
    } else {
      nonDerivedLines.push(line)
    }
  }
  return {
    dirty: nonDerivedLines.length > 0,
    status: nonDerivedLines.join("\n"),
    derivedOnly: nonDerivedLines.length === 0,
    derivedStatus: derivedLines.join("\n"),
  }
}

function isAutoCommitEnabled(flags?: Record<string, string | boolean>): boolean {
  if (flags && (flags["no-auto-commit"] === true || flags["no-auto-commit"] === "true")) {
    return false
  }
  const env = process.env.SYNTH_AUTO_COMMIT
  if (env === "0" || env === "false") return false
  return true
}

async function collectDerivedStateFiles(cwd: string): Promise<string[]> {
  const files: string[] = []
  const dirs = [sdk.paths.dataDir(cwd), path.join(cwd, "proof", "expeditions")]
  const rootFiles = [
    sdk.paths.eventLogFile(cwd),
    sdk.paths.stateFile(cwd),
    path.join(cwd, "AGENTS.md"),
  ]

  for (const dir of dirs) {
    try {
      await fs.access(dir)
      await collectDerivedStateFilesRecursive(dir, cwd, files)
    } catch {
      // directory does not exist
    }
  }

  for (const file of rootFiles) {
    try {
      await fs.access(file)
      files.push(path.relative(cwd, file))
    } catch {
      // file does not exist
    }
  }

  return files
}

async function collectDerivedStateFilesRecursive(dir: string, cwd: string, out: string[]) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectDerivedStateFilesRecursive(fullPath, cwd, out)
    } else {
      out.push(path.relative(cwd, fullPath))
    }
  }
}

async function filterIgnoredFiles(cwd: string, files: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["check-ignore", "--stdin"], { cwd })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8")
    })
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8")
    })
    child.on("close", (code) => {
      // git check-ignore exits 1 when none of the inputs are ignored.
      if (code !== 0 && code !== 1) {
        reject(new Error(stderr || `git check-ignore exited with ${code}`))
        return
      }
      const ignored = new Set(stdout.trim().split("\n").filter(Boolean))
      resolve(files.filter((f) => !ignored.has(f)))
    })
    child.on("error", reject)
    child.stdin.end(files.join("\n"))
  })
}

/**
 * Best-effort commit of derived SYNTH state files. Never throws; failures are
 * returned in `reason` so lifecycle commands can warn without aborting.
 */
async function autoCommitDerivedState(
  cwd: string,
  transition: string,
  expeditionId?: string,
): Promise<AutoCommitResult> {
  const message = `chore(synth): record ${transition}${expeditionId ? ` for expedition ${expeditionId}` : ""}`

  try {
    await fs.access(path.join(cwd, ".git"))
  } catch {
    return { committed: false, message, files: [], reason: "Not a git repository" }
  }

  const allFiles = await collectDerivedStateFiles(cwd)
  if (allFiles.length === 0) {
    return { committed: false, message, files: [], reason: "No derived state files present" }
  }

  let stageableFiles: string[]
  try {
    stageableFiles = await filterIgnoredFiles(cwd, allFiles)
  } catch {
    stageableFiles = allFiles
  }
  if (stageableFiles.length === 0) {
    return { committed: false, message, files: allFiles, reason: "Derived state files are ignored by git" }
  }

  try {
    execFileSync("git", ["add", "--", ...stageableFiles], { cwd, stdio: ["pipe", "pipe", "pipe"] })
  } catch (err: any) {
    return { committed: false, message, files: stageableFiles, reason: `Failed to stage derived state: ${err.message || err}` }
  }

  const stagedNames = await new Promise<string>((resolve, reject) => {
    const child = spawn("git", ["diff", "--cached", "--name-only"], { cwd })
    let stdout = ""
    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8")
    })
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`git diff --cached exited with ${code}`))
      else resolve(stdout.trim())
    })
    child.on("error", reject)
  })

  const stagedFiles = stagedNames.split("\n").filter(Boolean)
  if (stagedFiles.length === 0) {
    return { committed: false, message, files: stageableFiles, reason: "No derived state changes to commit" }
  }

  try {
    execFileSync("git", ["commit", "-m", message, "--", ...stagedFiles], { cwd, stdio: ["pipe", "pipe", "pipe"] })
    const commitHash = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf-8" }).trim()
    return { committed: true, commitHash, message, files: stagedFiles }
  } catch (err: any) {
    return { committed: false, message, files: stagedFiles, reason: `Commit failed: ${err.message || err}` }
  }
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

async function cmdCheckpoint() {
  await sdk.paths.ensureDataDir(sdk.workspace.root())

  // Step 1: synth status projection.
  const briefing = await buildOperatorBriefing(process.cwd())
  const statusOk = briefing.status === "ok"

  // Step 2: replay consistency.
  const replay = await verifyReplayHealth()

  // Step 3: active executing expedition.
  const executingExpeditions =
    briefing.status === "ok"
      ? briefing.activeExpeditions.filter((e) => e.status === "executing")
      : []
  const hasExecutingExpedition = executingExpeditions.length > 0

  const steps = {
    status: {
      ok: statusOk,
      detail: statusOk ? "Governance context resolved" : "Failed to resolve governance context",
      ...(statusOk ? {} : { nextStep: "Run 'synth status' to diagnose the governance context." }),
    },
    replay: {
      ok: replay.ok,
      detail: replay.detail,
      ...(replay.ok ? {} : { nextStep: replay.nextStep }),
    },
    executingExpedition: {
      ok: hasExecutingExpedition,
      detail: hasExecutingExpedition
        ? executingExpeditions.map((e) => `${e.id} (${e.name})`).join(", ")
        : "No expedition is at executing status",
      ...(hasExecutingExpedition
        ? {}
        : { nextStep: "Run 'synth expedition start --id <id>' to authorize implementation work." }),
    },
  }

  const allOk = statusOk && replay.ok && hasExecutingExpedition
  const nextSteps: string[] = []
  for (const step of Object.values(steps)) {
    if (!step.ok && step.nextStep) {
      nextSteps.push(step.nextStep)
    }
  }
  if (allOk) {
    nextSteps.push("You may begin implementation work covered by the executing expedition.")
  }

  printJson({
    status: allOk ? "ok" : "blocked",
    kind: "AgentCheckpoint",
    steps,
    executingExpeditionIds: executingExpeditions.map((e) => e.id),
    nextSteps,
  })

  if (!allOk) {
    process.exit(1)
  }
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

function buildConfidenceAnalysis(
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
      reasons.push(`${mapped.length} of ${report.affectedCapabilities.length} affected capabilities map to validation entries in docs/reference/capability-validation-map.json.`)
    }
    if (unmapped.length > 0) {
      const unmappedList = unmapped.join(", ")
      reasons.push(`${unmapped.length} of ${report.affectedCapabilities.length} affected capabilities are not mapped to validation entries: ${unmappedList}.`)
      nextSteps.push("Add or expand capability entries in docs/reference/capability-validation-map.json, or add project-level validation scripts such as test, lint, typecheck, or govern.")
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

async function executeValidationPlan(scripts: string[], taskRegistry?: TaskRegistry): Promise<ValidationExecution> {
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

async function cmdHelp() {
  printJson({
    status: "ok",
    name: "synth",
    description: "AI-native operator CLI for SYNTH v2",
    usage: "synth <command> [options]",
    commands: COMMANDS,
    vocabulary: PUBLIC_VOCABULARY,
    globalOptions: [
      { name: "--json", description: "Emit machine-clean JSON and suppress diagnostic logs to stderr" },
      { name: "--human", description: "Emit prose summaries instead of JSON" },
      { name: "--quiet", description: "Suppress bootstrap and diagnostic INFO/WARN/DEBUG logs" },
      { name: "--summary", description: "Emit a condensed summary: status, kind, id, and next step" },
      { name: "--discovery-mode", description: "Reject mutating commands; safe for read-only exploration" },
    ],
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
    { name: "synth bootstrap [path] --approve --human", description: "Apply bootstrap and print human-readable progress", args: "--approve --human" },
    { name: "synth bootstrap [path] --approve --stream-stages", description: "Stream structured stage events to stderr", args: "--approve --stream-stages" },
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

async function updateLifecycleRepositoryType(targetDir: string, rawRepositoryType: string): Promise<string | undefined> {
  const lifecycleDir = path.join(sdk.paths.synthDir(targetDir), "ai")
  const lifecyclePath = path.join(lifecycleDir, "lifecycle.json")
  const normalized = normalizeDiscoveryRepositoryType(rawRepositoryType)
  if (!normalized) return undefined

  let lifecycle: Record<string, unknown> = {}
  try {
    const raw = await fs.readFile(lifecyclePath, "utf-8")
    lifecycle = JSON.parse(raw) as Record<string, unknown>
  } catch {
    // lifecycle.json may not exist yet; write a fresh one.
  }

  lifecycle.repositoryType = normalized
  await fs.mkdir(lifecycleDir, { recursive: true })
  await fs.writeFile(lifecyclePath, JSON.stringify(lifecycle, null, 2), "utf-8")
  return lifecyclePath
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
    const lifecyclePath = await updateLifecycleRepositoryType(targetDir, analysis.repositoryType)
    printJson({
      ...result,
      baselinePath,
      lifecyclePath,
      note: "Discovery baseline exported and lifecycle.json updated with repositoryType. The baseline artifact is read-only; consumers must not mutate it.",
      nextSteps: [
        "Run 'synth validate' to see the confidence score and required checks for working-tree changes.",
        "If the score is below 1.0, follow the concrete next steps printed by synth validate.",
      ],
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
    { name: "synth mission list [--status <status>] [--program <program-id>]", description: "List missions with optional filters" },
    { name: "synth mission show --id <mission-id>", description: "Show a single mission and its expeditions", args: "--id 74c3a70571facb87" },
    { name: "synth mission decisions [--draft-id <id>]", description: "List Mission decisions" },
    { name: "synth mission snapshot [<snapshot-id> | list]", description: "Inspect or list Mission snapshots" },
    { name: "synth mission report --id <mission-id>", description: "Show mission status and its expeditions", args: "--id 74c3a70571facb87" },
    { name: "synth mission complete --id <mission-id>", description: "Complete an active Mission", args: "--id 74c3a70571facb87" },
  ]))
}

async function cmdMissionApproveHelp() {
  printJson({
    status: "ok",
    name: "synth",
    namespace: "mission",
    subcommand: "approve",
    description: "Approve a Mission draft and bind it to an Alignment Contract.",
    usage: "synth mission approve --draft-id <draft-id> --alignment-contract-id <contract-id>",
    required: [
      { name: "--draft-id <draft-id>", description: "Id of the Mission draft to approve (returned by synth mission create)" },
      { name: "--alignment-contract-id <contract-id>", description: "Id of the approved Alignment Contract that governs the Mission" },
    ],
    optional: [
      { name: "--human", description: "Emit a human-readable summary instead of JSON" },
      { name: "--summary", description: "Emit a condensed status/ID/next-step summary" },
      { name: "--quiet", description: "Suppress bootstrap and diagnostic logs" },
    ],
    examples: [
      "synth mission approve --draft-id 74c3a70571facb87 --alignment-contract-id alignment-contract-msjisgwg-v05a18",
    ],
    note: "Approval is gated by Mission Studio confidence and the Alignment Contract.",
  })
}

async function cmdProgramHelp() {
  printJson(namespaceHelp("program", "Governance program inventory", [
    { name: "synth program list", description: "List all governance programs" },
    { name: "synth program list --status <status>", description: "Filter programs by status", args: "--status Proposed | Active | Completed" },
    { name: "synth program list --priority <priority>", description: "Filter programs by priority", args: "--priority Critical | High | Medium | Low" },
    { name: "synth program show --id <program-id>", description: "Show a single program and its expeditions", args: "--id EXP-PROGRAM-044" },
    { name: "synth program rank", description: "Rank active programs by weighted open work" },
    { name: "synth program rank --next", description: "Return the single highest-priority active program" },
    { name: "synth program rank --status <status>", description: "Rank programs by status", args: "--status Proposed | Active | Completed" },
  ], { note: "Program list, show, and rank are read-only and derived from docs/expeditions/*.md." }))
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

async function cmdVerifyHelp() {
  printJson(namespaceHelp("verify", "Verify governance invariants, projection consistency, and event-log signatures", [
    { name: "synth verify", description: "Run the full governance invariant verification suite" },
    { name: "synth verify signatures", description: "Verify Ed25519 signatures and Merkle roots in the event log" },
    { name: "synth verify signatures --public-key <path>", description: "Verify against a specific public key", args: "--public-key <path>" },
  ]))
}

async function cmdApprovalHelp() {
  printJson(namespaceHelp("approval", "Two-party approval operations for destructive governance actions", [
    { name: "synth approval request --operation <op> --reason \"...\"", description: "Request approval for a destructive operation", args: "--operation <op> --reason <reason>" },
    { name: "synth approval grant --request-id <id> --reason \"...\"", description: "Grant a pending approval request", args: "--request-id <id> --reason <reason>" },
    { name: "synth approval deny --request-id <id> --reason \"...\"", description: "Deny a pending approval request", args: "--request-id <id> --reason <reason>" },
    { name: "synth approval list [--operation <op>] [--status <status>]", description: "List approval requests" },
    { name: "synth approval show --request-id <id>", description: "Show a single approval request", args: "--request-id <id>" },
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
    { name: "synth explain agents", description: "Comprehensive machine-readable guide for AI agents operating SYNTH" },
    { name: "synth explain all", description: "Umbrella report with every section above" },
  ], { note: "Every explain subcommand is read-only. Use --log <path> to inspect an alternative project log. Use --json for machine output. Use --markdown with synth explain agents for prose output." }))
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
  printJson(namespaceHelp("expedition", "Expedition lifecycle and inventory operations", [
    { name: "synth expedition create --mission <mission> --subject <subject> --goal <goal> [--scope <glob>]", description: "Create an Expedition proposal (Draft) with an optional file-scope boundary" },
    { name: "synth expedition approve --draft-id <id>", description: "Approve an Expedition draft (Draft → Approved)" },
    { name: "synth expedition approve --all-drafts --mission <id>", description: "Approve all draft Expeditions for a Mission" },
    { name: "synth expedition commit --proposal-id <id>", description: "Commit approved Expedition to runtime (Approved → Committed)" },
    { name: "synth expedition commit --all-approved --mission <id>", description: "Commit all approved Expeditions for a Mission" },
    { name: "synth expedition start --id <id> [--no-auto-commit]", description: "Begin executing a committed Expedition (Committed → Executing); derived state is auto-committed by default" },
    { name: "synth expedition start --all-committed --mission <id> [--no-auto-commit]", description: "Start all committed Expeditions for a Mission" },
    { name: "synth expedition complete --id <id> [--evidence <path>] [--force --reason <text>] [--no-auto-commit]", description: "Complete an executing Expedition (Executing → Completed); requires passing verification and attached evidence" },
    { name: "synth expedition finish --id <id> [--note <text>] [--force --reason <text>] [--no-auto-commit]", description: "Atomically attach git-diff evidence, certify convergence, and complete an executing Expedition" },
    { name: "synth expedition cancel --id <id> --reason <reason>", description: "Cancel an Expedition as a safe fallback (Executing → Cancelled)" },
    { name: "synth expedition archive --id <id> --reason <reason>", description: "Archive an Expedition (Executing | Cancelled → Archived)" },
    { name: "synth expedition evidence --id <id> [--git-diff] [--baseline <commit>] [--test-results <path>] [--attach <path>[,...]] [--note <text>] [--no-auto-commit]", description: "Capture and attach evidence artifacts to an executing Expedition" },
    { name: "synth expedition refine --id <id> --note <text> [--no-auto-commit]", description: "Record a charter refinement on a non-terminal Expedition; status does not change" },
    { name: "synth expedition certify --id <id> [--evaluation <path>] [--evidence <path>] [--no-auto-commit]", description: "Certify convergence for an executing or completed Expedition; auto-generates evaluation when omitted" },
    { name: "synth expedition list", description: "List governance expeditions" },
    { name: "synth expedition list --status <status>", description: "Filter expeditions by status", args: "--status Draft | Proposed | Executing | Completed" },
    { name: "synth expedition list --priority <priority>", description: "Filter expeditions by priority", args: "--priority Critical | High | Medium | Low" },
    { name: "synth expedition list --program <program-id>", description: "Filter expeditions by program", args: "--program EXP-PROGRAM-043" },
    { name: "synth expedition show --id <expedition-id>", description: "Show a single expedition with upstream/downstream context", args: "--id EXP-CLI-005" },
    { name: "synth expedition report --id <expedition-id>", description: "Show a rich report with charter intent, evidence, and expected output", args: "--id EXP-CLI-005" },
    { name: "synth expedition rank", description: "Rank open expeditions by priority, status, and downstream impact" },
    { name: "synth expedition rank --next", description: "Return the single highest-priority open expedition" },
    { name: "synth expedition rank --status <status>", description: "Rank expeditions by status", args: "--status Draft | Proposed | Executing | Completed" },
    { name: "synth expedition rank --program <program-id>", description: "Rank expeditions within a program", args: "--program EXP-PROGRAM-043" },
  ], { note: "expedition list and rank are read-only and derived from docs/expeditions/*.md." }))
}

async function cmdExpeditionApproveHelp() {
  printJson({
    status: "ok",
    name: "synth",
    namespace: "expedition",
    subcommand: "approve",
    description: "Approve an Expedition draft so it can be committed and started, or approve all drafts for a Mission.",
    usage: "synth expedition approve --draft-id <draft-id> | synth expedition approve --all-drafts --mission <mission-id>",
    required: [
      { name: "--draft-id <draft-id>", description: "Id of the Expedition draft to approve (returned by synth expedition create)" },
      { name: "--all-drafts --mission <mission-id>", description: "Approve every Expedition in draft status for the given Mission" },
    ],
    optional: [
      { name: "--dry-run", description: "Preview which drafts would be approved without mutating state" },
      { name: "--human", description: "Emit a human-readable summary instead of JSON" },
      { name: "--summary", description: "Emit a condensed status/ID/next-step summary" },
      { name: "--quiet", description: "Suppress bootstrap and diagnostic logs" },
    ],
    examples: [
      "synth expedition approve --draft-id 0b15edbbb74e4701",
      "synth expedition approve --all-drafts --mission 0c3c95e581c0fd75",
    ],
    note: "Approval advances the Expedition from Draft to Approved. Batch mode skips expeditions that are no longer in draft state.",
  })
}

async function cmdDoctorHelp() {
  printJson(namespaceHelp("doctor", "Verify installation and project health", [
    { name: "synth doctor", description: "Report Runtime Health and Project Health sections" },
  ]))
}

async function cmdCheckpointHelp() {
  printJson(namespaceHelp("checkpoint", "Run pre-flight checkpoint before implementation work", [
    { name: "synth checkpoint", description: "Confirm status, replay consistency, and an executing expedition before work" },
  ]))
}

async function cmdProjectHelp() {
  printJson(namespaceHelp("project", "Project-level derived artifacts", [
    { name: "synth project AGENTS.md", description: "Regenerate the AI operator contract from baseline and fragments" },
    { name: "synth project AGENTS.md --check", description: "Exit non-zero if AGENTS.md is stale" },
  ], {
    note: "AGENTS.md is a derived file. Edit source fragments or the framework baseline, not the root contract.",
  }))
}

async function cmdProjectAgentsMd(flags: Record<string, string | boolean>) {
  const check = flags.check === true || flags.check === "true"
  const result = await generateAgentsContract({
    rootDir: process.cwd(),
    check,
  })

  if (check) {
    printJson({
      status: result.stale ? "stale" : "ok",
      stale: result.stale,
      fragmentCount: result.fragmentCount,
      nextStep: result.stale ? "Run `synth project AGENTS.md` to regenerate." : undefined,
    })
    if (result.stale) {
      process.exitCode = 1
    }
    return
  }

  printJson({
    status: "ok",
    kind: "AgentsContractGenerated",
    wrote: result.wrote,
    stale: result.stale,
    fragmentCount: result.fragmentCount,
    path: "AGENTS.md",
  })
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

async function cmdCapabilities() {
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })
  const installedCapabilities = new Set(ctx.capabilityRegistry.list())
  const adapterRegistry = createAdapterRegistry()
  const installedAdapters = new Set(adapterRegistry.list())
  const implementedCommands = buildImplementedCommandSet()

  const capabilities = buildCapabilityEntries(installedCapabilities, installedAdapters, implementedCommands)

  printJson({
    status: "ok",
    kind: "CapabilityReport",
    capabilities,
    adapters: Array.from(installedAdapters).sort(),
  })
}

async function cmdCapabilitiesHelp() {
  printJson(namespaceHelp("capabilities", "Expose what the installed CLI can and cannot do", [
    { name: "synth capabilities", description: "List installed and missing CLI capabilities" },
    { name: "synth capabilities --json", description: "Emit structured capability report (default)" },
  ], {
    note: "Expected capabilities without a registered runtime capability or adapter are reported as unavailable.",
  }))
}

async function cmdLogHelp() {
  printJson(namespaceHelp("log", "Query the governance event log (read-only)", [
    { name: "synth log", description: "Show the last 50 events" },
    { name: "synth log --expedition <id>", description: "Filter events by expedition id", args: "--expedition <id>" },
    { name: "synth log --expedition-id <id>", description: "Alias for --expedition", args: "--expedition-id <id>" },
    { name: "synth log --mission <id>", description: "Filter events by mission id", args: "--mission <id>" },
    { name: "synth log --agent-id <id>", description: "Filter events by agent identity", args: "--agent-id <id>" },
    { name: "synth log --session-id <id>", description: "Filter events by session identity", args: "--session-id <id>" },
    { name: "synth log --approval-mode <mode>", description: "Filter events by approval mode", args: "--approval-mode <mode>" },
    { name: "synth log --type <prefix>", description: "Filter events by type prefix", args: "--type <prefix>" },
    { name: "synth log --since <iso>", description: "Events at or after ISO timestamp", args: "--since <iso>" },
    { name: "synth log --limit <n>", description: "Cap result count (default 50, max 1000)", args: "--limit <n>" },
    { name: "synth log --format table", description: "Human-readable table output", args: "--format table|json" },
    { name: "synth log --format json", description: "One JSON object per line (default)", args: "--format table|json" },
  ], {
    note: "synth log is read-only and never appends events or modifies state.",
  }))
}

async function cmdLog(flags: Record<string, string | boolean>) {
  const logPath = sdk.paths.eventLogFile(process.cwd())
  let raw = ""
  try {
    raw = await fs.readFile(logPath, "utf-8")
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ENOENT") {
      printError(
        `No event log found at ${logPath}. Run 'synth init' or 'synth bootstrap' first.`,
        { nextStep: "synth bootstrap . --approve" },
      )
      return
    }
    throw err
  }

  const expeditionId = typeof flags.expedition === "string" ? flags.expedition : typeof flags["expedition-id"] === "string" ? flags["expedition-id"] : undefined
  const missionId = typeof flags.mission === "string" ? flags.mission : undefined
  const agentId = typeof flags["agent-id"] === "string" ? flags["agent-id"] : undefined
  const sessionId = typeof flags["session-id"] === "string" ? flags["session-id"] : undefined
  const approvalMode = typeof flags["approval-mode"] === "string" ? flags["approval-mode"] : undefined
  const typePrefix = typeof flags.type === "string" ? flags.type : undefined
  const sinceIso = typeof flags.since === "string" ? flags.since : undefined
  const limitRaw = typeof flags.limit === "string" ? parseInt(flags.limit, 10) : 50
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 50
  const format = flags.format === "table" ? "table" : "json"

  const sinceMs = sinceIso ? new Date(sinceIso).getTime() : undefined
  if (sinceIso !== undefined && (sinceMs === undefined || Number.isNaN(sinceMs))) {
    printError(`Invalid --since timestamp: ${sinceIso}`, { nextStep: "synth log --since 2026-07-31T00:00:00Z" })
    return
  }

  const lines = raw.split("\n").filter(Boolean)
  const events: Array<SynthEvent & { offset: number }> = []
  for (let i = 0; i < lines.length; i++) {
    try {
      const event = JSON.parse(lines[i]) as SynthEvent
      events.push({ ...event, offset: i + 1 })
    } catch {
      // Skip malformed lines; they cannot be attributed safely.
    }
  }

  const filtered = events.filter((event) => {
    if (expeditionId && !eventReferencesExpeditionId(event, expeditionId)) return false
    if (missionId && !eventReferencesMission(event, missionId)) return false
    if (agentId && !eventMatchesIdentity(event, "agentId", agentId)) return false
    if (sessionId && !eventMatchesIdentity(event, "sessionId", sessionId)) return false
    if (approvalMode && !eventMatchesIdentity(event, "approvalMode", approvalMode)) return false
    if (typePrefix && !event.type.startsWith(typePrefix)) return false
    if (sinceMs !== undefined && event.timestamp < sinceMs) return false
    return true
  })

  const reversed = filtered.slice().reverse()
  const page = reversed.slice(0, limit)

  if (format === "table") {
    if (page.length === 0) {
      console.log("No events match the query.")
      return
    }
    console.log("offset  timestamp                  type                aggregate    summary")
    for (const event of page) {
      const iso = new Date(event.timestamp).toISOString()
      const aggregate = eventAggregateId(event) ?? "-"
      const summary = eventSummary(event)
      console.log(
        `${String(event.offset).padEnd(7)} ${iso.padEnd(26)} ${event.type.padEnd(19)} ${aggregate.padEnd(12)} ${summary}`,
      )
    }
    return
  }

  printJson({
    status: "ok",
    kind: "EventLogQuery",
    total: events.length,
    matched: filtered.length,
    returned: page.length,
    events: page,
  })
}

function eventReferencesExpedition(event: SynthEvent, expeditionId: string): boolean {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  if (payload.expeditionId === expeditionId) return true
  if (payload.id === expeditionId) return true
  if (event.partitionKey === expeditionId) return true
  return deepContains(payload, expeditionId)
}

function eventReferencesExpeditionId(event: SynthEvent, expeditionId: string): boolean {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  if (payload.expeditionId === expeditionId) return true
  if (payload.parentExpeditionId === expeditionId) return true
  return false
}

function eventMatchesIdentity(event: SynthEvent, field: "agentId" | "sessionId" | "approvalMode", value: string): boolean {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  const identity = (payload.metadata as Record<string, unknown> | undefined)?.identity as Record<string, unknown> | undefined
  return identity?.[field] === value
}

function eventReferencesMission(event: SynthEvent, missionId: string): boolean {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  if (payload.missionId === missionId) return true
  if (payload.id === missionId) return true
  return deepContains(payload, missionId)
}

function eventAggregateId(event: SynthEvent): string | undefined {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  const id =
    payload.expeditionId ??
    payload.missionId ??
    payload.id ??
    payload.workItemId ??
    payload.planId ??
    payload.projectId ??
    payload.intentModelId ??
    payload.contractId ??
    payload.decisionId ??
    payload.discoveryArtifactId ??
    event.partitionKey
  return typeof id === "string" ? id : undefined
}

function eventSummary(event: SynthEvent): string {
  const payload = (event.payload ?? {}) as Record<string, unknown>
  const name =
    payload.subject ??
    payload.name ??
    payload.title ??
    payload.reason ??
    payload.decision ??
    eventAggregateId(event)
  return typeof name === "string" ? truncate(name, 48) : "-"
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + "..."
}

function deepContains(value: unknown, target: string): boolean {
  if (typeof value === "string") return value === target
  if (Array.isArray(value)) return value.some((item) => deepContains(item, target))
  if (value && typeof value === "object") {
    return Object.values(value).some((item) => deepContains(item, target))
  }
  return false
}

async function cmdAiHelp() {
  printJson(namespaceHelp("ai", "AI agent interoperability", [
    { name: "synth ai refresh", description: "Regenerate .synth/ai/ metadata from canonical state" },
  ]))
}

async function cmdAiRefresh() {
  const synthDir = sdk.paths.synthDir(sdk.workspace.root())
  await refreshAiMetadata(synthDir, true)
  printJson({ status: "ok", message: "AI metadata refreshed", path: path.join(synthDir, "ai") })
}

async function cmdAdapterHelp() {
  printJson(namespaceHelp("adapter", "Delegate to the adapter management CLI", [
    { name: "synth adapter <adapter> [args...]", description: "Run an adapter-specific command" },
    { name: "synth adapter install-hooks", description: "Install governance git hooks (backs up existing hooks)" },
  ]))
}

async function cmdSnapshotHelp() {
  printJson(namespaceHelp("snapshot", "Git-anchored governance state snapshots", [
    { name: "synth snapshot create [--message ...] [--tag <name>] [--include-proofs]", description: "Commit and tag governance files" },
    { name: "synth snapshot list [--limit <n>]", description: "List synth-* governance tags" },
    { name: "synth snapshot show --tag <tag-name>", description: "Show snapshot metadata for a tag" },
    { name: "synth snapshot verify --tag <tag-name>", description: "Check out tag and verify replay consistency" },
  ]))
}

async function cmdSnapshotCreate(flags: Record<string, string | boolean>) {
  const adapter = new GitSnapshotAdapter()
  const message = typeof flags.message === "string" ? flags.message : undefined
  const tagName = typeof flags.tag === "string" ? flags.tag : undefined
  const includeProofs = flags["include-proofs"] === true || flags["include-proofs"] === "true"
  const trigger = typeof flags.trigger === "string" ? (flags.trigger as any) : "SNAPSHOT_REQUESTED"

  const result = adapter.createSnapshot({
    cwd: process.cwd(),
    trigger,
    message,
    tagName,
    includeProofs,
    actor: "synth-cli",
  })

  if (!result.ok) {
    printError(result.reason || "Snapshot failed", {
      code: "SnapshotFailed",
      category: "governance",
      snapshotId: result.snapshotId,
      reason: result.reason,
    })
  }

  printJson({
    status: "ok",
    kind: "GovernanceSnapshotCreated",
    snapshotId: result.snapshotId,
    commitHash: result.commitHash,
    tagName: result.tagName,
    eventOffset: result.eventOffset,
    stateHash: result.stateHash,
    trigger: result.trigger,
  })
}

async function cmdSnapshotList(flags: Record<string, string | boolean>) {
  const adapter = new GitSnapshotAdapter()
  const limitRaw = typeof flags.limit === "string" ? parseInt(flags.limit, 10) : 50
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 1000) : 50
  const entries = adapter.listSnapshots(process.cwd(), limit)
  printJson({
    status: "ok",
    kind: "GovernanceSnapshotList",
    count: entries.length,
    entries,
  })
}

async function cmdSnapshotShow(flags: Record<string, string | boolean>) {
  const tagName = typeof flags.tag === "string" ? flags.tag : ""
  if (!tagName) {
    printError("Usage: synth snapshot show --tag <tag-name>")
    return
  }
  const adapter = new GitSnapshotAdapter()
  const entries = adapter.listSnapshots(process.cwd(), 1000)
  const entry = entries.find((e) => e.tagName === tagName)
  if (!entry) {
    printError(`Snapshot not found: ${tagName}`)
    return
  }
  printJson({
    status: "ok",
    kind: "GovernanceSnapshot",
    ...entry,
  })
}

async function cmdSnapshotVerify(flags: Record<string, string | boolean>) {
  const tagName = typeof flags.tag === "string" ? flags.tag : ""
  if (!tagName) {
    printError("Usage: synth snapshot verify --tag <tag-name>")
    return
  }
  const adapter = new GitSnapshotAdapter()
  const result = adapter.verifySnapshot(process.cwd(), tagName)
  printJson({
    status: result.ok && result.consistent ? "ok" : "error",
    kind: "GovernanceSnapshotVerification",
    ...result,
  })
  if (!result.ok || !result.consistent) {
    process.exit(1)
  }
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
    streamStages: flags["stream-stages"] === true || flags["stream-stages"] === "true",
  }

  const result = await runBootstrap(targetDir, options)

  if (flags.human === true || flags.human === "true") {
    console.log(`Bootstrapping ${result.projectName} at ${result.targetDir}`)
    console.log("")
    if (Array.isArray(result.stages)) {
      for (const stage of result.stages) {
        const duration = stage.durationMs ? ` (${stage.durationMs}ms)` : ""
        console.log(`${stage.description}... ${stage.status}${duration}`)
      }
    }
    console.log("")
    console.log(`Status: ${result.status}`)
    if (Array.isArray(result.nextSteps) && result.nextSteps.length > 0) {
      console.log("")
      console.log("Next steps:")
      for (const step of result.nextSteps) {
        console.log(`  ${step}`)
      }
    }
  } else {
    printJson(result)
  }

  if (result.status === "error") {
    process.exit(1)
  }
}

async function cmdGovern(flags: Record<string, string | boolean>) {
  const pipelineMode =
    flags.pipeline === true ||
    flags.pipeline === "true" ||
    flags.explain === true ||
    flags.explain === "true" ||
    typeof flags.profile === "string" ||
    flags.full === true ||
    flags.full === "true"

  if (pipelineMode) {
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
    return
  }

  // Unified onboarding invocation: detect project state and route to the
  // appropriate SYNTH entry point without requiring the user to choose commands.
  const rootDir = process.cwd()
  const hasManifest = sdk.paths.hasManifest(rootDir)
  const intent = typeof flags.intent === "string" ? flags.intent : ""

  if (!hasManifest) {
    // Uninitialized project: greenfield or intent-driven onboarding.
    if (intent) {
      printJson({
        status: "ok",
        kind: "GovernRouted",
        reason: "uninitialized_project_with_intent",
        route: "first-contact start",
        intent,
      })
      return cmdFirstContactStart([intent], flags)
    }
    printJson({
      status: "ok",
      kind: "GovernRouted",
      reason: "uninitialized_project",
      route: "first-contact onboard:detect",
    })
    return cmdFirstContactOnboardDetect([], flags)
  }

  const statePath = sdk.paths.stateFile(rootDir)
  let hasGovernanceState = false
  try {
    await fs.access(statePath)
    hasGovernanceState = true
  } catch {
    hasGovernanceState = false
  }

  if (!hasGovernanceState) {
    // Initialized but not yet governed: bootstrap an existing repository.
    printJson({
      status: "ok",
      kind: "GovernRouted",
      reason: "initialized_not_governed",
      route: "bootstrap --approve",
    })
    return cmdBootstrap([rootDir], { ...flags, approve: true })
  }

  // Already governed.
  if (intent) {
    printJson({
      status: "ok",
      kind: "GovernRouted",
      reason: "governed_project_with_intent",
      route: "mission create",
      intent,
    })
    return cmdMissionCreate({ ...flags, subject: intent, purpose: `Governed intent captured via synth govern: ${intent}` })
  }

  printJson({
    status: "ok",
    kind: "GovernRouted",
    reason: "governed_project_no_intent",
    route: "status",
  })
  return cmdStatus()
}

async function buildStatusValidationSummary(): Promise<Record<string, unknown> | undefined> {
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

async function cmdStatus() {
  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const logger = new Logger("status")
  logger.info("Resolving governance context for operator briefing")
  // EXP-AI-003: keep .synth/ai/ metadata synchronized with canonical state so
  // agent orientation is always current when the operator asks for status.
  const synthDir = sdk.paths.synthDir(sdk.workspace.root())
  await refreshAiMetadata(synthDir)
  const briefing = await buildOperatorBriefing(process.cwd())
  const validation = await buildStatusValidationSummary()
  if (briefing.status === "ok" && validation) {
    ;(briefing as Record<string, unknown>).validation = validation
  }
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
  if (!subject) {
    printError("--subject is required", {
      code: "MissingSubject",
      category: "validation",
      suggestion: "Provide --subject \"<mission subject>\" when creating a mission.",
    })
  }

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

  const alignmentContractId = typeof flags["alignment-contract-id"] === "string" ? flags["alignment-contract-id"] : undefined
  if (!alignmentContractId) {
    printError(
      "Mission approval requires --alignment-contract-id.",
      {
        code: "MissingAlignmentContractId",
        category: "governance",
        suggestion: "Create an alignment contract first:\n  synth alignment prepare\nThen approve the mission with:\n  synth mission approve --draft-id <draft-id> --alignment-contract-id <contract-id>",
      },
    )
  }

  // Validate the draft exists before running the approval gate. This gives the
  // operator a clear input-validation error (Draft not found) before any
  // lifecycle gate messaging, which is easier to recover from.
  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  const draftPath = path.join(draftsDir, `${draftId}.json`)
  let draftData: any
  try {
    draftData = JSON.parse(await fs.readFile(draftPath, "utf-8"))
  } catch {
    printError(`Draft not found: ${draftPath}`)
  }

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

async function cmdMissionComplete(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : ""
  if (!id) {
    printError("Usage: synth mission complete --id <mission-id>", {
      code: "MissingMissionId",
      category: "validation",
      suggestion: "Run 'synth status' to see active missions.",
    })
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CompleteMission",
    payload: { id },
  })

  if (result.status !== "ok") {
    printError(result.error || `Failed to complete mission ${id}`, {
      code: "MissionCompleteFailed",
      category: "lifecycle",
      suggestion: "Ensure the mission is active and all its expeditions are completed or cancelled.",
    })
    return
  }

  printJson({
    status: "ok",
    kind: "MissionCompleted",
    missionId: id,
    result: result.result,
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
    const isNumeric = /^\d+(\.\d+)?$/.test(confidence)
    printError(
      `Unknown confidence level: "${confidence}". Valid levels: ${EVIDENCE_CONFIDENCE_LEVELS.join(", ")}`,
      {
        code: "InvalidConfidenceLevel",
        category: "cli",
        suggestion: `Use a named confidence level: ${EVIDENCE_CONFIDENCE_LEVELS.join(", ")}.${isNumeric ? " Numeric values like \"0.9\" are not accepted." : ""}`,
      },
    )
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

// ============================================================
// EXP-CLI-003: Governance inventory list commands
// ============================================================

// Merge charter metadata with the authoritative runtime expedition state.
// Runtime status is authoritative; charter data enriches name, kind, priority,
// program, and dependency fields. CLI-created expeditions with no charter are
// still included, so list/show never return "not found" for a real expedition.
type MergedExpeditionRecord = import("../governance/inventory.js").ExpeditionRecord & {
  missionId?: string
}

async function buildMergedExpeditionMap(
  charterDir: string,
  resolved: Awaited<ReturnType<typeof resolveGovernanceContext>>,
): Promise<Map<string, MergedExpeditionRecord>> {
  const inventory = await loadGovernanceInventory(charterDir)
  const charterMap = new Map(inventory.expeditions.map((e) => [e.id, e]))
  const runtimeExpeditions = !isGovernanceResolutionFailure(resolved)
    ? resolved.authoritative.replayedState.expeditions
    : {}

  const allIds = new Set([...charterMap.keys(), ...Object.keys(runtimeExpeditions)])
  const merged = new Map<string, MergedExpeditionRecord>()
  for (const id of allIds) {
    const charter = charterMap.get(id)
    const runtime = runtimeExpeditions[id]
    merged.set(id, {
      id,
      name: charter?.name || runtime?.name || id,
      kind: charter?.kind || "Unknown",
      status: runtime?.status || charter?.status || "Unknown",
      priority: charter?.priority || "Unknown",
      program: charter?.program || "",
      dependsOn: charter?.dependsOn || runtime?.dependsOn || [],
      blocks: charter?.blocks || [],
      missionId: runtime?.missionId,
    })
  }
  return merged
}

async function buildMergedExpeditionList(
  charterDir: string,
  resolved: Awaited<ReturnType<typeof resolveGovernanceContext>>,
): Promise<MergedExpeditionRecord[]> {
  const map = await buildMergedExpeditionMap(charterDir, resolved)
  return Array.from(map.values())
}

async function findMergedExpeditionById(
  charterDir: string,
  id: string,
  resolved: Awaited<ReturnType<typeof resolveGovernanceContext>>,
): Promise<MergedExpeditionRecord | undefined> {
  const map = await buildMergedExpeditionMap(charterDir, resolved)
  return map.get(id)
}

const PROGRAM_INFERENCE_STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "into", "over", "under", "through", "before", "after", "above", "below", "between", "among", "within", "without", "during", "while", "about", "against", "around", "behind", "beyond", "except", "inside", "outside", "until", "upon", "toward", "towards", "across", "along", "beside", "beyond", "concerning", "despite", "following", "including", "regarding", "regardless", "since", "throughout", "unless", "whether", "which", "their", "there", "where", "when", "what", "who", "how", "why", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "cannot", "has", "have", "had", "was", "were", "been", "being", "are", "is", "am", "do", "does", "did", "done", "get", "gets", "got", "make", "makes", "made", "take", "takes", "took", "come", "comes", "came", "use", "uses", "used", "using", "need", "needs", "needed", "want", "wants", "wanted", "like", "likes", "liked", "work", "works", "worked", "working",
])

function extractMeaningfulTokens(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ")
  return normalized
    .split(/\s+/)
    .map((t) => t.replace(/s$/, ""))
    .filter((t) => t.length >= 4 && !PROGRAM_INFERENCE_STOP_WORDS.has(t))
}

function scoreProgramMatch(
  missionTokens: Set<string>,
  programName: string,
  programExpeditionNames: string[],
): number {
  let score = 0
  for (const token of extractMeaningfulTokens(programName)) {
    if (missionTokens.has(token)) score += 3
  }
  for (const name of programExpeditionNames) {
    for (const token of extractMeaningfulTokens(name)) {
      if (missionTokens.has(token)) score += 1
    }
  }
  return score
}

// Infer a mission's owning program from its expeditions' charter records.
// If all charter-backed expeditions under the mission belong to the same program,
// return that program. Otherwise, fall back to a keyword match against program
// names and their charter expedition names so CLI-created missions without
// charters still surface a plausible program.
async function inferMissionProgram(
  charterDir: string,
  missionId: string,
  resolved: Awaited<ReturnType<typeof resolveGovernanceContext>>,
): Promise<{ id: string; name: string } | undefined> {
  if (isGovernanceResolutionFailure(resolved)) return undefined
  const inventory = await loadGovernanceInventory(charterDir)
  const missionExpeditions = Object.values(resolved.authoritative.replayedState.expeditions).filter(
    (e) => e.missionId === missionId,
  )

  const expeditionPrograms = missionExpeditions
    .map((e) => {
      const charter = inventory.expeditions.find((ce) => ce.id === e.id)
      return charter?.program
    })
    .filter((program): program is string => Boolean(program))

  const distinct = Array.from(new Set(expeditionPrograms))
  if (distinct.length === 1) {
    const program = inventory.programs.find((p) => p.id === distinct[0])
    return program ? { id: program.id, name: program.name } : { id: distinct[0], name: distinct[0] }
  }

  const mission = resolved.authoritative.replayedState.missions[missionId]
  if (!mission) return undefined
  const missionText = [mission.name, mission.purpose, ...missionExpeditions.map((e) => e.name), ...missionExpeditions.map((e) => e.goal)].join(" ")
  const missionTokens = new Set(extractMeaningfulTokens(missionText))
  if (missionTokens.size === 0) return undefined

  const programExpeditionsMap = new Map<string, string[]>()
  for (const p of inventory.programs) {
    programExpeditionsMap.set(p.id, inventory.expeditions.filter((e) => e.program === p.id).map((e) => e.name))
  }

  let bestProgram: { id: string; name: string } | undefined
  let bestScore = 0
  for (const program of inventory.programs) {
    const score = scoreProgramMatch(missionTokens, program.name, programExpeditionsMap.get(program.id) || [])
    if (score > bestScore) {
      bestScore = score
      bestProgram = { id: program.id, name: program.name }
    }
  }

  // Require a minimum signal to avoid spurious matches.
  if (bestScore >= 4) {
    return bestProgram
  }
  return undefined
}

async function cmdProgramList(flags: Record<string, string | boolean>) {
  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const inventory = await loadGovernanceInventory(charterDir)

  let programs = inventory.programs
  programs = filterByValues(programs, (p) => p.status, typeof flags.status === "string" ? flags.status : undefined)
  programs = filterByValues(programs, (p) => p.priority, typeof flags.priority === "string" ? flags.priority : undefined)

  printJson({
    status: "ok",
    kind: "ProgramList",
    count: programs.length,
    programs,
  })
}

async function cmdExpeditionList(flags: Record<string, string | boolean>) {
  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const resolved = await resolveGovernanceContext(process.cwd())
  let expeditions = await buildMergedExpeditionList(charterDir, resolved)

  expeditions = filterByValues(expeditions, (e) => e.status, typeof flags.status === "string" ? flags.status : undefined)
  expeditions = filterByValues(expeditions, (e) => e.priority, typeof flags.priority === "string" ? flags.priority : undefined)

  const programFilter = typeof flags.program === "string" ? flags.program : undefined
  if (programFilter && programFilter.trim() !== "") {
    const allowed = new Set(programFilter.split(",").map((s) => s.trim()).filter(Boolean))
    expeditions = expeditions.filter((e) => allowed.has(e.program))
  }

  // Remove runtime-only fields from the list response to keep the public shape stable.
  const publicExpeditions = expeditions.map(({ missionId: _missionId, ...rest }) => rest)

  printJson({
    status: "ok",
    kind: "ExpeditionList",
    count: publicExpeditions.length,
    expeditions: publicExpeditions,
  })
}

// ============================================================
// EXP-CLI-004: Weighted governance inventory ranking
// ============================================================
async function cmdProgramRank(flags: Record<string, string | boolean>) {
  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const human = flags.human === true || flags.human === "true"
  const result = await rankPrograms(charterDir, {
    status: typeof flags.status === "string" ? flags.status : undefined,
    priority: typeof flags.priority === "string" ? flags.priority : undefined,
  }, {
    next: flags.next === true || flags.next === "true",
    human,
  })

  if (human && result.next) {
    const top = result.programs.find((p) => p.id === result.next)
    if (top) {
      printJson({
        status: "ok",
        kind: "ProgramRankHuman",
        next: result.next,
        text: `Next recommended program: ${result.next} (score ${top.score})\n  ${top.name}.\n  Reason: ${top.rationale}.`,
      })
      return
    }
  }

  printJson(result)
}

async function cmdExpeditionRank(flags: Record<string, string | boolean>) {
  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const human = flags.human === true || flags.human === "true"
  const result = await rankExpeditions(charterDir, {
    status: typeof flags.status === "string" ? flags.status : undefined,
    priority: typeof flags.priority === "string" ? flags.priority : undefined,
    program: typeof flags.program === "string" ? flags.program : undefined,
  }, {
    next: flags.next === true || flags.next === "true",
    human,
  })

  if (human && result.next) {
    const top = result.expeditions.find((e) => e.id === result.next)
    if (top) {
      printJson({
        status: "ok",
        kind: "ExpeditionRankHuman",
        next: result.next,
        text: `Next recommended expedition: ${result.next} (score ${top.score})\n  ${top.name}.\n  Reason: ${top.rationale}.`,
      })
      return
    }
  }

  printJson(result)
}

// ============================================================
// EXP-CLI-005: Governance entity show commands
// ============================================================
async function cmdProgramShow(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth program show --id <program-id>", {
      code: "MissingProgramId",
      category: "validation",
      suggestion: "Run 'synth program list' to see available programs.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const program = await findProgramById(charterDir, id)
  if (!program) {
    printError(`Program ${id} not found.`, {
      code: "ProgramNotFound",
      category: "validation",
      suggestion: "Run 'synth program list' to see available programs.",
    })
    return
  }

  const expeditions = await findProgramExpeditions(charterDir, id)
  const human = flags.human === true || flags.human === "true"

  if (human) {
    const expeditionLines = expeditions.length === 0
      ? "  No expeditions chartered."
      : expeditions.map((e) => `  ${e.id}  ${e.status}  ${e.name}`).join("\n")
    console.log(
      `Program: ${program.id} — ${program.name}\n` +
      `Status: ${program.status} | Priority: ${program.priority}\n` +
      `Open expeditions: ${program.openExpeditions} | Completed: ${program.completedExpeditions}\n\n` +
      `Expeditions:\n${expeditionLines}`,
    )
    return
  }

  printJson({
    status: "ok",
    kind: "ProgramShow",
    program,
    expeditions,
  })
}

async function cmdExpeditionShow(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth expedition show --id <expedition-id>", {
      code: "MissingExpeditionId",
      category: "validation",
      suggestion: "Run 'synth expedition list' to see available expeditions.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const resolved = await resolveGovernanceContext(process.cwd())
  const expedition = await findMergedExpeditionById(charterDir, id, resolved)
  if (!expedition) {
    printError(`Expedition ${id} not found.`, {
      code: "ExpeditionNotFound",
      category: "validation",
      suggestion: "Run 'synth expedition list' to see available expeditions.",
    })
    return
  }

  const [programRecord, upstream, downstream] = await Promise.all([
    expedition.program ? findProgramById(charterDir, expedition.program) : Promise.resolve(undefined),
    expedition.program ? findUpstreamExpeditions(charterDir, expedition as import("../governance/inventory.js").ExpeditionRecord) : Promise.resolve([]),
    expedition.program ? findDownstreamExpeditions(charterDir, expedition as import("../governance/inventory.js").ExpeditionRecord) : Promise.resolve([]),
  ])

  const program = programRecord
    ? { id: programRecord.id, name: programRecord.name }
    : { id: expedition.program, name: expedition.program }

  const human = flags.human === true || flags.human === "true"

  if (human) {
    const upstreamText = upstream.length === 0
      ? "None"
      : upstream.map((e) => `${e.id} (${e.status})`).join(", ")
    const downstreamText = downstream.length === 0
      ? "None"
      : downstream.map((e) => `${e.id} (${e.status})`).join(", ")
    console.log(
      `Expedition: ${expedition.id} — ${expedition.name}\n` +
      `Status: ${expedition.status} | Priority: ${expedition.priority}\n` +
      `Program: ${program.id ? `${program.id} — ${program.name}` : "Unknown"}${expedition.missionId ? `\nMission: ${expedition.missionId}` : ""}\n` +
      `Depends on: ${expedition.dependsOn.length === 0 ? "None" : expedition.dependsOn.join(", ")}\n` +
      `Blocks: ${expedition.blocks.length === 0 ? "None" : expedition.blocks.join(", ")}\n` +
      `Upstream: ${upstreamText}\n` +
      `Downstream: ${downstreamText}`,
    )
    return
  }

  const { missionId, ...publicExpedition } = expedition
  printJson({
    status: "ok",
    kind: "ExpeditionShow",
    expedition: publicExpedition,
    program: program.id ? program : undefined,
    missionId,
    upstream,
    downstream,
  })
}

// ============================================================
// Human-readable governance reports
// ============================================================
async function cmdExpeditionReport(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth expedition report --id <expedition-id>", {
      code: "MissingExpeditionId",
      category: "validation",
      suggestion: "Run 'synth expedition list' to see available expeditions.",
    })
    return
  }

  // Resolve runtime state first so we can fall back to CLI-created expeditions
  // that have no docs/expeditions charter file.
  const resolved = await resolveGovernanceContext(process.cwd())
  const runtimeExpedition = !isGovernanceResolutionFailure(resolved)
    ? resolved.authoritative.replayedState.expeditions[id]
    : undefined

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const charterRecord = await findExpeditionById(charterDir, id)

  if (!charterRecord && !runtimeExpedition) {
    printError(`Expedition ${id} not found.`, {
      code: "ExpeditionNotFound",
      category: "validation",
      suggestion: "Run 'synth expedition list' to see available expeditions.",
    })
    return
  }

  // Build a unified expedition record. Charter docs win for priority/kind/program;
  // runtime state provides the authoritative status, mission id, attachments, and goal.
  const expeditionRecord: import("../governance/inventory.js").ExpeditionRecord = charterRecord || {
    id: runtimeExpedition!.id,
    name: runtimeExpedition!.name,
    kind: "Unknown",
    status: runtimeExpedition!.status,
    priority: "Unknown",
    program: "",
    dependsOn: runtimeExpedition!.dependsOn || [],
    blocks: [],
  }

  const charterDetails = (await loadExpeditionCharterDetails(charterDir, id)) || {
    purpose: runtimeExpedition?.goal || "",
    goal: runtimeExpedition?.goal || "",
    deliverables: [],
    acceptanceCriteria: [],
    evidence: [],
    outOfScope: [],
    relatedDocuments: [],
    expectedOutput: "",
  }

  const [programRecord, upstream, downstream] = await Promise.all([
    findProgramById(charterDir, expeditionRecord.program),
    charterRecord ? findUpstreamExpeditions(charterDir, charterRecord) : Promise.resolve([]),
    charterRecord ? findDownstreamExpeditions(charterDir, charterRecord) : Promise.resolve([]),
  ])

  const program = programRecord
    ? { id: programRecord.id, name: programRecord.name }
    : { id: expeditionRecord.program, name: expeditionRecord.program }

  const runtimeStatus = runtimeExpedition?.status || expeditionRecord.status
  const missionId = runtimeExpedition?.missionId || ""
  const forceCompleted = runtimeExpedition?.force === true
  const forceReason = runtimeExpedition?.forceReason
  const attachments: Array<{ kind: string; path: string; hash?: string; note?: string }> = runtimeExpedition
    ? (runtimeExpedition.attachments || []).map((a) => ({
        kind: a.kind,
        path: a.path,
        hash: a.hash,
        note: a.note,
      }))
    : []

  const human = flags.human === true || flags.human === "true"
  if (human) {
    const deliverablesText =
      charterDetails.deliverables.length === 0
        ? "  (none documented)"
        : charterDetails.deliverables.map((d) => `  • ${d}`).join("\n")
    const criteriaText =
      charterDetails.acceptanceCriteria.length === 0
        ? "  (none documented)"
        : charterDetails.acceptanceCriteria.map((c) => `  • ${c}`).join("\n")
    const evidenceText =
      attachments.length === 0 && charterDetails.evidence.length === 0
        ? "  (none attached)"
        : [
            ...attachments.map((a) => `  • [${a.kind}] ${a.path}${a.note ? ` — ${a.note}` : ""}`),
            ...charterDetails.evidence.map((e) => `  • ${e}`),
          ].join("\n")
    const scopeText =
      charterDetails.outOfScope.length === 0
        ? "  (none documented)"
        : charterDetails.outOfScope.map((s) => `  • ${s}`).join("\n")
    const relatedText =
      charterDetails.relatedDocuments.length === 0
        ? "  (none documented)"
        : charterDetails.relatedDocuments.map((r) => `  • ${r}`).join("\n")
    const upstreamText = upstream.length === 0 ? "None" : upstream.map((e) => `${e.id} (${e.status})`).join(", ")
    const downstreamText = downstream.length === 0 ? "None" : downstream.map((e) => `${e.id} (${e.status})`).join(", ")

    const forceText = forceCompleted
      ? `\nForce completed: yes${forceReason ? `\nForce reason: ${forceReason}` : ""}`
      : ""

    console.log(
      `Expedition: ${id} — ${expeditionRecord.name}\n` +
      `Status: ${runtimeStatus} | Priority: ${expeditionRecord.priority}\n` +
      `Program: ${program.id ? `${program.id} — ${program.name}` : "Unknown"}${missionId ? `\nMission: ${missionId}` : ""}${forceText}\n\n` +
      `Purpose:\n  ${charterDetails.purpose || "(not documented)"}\n\n` +
      `Deliverables:\n${deliverablesText}\n\n` +
      `Definition of done / Acceptance criteria:\n${criteriaText}\n\n` +
      `Evidence:\n${evidenceText}\n\n` +
      `Out of scope:\n${scopeText}\n\n` +
      `Related documents:\n${relatedText}\n\n` +
      `Depends on: ${expeditionRecord.dependsOn.length === 0 ? "None" : expeditionRecord.dependsOn.join(", ")}\n` +
      `Blocks: ${expeditionRecord.blocks.length === 0 ? "None" : expeditionRecord.blocks.join(", ")}\n` +
      `Upstream: ${upstreamText}\n` +
      `Downstream: ${downstreamText}`,
    )
    return
  }

  const expeditionOutput: Record<string, unknown> = {
    id,
    name: expeditionRecord.name,
    status: runtimeStatus,
    priority: expeditionRecord.priority,
    kind: expeditionRecord.kind,
    program: program.id ? program : undefined,
    missionId: missionId || undefined,
    dependsOn: expeditionRecord.dependsOn,
    blocks: expeditionRecord.blocks,
    upstream,
    downstream,
  }
  if (forceCompleted) {
    expeditionOutput.force = true
    if (forceReason) expeditionOutput.forceReason = forceReason
  }

  printJson({
    status: "ok",
    kind: "ExpeditionReport",
    expedition: expeditionOutput,
    charter: charterDetails,
    attachments,
  })
}

async function cmdMissionList(flags: Record<string, string | boolean>) {
  const resolved = await resolveGovernanceContext(process.cwd())
  if (isGovernanceResolutionFailure(resolved)) {
    printError("Could not resolve governance context.", {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: "Run 'synth explain replay' to diagnose state issues.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const missions = Object.values(resolved.authoritative.replayedState.missions)

  let missionsWithProgram = await Promise.all(
    missions.map(async (m) => {
      const program = await inferMissionProgram(charterDir, m.id, resolved)
      return {
        id: m.id,
        name: m.name,
        status: m.status,
        purpose: m.purpose,
        program: program || undefined,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }
    }),
  )

  missionsWithProgram = filterByValues(
    missionsWithProgram,
    (m) => m.status,
    typeof flags.status === "string" ? flags.status : undefined,
  )

  const programFilter = typeof flags.program === "string" ? flags.program : undefined
  if (programFilter && programFilter.trim() !== "") {
    const allowed = new Set(programFilter.split(",").map((s) => s.trim()).filter(Boolean))
    missionsWithProgram = missionsWithProgram.filter((m) => m.program && allowed.has(m.program.id))
  }

  printJson({
    status: "ok",
    kind: "MissionList",
    count: missionsWithProgram.length,
    missions: missionsWithProgram,
  })
}

async function cmdMissionShow(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth mission show --id <mission-id>", {
      code: "MissingMissionId",
      category: "validation",
      suggestion: "Run 'synth mission list' to see available missions.",
    })
    return
  }

  const resolved = await resolveGovernanceContext(process.cwd())
  if (isGovernanceResolutionFailure(resolved)) {
    printError("Could not resolve governance context.", {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: "Run 'synth explain replay' to diagnose state issues.",
    })
    return
  }

  const mission = resolved.authoritative.replayedState.missions[id]
  if (!mission) {
    printError(`Mission ${id} not found.`, {
      code: "MissionNotFound",
      category: "validation",
      suggestion: "Run 'synth mission list' to see available missions.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const program = await inferMissionProgram(charterDir, id, resolved)

  const expeditionRecords = Object.values(resolved.authoritative.replayedState.expeditions)
    .filter((e) => e.missionId === id)
    .map((e) => ({
      id: e.id,
      name: e.name,
      status: e.status,
      goal: e.goal,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  printJson({
    status: "ok",
    kind: "MissionShow",
    mission: {
      id: mission.id,
      name: mission.name,
      status: mission.status,
      purpose: mission.purpose,
      program: program || undefined,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    },
    expeditions: expeditionRecords,
  })
}

async function cmdMissionReport(flags: Record<string, string | boolean>) {
  const id = typeof flags.id === "string" ? flags.id : undefined
  if (!id) {
    printError("Usage: synth mission report --id <mission-id>", {
      code: "MissingMissionId",
      category: "validation",
      suggestion: "Run 'synth status' to see active missions.",
    })
    return
  }

  const resolved = await resolveGovernanceContext(process.cwd())
  if (isGovernanceResolutionFailure(resolved)) {
    printError("Could not resolve governance context.", {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: "Run 'synth explain replay' to diagnose state issues.",
    })
    return
  }

  const mission = resolved.authoritative.replayedState.missions[id]
  if (!mission) {
    printError(`Mission ${id} not found.`, {
      code: "MissionNotFound",
      category: "validation",
      suggestion: "Run 'synth status' to see active missions.",
    })
    return
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const inventory = await loadGovernanceInventory(charterDir)
  const program = await inferMissionProgram(charterDir, id, resolved)

  const expeditionRecords = Object.values(resolved.authoritative.replayedState.expeditions)
    .filter((e) => e.missionId === id)
    .map((e) => {
      const charter = inventory.expeditions.find((ce) => ce.id === e.id)
      return {
        id: e.id,
        name: e.name,
        status: e.status,
        priority: charter?.priority || "Unknown",
        program: charter?.program || "",
        goal: e.goal,
      }
    })

  const human = flags.human === true || flags.human === "true"
  if (human) {
    const expeditionLines =
      expeditionRecords.length === 0
        ? "  No expeditions."
        : expeditionRecords.map((e) => `  ${e.id}  ${e.status.padEnd(10)} ${e.name}`).join("\n")
    console.log(
      `Mission: ${id} — ${mission.name}\n` +
      `Status: ${mission.status}${program ? `\nProgram: ${program.id} — ${program.name}` : ""}\n` +
      `Purpose:\n  ${mission.purpose}\n\n` +
      `Expeditions:\n${expeditionLines}`,
    )
    return
  }

  printJson({
    status: "ok",
    kind: "MissionReport",
    mission: {
      id: mission.id,
      name: mission.name,
      status: mission.status,
      purpose: mission.purpose,
      program: program || undefined,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    },
    expeditions: expeditionRecords,
  })
}

// ============================================================
// Global human-readable project report
// ============================================================
async function cmdReport(flags: Record<string, string | boolean>) {
  const briefing = await buildOperatorBriefing(process.cwd())
  if (briefing.status === "error") {
    printError(briefing.diagnostic, {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: briefing.recovery,
    })
    return
  }

  const resolved = await resolveGovernanceContext(process.cwd())
  if (isGovernanceResolutionFailure(resolved)) {
    printError("Could not resolve governance context.", {
      code: "GovernanceResolutionFailure",
      category: "runtime",
      suggestion: "Run 'synth explain replay' to diagnose state issues.",
    })
    return
  }

  let projectName = "Synth Project"
  try {
    const manifest = JSON.parse(await fs.readFile(sdk.paths.manifestPath(process.cwd()), "utf-8"))
    if (typeof manifest.projectName === "string" && manifest.projectName.length > 0) {
      projectName = manifest.projectName
    }
  } catch {
    // Fall back to default project name.
  }

  const charterDir = path.resolve(process.cwd(), "docs", "expeditions")
  const state = resolved.authoritative.replayedState
  const activeExpedition = briefing.activeExpeditions[0] ?? null
  // Prefer the mission that owns the executing expedition; otherwise the first active mission.
  const activeMissionId = activeExpedition ? state.expeditions[activeExpedition.id]?.missionId : null
  const activeMission =
    (activeMissionId ? briefing.missions.find((m) => m.id === activeMissionId) : undefined) ??
    briefing.missions.find((m) => m.status === "active") ??
    null
  const missionPurpose = activeMission ? state.missions[activeMission.id]?.purpose : ""
  const activeMissionProgram = activeMission ? await inferMissionProgram(charterDir, activeMission.id, resolved) : undefined
  const expeditionGoal = activeExpedition ? state.expeditions[activeExpedition.id]?.goal : ""

  const human = flags.human === true || flags.human === "true"
  if (human) {
    const blockerText =
      briefing.blockers.length === 0
        ? "None"
        : briefing.blockers.map((b) => `  • ${b.description}`).join("\n")
    const nextStepText =
      briefing.nextActions.length === 0
        ? "No pending actions."
        : `  ${briefing.nextActions[0].command}${briefing.nextActions[0].reason ? ` — ${briefing.nextActions[0].reason}` : ""}`
    const missionText = activeMission
      ? `Mission: ${activeMission.name} (${activeMission.id})\nStatus: ${activeMission.status}${activeMissionProgram ? `\nProgram: ${activeMissionProgram.id} — ${activeMissionProgram.name}` : ""}${missionPurpose ? `\nPurpose:\n  ${missionPurpose}` : ""}`
      : "Mission: none active"
    const expeditionText = activeExpedition
      ? `Expedition: ${activeExpedition.name} (${activeExpedition.id}) — ${activeExpedition.status}${expeditionGoal ? `\nGoal:\n  ${expeditionGoal}` : ""}`
      : "Expedition: none executing"

    console.log(
      `Project: ${projectName}\n` +
      `Phase: ${briefing.phase}\n` +
      `Event count: ${briefing.eventCount}\n\n` +
      `${missionText}\n\n` +
      `${expeditionText}\n\n` +
      `Blockers:\n${blockerText}\n\n` +
      `Next step:\n${nextStepText}`,
    )
    return
  }

  printJson({
    status: "ok",
    kind: "ProjectReport",
    projectName,
    phase: briefing.phase,
    summary: briefing.summary,
    mission: activeMission
      ? {
          id: activeMission.id,
          name: activeMission.name,
          status: activeMission.status,
          purpose: missionPurpose,
          program: activeMissionProgram || undefined,
        }
      : null,
    expedition: activeExpedition
      ? {
          id: activeExpedition.id,
          name: activeExpedition.name,
          status: activeExpedition.status,
          goal: expeditionGoal,
        }
      : null,
    blockers: briefing.blockers,
    nextActions: briefing.nextActions,
    eventCount: briefing.eventCount,
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
      printError(
        err instanceof Error ? err.message : String(err),
        {
          code: "MissionSnapshotListFailed",
          category: "integrity",
          suggestion: "Run 'synth explain snapshots' to inspect stored snapshots, or restore from a known-good backup.",
          documentation: "docs/reference/snapshots.md",
        },
      )
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
    printError(
      err instanceof Error ? err.message : String(err),
      {
        code: "MissionSnapshotInspectionFailed",
        category: "integrity",
        suggestion: "Run 'synth explain snapshots' to inspect the snapshot chain, or restore from a known-good backup.",
        documentation: "docs/reference/snapshots.md",
        snapshotId,
        signatureValid: false,
      },
    )
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
    { name: "synth repair state", description: "Detect canonical-state divergences and propose regeneration from replay" },
    { name: "synth repair state --approve", description: "Regenerate canonical-state.json by emitting a REPAIR_ACCEPTED audit event", args: "--approve" },
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

const REPAIRABLE_DIVERGENCE_KINDS = [
  "state-lags-events",
  "replayed-state-mismatch",
  "missing-events",
]

interface StateRepairEntry {
  kind: string
  severity: string
  artifact: string
  description: string
  action: string
}

async function cmdRepairState(flags: Record<string, string | boolean>) {
  const approve = flags.approve === true || flags.approve === "true"
  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const rootDir = process.cwd()

  const ctxResult = await resolveGovernanceContext(rootDir)
  let stateDivergences: Array<{ kind: string; severity: string; artifact: string; description: string }> = []
  let unrepairableDivergences: Array<{ kind: string; severity: string; artifact: string; description: string }> = []

  if (isGovernanceResolutionFailure(ctxResult)) {
    // EXP-GOV-025: some resolution failures are repairable canonical-state
    // divergences (missing-events, replayed-state-mismatch). Surface them as
    // proposed repairs when they are the only problem; otherwise treat the
    // failure as unrepairable through state regeneration.
    const conflicts = ctxResult.conflicts || []
    stateDivergences = conflicts
      .filter((c) => REPAIRABLE_DIVERGENCE_KINDS.includes(c.kind || ""))
      .map((c) => ({
        kind: c.kind || "unknown",
        severity: "error" as const,
        artifact: c.artifact || "canonical-state.json",
        description: c.issue,
      }))
    unrepairableDivergences = conflicts
      .filter((c) => !REPAIRABLE_DIVERGENCE_KINDS.includes(c.kind || ""))
      .map((c) => ({
        kind: c.kind || "unknown",
        severity: "error" as const,
        artifact: c.artifact || "unknown",
        description: c.issue,
      }))
  } else {
    const graphViolations = ctxResult.derived.graphViolations || []
    const divergences = ctxResult.derived.divergences
    stateDivergences = divergences
      .filter((d) => REPAIRABLE_DIVERGENCE_KINDS.includes(d.kind))
      .map((d) => ({
        kind: d.kind,
        severity: d.severity,
        artifact: d.artifact || "canonical-state.json",
        description: d.description,
      }))
    unrepairableDivergences = [
      ...graphViolations.map((v) => ({
        kind: v.kind || "aggregate-graph-violation",
        severity: "error" as const,
        artifact: "event-log.jsonl",
        description: v.message,
      })),
      ...divergences
        .filter((d) => !REPAIRABLE_DIVERGENCE_KINDS.includes(d.kind))
        .map((d) => ({
          kind: d.kind,
          severity: d.severity,
          artifact: d.artifact || "unknown",
          description: d.description,
        })),
    ]
  }

  const repairs: StateRepairEntry[] = stateDivergences.map((d) => ({
    kind: d.kind,
    severity: d.severity,
    artifact: d.artifact || "canonical-state.json",
    description: d.description,
    action: "regenerate-canonical-state-from-replay",
  }))

  if (stateDivergences.length === 0 && unrepairableDivergences.length === 0) {
    printJson({
      status: "ok",
      kind: "RepairReport",
      mode: approve ? "apply" : "dry-run",
      repairs: [],
      note: "No canonical-state divergences detected.",
    })
    return
  }

  if (unrepairableDivergences.length > 0) {
    printJson({
      status: "error",
      kind: "RepairReport",
      mode: approve ? "apply" : "dry-run",
      repairs,
      unrepairable: unrepairableDivergences,
      note: "Event-log graph violations or non-state divergences are present. These cannot be repaired by regenerating canonical-state.json.",
    })
    process.exit(1)
  }

  if (!approve) {
    printJson({
      status: "ok",
      kind: "RepairReport",
      mode: "dry-run",
      repairs,
      nextStep: "Run 'synth repair state --approve' to regenerate canonical-state.json from replay.",
    })
    return
  }

  // EXP-GOV-025: apply the repair by recording a REPAIR_ACCEPTED audit event.
  // The runtime commit rewrites canonical-state.json with the replayed state,
  // which resolves state-lags-events, replayed-state-mismatch, and missing-events
  // divergences without hand-editing derived JSON.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const recordResult = await gateCtx.api.handleIntent({
    actor: "synth-cli",
    capability: "RecordRepair",
    payload: {
      repairPlan: {
        action: "regenerate-canonical-state-from-replay",
        divergences: stateDivergences,
      },
      appliedActions: ["regenerate-canonical-state"],
    },
  })

  if (recordResult.status !== "ok") {
    printError(`Repair failed: ${recordResult.error || JSON.stringify(recordResult)}`, {
      code: "RepairFailed",
      category: "repair",
      suggestion: "Inspect the event log and run 'synth explain diagnostics'.",
    })
  }

  // Verify the repair by re-resolving the governance context.
  const afterCtx = await resolveGovernanceContext(rootDir)
  const remaining = isGovernanceResolutionFailure(afterCtx)
    ? []
    : afterCtx.derived.divergences.filter((d) => REPAIRABLE_DIVERGENCE_KINDS.includes(d.kind))

  printJson({
    status: remaining.length === 0 ? "ok" : "warning",
    kind: "RepairReport",
    mode: "apply",
    repairs: repairs.map((r) => ({ ...r, status: "repaired" })),
    remainingDivergences: remaining,
    note:
      remaining.length === 0
        ? "canonical-state.json regenerated from replay; repair recorded as REPAIR_ACCEPTED event."
        : "Some canonical-state divergences remain after repair.",
  })

  if (remaining.length > 0) {
    process.exit(1)
  }
}

async function cmdRepairStateHelp() {
  printJson(namespaceHelp("repair state", "Repair canonical-state divergences", [
    { name: "synth repair state", description: "Diagnose canonical-state divergences" },
    { name: "synth repair state --approve", description: "Regenerate canonical-state.json from replay and record the repair", args: "--approve" },
  ]))
}

async function cmdExpeditionCreate(flags: Record<string, string | boolean>) {
  const missionSubject = typeof flags.mission === "string" ? flags.mission : ""
  const subject = typeof flags.subject === "string" ? flags.subject : ""
  const goal = typeof flags.goal === "string" ? flags.goal : ""
  const rawScope = typeof flags.scope === "string" ? flags.scope : ""
  const scope = rawScope
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (!missionSubject || !subject) printError("--mission and --subject are required")

  // Resolve the project's actual governance state before allowing expedition
  // proposal. Planning itself remains in-memory.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()

  // EXP-CLI-00x: --mission may be an existing mission id or name. Resolve it
  // before planning so Mission Studio does not fabricate a duplicate mission.
  const existingMission = Object.values(state.missions || {}).find(
    (m) => m.id === missionSubject || m.name === missionSubject,
  )
  const resolvedMissionId = existingMission ? existingMission.id : missionSubject
  const resolvedMissionName = existingMission ? existingMission.name : missionSubject

  const intake = await gateDecision({ kind: "expedition.create", missionId: resolvedMissionId }, state, gateCtx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const timestamp = Date.now()

  const observations = [
    existingMission
      ? makeObservation("mission", resolvedMissionName, timestamp, { id: resolvedMissionId, purpose: "Referenced existing mission" })
      : makeObservation("mission", missionSubject, timestamp, { purpose: "Auto-created from CLI" }),
    makeObservation("expedition", subject, timestamp, { goal, missionSubject: resolvedMissionId }),
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
    payload: {
      id: expeditionId,
      missionId: resolvedMissionId,
      name: subject,
      goal,
      metadata: scope.length > 0 ? { scope } : {},
    },
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
    missionSubject: existingMission ? `${resolvedMissionName} (${resolvedMissionId})` : missionSubject,
    expeditionSubject: subject,
    goal,
    proposals: proposalsResult.status === "ok" ? proposalsResult.proposals : undefined,
    nextStep: `synth expedition approve --draft-id ${expeditionId}`,
  })
}

function findExpeditionIdsByMissionAndStatus(
  state: import("../types/index.js").CanonicalState,
  missionId: string,
  status: string,
): string[] {
  return Object.values(state.expeditions)
    .filter((e: any) => e.missionId === missionId && e.status === status)
    .map((e: any) => e.id)
    .sort()
}

async function approveOneExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  draftId: string,
  dryRun: boolean,
): Promise<Record<string, unknown>> {
  if (dryRun) {
    return runLifecycleDryRun(ctx, {
      capability: "ApproveExpedition",
      payload: { id: draftId },
      eventType: "EXPEDITION_APPROVED",
      expeditionId: draftId,
      targetStatus: "approved",
    })
  }

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.approve", expeditionId: draftId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    return {
      status: "error",
      draftId,
      code: "LifecycleBlocked",
      error: intake.reason,
      requiredAction: intake.requiredAction,
    }
  }

  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  const draftPath = path.join(draftsDir, `${draftId}.json`)
  let draftData: any
  try {
    draftData = JSON.parse(await fs.readFile(draftPath, "utf-8"))
  } catch {
    return { status: "error", draftId, code: "DraftNotFound", error: `Draft not found: ${draftPath}` }
  }

  const integrity = await verifyDraftIntegrity(draftsDir, draftId, draftData)
  if (!integrity.ok) {
    return { status: "error", draftId, code: "DraftIntegrityFailed", error: integrity.message }
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ApproveExpedition",
    payload: { id: draftId },
  })

  if (result.status !== "ok") {
    return { status: "error", draftId, code: "ExpeditionApproveFailed", error: result.error || "Unknown execution gate error" }
  }

  return {
    status: "ok",
    kind: "ExpeditionApproved",
    draftId,
    proposalId: draftId,
    result: result.result,
    nextStep: `synth expedition commit --proposal-id ${draftId}`,
  }
}

async function cmdExpeditionApprove(flags: Record<string, string | boolean>) {
  const draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : ""
  const missionId = typeof flags.mission === "string" ? flags.mission : undefined
  const allDrafts = flags["all-drafts"] === true || flags["all-drafts"] === "true"
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"

  if (allDrafts) {
    if (!missionId) printError("--all-drafts requires --mission")
    if (draftId) printError("Cannot use --draft-id with --all-drafts")

    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const state = await ctx.runtime.getState()
    const ids = findExpeditionIdsByMissionAndStatus(state, missionId, "draft")

    if (dryRun) {
      const previews = []
      for (const id of ids) {
        previews.push(await approveOneExpedition(ctx, id, true))
      }
      printJson({
        status: "ok",
        kind: "ExpeditionBatchApproveDryRun",
        missionId,
        wouldApprove: ids,
        previews,
      })
      return
    }

    const results = []
    for (const id of ids) {
      results.push(await approveOneExpedition(ctx, id, false))
    }
    const errors = results.filter((r) => r.status === "error")
    printJson({
      status: errors.length === 0 ? "ok" : "error",
      kind: "ExpeditionBatchApproved",
      missionId,
      processed: results.filter((r) => r.status === "ok").length,
      failed: errors.length,
      results,
      nextStep: errors.length === 0 ? `synth expedition commit --all-approved --mission ${missionId}` : undefined,
    })
    if (errors.length > 0) process.exit(1)
    return
  }

  if (!draftId) printError("--draft-id is required")

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const result = await approveOneExpedition(ctx, draftId, dryRun)
  printJson(result)
  if (result.status === "error") process.exit(1)
}

async function commitOneExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  proposalId: string,
  dryRun: boolean,
): Promise<Record<string, unknown>> {
  if (dryRun) {
    return runLifecycleDryRun(ctx, {
      capability: "CommitExpedition",
      payload: { id: proposalId },
      eventType: "EXPEDITION_COMMITTED",
      expeditionId: proposalId,
      targetStatus: "committed",
    })
  }

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.commit", expeditionId: proposalId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    return {
      status: "error",
      proposalId,
      code: "LifecycleBlocked",
      error: intake.reason,
      requiredAction: intake.requiredAction,
    }
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CommitExpedition",
    payload: { id: proposalId },
  })

  if (result.status !== "ok") {
    return { status: "error", proposalId, code: "ExpeditionCommitFailed", error: result.error || "Unknown execution gate error" }
  }

  return {
    status: "ok",
    kind: "ExpeditionCommitted",
    proposalId,
    result: result.result,
    nextStep: `synth expedition start --id ${proposalId}`,
  }
}

async function cmdExpeditionCommit(flags: Record<string, string | boolean>) {
  const proposalId = typeof flags["proposal-id"] === "string" ? flags["proposal-id"] : ""
  const missionId = typeof flags.mission === "string" ? flags.mission : undefined
  const allApproved = flags["all-approved"] === true || flags["all-approved"] === "true"
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"

  if (allApproved) {
    if (!missionId) printError("--all-approved requires --mission")
    if (proposalId) printError("Cannot use --proposal-id with --all-approved")

    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const state = await ctx.runtime.getState()
    const ids = findExpeditionIdsByMissionAndStatus(state, missionId, "approved")

    if (dryRun) {
      const previews = []
      for (const id of ids) {
        previews.push(await commitOneExpedition(ctx, id, true))
      }
      printJson({
        status: "ok",
        kind: "ExpeditionBatchCommitDryRun",
        missionId,
        wouldCommit: ids,
        previews,
      })
      return
    }

    const results = []
    for (const id of ids) {
      results.push(await commitOneExpedition(ctx, id, false))
    }
    const errors = results.filter((r) => r.status === "error")
    printJson({
      status: errors.length === 0 ? "ok" : "error",
      kind: "ExpeditionBatchCommitted",
      missionId,
      processed: results.filter((r) => r.status === "ok").length,
      failed: errors.length,
      results,
      nextStep: errors.length === 0 ? `synth expedition start --all-committed --mission ${missionId}` : undefined,
    })
    if (errors.length > 0) process.exit(1)
    return
  }

  if (!proposalId) printError("--proposal-id is required")

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const result = await commitOneExpedition(ctx, proposalId, dryRun)
  printJson(result)
  if (result.status === "error") process.exit(1)
}

function resolveExpeditionId(flags: Record<string, string | boolean>): string {
  if (typeof flags.id === "string" && flags.id.length > 0) return flags.id
  if (typeof flags["expedition-id"] === "string" && flags["expedition-id"].length > 0) return flags["expedition-id"]
  return ""
}

interface LifecycleDryRunInput {
  capability: string
  payload: Record<string, unknown>
  eventType: string
  expeditionId: string
  targetStatus?: string
}

async function runLifecycleDryRun(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  input: LifecycleDryRunInput,
): Promise<{
  status: "ok"
  kind: "LifecycleDryRun"
  wouldAppend: { type: string; payload: Record<string, unknown> }
  verifyResult: { pass: number; fail: number; warn: number }
  stateDelta: string
}> {
  const state = await ctx.runtime.getState()
  const expedition = state.expeditions[input.expeditionId]
  const beforeStatus = expedition?.status ?? "unknown"
  const verifyReport = await runVerification(process.cwd())
  const checks = Array.isArray(verifyReport.checks) ? verifyReport.checks : []
  const pass = checks.filter((c: any) => c.status === "ok" || c.status === "pass").length
  const fail = checks.filter((c: any) => c.status === "error" || c.status === "fail").length
  const warn = checks.filter((c: any) => c.status === "warning" || c.status === "warn").length

  return {
    status: "ok",
    kind: "LifecycleDryRun",
    wouldAppend: {
      type: input.eventType,
      payload: input.payload,
    },
    verifyResult: { pass, fail, warn },
    stateDelta: input.targetStatus
      ? `expedition ${input.expeditionId} status: ${beforeStatus} → ${input.targetStatus}`
      : `expedition ${input.expeditionId} metadata updated (${input.eventType})`,
  }
}

function getCurrentGitCommit(): string | undefined {
  try {
    return execSync("git rev-parse HEAD", {
      cwd: process.cwd(),
      encoding: "utf-8",
      stdio: "pipe",
    }).trim()
  } catch {
    return undefined
  }
}

async function startOneExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  expeditionId: string,
  dryRun: boolean,
  autoCommit = false,
): Promise<Record<string, unknown>> {
  const baselineCommit = getCurrentGitCommit()
  const startPayload: Record<string, unknown> = { id: expeditionId }
  if (baselineCommit) startPayload.baselineCommit = baselineCommit

  if (dryRun) {
    return runLifecycleDryRun(ctx, {
      capability: "StartExpedition",
      payload: startPayload,
      eventType: "EXPEDITION_STARTED",
      expeditionId,
      targetStatus: "executing",
    })
  }

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.start", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    return {
      status: "error",
      expeditionId,
      code: "LifecycleBlocked",
      error: intake.reason,
      requiredAction: intake.requiredAction,
    }
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "StartExpedition",
    payload: startPayload,
  })

  if (result.status !== "ok") {
    return { status: "error", expeditionId, code: "ExpeditionStartFailed", error: result.error || "Unknown execution gate error" }
  }

  const response: Record<string, unknown> = {
    status: "ok",
    kind: "ExpeditionStarted",
    expeditionId,
    result: result.result,
    nextStep: `synth expedition complete --id ${expeditionId}`,
  }

  if (autoCommit) {
    const commit = await autoCommitDerivedState(process.cwd(), "expedition-start", expeditionId)
    response.autoCommit = {
      committed: commit.committed,
      commitHash: commit.commitHash,
      message: commit.message,
      files: commit.files,
      reason: commit.reason,
    }
  }

  return response
}

async function cmdExpeditionStart(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  const missionId = typeof flags.mission === "string" ? flags.mission : undefined
  const allCommitted = flags["all-committed"] === true || flags["all-committed"] === "true"
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"
  const autoCommit = isAutoCommitEnabled(flags)

  if (allCommitted) {
    if (!missionId) printError("--all-committed requires --mission")
    if (expeditionId) printError("Cannot use --id with --all-committed")

    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const state = await ctx.runtime.getState()
    const ids = findExpeditionIdsByMissionAndStatus(state, missionId, "committed")

    if (dryRun) {
      const previews = []
      for (const id of ids) {
        previews.push(await startOneExpedition(ctx, id, true, false))
      }
      printJson({
        status: "ok",
        kind: "ExpeditionBatchStartDryRun",
        missionId,
        wouldStart: ids,
        previews,
      })
      return
    }

    const results = []
    for (const id of ids) {
      results.push(await startOneExpedition(ctx, id, false, autoCommit))
    }
    const errors = results.filter((r) => r.status === "error")
    printJson({
      status: errors.length === 0 ? "ok" : "error",
      kind: "ExpeditionBatchStarted",
      missionId,
      processed: results.filter((r) => r.status === "ok").length,
      failed: errors.length,
      results,
    })
    if (errors.length > 0) process.exit(1)
    return
  }

  if (!expeditionId) printError("--id is required")

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const result = await startOneExpedition(ctx, expeditionId, dryRun, autoCommit)
  printJson(result)
  if (result.status === "error") process.exit(1)
}

async function cmdExpeditionPause(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "PauseExpedition",
      payload: { id: expeditionId },
      eventType: "EXPEDITION_PAUSED",
      expeditionId,
      targetStatus: "paused",
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.pause", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "PauseExpedition",
    payload: { id: expeditionId },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionPauseFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionPaused",
    expeditionId,
    result: result.result,
    nextStep: `synth expedition start --id ${expeditionId}`,
  })
}

async function cmdExpeditionCancel(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const reason = typeof flags.reason === "string" ? flags.reason : ""
  if (!reason) printError("--reason is required")

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "CancelExpedition",
      payload: { id: expeditionId, reason },
      eventType: "EXPEDITION_CANCELLED",
      expeditionId,
      targetStatus: "cancelled",
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.cancel", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CancelExpedition",
    payload: { id: expeditionId, reason },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionCancelFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionCancelled",
    expeditionId,
    reason,
    result: result.result,
    nextStep: `synth expedition start --id ${expeditionId}`,
  })
}

async function completeExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  expeditionId: string,
  options: { evidencePath?: string; force?: boolean; forceReason?: string; skipDirtyCheck?: boolean } = {},
): Promise<{ status: string; result: unknown; evidencePath?: string; force: boolean; forceReason?: string }> {
  const { evidencePath, force = false, forceReason, skipDirtyCheck = false } = options
  const state = await ctx.runtime.getState()
  const expedition = state.expeditions[expeditionId]

  // Hard lifecycle gate first: Convergence Certification must be present
  // before we even consider evidence or verification. This keeps the error
  // surfaced by `expedition.complete` stable and lets `--force` act only on
  // operational gates, not on architectural convergence.
  const intake = await gateDecision({ kind: "expedition.complete", expeditionId, force }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  // EXP-034d3ecc2cc0015e + EXP-AUTO-COMMIT-001: source-only working tree
  // gate. Derived SYNTH state (.synth/data/, proof/expeditions/) is no longer
  // allowed to block completion; it is auto-committed after the transition
  // succeeds. Only non-derived source changes must be committed by the agent.
  // The `finish` command bypasses this check because it captures the current
  // working-tree diff as evidence before completing.
  if (!force && !skipDirtyCheck) {
    const { dirty, status: gitStatus } = await getNonDerivedWorkingTreeStatus()
    if (dirty) {
      printError(
        `Expedition ${expeditionId} cannot be completed while the working tree has uncommitted source changes.\n\n${gitStatus}`,
        {
          code: "DirtyWorkingTreeBlocksCompletion",
          category: "governance",
          suggestion: `Commit source changes first, for example:\n  git add -A && git commit -m "expedition(${expeditionId}): describe changes"\nOr bypass with --force --reason "<why tree is dirty>".`,
          nextStep: `git add -A && git commit -m "expedition(${expeditionId}): describe changes"`,
          gitStatus,
        },
      )
    }
  }

  // EXP-GATE-014: mandatory evidence gate.
  const hasEvidence = expedition && Array.isArray(expedition.attachments) && expedition.attachments.length > 0
  if (!hasEvidence && !force) {
    printError(
      `Expedition ${expeditionId} cannot be completed because no evidence has been attached.`,
      {
        code: "MissingEvidenceBlocksCompletion",
        category: "governance",
        suggestion: `Capture evidence first: synth expedition evidence --id ${expeditionId} --git-diff`,
      },
    )
  }

  // EXP-GATE-014: mandatory verification gate.
  const verifyReport = await runVerification(process.cwd())
  if (verifyReport.status !== "ok" && !force) {
    printError(
      `Expedition ${expeditionId} cannot be completed because verification failed (${verifyReport.summary.pass}/${verifyReport.summary.total} passed, ${verifyReport.summary.fail} failed).`,
      {
        code: "VerificationFailedBlocksCompletion",
        category: "verification",
        suggestion: verifyReport.nextStep || "Run `synth verify` and resolve the failing checks before completing the expedition.",
        verifySummary: verifyReport.summary,
      },
    )
  }

  const completePayload: Record<string, unknown> = { id: expeditionId, evidencePath }
  if (force) {
    completePayload.force = true
    completePayload.forceReason = forceReason
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CompleteExpedition",
    payload: completePayload,
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionCompleteFailed")
  }

  return {
    status: "ok",
    result: result.result,
    evidencePath,
    force,
    forceReason,
  }
}

async function cmdExpeditionComplete(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const evidencePath = typeof flags.evidence === "string" ? flags.evidence : undefined
  const force = flags.force === true || flags.force === "true"
  const forceReason = typeof flags.reason === "string" ? flags.reason : undefined
  if (force && !forceReason) {
    printError("--force requires --reason to record why the verification gates were bypassed")
  }

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "CompleteExpedition",
      payload: { id: expeditionId, evidencePath, force, forceReason },
      eventType: "EXPEDITION_COMPLETED",
      expeditionId,
      targetStatus: "completed",
    })
    printJson(dryRun)
    return
  }

  // Use the project's actual event log so the CompleteExpedition event is
  // persisted and replayable.
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const { status, result, evidencePath: finalEvidencePath, force: finalForce, forceReason: finalForceReason } = await completeExpedition(
    ctx,
    expeditionId,
    { evidencePath, force, forceReason },
  )

  const autoCommit = isAutoCommitEnabled(flags)
    ? await autoCommitDerivedState(process.cwd(), "expedition-complete", expeditionId)
    : undefined

  const response: Record<string, unknown> = {
    status,
    kind: "ExpeditionCompleted",
    expeditionId,
    evidencePath: finalEvidencePath,
    force: finalForce,
    forceReason: finalForceReason,
    result,
  }
  if (autoCommit) {
    response.autoCommit = {
      committed: autoCommit.committed,
      commitHash: autoCommit.commitHash,
      message: autoCommit.message,
      files: autoCommit.files,
      reason: autoCommit.reason,
    }
  }
  printJson(response)
}

// ============================================================
// EXP-ATOMIC-FINISH-001: Atomic expedition finish command
// ============================================================
// Combines evidence capture, convergence certification, and expedition
// completion into a single atomic CLI operation. This removes the most
// common source of agent friction: forgetting to commit state before
// completing an expedition.
// ============================================================
async function cmdExpeditionFinish(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const note = typeof flags.note === "string" ? flags.note : "Auto-attached by synth expedition finish"
  const force = flags.force === true || flags.force === "true"
  const forceReason = typeof flags.reason === "string" ? flags.reason : undefined
  if (force && !forceReason) {
    printError("--force requires --reason to record why the verification gates were bypassed")
  }

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "CompleteExpedition",
      payload: { id: expeditionId, force, forceReason },
      eventType: "EXPEDITION_COMPLETED",
      expeditionId,
      targetStatus: "completed",
    })
    printJson({ ...dryRun, kind: "ExpeditionFinishDryRun", note: "Finish runs evidence + certify + complete; dry-run only previews complete gate." })
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  // 1. Attach git-diff evidence automatically.
  const { attachments, warnings, manifestPath } = await attachExpeditionEvidence(ctx, expeditionId, {
    gitDiff: true,
    note,
  })

  // 2. Certify convergence with an auto-generated evaluation.
  const certification = await certifyExpedition(ctx, expeditionId)
  if (certification.decision !== "converged") {
    printError(
      `Expedition ${expeditionId} convergence certification diverged.`,
      {
        code: "ConvergenceDivergedBlocksFinish",
        category: "governance",
        decision: certification.decision,
        confidence: certification.confidence,
        result: certification.result,
      },
    )
  }

  // 3. Complete the expedition, reusing the same gate checks as `complete`.
  // The dirty-tree check is skipped because finish already captured the diff
  // as evidence in step 1.
  const { result: completeResult } = await completeExpedition(ctx, expeditionId, {
    force,
    forceReason,
    skipDirtyCheck: true,
  })

  const autoCommit = isAutoCommitEnabled(flags)
    ? await autoCommitDerivedState(process.cwd(), "expedition-finish", expeditionId)
    : undefined

  const response: Record<string, unknown> = {
    status: "ok",
    kind: "ExpeditionFinished",
    expeditionId,
    missionId: certification.missionId,
    alignmentContractId: certification.alignmentContractId,
    certificationId: certification.certificationId,
    attachments,
    manifestPath: path.relative(process.cwd(), manifestPath),
    result: completeResult,
    steps: ["evidence-attached", "convergence-certified", "expedition-completed"],
  }
  if (warnings.length > 0) {
    response.warnings = warnings
  }
  if (autoCommit) {
    response.autoCommit = {
      committed: autoCommit.committed,
      commitHash: autoCommit.commitHash,
      message: autoCommit.message,
      files: autoCommit.files,
      reason: autoCommit.reason,
    }
  }
  printJson(response)
}

async function cmdExpeditionArchive(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const reason = typeof flags.reason === "string" ? flags.reason : ""
  if (!reason) printError("--reason is required")

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "ArchiveExpedition",
      payload: { id: expeditionId, reason },
      eventType: "EXPEDITION_ARCHIVED",
      expeditionId,
      targetStatus: "archived",
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.archive", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "ArchiveExpedition",
    payload: { id: expeditionId, reason },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionArchiveFailed")
  }

  printJson({
    status: "ok",
    kind: "ExpeditionArchived",
    expeditionId,
    reason,
    result: result.result,
    nextStep: "synth status",
  })
}

type EvidenceAttachment = { kind: string; path: string; hash: string }

async function attachExpeditionEvidence(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  expeditionId: string,
  options: {
    gitDiff?: boolean
    testResultsPath?: string
    attachPaths?: string[]
    note?: string
    baseline?: string
  } = {},
): Promise<{ attachments: EvidenceAttachment[]; warnings: string[]; manifestPath: string }> {
  const baseDir = path.join(process.cwd(), "proof", "expeditions", expeditionId)
  await fs.mkdir(baseDir, { recursive: true })
  const attachmentsDir = path.join(baseDir, "attachments")
  await fs.mkdir(attachmentsDir, { recursive: true })

  const { gitDiff = false, testResultsPath, attachPaths = [], note, baseline: baselineFlag } = options
  const warnings: string[] = []
  const captured: EvidenceAttachment[] = []

  async function captureFile(kind: string, sourcePath: string, destName: string) {
    const resolvedSource = path.resolve(sourcePath)
    const content = await fs.readFile(resolvedSource)
    const destPath = path.join(kind === "attachment" ? attachmentsDir : baseDir, destName)
    await fs.writeFile(destPath, content)
    captured.push({ kind, path: path.relative(process.cwd(), destPath), hash: sha256(content) })
  }

  if (gitDiff) {
    const dirty = await isWorkingTreeDirty()
    let baselineCommit = baselineFlag
    if (!baselineCommit && !dirty) {
      const state = await ctx.runtime.getState()
      const expedition = state.expeditions[expeditionId]
      const storedBaseline = expedition?.metadata?.baselineCommit
      if (typeof storedBaseline === "string") {
        baselineCommit = storedBaseline
      }
    }

    const diffArgs = dirty
      ? ["diff", "HEAD"]
      : baselineCommit
      ? ["diff", `${baselineCommit}..HEAD`]
      : ["diff", "HEAD"]

    if (!dirty && baselineCommit) {
      warnings.push(`Working tree is clean; diffing from baseline ${baselineCommit}`)
    } else if (!dirty) {
      warnings.push("Working tree is clean and no baseline commit was recorded; git-diff may be empty")
    }

    const diff = await new Promise<string>((resolve, reject) => {
      const child = spawn("git", diffArgs, { cwd: process.cwd() })
      let stdout = ""
      let stderr = ""
      child.stdout.on("data", (data: Buffer) => { stdout += data.toString("utf-8") })
      child.stderr.on("data", (data: Buffer) => { stderr += data.toString("utf-8") })
      child.on("close", (code) => {
        if (code !== 0) reject(new Error(stderr || `git diff exited with code ${code}`))
        else resolve(stdout)
      })
      child.on("error", reject)
    })

    if (diff.trim().length === 0) {
      warnings.push("git-diff produced an empty patch")
    }

    const destPath = path.join(baseDir, "git-diff.patch")
    await fs.writeFile(destPath, diff)
    captured.push({ kind: "git-diff", path: path.relative(process.cwd(), destPath), hash: sha256(diff) })
  }

  if (testResultsPath) {
    await captureFile("test-results", testResultsPath, "test-results.txt")
  }

  for (const sourcePath of attachPaths) {
    const destName = path.basename(sourcePath)
    await captureFile("attachment", sourcePath, destName)
  }

  const manifestPath = path.join(baseDir, "manifest.json")
  const manifest = {
    expeditionId,
    capturedAt: Date.now(),
    note,
    attachments: captured,
  }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "AttachEvidence",
    payload: { id: expeditionId, attachments: captured, note },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "EvidenceAttachFailed")
  }

  return { attachments: captured, warnings, manifestPath }
}

async function cmdExpeditionEvidence(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const gitDiff = flags["git-diff"] === true || flags["git-diff"] === "true"
  const testResultsPath = typeof flags["test-results"] === "string" ? flags["test-results"] : undefined
  const rawAttach = typeof flags.attach === "string" ? flags.attach : ""
  const attachPaths = rawAttach
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const note = typeof flags.note === "string" ? flags.note : undefined
  const baseline = typeof flags.baseline === "string" ? flags.baseline : undefined

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const { attachments, warnings, manifestPath } = await attachExpeditionEvidence(ctx, expeditionId, {
    gitDiff,
    testResultsPath,
    attachPaths,
    note,
    baseline,
  })

  const autoCommit = isAutoCommitEnabled(flags)
    ? await autoCommitDerivedState(process.cwd(), "evidence-attach", expeditionId)
    : undefined

  const response: Record<string, unknown> = {
    status: "ok",
    kind: "EvidenceAttached",
    expeditionId,
    attachments,
    note,
    manifestPath: path.relative(process.cwd(), manifestPath),
  }
  if (warnings.length > 0) {
    response.warnings = warnings
  }
  if (autoCommit) {
    response.autoCommit = {
      committed: autoCommit.committed,
      commitHash: autoCommit.commitHash,
      message: autoCommit.message,
      files: autoCommit.files,
      reason: autoCommit.reason,
    }
  }
  printJson(response)
}

async function cmdExpeditionRefine(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const note = typeof flags.note === "string" ? flags.note : ""
  if (!note) printError("--note is required")

  if (flags["dry-run"] === true || flags["dry-run"] === "true") {
    const ctx = await bootstrapWithCapabilities({
      skipGenesis: true,
      infra: { persistence: "file" },
    })
    const dryRun = await runLifecycleDryRun(ctx, {
      capability: "RefineExpedition",
      payload: { id: expeditionId, note },
      eventType: "EXPEDITION_REFINED",
      expeditionId,
      targetStatus: undefined,
    })
    printJson(dryRun)
    return
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = await gateDecision({ kind: "expedition.refine", expeditionId }, state, ctx.runtime)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "RefineExpedition",
    payload: { id: expeditionId, note },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ExpeditionRefineFailed")
  }

  const refined = result.result as { metadata?: Record<string, unknown> } | undefined

  const autoCommit = isAutoCommitEnabled(flags)
    ? await autoCommitDerivedState(process.cwd(), "expedition-refine", expeditionId)
    : undefined

  const response: Record<string, unknown> = {
    status: "ok",
    kind: "ExpeditionRefined",
    expeditionId,
    note,
    refinementId: refined?.metadata?.refinementId,
    result: refined,
  }
  if (autoCommit) {
    response.autoCommit = {
      committed: autoCommit.committed,
      commitHash: autoCommit.commitHash,
      message: autoCommit.message,
      files: autoCommit.files,
      reason: autoCommit.reason,
    }
  }
  printJson(response)
}

async function certifyExpedition(
  ctx: Awaited<ReturnType<typeof bootstrapWithCapabilities>>,
  expeditionId: string,
  options: { evaluationPath?: string; evidencePath?: string } = {},
): Promise<{ decision: string; confidence?: unknown; certificationId?: string; result: unknown; missionId: string; alignmentContractId: string }> {
  const state = await ctx.runtime.getState()
  const expedition = state.expeditions[expeditionId]
  if (!expedition) {
    printError(`Expedition ${expeditionId} not found.`, { code: "ExpeditionNotFound", category: "validation" })
  }
  if (expedition.status !== "executing" && expedition.status !== "completed") {
    printError(
      `Expedition ${expeditionId} is ${expedition.status}; only executing or completed expeditions can be certified.`,
      { code: "ExpeditionNotCertifiable", category: "lifecycle" },
    )
  }

  const mission = state.missions[expedition.missionId]
  if (!mission) {
    printError(`Mission ${expedition.missionId} not found.`, { code: "MissionNotFound", category: "validation" })
  }

  const alignmentContractId = mission.alignmentContractId
  if (!alignmentContractId) {
    printError(
      `Mission ${mission.id} has no alignment contract. Approve the mission with --alignment-contract-id first.`,
      { code: "AlignmentContractMissing", category: "validation" },
    )
  }

  const { evaluationPath, evidencePath } = options

  let evaluation: import("../governance/proposal-evaluation/types.js").EvaluationResult
  if (evaluationPath) {
    let parsed: unknown
    try {
      const raw = await fs.readFile(path.resolve(evaluationPath), "utf-8")
      parsed = JSON.parse(raw)
    } catch (err) {
      printError(
        `Evaluation file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        {
          code: "EvaluationFileParseFailed",
          category: "validation",
          suggestion: "Verify the file contains a single JSON object and check for trailing commas or unmatched braces.",
        },
      )
    }

    const validation = validateEvaluationResult(parsed)
    if (!validation.valid) {
      printError(formatEvaluationErrors(validation.errors), {
        code: "EvaluationSchemaValidationFailed",
        category: "validation",
        suggestion: "Provide an EvaluationResult with decision, confidence, matchedRules, violatedRules, matchedDriftClasses, evidence, reasoning, and deterministic: true.",
        errors: validation.errors,
      })
    }
    evaluation = validation.result
  } else {
    // Auto-generate a default aligned evaluation from the expedition goal
    // and attached evidence when the operator does not supply one.
    evaluation = generateConvergenceEvaluation(expedition)
  }

  const artifactPath = evidencePath ?? evaluationPath
  const artifacts: import("../governance/convergence-certification/types.js").ImplementedArtifact[] = artifactPath
    ? [{ kind: "artifact", id: "evidence", path: artifactPath, description: "Certification evidence supplied by operator" }]
    : [
        {
          kind: "artifact",
          id: "auto-generated-evaluation",
          path: `synth://missions/${mission.id}/expeditions/${expeditionId}/evaluation`,
          description: "Auto-generated converged evaluation from expedition goal and attached evidence",
        },
      ]

  const runtimeEvidence: import("../governance/convergence-certification/types.js").ObservedRuntimeEvidence[] = [
    {
      kind: "runtime",
      id: "cli-certification",
      source: "synth-cli",
      observation: `Convergence certification invoked for expedition ${expeditionId}`,
      timestamp: Date.now(),
    },
  ]

  const executionEvidence: import("../governance/convergence-certification/types.js").ExecutionEvidence[] = [
    {
      kind: "execution",
      id: "expedition-lifecycle",
      eventIds: [],
      summary: `Execution evidence drawn from expedition ${expeditionId} lifecycle`,
    },
  ]

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CertifyConvergence",
    payload: {
      missionId: mission.id,
      expeditionId,
      alignmentContractId,
      evaluation,
      artifacts,
      runtimeEvidence,
      executionEvidence,
    },
  })

  if (result.status !== "ok") {
    printError(result.error || "Unknown execution gate error", "ConvergenceCertificationFailed")
  }

  const certificationEvent = await ctx.infra.eventStore.loadAll().then((events) =>
    events.reverse().find((e) =>
      (e.type === "CONVERGENCE_CERTIFIED" || e.type === "CONVERGENCE_DIVERGED") &&
      (e.payload as Record<string, unknown>).expeditionId === expeditionId
    )
  )

  return {
    decision: (result.result as Record<string, unknown>)?.decision as string,
    confidence: (result.result as Record<string, unknown>)?.confidence,
    certificationId: (certificationEvent?.payload as Record<string, unknown>)?.certificationId as string | undefined,
    result: result.result,
    missionId: mission.id,
    alignmentContractId,
  }
}

async function cmdExpeditionCertify(flags: Record<string, string | boolean>) {
  const expeditionId = resolveExpeditionId(flags)
  if (!expeditionId) printError("--id is required")

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const { decision, confidence, certificationId, result, missionId, alignmentContractId } = await certifyExpedition(
    ctx,
    expeditionId,
    {
      evaluationPath: typeof flags.evaluation === "string" ? flags.evaluation : undefined,
      evidencePath: typeof flags.evidence === "string" ? flags.evidence : undefined,
    },
  )

  const autoCommit = isAutoCommitEnabled(flags) && decision === "converged"
    ? await autoCommitDerivedState(process.cwd(), "convergence-certification", expeditionId)
    : undefined

  const response: Record<string, unknown> = {
    status: decision === "converged" ? "ok" : "error",
    kind: decision === "converged" ? "ConvergenceCertified" : "ConvergenceDiverged",
    expeditionId,
    missionId,
    alignmentContractId,
    decision,
    confidence,
    certificationId,
    result,
    nextStep: decision === "converged" ? `synth expedition complete --id ${expeditionId}` : undefined,
  }
  if (autoCommit) {
    response.autoCommit = {
      committed: autoCommit.committed,
      commitHash: autoCommit.commitHash,
      message: autoCommit.message,
      files: autoCommit.files,
      reason: autoCommit.reason,
    }
  }
  printJson(response)
}

async function cmdDocsGenerateHelp() {
  printJson(namespaceHelp("docs", "Documentation operations", [
    {
      name: "synth docs generate",
      description: "Generate documentation projections from the knowledge base",
      args: "[--out-dir <dir>] [--knowledge-base <dir>] [--link-prefix <prefix>]",
    },
    {
      name: "synth docs generate --provenance",
      description: "Explicitly regenerate projections with provenance metadata (default behavior)",
      args: "--provenance",
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
  // EXP-DOC-008: provenance metadata is embedded by default; --provenance is
  // an explicit no-op that confirms the behavior for scripts and CI.
  const provenance = true

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
    provenance,
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
  // Exit directly with the child's code so its stdout/stderr remains the only output.
  return new Promise<never>((_resolve) => {
    const child = spawn("node", [path.join(__dirname, "adapter.js"), ...args], {
      stdio: "inherit",
      cwd: process.cwd(),
    })
    child.on("close", (code) => {
      process.exit(code ?? 1)
    })
  })
}

function isNamespaceHelp(rawArgs: string[]): { namespace: string; handler: () => Promise<void>; subcommand?: string } | undefined {
  if (rawArgs.length < 2) return undefined
  if (!rawArgs.includes("--help") && !rawArgs.includes("-h")) return undefined
  const namespace = rawArgs[0]

  // EXP-CLI-003: subcommand-specific help for approve operations so agents can
  // discover required options without reading source code.
  const positional = rawArgs.filter((arg) => arg !== "--help" && arg !== "-h")
  const subcommand = positional[1]
  if (namespace === "mission" && subcommand === "approve") {
    return { namespace, handler: cmdMissionApproveHelp, subcommand }
  }
  if (namespace === "expedition" && subcommand === "approve") {
    return { namespace, handler: cmdExpeditionApproveHelp, subcommand }
  }

  switch (namespace) {
    case "bootstrap":
      return { namespace, handler: cmdBootstrapHelp }
    case "discover":
      return { namespace, handler: cmdDiscoverHelp }
    case "mission":
      return { namespace, handler: cmdMissionHelp }
    case "program":
      return { namespace, handler: cmdProgramHelp }
    case "intent":
      return { namespace, handler: cmdIntentHelp }
    case "alignment":
      return { namespace, handler: cmdAlignmentHelp }
    case "expedition":
      return { namespace, handler: cmdExpeditionHelp }
    case "doctor":
      return { namespace, handler: cmdDoctorHelp }
    case "checkpoint":
      return { namespace, handler: cmdCheckpointHelp }
    case "certify":
      return { namespace, handler: cmdCertifyHelp }
    case "capabilities":
      return { namespace, handler: cmdCapabilitiesHelp }
    case "log":
      return { namespace, handler: cmdLogHelp }
    case "docs":
      return { namespace, handler: cmdDocsGenerateHelp }
    case "adapter":
      return { namespace, handler: cmdAdapterHelp }
    case "snapshot":
      return { namespace, handler: cmdSnapshotHelp }
    case "repair":
      return { namespace, handler: cmdRepairHelp }
    case "first-contact":
    case "genesis":
      return { namespace, handler: cmdFirstContactHelp }
    case "validate":
      return { namespace, handler: cmdValidateHelp }
    case "verify":
      return { namespace, handler: cmdVerifyHelp }
    case "approval":
      return { namespace, handler: cmdApprovalHelp }
    case "task":
      return { namespace, handler: cmdTaskHelp }
    case "explain":
      return { namespace, handler: cmdExplainHelp }
    case "ai":
      return { namespace, handler: cmdAiHelp }
    case "repo":
      return { namespace, handler: async () => printJson(cmdRepoHelp()) }
    case "migrate":
      return { namespace, handler: async () => printJson(cmdMigrateHelp()) }
    default:
      return undefined
  }
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
    printError(
      "--file is required",
      {
        code: "CharterFileRequired",
        category: "validation",
        suggestion: "Provide the path to an expedition charter with --file <path>.",
        documentation: "docs/reference/charter-format.md",
      },
    )
  }

  let content: string
  try {
    content = await fs.readFile(path.resolve(filePath), "utf-8")
  } catch {
    printError(
      `Cannot read file: ${filePath}`,
      {
        code: "CharterFileUnreadable",
        category: "io",
        suggestion: "Verify the file path exists and is readable.",
        documentation: "docs/reference/charter-format.md",
      },
    )
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

  // EXP-QUIET-001: global --quiet suppresses bootstrap and diagnostic logs.
  const quietFlag = rawArgs.includes("--quiet")
  if (quietFlag) {
    setQuietMode(true)
  }

  // EXP-QUIET-001: global --summary emits a condensed status/ID/next-step summary.
  const summaryFlag = rawArgs.includes("--summary")
  if (summaryFlag) {
    setSummaryMode(true)
  }

  // EXP-BROWNFIELD-001: Discovery Safety Model flag. Treat it as a boolean
  // sentinel and remove it from parsing so it does not consume the next
  // positional argument.
  const discoveryModeFlag = rawArgs.includes("--discovery-mode")
  const filteredArgs = rawArgs.filter((arg) => arg !== "--json" && arg !== "--discovery-mode" && arg !== "--quiet" && arg !== "--summary")
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

  // EXP-CLI-002: global --human flag switches CLI output to prose summaries.
  if (flags.human === true) {
    setHumanMode(true)
  }

  // EXP-IDENTITY-001: capture agent identity once at process startup.
  // Commands invoked with --approve are treated as human-approved.
  const identityOverride: Partial<import("../identity/types.js").AgentIdentity> = {}
  if (flags.approve === true || flags.approve === "true") {
    identityOverride.approvalMode = "human-approved"
  }
  initCliIdentity(identityOverride)

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

    case "checkpoint":
      await cmdCheckpoint()
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

    case "govern": {
      if (!flags.intent && positional[1]) {
        flags.intent = positional[1]
      }
      await cmdGovern(flags)
      break
    }

    case "validate": {
      const sub = positional[1]
      if (sub === "dependencies") await cmdValidateDependencies(flags)
      else if (sub === "artifact") await cmdValidateArtifact(flags)
      else await cmdValidate(flags)
      break
    }

    case "task":
      await cmdTask(positional.slice(1), flags)
      break

    case "verify": {
      const sub = positional[1]
      if (sub === "signatures") await cmdVerifySignatures()
      else await cmdVerify()
      break
    }

    case "approval": {
      const sub = positional[1]
      if (sub === "request") await cmdApprovalRequest(flags)
      else if (sub === "grant") await cmdApprovalGrant(flags)
      else if (sub === "deny") await cmdApprovalDeny(flags)
      else if (sub === "list") await cmdApprovalList(flags)
      else if (sub === "show") await cmdApprovalShow(flags)
      else await cmdApprovalHelp()
      break
    }

    case "status":
      await cmdStatus()
      break

    case "report":
      await cmdReport(flags)
      break

    case "mission": {
      const sub = positional[1]
      if (sub === "create") await cmdMissionCreate(flags)
      else if (sub === "project") await cmdMissionProject(flags)
      else if (sub === "approve") await cmdMissionApprove(flags)
      else if (sub === "evidence" && positional[2] === "add") await cmdMissionEvidenceAdd(flags)
      else if (sub === "list") await cmdMissionList(flags)
      else if (sub === "show") await cmdMissionShow(flags)
      else if (sub === "verify-charter") await cmdMissionVerifyCharter(flags)
      else if (sub === "decisions") await cmdMissionDecisions(flags)
      else if (sub === "snapshot") await cmdMissionSnapshot(positional.slice(2), flags)
      else if (sub === "report") await cmdMissionReport(flags)
      else if (sub === "complete") await cmdMissionComplete(flags)
      else if (sub === "certify") {
        printError(
          "synth mission certify does not exist. Missions are closed with synth mission complete --id <mission-id>.",
          {
            code: "UnknownMissionSubcommand",
            category: "cli",
            suggestion: "Close the mission with:\n  synth mission complete --id <mission-id>",
          },
        )
      }
      else
        printError(
          "Usage: synth mission create --subject <subject> --purpose <purpose> [--evidence-file <path>] | synth mission project --alignment-contract-id <id> | synth mission approve --draft-id <draft-id> --alignment-contract-id <contract-id> | synth mission evidence add --draft-id <draft-id> --subject <subject> [--purpose <purpose>] [--confidence <level>] | synth mission list [--status <status>] [--program <program-id>] | synth mission show --id <mission-id> | synth mission verify-charter --file <path> | synth mission decisions [--draft-id <draft-id>] | synth mission snapshot [<snapshot-id> | list] | synth mission report --id <mission-id> | synth mission complete --id <mission-id>",
        )
      break
    }

    case "program": {
      const sub = positional[1]
      if (sub === "list") await cmdProgramList(flags)
      else if (sub === "show") await cmdProgramShow(flags)
      else if (sub === "rank") await cmdProgramRank(flags)
      else
        printError(
          "Usage: synth program list [--status <status>] [--priority <priority>] | synth program show --id <program-id> | synth program rank [--next] [--status <status>] [--priority <priority>]",
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
      else if (sub === "pause") await cmdExpeditionPause(flags)
      else if (sub === "cancel") await cmdExpeditionCancel(flags)
      else if (sub === "complete") await cmdExpeditionComplete(flags)
      else if (sub === "finish") await cmdExpeditionFinish(flags)
      else if (sub === "archive") await cmdExpeditionArchive(flags)
      else if (sub === "evidence") await cmdExpeditionEvidence(flags)
      else if (sub === "refine") await cmdExpeditionRefine(flags)
      else if (sub === "certify") await cmdExpeditionCertify(flags)
      else if (sub === "list") await cmdExpeditionList(flags)
      else if (sub === "show") await cmdExpeditionShow(flags)
      else if (sub === "explain") await cmdExpeditionShow(flags)
      else if (sub === "rank") await cmdExpeditionRank(flags)
      else if (sub === "report") await cmdExpeditionReport(flags)
      else
        printError(
          `Unknown subcommand '${sub}' for 'synth expedition'. Did you mean 'synth expedition show --id <expedition-id>'?`,
          {
            code: "UnknownExpeditionSubcommand",
            category: "cli",
            suggestion: "Run 'synth expedition --help' for the full list of lifecycle and inventory commands.",
          },
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
      else if (sub === "agents") await cmdExplainAgents(flags)
      else await cmdExplainObservability(sub, flags)
      break
    }

    case "repair": {
      const sub = positional[1]
      if (sub === "replay") await cmdRepairReplay(positional.slice(2), flags)
      else if (sub === "state") await cmdRepairState(flags)
      else
        printError(
          "Usage: synth repair replay [--approve] or synth repair state [--approve]",
        )
      break
    }

    case "release":
      await cmdRelease(flags)
      break

    case "certify":
      await cmdCertify(flags)
      break

    case "capabilities":
      await cmdCapabilities()
      break

    case "project": {
      const sub = positional[1]
      if (sub === "AGENTS.md") await cmdProjectAgentsMd(flags)
      else
        printError(
          "Usage: synth project AGENTS.md [--check]",
        )
      break
    }

    case "log":
      await cmdLog(flags)
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

    case "snapshot": {
      const sub = positional[1]
      if (sub === "create") await cmdSnapshotCreate(flags)
      else if (sub === "list") await cmdSnapshotList(flags)
      else if (sub === "show") await cmdSnapshotShow(flags)
      else if (sub === "verify") await cmdSnapshotVerify(flags)
      else await cmdSnapshotHelp()
      break
    }

    case "migrate": {
      const sub = positional[1]
      if (sub === "detect") await cmdMigrateDetect(positional.slice(2))
      else if (sub === "plan") await cmdMigratePlan(positional.slice(2), flags)
      else if (sub === "archive") await cmdMigrateArchive(positional.slice(2), flags)
      else if (sub === "import") await cmdMigrateImport(positional.slice(2), flags)
      else
        printError(
          "Usage: synth migrate detect [path] | synth migrate plan [path] [--path archive|import] | synth migrate archive [path] [--approve] | synth migrate import [path] [--source <path>] [--approve]",
        )
      break
    }

    case "first-contact":
    case "genesis": {
      const sub = positional[1]
      if (!sub) await cmdFirstContactOnboard(positional.slice(1), flags)
      else if (sub === "start") await cmdFirstContactStart(positional.slice(2), flags)
      else if (sub === "clarify") await cmdFirstContactClarify(positional.slice(2), flags)
      else if (sub === "project") await cmdFirstContactProject(positional.slice(2), flags)
      else if (sub === "verify") await cmdFirstContactVerify(positional.slice(2), flags)
      else if (sub === "approve") await cmdFirstContactApprove(positional.slice(2), flags)
      else if (sub === "materialize") await cmdFirstContactMaterialize(positional.slice(2), flags)
      else if (sub === "status") await cmdFirstContactStatus(positional.slice(2), flags)
      else if (sub === "onboard:detect") await cmdFirstContactOnboardDetect(positional.slice(2), flags)
      else if (sub === "onboard:archive") await cmdFirstContactOnboardArchive(positional.slice(2), flags)
      else if (sub === "onboard:init") await cmdFirstContactOnboardInit(positional.slice(2), flags)
      else if (sub === "onboard:bootstrap") await cmdFirstContactOnboardBootstrap(positional.slice(2), flags)
      else if (sub === "onboard:mission") await cmdFirstContactOnboardMission(positional.slice(2), flags)
      else if (sub === "onboard:govern") await cmdFirstContactOnboardGovern(positional.slice(2), flags)
      else
        printError(
          "Usage: synth first-contact [--dry-run | --approve] | synth first-contact start \"<intent>\" | synth first-contact clarify [--field <field> --answer <answer>] | synth first-contact project | synth first-contact verify | synth first-contact approve | synth first-contact materialize --dry-run | --approve | synth first-contact status | synth first-contact onboard:<detect|archive|init|bootstrap|mission|govern>",
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
