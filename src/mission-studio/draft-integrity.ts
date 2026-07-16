// ============================================================
// MISSION STUDIO: Draft Integrity (EXP-TRUST-002)
// ============================================================
// Mission drafts are planning artifacts stored as JSON. The
// confidence that gates approval must never be read from the
// editable artifact it grades, and any modification of a draft
// after creation must be detected.
//
// Every draft carries an immutable, write-once integrity record
// (data/drafts/<id>.integrity.json) holding a canonical-content
// fingerprint and the hash of the previous record. Records form
// a chain: rewriting or deleting history invalidates every
// successor. Follows the FileSystemSnapshotStore precedent —
// planning-layer persistence, certified at read, outside the
// execution-state mutation authority.
// ============================================================

import crypto from "crypto"
import fs from "fs/promises"
import path from "path"

const RECORD_SCHEMA = "synth-draft-integrity-v1"
const RECORD_SUFFIX = ".integrity.json"

// Decision-relevant draft content. Volatile session metadata
// (createdAt, approvalState, decisions) is excluded, mirroring
// the exclusion discipline of snapshot-integrity.ts.
const FINGERPRINT_FIELDS = [
  "id",
  "observations",
  "evidence",
  "unknowns",
  "questions",
  "worldModel",
  "confidence",
]

export type DraftIntegrityRecord = {
  schema: typeof RECORD_SCHEMA
  draftId: string
  fingerprint: string
  previousHash: string
  createdAt: number
}

export type DraftIntegrityVerdict = { ok: true } | { ok: false; message: string }

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex")
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map(canonicalize)
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = canonicalize((value as Record<string, unknown>)[key])
  }
  return sorted
}

/** Fingerprint of a serialized draft's decision-relevant content. */
export function fingerprintDraft(serializedDraft: Record<string, unknown>): string {
  const subset: Record<string, unknown> = {}
  for (const field of FINGERPRINT_FIELDS) {
    subset[field] = serializedDraft[field]
  }
  return sha256(JSON.stringify(canonicalize(subset)))
}

/** Chain hash of a record's content (createdAt excluded). */
function hashRecord(record: DraftIntegrityRecord): string {
  return sha256(
    JSON.stringify(
      canonicalize({
        schema: record.schema,
        draftId: record.draftId,
        fingerprint: record.fingerprint,
        previousHash: record.previousHash,
      }),
    ),
  )
}

function recordPath(draftsDir: string, draftId: string): string {
  return path.join(draftsDir, `${draftId}${RECORD_SUFFIX}`)
}

async function loadRecords(draftsDir: string): Promise<DraftIntegrityRecord[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(draftsDir)
  } catch {
    return []
  }
  const records: DraftIntegrityRecord[] = []
  for (const entry of entries) {
    if (!entry.endsWith(RECORD_SUFFIX)) continue
    try {
      const raw = JSON.parse(await fs.readFile(path.join(draftsDir, entry), "utf8")) as DraftIntegrityRecord
      if (raw.schema === RECORD_SCHEMA && typeof raw.draftId === "string") {
        records.push(raw)
      }
    } catch {
      // Unparseable files are ignored here; verification fails closed
      // through the missing-record path when one is referenced.
    }
  }
  return records
}

function chainTip(records: DraftIntegrityRecord[]): DraftIntegrityRecord | undefined {
  const referenced = new Set(records.map((r) => r.previousHash))
  const tips = records.filter((r) => !referenced.has(hashRecord(r)))
  if (tips.length === 0) return undefined
  return tips.sort((a, b) => a.draftId.localeCompare(b.draftId))[0]
}

/**
 * Write the immutable integrity record for a freshly created draft.
 * Throws if a record already exists — records are write-once.
 */
export async function writeDraftIntegrityRecord(
  draftsDir: string,
  draftId: string,
  serializedDraft: Record<string, unknown>,
): Promise<DraftIntegrityRecord> {
  const file = recordPath(draftsDir, draftId)
  try {
    await fs.access(file)
    throw new Error(`INVARIANT_VIOLATION: draft integrity record ${draftId} already exists`)
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("INVARIANT_VIOLATION")) throw err
  }

  const records = await loadRecords(draftsDir)
  const previous = chainTip(records)
  const record: DraftIntegrityRecord = {
    schema: RECORD_SCHEMA,
    draftId,
    fingerprint: fingerprintDraft(serializedDraft),
    previousHash: previous ? hashRecord(previous) : "genesis",
    createdAt: Date.now(),
  }
  await fs.writeFile(file, JSON.stringify(record, null, 2), "utf-8")
  return record
}

/**
 * Certify a draft against its integrity record before approval.
 * Fails closed: missing record, content divergence, or a broken
 * chain all produce a prescriptive rejection.
 */
export async function verifyDraftIntegrity(
  draftsDir: string,
  draftId: string,
  serializedDraft: Record<string, unknown>,
): Promise<DraftIntegrityVerdict> {
  const records = await loadRecords(draftsDir)
  const record = records.find((r) => r.draftId === draftId)

  if (!record) {
    return {
      ok: false,
      message: [
        `Draft integrity record missing for "${draftId}".`,
        `The draft cannot be certified: it predates draft integrity or its record was removed.`,
        `Create a new Mission Draft from current evidence (synth mission create --subject <subject> --purpose <purpose>) and approve that draft.`,
      ].join(" "),
    }
  }

  if (fingerprintDraft(serializedDraft) !== record.fingerprint) {
    return {
      ok: false,
      message: [
        `Draft integrity violation: "${draftId}" diverges from its certified record.`,
        `The draft was modified after creation; stored values are never authoritative.`,
        `Create a new Mission Draft from current evidence (synth mission create --subject <subject> --purpose <purpose>) and approve that draft.`,
      ].join(" "),
    }
  }

  // Chain continuity: exactly one genesis record, one successor per
  // record, and every record reachable from genesis.
  if (records.length > 0) {
    const genesis = records.filter((r) => r.previousHash === "genesis")
    const byPrevious = new Map<string, DraftIntegrityRecord[]>()
    for (const r of records) {
      const list = byPrevious.get(r.previousHash) ?? []
      list.push(r)
      byPrevious.set(r.previousHash, list)
    }
    const forks = [...byPrevious.values()].filter((list) => list.length > 1)

    let seen = 0
    if (genesis.length === 1 && forks.length === 0) {
      let current: DraftIntegrityRecord | undefined = genesis[0]
      while (current) {
        seen++
        const next = byPrevious.get(hashRecord(current))
        current = next?.[0]
      }
    }

    if (genesis.length !== 1 || forks.length > 0 || seen !== records.length) {
      return {
        ok: false,
        message: [
          `Draft integrity violation: the integrity chain is broken.`,
          `A certified record is missing, altered, or duplicated; successors cannot be certified.`,
          `Create a new Mission Draft from current evidence (synth mission create --subject <subject> --purpose <purpose>) and approve that draft.`,
        ].join(" "),
      }
    }
  }

  return { ok: true }
}
