#!/usr/bin/env node
// ============================================================
// SYNTH v2 — First Contact CLI
// ============================================================
// Operator surface for greenfield onboarding (EXP-AIFC-008).
// All subcommands emit JSON. Commands are read-only or proposal-only
// until approval / materialization.
// ============================================================

import fs from "fs/promises"
import path from "path"
import * as sdk from "../sdk/index.js"
import { runBootstrap } from "./bootstrap-apply.js"
import { extractIntent } from "../first-contact/extract/index.js"
import type { IntentExtractionResult, TranscriptEntry } from "../first-contact/extract/types.js"
import { clarify, DefaultClarificationStrategy } from "../first-contact/clarify/index.js"
import type { ClarificationAnswer, ClarificationQuestion } from "../first-contact/clarify/types.js"
import { projectArchitecture } from "../first-contact/project/index.js"
import type { ArchitectureCandidate } from "../first-contact/project/types.js"
import { verifyCapabilities } from "../first-contact/verify/index.js"
import { materialize } from "../first-contact/materialize/index.js"
import { hashArtifact } from "../first-contact/artifact/canonical.js"

const DRAFT_STATUS = "draft" as const
const APPROVED_STATUS = "approved" as const

interface DraftEnvelope {
  schema: "synth-first-contact-draft-v1"
  status: typeof DRAFT_STATUS
  artifact: IntentExtractionResult
  updatedAt: string
}

interface ApprovedEnvelope {
  schema: "synth-first-contact-approved-v1"
  status: typeof APPROVED_STATUS
  artifact: IntentExtractionResult
  selectedArchitecture: ArchitectureCandidate
  verificationReport: import("../first-contact/verify/types.js").CapabilityVerificationReport
  approvedAt: string
  artifactHash: string
}

import { printJson, printError } from "./print.js"

function uuid(): string {
  return sdk.identity.uuid()
}

function nowIso(): string {
  return new Date().toISOString()
}

function artifactDraftPaths(cwd: string) {
  const dir = sdk.paths.firstContactDir(sdk.workspace.root(cwd))
  return {
    dir,
    draftPath: path.join(dir, "draft.json"),
    approvedPath: path.join(dir, "approved-artifact.json"),
    transcriptPath: path.join(dir, "transcript.jsonl"),
  }
}

async function ensureFirstContactDir(cwd: string): Promise<string> {
  const dir = artifactDraftPaths(cwd).dir
  await sdk.files.ensureDirectory(dir)
  return dir
}

async function tryReadDraft(cwd: string): Promise<DraftEnvelope | undefined> {
  const { draftPath } = artifactDraftPaths(cwd)
  return sdk.json.readJsonMaybe<DraftEnvelope>(draftPath)
}

async function readDraft(cwd: string): Promise<DraftEnvelope> {
  const draft = await tryReadDraft(cwd)
  if (!draft) {
    printError(`No first-contact draft found. Run 'synth first-contact start "<intent>"' first.`)
  }
  return draft
}

async function writeDraft(cwd: string, artifact: IntentExtractionResult): Promise<string> {
  const { draftPath } = artifactDraftPaths(cwd)
  await ensureFirstContactDir(cwd)
  const envelope: DraftEnvelope = {
    schema: "synth-first-contact-draft-v1",
    status: DRAFT_STATUS,
    artifact,
    updatedAt: nowIso(),
  }
  await sdk.json.writeJsonNewline(draftPath, envelope)
  return draftPath
}

async function appendTranscript(cwd: string, entries: TranscriptEntry[]): Promise<void> {
  const { transcriptPath } = artifactDraftPaths(cwd)
  if (entries.length === 0) return
  const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n"
  await sdk.files.appendFile(transcriptPath, lines)
}

async function tryReadApproved(cwd: string): Promise<ApprovedEnvelope | undefined> {
  const { approvedPath } = artifactDraftPaths(cwd)
  return sdk.json.readJsonMaybe<ApprovedEnvelope>(approvedPath)
}

async function readApproved(cwd: string): Promise<ApprovedEnvelope> {
  const approved = await tryReadApproved(cwd)
  if (!approved) {
    printError(`No approved first-contact artifact found. Run 'synth first-contact approve' first.`)
  }
  return approved
}

async function writeApproved(cwd: string, envelope: ApprovedEnvelope): Promise<string> {
  const { approvedPath } = artifactDraftPaths(cwd)
  await ensureFirstContactDir(cwd)
  await sdk.json.writeJsonNewline(approvedPath, envelope)
  return approvedPath
}

export async function cmdFirstContactHelp(): Promise<void> {
  printJson({
    status: "ok",
    name: "synth",
    namespace: "first-contact",
    description: "Guided onboarding entry point for greenfield, brownfield, and legacy projects, plus the greenfield idea-to-project workflow (also available as 'synth genesis')",
    usage: "synth first-contact [--dry-run | --approve] | synth first-contact <subcommand> [options]",
    subcommands: [
      { name: "synth first-contact", description: "Detect repository state and preview the guided onboarding plan" },
      { name: "synth first-contact --dry-run", description: "Print the onboarding plan without mutating state", args: "--dry-run" },
      { name: "synth first-contact --approve", description: "Apply the guided onboarding plan", args: "--approve [--name <project-name>]" },
      { name: "synth first-contact start \"<intent>\"", description: "Extract intent and create a first-contact draft", args: "<intent> [--name <project-name>]" },
      { name: "synth first-contact clarify", description: "Show the next clarification questions for the draft" },
      { name: "synth first-contact clarify --field <field> --answer <answer>", description: "Apply a clarification answer to the draft", args: "--field <field> --answer <answer>" },
      { name: "synth first-contact project", description: "Project architecture candidates from the draft" },
      { name: "synth first-contact verify", description: "Verify capability assumptions for the recommended architecture" },
      { name: "synth first-contact approve", description: "Approve the draft once it is unambiguous and verifiable" },
      { name: "synth first-contact materialize --dry-run", description: "Preview what materialization would create", args: "--dry-run" },
      { name: "synth first-contact materialize --approve", description: "Materialize the approved artifact into a SYNTH project", args: "--approve [--name <project-name>]" },
      { name: "synth first-contact status", description: "Report the current first-contact state" },
    ],
    note: "The bare command, --dry-run, start, clarify, project, verify, and status are read-only or proposal-only. --approve, approve, and materialize --approve mutate project state.",
  })
}

export async function cmdFirstContactStart(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const intentInput = args.join(" ").trim() || (typeof flags.intent === "string" ? flags.intent.trim() : "")
  if (!intentInput) {
    printError("Intent is required. Usage: synth first-contact start \"<intent>\"")
  }

  const projectName = typeof flags.name === "string" ? flags.name : undefined
  const context = { sessionId: uuid(), turn: 1 }
  const artifact = extractIntent(intentInput, context)

  const draftPath = await writeDraft(process.cwd(), artifact)
  await appendTranscript(process.cwd(), artifact.transcript)

  printJson({
    status: "ok",
    kind: "FirstContactDraft",
    draftPath,
    projectName,
    intent: artifact.intent.description,
    confidence: artifact.confidence,
    unknowns: artifact.unknowns,
    nextStep: "synth first-contact clarify",
  })
}

export async function cmdFirstContactClarify(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const draft = await readDraft(process.cwd())
  const strategy = new DefaultClarificationStrategy()

  const answerField = typeof flags.field === "string" ? flags.field : undefined
  const answerContent = typeof flags.answer === "string" ? flags.answer : undefined

  if (answerField && answerContent !== undefined) {
    const clarification = clarify(draft.artifact, strategy)
    const question = clarification.questions.find((q) => q.field === answerField)
    if (!question) {
      printError(`No clarification question found for field '${answerField}'. Run 'synth first-contact clarify' to see open questions.`)
    }
    const answer: ClarificationAnswer = { questionId: question.id, content: answerContent }
    const updatedArtifact = strategy.applyAnswer(draft.artifact, question, answer)
    const updatedPath = await writeDraft(process.cwd(), updatedArtifact)
    const newEntries = [updatedArtifact.transcript.at(-2), updatedArtifact.transcript.at(-1)].filter((e): e is TranscriptEntry => e !== undefined)
    await appendTranscript(process.cwd(), newEntries)

    const nextClarification = clarify(updatedArtifact, strategy)
    printJson({
      status: "ok",
      kind: "FirstContactClarificationApplied",
      field: answerField,
      draftPath: updatedPath,
      canApprove: nextClarification.canApprove,
      remainingQuestions: nextClarification.questions.length,
      nextStep: nextClarification.canApprove ? "synth first-contact project" : "synth first-contact clarify",
    })
    return
  }

  const clarification = clarify(draft.artifact, strategy)
  printJson({
    status: "ok",
    kind: "FirstContactClarification",
    draftPath: artifactDraftPaths(process.cwd()).draftPath,
    canApprove: clarification.canApprove,
    ambiguities: clarification.ambiguities,
    questions: clarification.questions,
    nextStep: clarification.canApprove ? "synth first-contact project" : "synth first-contact clarify --field <field> --answer <answer>",
  })
}

function pickCandidate(artifact: IntentExtractionResult, flags: Record<string, string | boolean>): ArchitectureCandidate {
  const projection = projectArchitecture(artifact)
  if (typeof flags.architecture === "string") {
    const selected = projection.candidates.find((c) => c.id === flags.architecture)
    if (!selected) {
      printError(`Architecture '${flags.architecture}' not found. Run 'synth first-contact project' to see candidates.`)
    }
    return selected
  }
  if (projection.recommended) {
    return projection.recommended
  }
  if (projection.candidates.length === 0) {
    printError("No architecture candidates could be projected from the draft.")
  }
  return projection.candidates[0]
}

export async function cmdFirstContactProject(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const draft = await readDraft(process.cwd())
  const projection = projectArchitecture(draft.artifact)
  printJson({
    status: "ok",
    kind: "FirstContactArchitectureProjection",
    draftPath: artifactDraftPaths(process.cwd()).draftPath,
    recommended: projection.recommended,
    candidates: projection.candidates,
    nextStep: "synth first-contact verify",
  })
}

export async function cmdFirstContactVerify(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const draft = await readDraft(process.cwd())
  const candidate = pickCandidate(draft.artifact, flags)
  const report = verifyCapabilities(candidate)
  printJson({
    status: report.status === "passed" ? "ok" : "error",
    kind: "FirstContactCapabilityVerification",
    draftPath: artifactDraftPaths(process.cwd()).draftPath,
    selectedArchitecture: candidate,
    report,
    nextStep: report.status === "passed" ? "synth first-contact approve" : "synth first-contact clarify (or use --override once supported)",
  })
  if (report.status !== "passed") {
    process.exit(1)
  }
}

export async function cmdFirstContactApprove(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const draft = await readDraft(process.cwd())
  const strategy = new DefaultClarificationStrategy()
  const clarification = clarify(draft.artifact, strategy)
  if (!clarification.canApprove) {
    printJson({
      status: "error",
      kind: "FirstContactNotReadyForApproval",
      reason: "Draft still has unresolved ambiguities",
      ambiguities: clarification.ambiguities,
      questions: clarification.questions,
      nextStep: "synth first-contact clarify --field <field> --answer <answer>",
    })
    process.exit(1)
  }

  const candidate = pickCandidate(draft.artifact, flags)
  const report = verifyCapabilities(candidate)
  if (report.status !== "passed") {
    printJson({
      status: "error",
      kind: "FirstContactApprovalBlocked",
      reason: "Capability verification did not pass",
      report,
      nextStep: "synth first-contact clarify (or select a different architecture)",
    })
    process.exit(1)
  }

  const approvedArtifact = { ...draft.artifact, id: draft.artifact.id ?? `artifact-${uuid()}` }
  const envelope: ApprovedEnvelope = {
    schema: "synth-first-contact-approved-v1",
    status: APPROVED_STATUS,
    artifact: approvedArtifact,
    selectedArchitecture: candidate,
    verificationReport: report,
    approvedAt: nowIso(),
    artifactHash: hashArtifact(approvedArtifact as Record<string, unknown>),
  }

  const approvedPath = await writeApproved(process.cwd(), envelope)

  printJson({
    status: "ok",
    kind: "FirstContactApproved",
    approvedPath,
    artifactHash: envelope.artifactHash,
    selectedArchitecture: candidate,
    verificationReport: report,
    nextStep: "synth first-contact materialize --dry-run",
  })
}

export async function cmdFirstContactMaterialize(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const approved = await readApproved(process.cwd())
  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"
  const projectName = typeof flags.name === "string" ? flags.name : approved.artifact.intent.description.slice(0, 40)

  if (dryRun) {
    printJson({
      status: "ok",
      kind: "FirstContactMaterializationPreview",
      wouldCreate: [
        ".synth/manifest.json",
        ".synth/data/event-log.jsonl",
        ".synth/data/canonical-state.json",
        ".synth/first-contact/discovery-artifact.json",
        ".synth/first-contact/transcript.jsonl",
        ".synth/proposals/mission-proposal.json",
        ".synth/proposals/expedition-proposals.json",
      ],
      projectName,
      selectedArchitecture: approved.selectedArchitecture,
      note: "Dry-run: no files were written. Run 'synth first-contact materialize --approve' to materialize.",
    })
    return
  }

  const approve = flags.approve === true || flags.approve === "true"
  if (!approve) {
    printError("Materialization requires --dry-run or --approve.")
  }

  const result = await materialize({
    projectRoot: process.cwd(),
    projectName,
    approvedArtifact: approved.artifact,
    selectedArchitecture: approved.selectedArchitecture,
    verificationReport: approved.verificationReport,
  })

  printJson({
    status: "ok",
    kind: "FirstContactMaterialized",
    projectRoot: result.projectRoot,
    manifestPath: result.manifestPath,
    eventLogPath: result.eventLogPath,
    artifactPath: result.artifactPath,
    missionProposalPath: result.missionProposalPath,
    expeditionProposalsPath: result.expeditionProposalsPath,
    mission: result.mission,
    expeditions: result.expeditions,
    nextStep: "synth explain replay",
  })
}

export async function cmdFirstContactStatus(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const artifactPaths = artifactDraftPaths(process.cwd())
  const draft = await tryReadDraft(process.cwd())
  const approved = await tryReadApproved(process.cwd())

  if (!draft && !approved) {
    printJson({
      status: "ok",
      kind: "FirstContactStatus",
      state: "not-started",
      nextStep: "synth first-contact start \"<intent>\"",
    })
    return
  }

  const state = approved ? "approved" : draft ? "draft" : "unknown"
  const artifact = approved?.artifact ?? draft?.artifact
  const strategy = artifact ? clarify(artifact, new DefaultClarificationStrategy()) : undefined

  printJson({
    status: "ok",
    kind: "FirstContactStatus",
    state,
    draftPath: draft ? artifactPaths.draftPath : undefined,
    approvedPath: approved ? artifactPaths.approvedPath : undefined,
    intent: artifact?.intent.description,
    confidence: artifact?.confidence,
    canApprove: strategy?.canApprove ?? false,
    selectedArchitecture: approved?.selectedArchitecture,
    artifactHash: approved?.artifactHash,
    nextStep: approved
      ? "synth first-contact materialize --dry-run"
      : strategy?.canApprove
        ? "synth first-contact project"
        : "synth first-contact clarify",
  })
}

// ============================================================
// EXP-ONBOARD-001: Guided first-contact onboard flow
// ============================================================
// Bare `synth first-contact` detects repository state and guides the
// operator through the appropriate initialization path.
// ============================================================

type OnboardState =
  | { kind: "empty"; reason: string }
  | { kind: "initialized-v2"; manifestPath: string }
  | { kind: "legacy"; manifestPath?: string; legacyDir: string }
  | { kind: "brownfield"; hasPackageJson: boolean }

interface OnboardStage {
  stage: string
  description: string
  nextStep?: string
}

interface OnboardPlan {
  detected: OnboardState["kind"]
  projectName: string
  targetDir: string
  stages: OnboardStage[]
  wouldArchive?: string
  wouldCreate: string[]
  wouldRun: string[]
  nextStep: string
}

async function detectOnboardState(targetDir: string): Promise<OnboardState> {
  const synthDir = sdk.paths.synthDir(targetDir)
  const manifestPath = sdk.paths.manifestPath(targetDir)

  try {
    const synthStat = await fs.stat(synthDir)
    if (synthStat.isDirectory()) {
      try {
        const manifest = await sdk.json.readJson<Record<string, unknown>>(manifestPath)
        if (manifest.schema === "synth-bootstrap-manifest-v1") {
          return { kind: "initialized-v2", manifestPath }
        }
        return { kind: "legacy", manifestPath, legacyDir: synthDir }
      } catch {
        return { kind: "legacy", legacyDir: synthDir }
      }
    }
  } catch {
    // .synth does not exist
  }

  const entries = await fs.readdir(targetDir)
  const nonIgnorable = entries.filter((e) => e !== ".git" && e !== ".DS_Store")
  if (nonIgnorable.length === 0) {
    return { kind: "empty", reason: "No files in target directory" }
  }

  const packageJsonPath = path.join(targetDir, "package.json")
  let hasPackageJson = false
  try {
    await fs.access(packageJsonPath)
    hasPackageJson = true
  } catch {
    hasPackageJson = false
  }
  return { kind: "brownfield", hasPackageJson }
}

function buildOnboardPlan(state: OnboardState, targetDir: string, projectName: string): OnboardPlan {
  const base: OnboardPlan = {
    detected: state.kind,
    projectName,
    targetDir,
    stages: [],
    wouldCreate: [],
    wouldRun: [],
    nextStep: "",
  }

  switch (state.kind) {
    case "empty": {
      base.stages = [
        { stage: "detect", description: "Detected an empty directory", nextStep: "initialize project" },
        { stage: "init", description: `Initialize Synth project as ${projectName}`, nextStep: "create baseline mission" },
        { stage: "mission", description: "Create and approve a baseline mission", nextStep: "run npm run govern" },
      ]
      base.wouldCreate = [
        ".synth/manifest.json",
        ".synth/data/event-log.jsonl",
        ".synth/data/canonical-state.json",
      ]
      base.wouldRun = ["synth init", "synth mission create", "synth mission approve"]
      base.nextStep = "synth first-contact --approve"
      break
    }
    case "brownfield": {
      base.stages = [
        { stage: "detect", description: "Detected an existing project without Synth governance", nextStep: "analyze repository" },
        { stage: "analyze", description: "Run repository analysis and generate proposals", nextStep: "apply bootstrap" },
        { stage: "apply", description: "Apply Synth governance manifest and event log", nextStep: "run npm run govern" },
      ]
      base.wouldCreate = [
        ".synth/manifest.json",
        ".synth/data/event-log.jsonl",
        ".synth/data/canonical-state.json",
        "docs/reference/capability-validation-map.json",
      ]
      base.wouldRun = ["synth bootstrap --approve"]
      base.nextStep = "synth first-contact --approve"
      break
    }
    case "legacy": {
      const archiveDir = `${state.legacyDir}_bk_${Date.now()}`
      base.wouldArchive = archiveDir
      base.stages = [
        { stage: "detect", description: "Detected legacy Synth state", nextStep: "archive legacy state" },
        { stage: "archive", description: `Move ${state.legacyDir} to ${archiveDir}`, nextStep: "bootstrap fresh" },
        { stage: "apply", description: "Apply Synth v2 governance", nextStep: "run npm run govern" },
      ]
      base.wouldCreate = [
        ".synth/manifest.json",
        ".synth/data/event-log.jsonl",
        ".synth/data/canonical-state.json",
      ]
      base.wouldRun = ["mv .synth .synth_bk_<timestamp>", "synth bootstrap --approve"]
      base.nextStep = "synth first-contact --approve"
      break
    }
    case "initialized-v2": {
      base.stages = [
        { stage: "detect", description: "Detected an existing Synth v2 project", nextStep: "report status" },
      ]
      base.nextStep = "synth status"
      break
    }
  }

  return base
}

async function initializeEmptyProject(targetDir: string, projectName: string) {
  const governanceVersion = "2.1"
  const projectId = sdk.identity.uuid()

  await sdk.files.ensureDirectory(sdk.paths.synthDir(targetDir))
  await sdk.files.ensureDirectory(sdk.paths.dataDir(targetDir))

  const manifest = {
    schema: "synth-bootstrap-manifest-v1",
    version: "2.4.1",
    governanceVersion,
    projectName,
    root: targetDir,
    generatedAt: new Date().toISOString(),
    bootstrapped: false,
    source: "first-contact",
    commands: [
      { name: "version", description: "Print the installed Synth version" },
      { name: "init", description: "Initialize the current directory as a Synth project" },
      { name: "first-contact", description: "Guided onboarding entry point" },
      { name: "govern", description: "Run the full governance pipeline" },
      { name: "status", description: "Report the current project state" },
      { name: "mission", description: "Mission Studio operations" },
      { name: "expedition", description: "Planning operations" },
      { name: "capabilities", description: "List installed and missing CLI capabilities" },
    ],
    capabilities: [
      "repository", "github", "tdd", "bdd", "conversation", "document",
      "filesystem", "specification", "knowledge-extraction", "confidence",
      "dependency", "architecture", "mission-builder", "expedition-builder",
      "objective-builder", "wizard",
    ],
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
    publicVocabulary: ["Mission", "Expedition", "Evidence", "Plan", "Event", "State", "Replay"],
    govern: "npm run govern",
    quickStart: "synth first-contact --approve && npm run govern",
  }

  await sdk.json.writeJson(sdk.paths.manifestPath(targetDir), manifest)

  const { bootstrap } = await import("../core/bootstrap.js")
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      eventLogPath: sdk.paths.eventLogFile(targetDir),
      statePath: sdk.paths.stateFile(targetDir),
      checkpointPath: sdk.paths.checkpointsFile(targetDir),
    },
  })

  for (const name of ctx.capabilityRegistry.list()) {
    const cap = ctx.capabilityRegistry.resolve(name)
    if (cap) ctx.runtime.registerCapability(cap)
  }

  const currentState = await ctx.runtime.getState()
  if (currentState.lifecycle !== "initialized") {
    const initResult = await ctx.api.handleIntent({
      actor: "synth-first-contact",
      capability: "InitializeProject",
      payload: { projectId, name: projectName, governanceVersion },
    })
    if (initResult.status !== "ok") {
      throw new Error(`Project initialization failed: ${initResult.error || JSON.stringify(initResult)}`)
    }
  }

  const missionSubject = "Establish governance baseline"
  const missionPurpose = "Capture the initial state of the project and create a governed baseline for future expeditions."
  const missionResult = await ctx.api.handleIntent({
    actor: "synth-first-contact",
    capability: "CreateMission",
    payload: {
      id: sdk.identity.uuid(),
      name: missionSubject,
      purpose: missionPurpose,
      alignmentContractId: undefined,
      metadata: { createdBy: "first-contact-onboard" },
    },
  })
  if (missionResult.status !== "ok") {
    throw new Error(`Mission creation failed: ${missionResult.error || JSON.stringify(missionResult)}`)
  }

  const missionId = (missionResult.result as Record<string, unknown>)?.id as string

  return { manifest, missionId, projectId }
}

export async function cmdFirstContactOnboard(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const projectName = typeof flags.name === "string" ? flags.name : path.basename(targetDir)

  const state = await detectOnboardState(targetDir)
  const plan = buildOnboardPlan(state, targetDir, projectName)

  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"
  const approve = flags.approve === true || flags.approve === "true"

  if (dryRun || !approve) {
    printJson({
      status: "pending-approval",
      kind: "FirstContactOnboardPlan",
      ...plan,
      note: dryRun
        ? "Dry-run: no files were written."
        : "Review the plan and run 'synth first-contact --approve' to apply.",
    })
    return
  }

  if (state.kind === "initialized-v2") {
    printJson({
      status: "ok",
      kind: "FirstContactOnboardAlreadyInitialized",
      detected: state.kind,
      manifestPath: state.manifestPath,
      nextStep: "synth status",
    })
    return
  }

  const stages: OnboardStage[] = []

  if (state.kind === "legacy") {
    const archiveDir = plan.wouldArchive!
    await fs.rename(state.legacyDir, archiveDir)
    stages.push({ stage: "archive", description: `Archived legacy state to ${archiveDir}`, nextStep: "bootstrap" })
  }

  if (state.kind === "empty") {
    const result = await initializeEmptyProject(targetDir, projectName)
    stages.push({ stage: "init", description: `Initialized Synth project as ${projectName}`, nextStep: "create baseline mission" })
    stages.push({ stage: "mission", description: `Created baseline mission ${result.missionId}`, nextStep: "run npm run govern" })
    printJson({
      status: "ok",
      kind: "FirstContactOnboardCompleted",
      detected: state.kind,
      projectName,
      targetDir,
      stages,
      missionId: result.missionId,
      nextStep: "synth mission approve --draft-id <mission-id>",
    })
    return
  }

  // brownfield or post-archive legacy
  const bootstrapResult = await runBootstrap(targetDir, {
    approve: true,
    dryRun: false,
    withWebsite: false,
    withExample: false,
    projectName,
  })

  if (bootstrapResult.status === "error") {
    printError(`Bootstrap failed: ${JSON.stringify(bootstrapResult)}`)
  }

  stages.push({ stage: "analyze", description: "Analyzed repository and generated proposals", nextStep: "apply bootstrap" })
  stages.push({ stage: "apply", description: "Applied Synth governance manifest and event log", nextStep: "run npm run govern" })

  printJson({
    status: "ok",
    kind: "FirstContactOnboardCompleted",
    detected: state.kind,
    projectName,
    targetDir,
    stages,
    bootstrapStatus: bootstrapResult.status,
    nextStep: "synth mission approve --draft-id <draft-id>",
  })
}
