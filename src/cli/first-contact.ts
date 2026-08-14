#!/usr/bin/env node
// ============================================================
// SYNTH v2 — First Contact CLI
// ============================================================
// Operator surface for greenfield onboarding (EXP-AIFC-008).
// All subcommands emit JSON. Commands are read-only or proposal-only
// until approval / materialization.
// ============================================================

import { realpathSync } from "fs"
import fs from "fs/promises"
import { spawn, execSync } from "child_process"
import path from "path"
import * as sdk from "../sdk/index.js"
import { runBootstrap } from "./bootstrap-apply.js"
import { injectIdentityContext, identityEnvVars, getCliIdentity } from "./identity-context.js"
import { extractIntent } from "../first-contact/extract/index.js"
import type { IntentExtractionResult, TranscriptEntry } from "../first-contact/extract/types.js"
import { clarify, DefaultClarificationStrategy } from "../first-contact/clarify/index.js"
import type { ClarificationAnswer, ClarificationQuestion } from "../first-contact/clarify/types.js"
import { projectArchitecture } from "../first-contact/project/index.js"
import type { ArchitectureCandidate } from "../first-contact/project/types.js"
import { verifyCapabilities } from "../first-contact/verify/index.js"
import { materialize, recommendAdapters, selectWorkflowTemplate } from "../first-contact/materialize/index.js"
import { hashArtifact } from "../first-contact/artifact/canonical.js"
import { detectRecommendedAdapters } from "./detect-adapters.js"

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
      { name: "synth first-contact", description: "Detect repository state and preview the guided onboarding plan (includes repository adapter snapshot)" },
      { name: "synth first-contact --dry-run", description: "Print the onboarding plan and repository adapter snapshot without mutating state", args: "--dry-run" },
      { name: "synth first-contact --approve", description: "Apply the guided onboarding plan", args: "--approve [--name <project-name>]" },
      { name: "synth first-contact start \"<intent>\"", description: "Extract intent and create a first-contact draft", args: "<intent> [--name <project-name>]" },
      { name: "synth first-contact clarify", description: "Show the next clarification questions for the draft" },
      { name: "synth first-contact clarify --field <field> --answer <answer>", description: "Apply a clarification answer to the draft", args: "--field <field> --answer <answer>" },
      { name: "synth first-contact project", description: "Project architecture candidates from the draft" },
      { name: "synth first-contact verify", description: "Verify capability assumptions for the recommended architecture" },
      { name: "synth first-contact approve", description: "Approve the draft once it is unambiguous and verifiable" },
      { name: "synth first-contact materialize --dry-run", description: "Preview materialization, including recommended adapters (pending approval) and workflow template", args: "--dry-run" },
      { name: "synth first-contact materialize --approve", description: "Materialize the approved artifact and persist recommended adapters to .synth/manifest.json", args: "--approve [--name <project-name>]" },
      { name: "synth first-contact status", description: "Report the current first-contact state" },
      { name: "synth first-contact onboard:detect", description: "Detect repository state for the task-engine onboarding flow" },
      { name: "synth first-contact onboard:archive", description: "Archive legacy Synth state" },
      { name: "synth first-contact onboard:init", description: "Initialize an empty directory as a Synth project" },
      { name: "synth first-contact onboard:bootstrap", description: "Apply Synth governance to a brownfield project" },
      { name: "synth first-contact onboard:mission", description: "Create the baseline mission after init" },
      { name: "synth first-contact onboard:govern", description: "Run the governance pipeline after onboarding" },
    ],
    note: "The bare command, --dry-run, start, clarify, project, verify, status, and onboard:detect are read-only or proposal-only. --approve, approve, materialize --approve, and all onboard:<archive|init|bootstrap|mission|govern> mutate project state.",
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
    const recommendationOptions = {
      projectRoot: process.cwd(),
      projectName,
      approvedArtifact: approved.artifact,
      selectedArchitecture: approved.selectedArchitecture,
      verificationReport: approved.verificationReport,
    }
    const recommendedAdapters = recommendAdapters(recommendationOptions).map((adapter) => ({
      ...adapter,
      status: "pending approval" as const,
    }))
    const workflowTemplate = selectWorkflowTemplate(recommendationOptions)

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
      recommendedAdapters,
      workflowTemplate,
      note: "Dry-run: no files were written. Adapters are pending approval. Run 'synth first-contact materialize --approve' to materialize.",
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
    recommendedAdapters: result.recommendedAdapters,
    workflowTemplate: result.workflowTemplate,
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

interface RepositoryAdapterSnapshot {
  detected: "git" | "external" | "none"
  initialized: boolean
  branch?: string
  remoteConfigured: boolean
  uncommittedChanges: boolean
  hooksInstalled: boolean
  health: "healthy" | "unhealthy" | "unknown"
  nextStep: string
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
  repositoryAdapter: RepositoryAdapterSnapshot
}

export async function detectRepositoryAdapter(targetDir: string): Promise<RepositoryAdapterSnapshot> {
  const selection = await detectRecommendedAdapters({ targetDir })
  const hasLocalGit = selection.selected.includes("integration:repository")

  let hasExternalGit = false
  let current = targetDir
  for (let depth = 0; depth < 3; depth++) {
    const parent = path.dirname(current)
    if (parent === current) break
    try {
      await fs.access(path.join(parent, ".git"))
      hasExternalGit = true
      break
    } catch {
      // continue searching upward
    }
    current = parent
  }

  const detected: RepositoryAdapterSnapshot["detected"] = hasLocalGit
    ? "git"
    : hasExternalGit
      ? "external"
      : "none"

  if (detected === "none") {
    return {
      detected: "none",
      initialized: false,
      remoteConfigured: false,
      uncommittedChanges: false,
      hooksInstalled: false,
      health: "unknown",
      nextStep: "Initialize a git repository: synth adapter init",
    }
  }

  const git = (args: string[]) =>
    execSync(["git", ...args].join(" "), {
      cwd: targetDir,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()

  let branch: string | undefined
  try {
    branch = git(["rev-parse", "--abbrev-ref", "HEAD"])
  } catch {
    branch = undefined
  }

  let remoteConfigured = false
  try {
    git(["remote", "get-url", "origin"])
    remoteConfigured = true
  } catch {
    remoteConfigured = false
  }

  let uncommittedChanges = false
  try {
    const statusOutput = git(["status", "--porcelain"])
    uncommittedChanges = statusOutput.length > 0
  } catch {
    uncommittedChanges = false
  }

  let hooksInstalled = false
  try {
    const hooksDir = git(["config", "--get", "core.hooksPath"])
    hooksInstalled = hooksDir.length > 0
  } catch {
    hooksInstalled = false
  }

  const health: RepositoryAdapterSnapshot["health"] =
    branch && (hasLocalGit || hasExternalGit) ? "healthy" : "unknown"

  let nextStep = "synth repo status"
  if (!hooksInstalled) {
    nextStep = "Install governance hooks: synth adapter install-hooks"
  } else if (!remoteConfigured) {
    nextStep = "Configure a remote: synth adapter configure remote=<remote-url>"
  }

  return {
    detected,
    initialized: hasLocalGit,
    branch,
    remoteConfigured,
    uncommittedChanges,
    hooksInstalled,
    health,
    nextStep,
  }
}

export async function detectOnboardState(targetDir: string): Promise<OnboardState> {
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

export function buildOnboardPlan(
  state: OnboardState,
  targetDir: string,
  projectName: string,
  repositoryAdapter: RepositoryAdapterSnapshot,
): OnboardPlan {
  const base: OnboardPlan = {
    detected: state.kind,
    projectName,
    targetDir,
    stages: [],
    wouldCreate: [],
    wouldRun: [],
    nextStep: "",
    repositoryAdapter,
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

export async function initializeEmptyProject(targetDir: string, projectName: string) {
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
  // EXP-IDENTITY-001: ensure every handleIntent call carries the CLI identity.
  injectIdentityContext(ctx.api)

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

  return { manifest, projectId }
}

async function createBaselineMission(targetDir: string): Promise<string> {
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
  // EXP-IDENTITY-001: ensure every handleIntent call carries the CLI identity.
  injectIdentityContext(ctx.api)

  const currentState = await ctx.runtime.getState()
  const missions = Object.values(currentState.missions || {})
  const existingBaseline = missions.find((m: Record<string, unknown>) => m.name === "Establish governance baseline")
  if (existingBaseline) {
    return existingBaseline.id as string
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

  return (missionResult.result as Record<string, unknown>)?.id as string
}

async function findBaselineMissionId(targetDir: string): Promise<string | undefined> {
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
  const currentState = await ctx.runtime.getState()
  const missions = Object.values(currentState.missions || {})
  const baselineMission = missions.find((m: Record<string, unknown>) => m.name === "Establish governance baseline")
  return baselineMission?.id as string | undefined
}

function buildTaskPlan(state: OnboardState["kind"]): string[] {
  switch (state) {
    case "empty":
      return ["onboarding:init", "onboarding:mission"]
    case "brownfield":
      return ["onboarding:bootstrap"]
    case "legacy":
      return ["onboarding:archive", "onboarding:bootstrap"]
    case "initialized-v2":
      return []
  }
}

export async function cmdFirstContactOnboard(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const projectName = typeof flags.name === "string" ? flags.name : path.basename(targetDir)

  const state = await detectOnboardState(targetDir)
  const repositoryAdapter = await detectRepositoryAdapter(targetDir)
  const plan = buildOnboardPlan(state, targetDir, projectName, repositoryAdapter)
  const taskPlan = buildTaskPlan(state.kind)

  const dryRun = flags["dry-run"] === true || flags["dry-run"] === "true"
  const approve = flags.approve === true || flags.approve === "true"

  if (dryRun || !approve) {
    printJson({
      status: "pending-approval",
      kind: "FirstContactOnboardPlan",
      ...plan,
      taskPlan,
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
      repositoryAdapter,
      nextStep: "synth status",
    })
    return
  }

  // Execute the onboarding task graph through the canonical task engine.
  // Propagate the operator-supplied project name so each stage uses the same
  // name even when the task runner re-invokes synth as a subprocess.
  for (const taskId of taskPlan) {
    const code = await runTask(taskId, targetDir, { SYNTH_PROJECT_NAME: projectName })
    if (code !== 0) {
      printError(`Onboarding task ${taskId} failed with exit code ${code}`)
    }
  }

  const missionId = await findBaselineMissionId(targetDir)

  printJson({
    status: "ok",
    kind: "FirstContactOnboardCompleted",
    detected: state.kind,
    projectName,
    targetDir,
    taskPlan,
    missionId,
    repositoryAdapter: await detectRepositoryAdapter(targetDir),
    nextStep: "synth first-contact onboard:govern",
  })
}


// ============================================================
// EXP-ONBOARD-002: Onboarding task-engine integration
// ============================================================
// The following functions expose each onboarding stage as a
// first-contact subcommand so that the onboarding task graph can
// invoke them through `synth task run`. The main `cmdFirstContactOnboard`
// retains state-based dispatch and delegates execution to the task engine.
// ============================================================

function resolveSynthCli(): string {
  // Use the currently running synth CLI entry point if available. Resolve
  // symlinks so global npm installs (where the user-facing binary is a
  // symlink to dist/cli/synth.js) dispatch to the real entry point.
  if (process.argv[1]) {
    try {
      const resolved = realpathSync(process.argv[1])
      if (resolved.endsWith("synth.js")) {
        return path.resolve(resolved)
      }
    } catch {
      // If realpath fails, fall back to the literal argv[1] check.
      if (process.argv[1].endsWith("synth.js")) {
        return path.resolve(process.argv[1])
      }
    }
  }
  return path.resolve(process.cwd(), "dist", "cli", "synth.js")
}

function runTask(taskId: string, targetDir: string, envOverrides: Record<string, string> = {}): Promise<number> {
  return new Promise((resolve) => {
    let stdout = ""
    let stderr = ""
    // EXP-IDENTITY-001: propagate the current identity to subprocess tasks.
    const identityOverrides = identityEnvVars(getCliIdentity())
    const child = spawn(process.execPath, [resolveSynthCli(), "task", "run", taskId], {
      cwd: targetDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      env: { ...process.env, ...identityOverrides, ...envOverrides },
    })
    child.stdout.on("data", (data) => {
      stdout += data
    })
    child.stderr.on("data", (data) => {
      stderr += data
    })
    child.on("close", (code) => {
      // Forward task stderr for diagnostics, but keep stdout private so the
      // final first-contact JSON output remains the only stdout payload.
      if (stderr) {
        console.error(stderr)
      }
      resolve(code ?? 1)
    })
  })
}

async function readOnboardContext(targetDir: string): Promise<{
  state: OnboardState
  projectName: string
  targetDir: string
  repositoryAdapter: RepositoryAdapterSnapshot
}> {
  const state = await detectOnboardState(targetDir)
  const projectName = path.basename(targetDir)
  const repositoryAdapter = await detectRepositoryAdapter(targetDir)
  return { state, projectName, targetDir, repositoryAdapter }
}

export async function cmdFirstContactOnboardDetect(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const projectName = typeof flags.name === "string" ? flags.name : path.basename(targetDir)
  const state = await detectOnboardState(targetDir)
  const repositoryAdapter = await detectRepositoryAdapter(targetDir)

  printJson({
    status: "ok",
    kind: "FirstContactOnboardDetect",
    detected: state.kind,
    projectName,
    targetDir,
    repositoryAdapter,
    nextStep: state.kind === "initialized-v2" ? "synth status" : "synth first-contact --approve",
  })
}

export async function cmdFirstContactOnboardArchive(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const state = await detectOnboardState(targetDir)
  if (state.kind !== "legacy") {
    printError(`Archive is only valid for legacy state, detected: ${state.kind}`)
  }

  const archiveDir = `${state.legacyDir}_bk_${Date.now()}`
  await fs.rename(state.legacyDir, archiveDir)

  printJson({
    status: "ok",
    kind: "FirstContactOnboardArchive",
    archiveDir,
    nextStep: "onboarding:bootstrap",
  })
}

export async function cmdFirstContactOnboardInit(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const projectName = typeof flags.name === "string"
    ? flags.name
    : process.env.SYNTH_PROJECT_NAME || path.basename(targetDir)
  const state = await detectOnboardState(targetDir)

  if (state.kind === "initialized-v2") {
    printJson({
      status: "ok",
      kind: "FirstContactOnboardInitAlreadyDone",
      detected: state.kind,
      manifestPath: state.manifestPath,
      projectName,
      targetDir,
      nextStep: "onboarding:mission",
    })
    return
  }

  if (state.kind !== "empty") {
    printError(`Init is only valid for empty directories, detected: ${state.kind}`)
  }

  await initializeEmptyProject(targetDir, projectName)

  printJson({
    status: "ok",
    kind: "FirstContactOnboardInit",
    projectName,
    targetDir,
    nextStep: "onboarding:mission",
  })
}

export async function cmdFirstContactOnboardBootstrap(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const projectName = typeof flags.name === "string"
    ? flags.name
    : process.env.SYNTH_PROJECT_NAME || path.basename(targetDir)
  const state = await detectOnboardState(targetDir)
  if (state.kind !== "brownfield" && state.kind !== "legacy") {
    // Legacy state is valid after archive has run.
    printError(`Bootstrap is only valid for brownfield or post-archive legacy state, detected: ${state.kind}`)
  }

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

  printJson({
    status: "ok",
    kind: "FirstContactOnboardBootstrap",
    projectName,
    targetDir,
    bootstrapStatus: bootstrapResult.status,
    nextStep: "onboarding:govern",
  })
}

export async function cmdFirstContactOnboardMission(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const projectName = typeof flags.name === "string"
    ? flags.name
    : process.env.SYNTH_PROJECT_NAME || path.basename(targetDir)
  const state = await detectOnboardState(targetDir)

  if (state.kind !== "empty" && state.kind !== "initialized-v2") {
    printError(`Mission creation is only valid after empty-project init, detected: ${state.kind}`)
  }

  // Idempotent: if a baseline mission already exists, return it; otherwise create one.
  const missionId = await createBaselineMission(targetDir)

  printJson({
    status: "ok",
    kind: "FirstContactOnboardMission",
    missionId,
    projectName,
    targetDir,
    nextStep: "onboarding:govern",
  })
}

export async function cmdFirstContactOnboardGovern(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const targetDir = args[0] ? path.resolve(args[0]) : process.cwd()
  const code = await runTask("govern", targetDir)
  if (code !== 0) {
    printError(`Govern pipeline failed with exit code ${code}`)
  }

  printJson({
    status: "ok",
    kind: "FirstContactOnboardGovern",
    targetDir,
    nextStep: "synth status",
  })
}
