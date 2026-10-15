// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import path from "path"
import * as sdk from "../sdk/index.js"
import type { PlanningObservation } from "../planning/observation.js"
import type { PlanningSession } from "../mission-studio/types.js"
import { markCeremony, flushPendingCeremony } from "./auto-commit-ceremony.js"
import type { LedgerCommitInfo } from "./auto-commit-ceremony.js"


/**
 * Commit an intake ceremony (draft creation/update, artifact retirement) that
 * has no capability to hang a choke-point commit on. Loud on refusal, exactly
 * like the capability path.
 */
export async function commitDraftCeremony(transition: string, entityId?: string): Promise<LedgerCommitInfo | undefined> {
  markCeremony(transition, entityId)
  return flushPendingCeremony()
}

export function parseTokenList(value: string | boolean | undefined): string[] {
  if (typeof value !== "string" || value.length === 0) return []
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
}


export function makeObservation(
  type: string,
  subject: string,
  timestamp: number,
  overrides: Record<string, unknown> = {}
): PlanningObservation {
  return {
    id: `obs-${type}-${subject.toLowerCase().replace(/\s+/g, "-")}`,
    sourceAdapter: "synth-cli",
    type: type as any,
    payload: { subject, name: subject, ...overrides },
    evidenceReference: `evidence-${type}-${subject}`,
    confidence: "high",
    timestamp,
  }
}


export function serializePlanningSession(session: PlanningSession): any {
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


export async function ensureDraftsDir(): Promise<string> {
  const dataDir = await sdk.paths.ensureDataDir(sdk.workspace.root())
  const draftsDir = path.join(dataDir, "drafts")
  await fs.mkdir(draftsDir, { recursive: true })
  return draftsDir
}
