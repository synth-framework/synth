#!/usr/bin/env node
// ============================================================
// SYNTH v2 — AI-Native Operator CLI
// ============================================================
// Primary interface for humans and AI agents.
// All output is structured JSON by default so agents can parse it.
// ============================================================

import fs from "fs/promises"
import path from "path"
import { spawn, spawnSync } from "child_process"
import { fileURLToPath } from "url"
import { bootstrap } from "../core/bootstrap.js"
import { createReplayVerifier } from "../core/replay-verifier.js"
import { runBootstrap } from "./bootstrap-apply.js"
import { analyzeFiles, getWorkingTreeDiff, parseDiff } from "../governance/impact-analyzer.js"
import { buildValidationPlan } from "../validation/planner.js"
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
  { name: "status", description: "Report the current project state" },
  { name: "mission", description: "Mission Studio operations (create, approve)" },
  { name: "expedition", description: "Planning operations (create)" },
  { name: "docs", description: "Documentation operations (generate)" },
  { name: "explain", description: "Explain operations (replay)" },
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

function printJson(obj: unknown) {
  console.log(JSON.stringify(obj, null, 2))
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

  const allOk = Object.values(checks).every((c) => c.ok)

  printJson({
    status: allOk ? "ok" : "warning",
    name: "synth",
    version,
    healthy: allOk,
    checks,
    nextSteps: hasManifest
      ? ["synth status", "synth mission create --subject '...' --purpose '...'"]
      : ["synth init --name 'Project Name'"],
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
      note: "No validation needed.",
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
  return new Promise<void>((resolve) => {
    const child = spawn("npm", ["run", "govern"], {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
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
    const args = script === "govern" ? ["run", "govern"] : ["run", script]
    const result = spawnSync("npm", args, {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
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

  await fs.mkdir(synthDir, { recursive: true })

  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: await getVersion(),
    projectName,
    root: targetDir,
    generatedAt: new Date().toISOString(),
    commands: COMMANDS.map((c) => ({ name: c.name, description: c.description })),
    capabilities: ADAPTER_NAMES,
    layout: {
      docs: "docs/",
      generatedDocs: "docs/generated/",
      examples: "examples/",
      data: "data/",
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

  // Ensure data directory exists for event log
  await fs.mkdir(path.join(targetDir, "data"), { recursive: true })

  printJson({
    status: "ok",
    message: "Synth project initialized",
    manifestPath,
    projectName,
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
  return new Promise<void>((resolve, reject) => {
    const child = spawn("npm", ["run", "govern"], {
      stdio: "inherit",
      shell: true,
      cwd: process.cwd(),
    })
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`govern failed with exit code ${code}`))
    })
  })
}

async function cmdStatus() {
  const eventLogPath = path.join(process.cwd(), "data", "event-log.jsonl")
  const statePath = path.join(process.cwd(), "data", "canonical-state.json")
  const checkpointPath = path.join(process.cwd(), "data", "checkpoint.json")

  let hasExistingEvents = false
  try {
    await fs.access(eventLogPath)
    hasExistingEvents = true
  } catch {
    hasExistingEvents = false
  }

  const ctx = await bootstrap({
    skipGenesis: hasExistingEvents,
    infra: {
      persistence: "file",
      eventLogPath,
      statePath,
      checkpointPath,
    },
    genesis: {
      projectName: DEFAULT_PROJECT_NAME,
      systemId: "synth-cli-status",
      partitions: 1,
    },
  })

  const state = await ctx.runtime.getState()
  const eventCount = await ctx.runtime.getEventCount()

  printJson({
    status: "ok",
    project: ctx.genesis ? "initialized" : "not initialized",
    eventCount,
    stateHash: state.stateHash,
    version: await getVersion(),
    missions: Object.keys(state.missions || {}).length,
    expeditions: Object.keys(state.expeditions || {}).length,
    objectives: Object.keys(state.objectives || {}).length,
    workItems: Object.keys(state.workItems || {}).length,
  })
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
  const draftsDir = path.join(process.cwd(), "data", "drafts")
  await fs.mkdir(draftsDir, { recursive: true })
  return draftsDir
}

async function cmdMissionCreate(flags: Record<string, string | boolean>) {
  const subject = typeof flags.subject === "string" ? flags.subject : ""
  const purpose = typeof flags.purpose === "string" ? flags.purpose : ""
  if (!subject) printError("--subject is required")

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
  await fs.writeFile(draftPath, JSON.stringify(serializePlanningSession(session), null, 2), "utf-8")

  printJson({
    status: "ok",
    kind: "MissionDraft",
    draftId: session.id,
    draftPath,
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

  const draftPath = path.join(process.cwd(), "data", "drafts", `${draftId}.json`)
  let draftData: any
  try {
    draftData = JSON.parse(await fs.readFile(draftPath, "utf-8"))
  } catch {
    printError(`Draft not found: ${draftPath}`)
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
    result?: { success?: boolean; error?: string; data?: { id?: string; proposals?: unknown } }
    proposals?: unknown
    error?: string
  }

  if (approveResult.status !== "ok") {
    printError(`Mission approval operation failed: ${approveResult.error || JSON.stringify(approveResult)}`)
  }

  const decision = approveResult.decision
  if (!decision?.approved) {
    printJson({
      status: "ok",
      kind: "MissionApprovalDecision",
      decision: {
        approved: false,
        reason: decision?.reason || "Approval denied by Mission Studio",
        confidence: session.confidence.overall,
      },
      draftId,
      proposals: approveResult.proposals ?? [],
      nextStep: `Add more evidence and create a new Mission Draft`,
    })
    return
  }

  const approvedData = approveResult.result?.data

  printJson({
    status: "ok",
    kind: "MissionApprovalDecision",
    decision: {
      approved: true,
      confidence: session.confidence.overall,
    },
    draftId,
    snapshotId: approvedData?.id,
    proposals: approvedData?.proposals,
    nextStep: "synth genesis from snapshot or continue planning expeditions",
  })
}

async function cmdExpeditionCreate(flags: Record<string, string | boolean>) {
  const missionSubject = typeof flags.mission === "string" ? flags.mission : ""
  const subject = typeof flags.subject === "string" ? flags.subject : ""
  const goal = typeof flags.goal === "string" ? flags.goal : ""
  if (!missionSubject || !subject) printError("--mission and --subject are required")

  const ctx = await bootstrap({
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

async function cmdExplainReplay() {
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: path.join(process.cwd(), "data", "event-log.jsonl"),
      statePath: path.join(process.cwd(), "data", "canonical-state.json"),
      checkpointPath: path.join(process.cwd(), "data", "checkpoint.json"),
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

  const { positional, flags } = parseArgs(process.argv)
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

    case "status":
      await cmdStatus()
      break

    case "mission": {
      const sub = positional[1]
      if (sub === "create") await cmdMissionCreate(flags)
      else if (sub === "approve") await cmdMissionApprove(flags)
      else
        printError(
          "Usage: synth mission create --subject <subject> --purpose <purpose> | synth mission approve --draft-id <draft-id>",
        )
      break
    }

    case "expedition": {
      const sub = positional[1]
      if (sub === "create") await cmdExpeditionCreate(flags)
      else printError("Usage: synth expedition create --mission <mission> --subject <subject> --goal <goal>")
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
      if (sub === "replay") await cmdExplainReplay()
      else printError("Usage: synth explain replay")
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
