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
import crypto from "crypto"
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

function printJson(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2))
}

function printError(error: string, code = 1): never {
  printJson({ status: "error", error })
  process.exit(code)
}

function uuid(): string {
  return crypto.randomUUID()
}

function nowIso(): string {
  return new Date().toISOString()
}

function artifactDraftPaths(cwd: string) {
  const dir = path.join(cwd, ".synth", "first-contact")
  return {
    dir,
    draftPath: path.join(dir, "draft.json"),
    approvedPath: path.join(dir, "approved-artifact.json"),
    transcriptPath: path.join(dir, "transcript.jsonl"),
  }
}

async function ensureFirstContactDir(cwd: string): Promise<string> {
  const dir = artifactDraftPaths(cwd).dir
  await fs.mkdir(dir, { recursive: true })
  return dir
}

async function tryReadDraft(cwd: string): Promise<DraftEnvelope | undefined> {
  const { draftPath } = artifactDraftPaths(cwd)
  try {
    const raw = await fs.readFile(draftPath, "utf-8")
    return JSON.parse(raw) as DraftEnvelope
  } catch {
    return undefined
  }
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
  await fs.writeFile(draftPath, JSON.stringify(envelope, null, 2) + "\n", "utf-8")
  return draftPath
}

async function appendTranscript(cwd: string, entries: TranscriptEntry[]): Promise<void> {
  const { transcriptPath } = artifactDraftPaths(cwd)
  if (entries.length === 0) return
  const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n"
  await fs.appendFile(transcriptPath, lines, "utf-8")
}

async function tryReadApproved(cwd: string): Promise<ApprovedEnvelope | undefined> {
  const { approvedPath } = artifactDraftPaths(cwd)
  try {
    const raw = await fs.readFile(approvedPath, "utf-8")
    return JSON.parse(raw) as ApprovedEnvelope
  } catch {
    return undefined
  }
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
  await fs.writeFile(approvedPath, JSON.stringify(envelope, null, 2) + "\n", "utf-8")
  return approvedPath
}

export async function cmdFirstContactHelp(): Promise<void> {
  printJson({
    status: "ok",
    name: "synth",
    namespace: "first-contact",
    description: "Greenfield onboarding workflow: turn an idea into an approved Mission before materializing a project",
    usage: "synth first-contact <subcommand> [options]",
    subcommands: [
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
    note: "start, clarify, project, verify, and status are read-only or proposal-only. approve and materialize --approve mutate project state.",
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
  const paths = artifactDraftPaths(process.cwd())
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
    draftPath: draft ? paths.draftPath : undefined,
    approvedPath: approved ? paths.approvedPath : undefined,
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
