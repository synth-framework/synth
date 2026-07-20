// ============================================================
// CLI: Explain Governance (EXP-GOV-002)
// ============================================================
// Renders the Governance Record lineage derived from replay.
//
// Usage:
//   synth explain governance [--json]
// ============================================================

import fs from "fs/promises"
import path from "path"
import { deriveGovernanceRecords } from "../core/governance-record-projection.js"
import type { GovernanceRecordLineage } from "../types/governance-record.js"
import { ensureRuntimeDataDir } from "../infra/paths.js"
import { getRuntimeDataDir } from "../infra/paths.js"

function printJson(obj: unknown) {
  console.log(JSON.stringify(obj, null, 2))
}

function fail(error: string): never {
  printJson({ status: "error", error })
  process.exit(1)
}

async function readEventLog(logPath: string) {
  try {
    const text = await fs.readFile(logPath, "utf-8")
    return text
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

/**
 * CLI handler for `synth explain governance`.
 */
export async function cmdExplainGovernance(flags: Record<string, string | boolean>): Promise<void> {
  const logFlag = flags.log
  if (logFlag !== undefined && typeof logFlag !== "string") {
    fail("--log requires a path")
  }

  const cwd = process.cwd()
  await ensureRuntimeDataDir(cwd)
  const dataDir = getRuntimeDataDir(cwd)
  const defaultLogPath = path.join(dataDir, "event-log.jsonl")
  const logPath = logFlag ? path.resolve(cwd, logFlag) : defaultLogPath

  if (!(await fs.access(logPath).then(() => true).catch(() => false))) {
    fail(`event log not found: ${logFlag ?? path.relative(cwd, defaultLogPath)}`)
  }

  const events = await readEventLog(logPath)
  const lineage = deriveGovernanceRecords(events)

  printJson(lineage)
}

