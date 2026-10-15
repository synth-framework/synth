// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import crypto from "crypto"

import { printJson, printError } from "./print.js"
import { writeDraftIntegrityRecord } from "../mission-studio/draft-integrity.js"
import { findSimilarMissions } from "../mission-studio/duplicate-detection.js"
import type { PlanningSession } from "../mission-studio/types.js"
import { bootstrapWithCapabilities } from "./auto-commit-ceremony.js"
import { gateDecision, printGateBlock } from "./gate-reporting.js"
import { parseTokenList, makeObservation, ensureDraftsDir, serializePlanningSession, commitDraftCeremony } from "./command-planning.js"


export async function cmdMissionCreate(flags: Record<string, string | boolean>) {
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

  // EXP-DUP-001: duplicate-aware creation. Tokenize the candidate and
  // surface existing missions with similar scope as an advisory.
  const scopeTokens = parseTokenList(flags.scope)
  const intentTokens = parseTokenList(flags.intent)
  const similar = findSimilarMissions(
    { subject, purpose, scopeTokens, intentTokens },
    Object.values(state.missions || {}).map((m: any) => ({
      id: m.id,
      name: m.name,
      purpose: m.purpose,
      metadata: m.metadata,
    })),
  )

  const ctx = await (await import("../core/bootstrap.js")).bootstrap({
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

  // The draft and its integrity record are this ceremony's ledger payload; the
  // verb that writes them commits them (§R2.1 · AC9).
  const ledger = await commitDraftCeremony("mission-draft", session.id)

  printJson({
    status: "ok",
    kind: "MissionDraft",
    draftId: session.id,
    draftPath,
    integrity: "certified",
    subject,
    purpose,
    evidence,
    similar,
    confidence: session.confidence,
    unknowns: session.unknowns,
    questions: session.questions,
    proposals: proposalsResult.status === "ok" ? proposalsResult.proposals : [],
    ...(ledger ? { ledger } : {}),
    nextStep: `synth mission approve --draft-id ${session.id}`,
  })
}


// ============================================================
// EXP-REFINE-015: Evidence attachment for mission create
// ============================================================
export async function loadEvidenceFromFile(evidenceFile: string): Promise<{ source: string; content: string; hash: string } | null> {
  try {
    const content = await fs.readFile(evidenceFile, "utf-8")
    const hash = crypto.createHash("sha256").update(content).digest("hex")
    return { source: evidenceFile, content, hash }
  } catch {
    return null
  }
}
