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
import { spawn, spawnSync } from "child_process"
import { fileURLToPath } from "url"
import { bootstrap } from "../core/bootstrap.js"
import { createReplayVerifier } from "../core/replay-verifier.js"
import { Logger } from "../observability/tracer.js"
import { runBootstrap } from "./bootstrap-apply.js"
import { writeAgentArtifacts } from "./agent-artifacts.js"
import { createInitializationEngine } from "../initialization/engine.js"
import { createInitializationEvidenceStore } from "../initialization/evidence-store.js"
import { createFilesystemInitializationAdapter } from "../adapters/filesystem-initialization-adapter.js"
import { createPosixFilesystemProvider } from "../environment/filesystem-capability.js"
import { checkGovernDelegation } from "./govern-delegation.js"
import { verifyDraftIntegrity, writeDraftIntegrityRecord } from "../mission-studio/draft-integrity.js"
import { appendDecision, latestDecision, listDecisions } from "../mission-studio/decision-log.js"
import { cmdExplainObservability, resolveExplainPaths } from "./explain-observability.js"
import { cmdExplainIdentity } from "./repository-identity.js"
import { cmdExplainResume } from "./resume-briefing.js"
import { cmdExplainGovernance } from "./explain-governance.js"
import { cmdVerify } from "./verify.js"
import { buildOperatorBriefing } from "./status-briefing.js"
import { analyzeFiles, getWorkingTreeDiff, parseDiff } from "../governance/impact-analyzer.js"
import { getRuntimeDataDir } from "../infra/paths.js"
import { ensureRuntimeDataDir } from "../infra/migrate-data-dir.js"
import { buildValidationPlan } from "../validation/planner.js"
import { validateAgentAction, type AgentAction } from "../governance/intake.js"
import type { PlanningObservation } from "../planning/observation.js"
import type { PlanningSession } from "../mission-studio/types.js"

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
  { name: "govern", description: "Run the full governance pipeline" },
  { name: "validate", description: "Analyze changes, plan validations, and execute them (--dry-run, --full)" },
  { name: "verify", description: "Verify governance invariants and projection consistency" },
  { name: "status", description: "Report the current project state" },
  { name: "mission", description: "Mission Studio operations (create, approve, snapshot)" },
  { name: "expedition", description: "Expedition lifecycle (create, start, complete)" },
  { name: "docs", description: "Documentation operations (generate)" },
  { name: "explain", description: "Explain operations (replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all)" },
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

let agentTelemetry: Record<string, unknown> = {}

function setAgentTelemetry(flags: Record<string, string | boolean>) {
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
  agentTelemetry = telemetry
}

function printJson(obj: unknown) {
  if (Object.keys(agentTelemetry).length === 0) {
    console.log(JSON.stringify(obj, null, 2))
  } else {
    console.log(JSON.stringify({ ...agentTelemetry, ...(obj as Record<string, unknown>) }, null, 2))
  }
}

function printError(error: string, code = 1): never {
  printJson({ status: "error", error })
  process.exit(code)
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

function gateDecision(action: AgentAction, state: import("../types/index.js").CanonicalState) {
  return validateAgentAction(action, state)
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

async function verifyDistIntegrity(): Promise<{ ok: boolean; detail: string }> {
  const manifestPath = path.resolve(__dirname, "..", "dist-manifest.json")
  try {
    await fs.access(manifestPath)
  } catch {
    return { ok: false, detail: "No dist manifest found; run 'npm run build'" }
  }

  let manifest: any
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"))
  } catch {
    return { ok: false, detail: "dist manifest is not valid JSON" }
  }

  if (manifest.schema !== "synth-dist-manifest-v1") {
    return { ok: false, detail: `Unknown dist manifest schema: ${manifest.schema}` }
  }

  const distDir = path.resolve(__dirname, "..")
  const expectedFiles = Object.entries<string>(manifest.files ?? {})
  let mismatches = 0
  let missing = 0
  for (const [rel, expectedHash] of expectedFiles) {
    const filePath = path.join(distDir, rel)
    let actualHash: string
    try {
      actualHash = crypto.createHash("sha256").update(await fs.readFile(filePath)).digest("hex")
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
    }
  }

  return { ok: true, detail: `${expectedFiles.length} dist file(s) verified` }
}

async function cmdDoctor() {
  const REQUIRED_NODE_MAJOR = 20
  const checks: Record<string, { ok: boolean; detail: string }> = {}

  // Node version
  const nodeVersion = process.version
  const nodeMajor = Number(nodeVersion.replace("v", "").split(".")[0])
  checks.node = {
    ok: nodeMajor >= REQUIRED_NODE_MAJOR,
    detail: `Node.js ${nodeVersion} (required >= ${REQUIRED_NODE_MAJOR})`,
  }

  // Binary path
  checks.binary = {
    ok: true,
    detail: process.argv[1] || "unknown",
  }

  // Package version
  const version = await getVersion()
  checks.version = {
    ok: version !== "unknown",
    detail: version,
  }

  // Project manifest
  const manifestPath = path.join(process.cwd(), ".synth", "manifest.json")
  let hasManifest = false
  try {
    await fs.access(manifestPath)
    hasManifest = true
  } catch {
    hasManifest = false
  }
  checks.manifest = {
    ok: hasManifest,
    detail: hasManifest ? manifestPath : "No SYNTH project manifest found in current directory",
  }

  // Installed dist integrity (EXP-DISC-005)
  checks.distIntegrity = await verifyDistIntegrity()

  const allOk = Object.values(checks).every((c) => c.ok)
  const nextSteps: string[] = []
  if (!checks.distIntegrity.ok) {
    nextSteps.push("npm run build")
  }
  if (hasManifest) {
    nextSteps.push("synth status", "synth mission create --subject '...' --purpose '...'")
  } else {
    nextSteps.push("synth init --name 'Project Name'")
  }

  printJson({
    status: allOk ? "ok" : "warning",
    name: "synth",
    version,
    healthy: allOk,
    checks,
    nextSteps,
  })
}

async function cmdValidate(flags: Record<string, string | boolean>) {
  const fullMode = flags.full === true || flags.full === "true"
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"

  // --full always runs the complete governance pipeline.
  if (fullMode) {
    if (dryRun) {
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
        note: "Dry-run: would run npm run govern.",
      })
      return
    }

    return runGovernAndExit()
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

  const plan = buildValidationPlan(report, map, { availableScripts })

  if (dryRun) {
    printJson({
      status: "ok",
      kind: "ValidationPlan",
      ...report,
      ...plan,
      note: "Dry-run: plan computed but not executed.",
    })
    return
  }

  // Execute the planned validations.
  const execution = await executeValidationPlan(plan.run)

  printJson({
    status: execution.success ? "ok" : "error",
    kind: "ValidationResult",
    ...report,
    ...plan,
    execution,
    note: execution.success
      ? "All planned validations passed."
      : `Planned validation failed: ${execution.failedScript}`,
  })

  if (!execution.success) {
    process.exit(1)
  }
}

function runGovernAndExit(): Promise<void> {
  const verdict = checkGovernDelegation(process.cwd())
  if (!verdict.allowed) printError(verdict.message)
  return new Promise<void>((resolve) => {
    const child = spawn("npm", ["run", "govern"], {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
      env: verdict.childEnv,
    })
    child.on("close", (code) => {
      process.exit(code ?? 1)
    })
  })
}

interface ValidationExecution {
  success: boolean
  results: Array<{ script: string; status: number; durationMs: number }>
  failedScript?: string
  totalDurationMs: number
}

async function executeValidationPlan(scripts: string[]): Promise<ValidationExecution> {
  const results: Array<{ script: string; status: number; durationMs: number }> = []
  const start = Date.now()

  for (const script of scripts) {
    const scriptStart = Date.now()
    let childEnv: NodeJS.ProcessEnv | undefined
    if (script === "govern") {
      const verdict = checkGovernDelegation(process.cwd())
      if (!verdict.allowed) {
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
    const result = spawnSync("npm", args, {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
      ...(childEnv ? { env: childEnv } : {}),
    })
    const durationMs = Date.now() - scriptStart
    results.push({ script, status: result.status ?? 1, durationMs })

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

async function cmdInit(args: string[], flags: Record<string, string | boolean>) {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const projectName = typeof flags.name === "string" ? flags.name : path.basename(targetDir)
  const synthDir = path.join(targetDir, ".synth")
  const dataDir = path.join(targetDir, ".synth", "data")
  const governanceVersion = "2.1"
  const projectId = crypto.randomUUID()

  const sourceType = typeof flags.source === "string" ? flags.source : "filesystem"
  const sourceLocation = typeof flags["source-location"] === "string" ? flags["source-location"] : targetDir
  const declaredIntent = typeof flags["declared-intent"] === "string" ? flags["declared-intent"] : undefined

  await fs.mkdir(synthDir, { recursive: true })
  await fs.mkdir(dataDir, { recursive: true })

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

  const manifestPath = path.join(synthDir, "manifest.json")
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8")

  // Bootstrap a file-backed runtime in the target directory so the
  // initialization itself is recorded as a replayable governance event.
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: path.join(dataDir, "event-log.jsonl"),
      statePath: path.join(dataDir, "canonical-state.json"),
      checkpointPath: path.join(dataDir, "checkpoints.json"),
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

    const evidenceStore = createInitializationEvidenceStore(createPosixFilesystemProvider(targetDir))
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

  await writeAgentArtifacts(synthDir, projectName)

  printJson({
    status: "ok",
    message: "Synth project initialized",
    manifestPath,
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

function cmdGovern() {
  const verdict = checkGovernDelegation(process.cwd())
  if (!verdict.allowed) return Promise.reject(new Error(verdict.message))
  return new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", "govern"], {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
      env: verdict.childEnv,
    })
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`govern failed with exit code ${code}`))
    })
  })
}

async function cmdStatus() {
  await ensureRuntimeDataDir(process.cwd())
  const logger = new Logger("status")
  logger.info("Resolving governance context for operator briefing")
  const briefing = await buildOperatorBriefing(process.cwd())
  printJson(briefing)
  if (briefing.status === "error") {
    process.exit(1)
  }
}

function makeObservation(type: string, subject: string, overrides: Record<string, unknown> = {}): PlanningObservation {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "synth-cli",
    type: type as any,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp: Date.now(),
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
  const dataDir = await ensureRuntimeDataDir(process.cwd())
  const draftsDir = path.join(dataDir, "drafts")
  await fs.mkdir(draftsDir, { recursive: true })
  return draftsDir
}

async function cmdMissionCreate(flags: Record<string, string | boolean>) {
  const subject = typeof flags.subject === "string" ? flags.subject : ""
  const purpose = typeof flags.purpose === "string" ? flags.purpose : ""
  if (!subject) printError("--subject is required")

  // Resolve the project's actual governance state before allowing intent
  // capture. The resolver is the single authority for lifecycle phase.
  const gateCtx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })
  const state = await gateCtx.runtime.getState()
  const intake = gateDecision({ kind: "mission.create" }, state)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const ctx = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })

  const observations = [makeObservation("mission", subject, { purpose })]
  const sessionResult = (await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { observations },
  })) as { status: string; session?: PlanningSession; error?: string }

  if (sessionResult.status !== "ok" || !sessionResult.session) {
    printError(`Mission Studio session failed: ${JSON.stringify(sessionResult)}`)
  }

  const session = sessionResult.session

  const proposalsResult = (await ctx.api.missionStudioOperation({
    operation: "proposeMissions",
    params: { observations },
  })) as { status: string; proposals?: unknown; error?: string }

  const draftsDir = await ensureDraftsDir()
  const draftPath = path.join(draftsDir, `${session.id}.json`)
  const serialized = serializePlanningSession(session)
  await fs.writeFile(draftPath, JSON.stringify(serialized, null, 2), "utf-8")
  await writeDraftIntegrityRecord(draftsDir, session.id, serialized)

  printJson({
    status: "ok",
    kind: "MissionDraft",
    draftId: session.id,
    draftPath,
    integrity: "certified",
    subject,
    purpose,
    confidence: session.confidence,
    unknowns: session.unknowns,
    questions: session.questions,
    proposals: proposalsResult.status === "ok" ? proposalsResult.proposals : [],
    nextStep: `synth mission approve --draft-id ${session.id}`,
  })
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
  const intake = gateDecision({ kind: "mission.approve" }, state)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const dataDir = await ensureRuntimeDataDir(process.cwd())
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

  // Approval state derives from the decision record, never from the
  // editable approvalState field (EXP-TRUST-004): re-approval is
  // idempotent and prescriptive.
  const priorApproval = await latestDecision(dataDir, draftId, "MISSION_APPROVAL_APPROVED")
  if (priorApproval) {
    printJson({
      status: "ok",
      kind: "MissionApprovalDecision",
      decision: {
        approved: true,
        confidence: priorApproval.confidence,
      },
      draftId,
      snapshotId: priorApproval.snapshotId,
      snapshotPersisted: false,
      note: `Draft already approved (decision recorded at ${new Date(priorApproval.timestamp).toISOString()}); no duplicate snapshot created.`,
      nextStep: `synth mission snapshot ${priorApproval.snapshotId ?? "<snapshot-id>"} to inspect the persisted snapshot`,
    })
    return
  }

  const session = deserializePlanningSession(draftData)

  const ctx = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })

  const approveResult = (await ctx.api.missionStudioOperation({
    operation: "approveModel",
    params: { session },
  })) as {
    status: string
    decision?: { approved: boolean; reason?: string; confidence?: number }
    result?: { success?: boolean; error?: string; session?: PlanningSession; data?: { id?: string; proposals?: unknown } }
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

  // Persist the approved snapshot as an immutable, certified artifact.
  let snapshotPersisted = false
  let snapshotNote: string | undefined
  if (approvedData) {
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
  }

  await appendDecision(dataDir, {
    type: "MISSION_APPROVAL_APPROVED",
    draftId,
    confidence: decision?.confidence ?? session.confidence.overall,
    ...(approvedData?.id ? { snapshotId: approvedData.id } : {}),
  })

  printJson({
    status: "ok",
    kind: "MissionApprovalDecision",
    decision: {
      approved: true,
      confidence: decision?.confidence ?? session.confidence.overall,
    },
    draftId,
    decisionRecorded: true,
    snapshotId: approvedData?.id,
    snapshotPersisted,
    ...(snapshotNote ? { note: snapshotNote } : {}),
    proposals: approvedData?.proposals,
    nextStep: `synth mission snapshot ${approvedData?.id ?? "<snapshot-id>"} to inspect the persisted snapshot`,
  })
}

const EVIDENCE_CONFIDENCE_LEVELS = ["unknown", "low", "medium", "high", "certain"]

async function cmdMissionDecisions(flags: Record<string, string | boolean>) {
  const draftId = typeof flags["draft-id"] === "string" ? flags["draft-id"] : undefined
  const dataDir = await ensureRuntimeDataDir(process.cwd())
  const { records, chainValid } = await listDecisions(dataDir, draftId)
  if (!chainValid) {
    printError(
      "Mission decision record chain is broken: a recorded decision is missing, altered, or duplicated. " +
        "Inspect data/decisions.jsonl; the record is tamper-evident by design.",
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
  const intake = gateDecision({ kind: "mission.evidence.add" }, state)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }
  const purpose = typeof flags.purpose === "string" ? flags.purpose : undefined
  const confidence = typeof flags.confidence === "string" ? flags.confidence : "high"
  if (!EVIDENCE_CONFIDENCE_LEVELS.includes(confidence)) {
    printError(`Unknown confidence level: "${confidence}". Valid levels: ${EVIDENCE_CONFIDENCE_LEVELS.join(", ")}`)
  }

  const dataDir = await ensureRuntimeDataDir(process.cwd())
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

  // Drafts are immutable: adding evidence creates a successor draft (EXP-TRUST-003).
  const observation = makeObservation("evidence", subject, {
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
    params: { observations: [...existing, observation] },
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
  const intake = gateDecision({ kind: "expedition.create" }, state)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "memory" },
  })

  const observations = [
    makeObservation("mission", missionSubject, { purpose: "Auto-created from CLI" }),
    makeObservation("expedition", subject, { goal, missionSubject }),
  ]
  const sessionResult = (await ctx.api.missionStudioOperation({
    operation: "startSession",
    params: { observations },
  })) as { status: string; session?: unknown; error?: string }

  if (sessionResult.status !== "ok") {
    printError(`Mission Studio session failed: ${JSON.stringify(sessionResult)}`)
  }

  const proposalsResult = (await ctx.api.missionStudioOperation({
    operation: "proposeExpeditions",
    params: { observations },
  })) as { status: string; proposals?: unknown; error?: string }

  printJson({
    status: proposalsResult.status,
    missionSubject,
    expeditionSubject: subject,
    goal,
    proposals: proposalsResult.status === "ok" ? proposalsResult.proposals : undefined,
  })
}

async function cmdExpeditionStart(flags: Record<string, string | boolean>) {
  const expeditionId = typeof flags["expedition-id"] === "string" ? flags["expedition-id"] : ""
  if (!expeditionId) printError("--expedition-id is required")

  // Use the project's actual event log so the StartExpedition event is
  // persisted and replayable.
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = gateDecision({ kind: "expedition.start", expeditionId }, state)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "StartExpedition",
    payload: { id: expeditionId },
  })

  if (result.status !== "ok") {
    printJson({
      status: "error",
      kind: "ExpeditionStartFailed",
      expeditionId,
      error: result.error || "Unknown execution gate error",
    })
    process.exit(1)
  }

  printJson({
    status: "ok",
    kind: "ExpeditionStarted",
    expeditionId,
    result: result.result,
    nextStep: `synth expedition complete --expedition-id ${expeditionId}`,
  })
}

async function cmdExpeditionComplete(flags: Record<string, string | boolean>) {
  const expeditionId = typeof flags["expedition-id"] === "string" ? flags["expedition-id"] : ""
  if (!expeditionId) printError("--expedition-id is required")

  // Use the project's actual event log so the CompleteExpedition event is
  // persisted and replayable.
  const ctx = await bootstrapWithCapabilities({
    skipGenesis: true,
    infra: { persistence: "file" },
  })

  const state = await ctx.runtime.getState()
  const intake = gateDecision({ kind: "expedition.complete", expeditionId }, state)
  if (intake.decision === "BLOCK") {
    printGateBlock(intake)
  }

  const result = await ctx.api.handleIntent({
    actor: "synth-cli",
    capability: "CompleteExpedition",
    payload: { id: expeditionId },
  })

  if (result.status !== "ok") {
    printJson({
      status: "error",
      kind: "ExpeditionCompleteFailed",
      expeditionId,
      error: result.error || "Unknown execution gate error",
    })
    process.exit(1)
  }

  printJson({
    status: "ok",
    kind: "ExpeditionCompleted",
    expeditionId,
    result: result.result,
  })
}

async function cmdDocsGenerate(flags: Record<string, string | boolean>) {
  const outDir = typeof flags["out-dir"] === "string" ? flags["out-dir"] : "./docs/generated"
  const knowledgeBaseDir = typeof flags["knowledge-base"] === "string" ? flags["knowledge-base"] : "./docs"
  const linkPrefix = typeof flags["link-prefix"] === "string" ? flags["link-prefix"] : undefined

  const result = await bootstrap({
    skipGenesis: true,
    infra: { persistence: "memory" },
  }).then((ctx) =>
    ctx.api.documentationOperation({
      operation: "generateDocs",
      params: { knowledgeBaseDir, outDir, linkPrefix },
    }),
  )

  printJson(result)
}

async function cmdExplainReplay(flags: Record<string, string | boolean>) {
  // Ensure runtime data is in `.synth/data/` for governed projects before
  // inspecting any project-local log.
  await ensureRuntimeDataDir(process.cwd())

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

async function main() {
  const rawArgs = process.argv.slice(2)

  if (rawArgs.length === 0 || rawArgs.includes("--help") || rawArgs.includes("-h")) {
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

  const filteredArgs = rawArgs.filter((arg) => arg !== "--json")
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
  setAgentTelemetry(flags)

  const command = positional[0]

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

    case "govern":
      await cmdGovern()
      break

    case "validate":
      await cmdValidate(flags)
      break

    case "verify":
      await cmdVerify()
      break

    case "status":
      await cmdStatus()
      break

    case "mission": {
      const sub = positional[1]
      if (sub === "create") await cmdMissionCreate(flags)
      else if (sub === "approve") await cmdMissionApprove(flags)
      else if (sub === "evidence" && positional[2] === "add") await cmdMissionEvidenceAdd(flags)
      else if (sub === "decisions") await cmdMissionDecisions(flags)
      else if (sub === "snapshot") await cmdMissionSnapshot(positional.slice(2), flags)
      else
        printError(
          "Usage: synth mission create --subject <subject> --purpose <purpose> | synth mission approve --draft-id <draft-id> | synth mission evidence add --draft-id <draft-id> --subject <subject> [--purpose <purpose>] [--confidence <level>] | synth mission decisions [--draft-id <draft-id>] | synth mission snapshot [<snapshot-id> | list]",
        )
      break
    }

    case "expedition": {
      const sub = positional[1]
      if (sub === "create") await cmdExpeditionCreate(flags)
      else if (sub === "start") await cmdExpeditionStart(flags)
      else if (sub === "complete") await cmdExpeditionComplete(flags)
      else
        printError(
          "Usage: synth expedition create --mission <mission> --subject <subject> --goal <goal> | synth expedition start --expedition-id <id> | synth expedition complete --expedition-id <id>",
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

    case "adapter":
      await cmdAdapter(positional.slice(1))
      break

    default:
      printError(`Unknown command: ${command}. Run 'synth --help' for available commands.`)
  }
}

main().catch((err) => {
  printError(err instanceof Error ? err.message : String(err), 1)
})
