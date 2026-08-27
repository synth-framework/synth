// ============================================================
// CLI: Explain Governance (EXP-GOV-002)
// ============================================================
// Renders the Governance Record lineage derived from replay.
//
// Usage:
//   synth explain governance [--json]
// ============================================================

import path from "path"
import * as sdk from "../sdk/index.js"
import { deriveGovernanceRecords } from "../core/governance-record-projection.js"
import type { GovernanceRecordLineage } from "../types/governance-record.js"
import type { SynthEvent } from "../types/index.js"
import { ensureDataDir, eventsDir } from "../sdk/paths/index.js"
import { root } from "../sdk/workspace/index.js"
import { printJson, printError } from "./print.js"

async function readEventLogFromPath(logPath: string): Promise<Record<string, unknown>[]> {
  const text = await sdk.files.readFileMaybe(logPath)
  if (text === undefined) return []
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
}

/**
 * CLI handler for `synth explain governance`.
 */
export async function cmdExplainGovernance(flags: Record<string, string | boolean>): Promise<void> {
  const logFlag = flags.log
  if (logFlag !== undefined && typeof logFlag !== "string") {
    printError("--log requires a path")
  }

  const cwd = root()
  await ensureDataDir(cwd)
  const defaultLogPath = eventsDir(cwd)
  const logPath = logFlag ? path.resolve(cwd, logFlag) : defaultLogPath

  let events: SynthEvent[]
  if (logFlag) {
    events = (await readEventLogFromPath(logPath)) as SynthEvent[]
  } else {
    events = await sdk.events.readEvents(cwd)
  }

  const lineage = deriveGovernanceRecords(events)

  printJson(lineage)
}

