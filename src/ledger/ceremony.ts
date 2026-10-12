// ============================================================
// LEDGER — Ceremony commits (ADR-055 §2.3 / rev 2 §R2.1)
// ============================================================
// Every lifecycle ceremony that mutates governance state ends in exactly one
// commit on the ledger branch, made by the Ledger Writer:
//
//   lock → residue check → commit the ceremony's paths → CAS → refresh
//
// Message shape (normative): `chore(synth): <TRANSITION> <entity-kind> <id8>`.
// Failure is loud: the caller gets a `LEDGER_*` code and a next step, never a
// silent `{committed:false}` that leaves the ledger abandoned mid-ceremony.
// ============================================================

import { execFileSync } from "node:child_process"

import {
  LEDGER_PATHS,
  LedgerError,
  advanceCanonicalBranch,
  isUnderAnyPathspecFile,
  ledgerChanges,
  withLedgerLock,
} from "./writer.js"
import { currentBranch, recordLedgerBranch, resolveLedgerBranch } from "./branch.js"

export type CeremonySpec = {
  /** Transition recorded on the ledger, i.e. the event name. */
  transition: string
  entityKind: "mission" | "expedition"
  /** Pathspecs this ceremony owns. Defaults to the whole ledger. */
  paths?: readonly string[]
  /**
   * True when the CLI verb already commits this ceremony itself (the six
   * original call sites). The capability choke point skips these so one verb
   * never produces two commits for one transition.
   */
  verbLevel?: boolean
}

/**
 * Transition table for the CLI's auto-committing ceremonies (keys are the
 * legacy transition identifiers used by the call sites). The remaining rows of
 * ADR-055 rev 2 §R2.1 arrive with the capability choke point described in the
 * E5 report.
 */
export const CEREMONIES: Record<string, CeremonySpec> = {
  // Verb-level ceremonies: the CLI call site commits (and reports) these.
  "expedition-start": { transition: "EXPEDITION_STARTED", entityKind: "expedition", verbLevel: true },
  "expedition-complete": { transition: "EXPEDITION_COMPLETED", entityKind: "expedition", verbLevel: true },
  "expedition-finish": { transition: "EXPEDITION_FINISHED", entityKind: "expedition", verbLevel: true },
  "evidence-attach": { transition: "EVIDENCE_ATTACHED", entityKind: "expedition", verbLevel: true },
  "expedition-refine": { transition: "EXPEDITION_REFINED", entityKind: "expedition", verbLevel: true },
  "convergence-certification": { transition: "CONVERGENCE_CERTIFIED", entityKind: "expedition", verbLevel: true },
  "ledger-repair": { transition: "LEDGER_REPAIR", entityKind: "mission" },

  // Capability ceremonies: committed by the handleIntent choke point, so every
  // verb that mutates governance state lands a ledger commit (ADR-055 rev 2
  // §R2.1 · AC1/AC10) without nineteen call sites.
  "mission-create": { transition: "MISSION_CREATED", entityKind: "mission" },
  "mission-approve": { transition: "MISSION_APPROVED", entityKind: "mission" },
  "mission-complete": { transition: "MISSION_COMPLETED", entityKind: "mission" },
  "mission-archive": { transition: "MISSION_ARCHIVED", entityKind: "mission" },
  "mission-delete": { transition: "MISSION_DELETED", entityKind: "mission", verbLevel: true },
  "expedition-create": { transition: "EXPEDITION_CREATED", entityKind: "expedition" },
  "expedition-approve": { transition: "EXPEDITION_APPROVED", entityKind: "expedition" },
  "expedition-commit": { transition: "EXPEDITION_COMMITTED", entityKind: "expedition" },
  "expedition-pause": { transition: "EXPEDITION_PAUSED", entityKind: "expedition" },
  "expedition-cancel": { transition: "EXPEDITION_CANCELLED", entityKind: "expedition" },
  "expedition-archive": { transition: "EXPEDITION_ARCHIVED", entityKind: "expedition" },
  "expedition-delete": { transition: "EXPEDITION_DELETED", entityKind: "expedition", verbLevel: true },
  "expedition-move": { transition: "EXPEDITION_MOVED", entityKind: "expedition" },
  "expedition-deliver": { transition: "EXPEDITION_DELIVERED", entityKind: "expedition" },
  "expedition-seal": { transition: "EXPEDITION_INTEGRATED", entityKind: "expedition" },
  "expedition-abandon": { transition: "EXPEDITION_ABANDONED", entityKind: "expedition" },
  // The deletion half of an abandonment: it is its own ceremony precisely so the
  // ledger can never be missing a deletion that happened.
  "expedition-discard": { transition: "EXPEDITION_DISCARDED", entityKind: "expedition" },

  // Intake ceremonies: the draft + its integrity record are the input class of
  // the planning step, and they are tracked — so the verb that writes them is
  // the verb that commits them (§R2.1). Draft-only verbs have no capability to
  // hang a choke-point commit on, so the CLI call site commits explicitly.
  "mission-draft": { transition: "MISSION_DRAFTED", entityKind: "mission" },
  "mission-evidence": { transition: "MISSION_EVIDENCE_ADDED", entityKind: "mission" },
  "expedition-draft": { transition: "EXPEDITION_DRAFTED", entityKind: "expedition" },
  // Deletion retires draft artifacts after the state mutation; the retirement
  // is recorded in the same command (never a silent file deletion).
  "draft-retire": { transition: "DRAFT_ARTIFACTS_RETIRED", entityKind: "mission" },
}

/** Which capability produces which ceremony. */
export const CAPABILITY_CEREMONIES: Record<string, string> = {
  CreateMission: "mission-create",
  ApproveMission: "mission-approve",
  CompleteMission: "mission-complete",
  ArchiveMission: "mission-archive",
  // DeleteMission / DeleteExpedition: the CLI commits after draft retirement,
  // so the whole delete is one commit; marked verbLevel below.
  CreateExpedition: "expedition-create",
  ApproveExpedition: "expedition-approve",
  CommitExpedition: "expedition-commit",
  PauseExpedition: "expedition-pause",
  CancelExpedition: "expedition-cancel",
  ArchiveExpedition: "expedition-archive",
  DeleteExpedition: "expedition-delete",
  // (delete ceremonies are verbLevel: see above)
  MoveExpedition: "expedition-move",
  DeliverExpedition: "expedition-deliver",
  SealExpedition: "expedition-seal",
  AbandonExpedition: "expedition-abandon",
  DiscardExpedition: "expedition-discard",
}

export type CeremonyIntent = {
  key: string
  spec: CeremonySpec
  entityId?: string
}

function entityIdFromPayload(payload: Record<string, unknown> | undefined): string | undefined {
  if (!payload) return undefined
  for (const field of ["id", "expeditionId", "missionId", "draftId", "proposalId"]) {
    const value = payload[field]
    if (typeof value === "string" && value.length > 0) return value
  }
  return undefined
}

/**
 * The ceremony a capability produces, or undefined when the capability is not
 * a governance ceremony (planning steps, identity, genesis, repairs...).
 */
export function ceremonyForCapability(
  capability: string | undefined,
  payload: Record<string, unknown> | undefined,
): CeremonyIntent | undefined {
  if (!capability) return undefined
  const key = CAPABILITY_CEREMONIES[capability]
  if (!key) return undefined
  const spec = CEREMONIES[key]
  if (!spec) return undefined
  return { key, spec, entityId: entityIdFromPayload(payload) }
}

export function ceremonyMessage(spec: CeremonySpec, entityId?: string): string {
  const id8 = entityId && entityId.length > 0 ? entityId.slice(0, 8) : "unknown"
  return `chore(synth): ${spec.transition} ${spec.entityKind} ${id8}`
}

export type CeremonyCommit = {
  committed: boolean
  commitHash: string
  message: string
  files: string[]
  /** Where the ledger branch came from: config | recorded | inferred. */
  ledgerBranch?: { branch: string; source: string }
  /** Set when this ceremony recorded the ledger branch (first inference). */
  branchRecorded?: string
  /** Present when nothing was committed (e.g. the ledger was already clean). */
  reason?: string
  /** Set when the writer refused: LEDGER_DIRTY | LEDGER_LOCKED | … */
  code?: string
  nextStep?: string
  /** Set when the ceremony's checkout is not the ledger branch and stayed dirty. */
  checkoutDirty?: boolean
  /** Advisory text (e.g. the branch was inferred rather than configured). */
  warning?: string
}

/**
 * Commit a finished ceremony on the ledger branch. Never throws: a refusal is
 * returned with its code so the caller can fail loudly (ADR-055 §2.3).
 */
export async function commitCeremony(root: string, transitionKey: string, entityId?: string): Promise<CeremonyCommit> {
  const spec = CEREMONIES[transitionKey]
  const message = spec
    ? ceremonyMessage(spec, entityId)
    : `chore(synth): record ${transitionKey}${entityId ? ` expedition ${entityId.slice(0, 8)}` : ""}`

  const resolution = resolveLedgerBranch(root)
  const branch = resolution.branch
  if (!branch) {
    return {
      committed: false,
      commitHash: "",
      message,
      files: [],
      reason: "Detached HEAD and no recorded ledger branch",
      code: "LEDGER_UNAVAILABLE",
      nextStep:
        "Check out the ledger branch (or name it once with git.ledgerBranch in .synth/config.yaml) before running ceremonies (ADR-055 §2.3).",
    }
  }

  // The ledger branch is named, not assumed: the operator's checkout is the
  // fast path only when it *is* the ledger branch. Every other checkout commits
  // through the anchor, so the ledger never lands on a work branch (F12).
  const checkout = currentBranch(root)
  const fastPath = checkout === branch

  // Outside the ledger branch, the checkout's ledger edits are the source of
  // truth for this ceremony — but only the ones this ceremony owns. Anything
  // else must be committed (or repaired) first, loudly.
  if (!fastPath) {
    const ownedPaths = spec?.paths ?? LEDGER_PATHS
    const residue = ledgerChanges(root, LEDGER_PATHS).filter(
      (change) => !isUnderAnyPathspecFile(change.path, ownedPaths),
    )
    if (residue.length > 0) {
      return {
        committed: false,
        commitHash: "",
        message,
        files: [],
        ledgerBranch: { branch, source: resolution.source },
        reason: `The checkout holds ledger edits this ceremony does not own: ${residue
          .map((change) => change.path)
          .join(", ")}`,
        code: "LEDGER_DIRTY",
        nextStep: "Commit or stash them, or run `synth doctor --fix`, then repeat the ceremony.",
      }
    }
  }

  // First inference records the answer in the ledger, so the next ceremony —
  // and every branch cut from here — resolves without guessing.
  let branchRecorded: string | undefined
  if (resolution.source === "inferred") {
    try {
      branchRecorded = recordLedgerBranch(root, branch)
    } catch {
      // Recording is best-effort; the ceremony still commits.
    }
  }

  try {
    const result = await withLedgerLock(root, () =>
      advanceCanonicalBranch(root, {
        branch,
        message,
        paths: spec?.paths ?? LEDGER_PATHS,
        ...(fastPath ? { useCheckout: root } : { sourceRoot: root }),
      }),
    )
    const checkoutDirty = !fastPath && hasLedgerDirt(root)
    return {
      committed: result.committed,
      commitHash: result.commitHash,
      message,
      files: result.files,
      ledgerBranch: { branch, source: resolution.source },
      ...(branchRecorded ? { branchRecorded } : {}),
      ...(resolution.warning ? { warning: resolution.warning } : {}),
      ...(checkoutDirty ? { checkoutDirty: true } : {}),
      ...(result.reason ? { reason: result.reason } : {}),
    }
  } catch (err) {
    const e = err as LedgerError
    return {
      committed: false,
      commitHash: "",
      message,
      files: [],
      ledgerBranch: { branch, source: resolution.source },
      ...(resolution.warning ? { warning: resolution.warning } : {}),
      reason: e.message ?? String(err),
      code: e.code ?? "LEDGER_UNAVAILABLE",
      nextStep: e.nextStep ?? "Run `synth doctor --fix`, then repeat the ceremony.",
    }
  }
}

/** True when the checkout holds ledger edits (reported, never silently discarded). */
function hasLedgerDirt(root: string): boolean {
  return ledgerChanges(root, LEDGER_PATHS).length > 0
}

