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

import { LEDGER_PATHS, LedgerError, advanceCanonicalBranch, withLedgerLock } from "./writer.js"
import { ledgerBranch } from "./doctor.js"

export type CeremonySpec = {
  /** Transition recorded on the ledger, i.e. the event name. */
  transition: string
  entityKind: "mission" | "expedition"
  /** Pathspecs this ceremony owns. Defaults to the whole ledger. */
  paths?: readonly string[]
}

/**
 * Transition table for the CLI's auto-committing ceremonies (keys are the
 * legacy transition identifiers used by the call sites). The remaining rows of
 * ADR-055 rev 2 §R2.1 arrive with the capability choke point described in the
 * E5 report.
 */
export const CEREMONIES: Record<string, CeremonySpec> = {
  "expedition-start": { transition: "EXPEDITION_STARTED", entityKind: "expedition" },
  "expedition-complete": { transition: "EXPEDITION_COMPLETED", entityKind: "expedition" },
  "expedition-finish": { transition: "EXPEDITION_FINISHED", entityKind: "expedition" },
  "evidence-attach": { transition: "EVIDENCE_ATTACHED", entityKind: "expedition" },
  "expedition-refine": { transition: "EXPEDITION_REFINED", entityKind: "expedition" },
  "convergence-certification": { transition: "CONVERGENCE_CERTIFIED", entityKind: "expedition" },
  "ledger-repair": { transition: "LEDGER_REPAIR", entityKind: "mission" },
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
  /** Present when nothing was committed (e.g. the ledger was already clean). */
  reason?: string
  /** Present when the writer refused: LEDGER_DIRTY | LEDGER_LOCKED | … */
  code?: string
  nextStep?: string
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

  const branch = ledgerBranch(root)
  if (!branch) {
    return {
      committed: false,
      commitHash: "",
      message,
      files: [],
      reason: "Detached HEAD: the ledger branch cannot be resolved",
      code: "LEDGER_UNAVAILABLE",
      nextStep: "Check out a branch before running ceremonies (ADR-055 §2.3).",
    }
  }

  try {
    const result = await withLedgerLock(root, () =>
      advanceCanonicalBranch(root, {
        branch,
        message,
        paths: spec?.paths ?? LEDGER_PATHS,
        useCheckout: root,
      }),
    )
    return {
      committed: result.committed,
      commitHash: result.commitHash,
      message,
      files: result.files,
      ...(result.reason ? { reason: result.reason } : {}),
    }
  } catch (err) {
    const e = err as LedgerError
    return {
      committed: false,
      commitHash: "",
      message,
      files: [],
      reason: e.message ?? String(err),
      code: e.code ?? "LEDGER_UNAVAILABLE",
      nextStep: e.nextStep ?? "Run `synth doctor --fix`, then repeat the ceremony.",
    }
  }
}
