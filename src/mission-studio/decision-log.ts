// ============================================================
// MISSION STUDIO: Decision Log (EXP-TRUST-004)
// ============================================================
// Trust-relevant decisions about planning artifacts must be
// durable: an approval rejection that exists only in CLI output
// never happened. Every approval outcome is appended to an
// append-only, hash-chained planning-layer record
// (.synth/data/decisions.jsonl), persisted through the Environment
// Layer filesystem provider and certified at read.
//
// The canonical event log is execution state and stays behind
// ExecutionGate; decisions about planning artifacts are planning
// state (see the EXP-TRUST-004 constitutional note).
// ============================================================

import type { FilesystemProvider } from "../infra/filesystem-provider.js"
import { createPosixFilesystemProvider } from "../infra/filesystem-provider.js"
import { canonicalHash } from "./canonical-json.js"

const RECORD_SCHEMA = "synth-decision-v1"
const DECISIONS_FILE = "decisions.jsonl"

export type MissionDecisionType =
  | "MISSION_APPROVAL_APPROVED"
  | "MISSION_APPROVAL_REJECTED"
  | "MISSION_DRAFT_INTEGRITY_REJECTED"

export type MissionDecision = {
  schema: typeof RECORD_SCHEMA
  id: string
  type: MissionDecisionType
  draftId: string
  reason?: string
  confidence?: number
  snapshotId?: string
  previousHash: string
  timestamp: number
}

export type DecisionInput = {
  type: MissionDecisionType
  draftId: string
  reason?: string
  confidence?: number
  snapshotId?: string
}

export type DecisionLogRead = {
  records: MissionDecision[]
  chainValid: boolean
}

/** Chain hash of a decision's content (timestamp excluded). */
function hashDecision(decision: MissionDecision): string {
  return canonicalHash({
    schema: decision.schema,
    id: decision.id,
    type: decision.type,
    draftId: decision.draftId,
    reason: decision.reason,
    confidence: decision.confidence,
    snapshotId: decision.snapshotId,
    previousHash: decision.previousHash,
  })
}

async function readRaw(fs: FilesystemProvider): Promise<MissionDecision[]> {
  const content = await fs.readFile(DECISIONS_FILE)
  if (content === undefined) return []
  const records: MissionDecision[] = []
  for (const line of content.split("\n")) {
    if (!line.trim()) continue
    try {
      const raw = JSON.parse(line) as MissionDecision
      if (raw.schema === RECORD_SCHEMA && typeof raw.draftId === "string") {
        records.push(raw)
      }
    } catch {
      // Unparseable lines are surfaced as a broken chain at verify time.
      return records
    }
  }
  return records
}

/**
 * Verify chain continuity: exactly one genesis record, one successor
 * per record, and every record reachable from genesis.
 */
export function verifyDecisionChain(records: MissionDecision[]): boolean {
  if (records.length === 0) return true
  const genesis = records.filter((r) => r.previousHash === "genesis")
  if (genesis.length !== 1) return false

  const byPrevious = new Map<string, MissionDecision[]>()
  for (const r of records) {
    const list = byPrevious.get(r.previousHash) ?? []
    list.push(r)
    byPrevious.set(r.previousHash, list)
  }
  for (const list of byPrevious.values()) {
    if (list.length > 1) return false
  }

  let seen = 0
  let current: MissionDecision | undefined = genesis[0]
  while (current) {
    seen++
    current = byPrevious.get(hashDecision(current))?.[0]
  }
  return seen === records.length
}

/**
 * Append a decision to the record. Fails closed: a broken chain is
 * never extended silently.
 */
export async function appendDecision(
  dataDir: string,
  input: DecisionInput,
  fsProvider?: FilesystemProvider,
): Promise<MissionDecision> {
  const fs = fsProvider ?? createPosixFilesystemProvider(dataDir)
  const records = await readRaw(fs)
  if (!verifyDecisionChain(records)) {
    throw new Error(
      "Mission decision record chain is broken: a recorded decision is missing, altered, or duplicated. " +
        "Inspect .synth/data/decisions.jsonl; the record is tamper-evident by design.",
    )
  }

  const timestamp = Date.now()
  const id = canonicalHash({
    type: input.type,
    draftId: input.draftId,
    reason: input.reason,
    confidence: input.confidence,
    snapshotId: input.snapshotId,
    timestamp,
  })
  const previous = records[records.length - 1]
  const decision: MissionDecision = {
    schema: RECORD_SCHEMA,
    id,
    type: input.type,
    draftId: input.draftId,
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(input.confidence !== undefined ? { confidence: input.confidence } : {}),
    ...(input.snapshotId !== undefined ? { snapshotId: input.snapshotId } : {}),
    previousHash: previous ? hashDecision(previous) : "genesis",
    timestamp,
  }

  const existing = (await fs.readFile(DECISIONS_FILE)) ?? ""
  await fs.writeFile(DECISIONS_FILE, `${existing}${JSON.stringify(decision)}\n`)
  return decision
}

/** Read the record, optionally filtered to one draft. */
export async function listDecisions(
  dataDir: string,
  draftId?: string,
  fsProvider?: FilesystemProvider,
): Promise<DecisionLogRead> {
  const fs = fsProvider ?? createPosixFilesystemProvider(dataDir)
  const all = await readRaw(fs)
  return {
    records: draftId ? all.filter((d) => d.draftId === draftId) : all,
    chainValid: verifyDecisionChain(all),
  }
}

/** Latest decision of a type for a draft, or undefined. */
export async function latestDecision(
  dataDir: string,
  draftId: string,
  type: MissionDecisionType,
  fsProvider?: FilesystemProvider,
): Promise<MissionDecision | undefined> {
  const { records } = await listDecisions(dataDir, draftId, fsProvider)
  const matches = records.filter((d) => d.type === type)
  return matches[matches.length - 1]
}
