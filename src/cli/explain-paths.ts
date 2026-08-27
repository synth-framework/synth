// SYNTH-LOADER-003: bootstrap-free explain path resolution.
//
// `explain replay` needs to resolve the event-log / state / checkpoint paths
// for a given invocation (default project log, or an arbitrary `--log`). This
// is pure SDK path math with no bootstrap, so it lives outside
// explain-observability.ts (which imports core/bootstrap.js) to keep the thin
// entrypoint's light `explain replay` path bootstrap-free.
import path from "path"
import fs from "fs"
import { root } from "../sdk/workspace/index.js"
import {
  dataDir,
  eventsDir,
  stateFile,
  checkpointsFile,
  snapshotsDir,
} from "../sdk/paths/index.js"
import { printError } from "./print.js"

export type ExplainPaths = {
  logPath: string
  streamDir: string
  eventLogFile?: string
  logDisplay: string
  logDir: string
  statePath: string
  checkpointPath: string
  snapshotsDir: string
}

const DEFAULT_LOG_DISPLAY = path.posix.join(
  path.relative(root(), dataDir(root())).replace(/\\/g, "/") || ".",
  "event-stream",
)

export function resolveExplainPaths(flags: Record<string, string | boolean>): ExplainPaths {
  const logFlag = flags.log
  if (logFlag !== undefined && typeof logFlag !== "string") {
    printError("--log requires a path")
  }
  const cwd = process.cwd()
  if (logFlag) {
    const logPath = path.resolve(cwd, logFlag)
    const logDir = path.dirname(logPath)
    let isFile = false
    try {
      isFile = fs.statSync(logPath).isFile()
    } catch {
      isFile = false
    }
    if (isFile) {
      // An explicitly-named standalone log file (e.g. an evidence archive).
      // Read it directly; no monolithic canonical migration is performed.
      return {
        logPath,
        streamDir: logDir,
        eventLogFile: logPath,
        logDisplay: logFlag,
        logDir,
        statePath: path.join(logDir, "canonical-state.json"),
        checkpointPath: path.join(logDir, "checkpoint.json"),
        snapshotsDir: path.join(logDir, "snapshots"),
      }
    }
    // A directory is treated as the event-stream directory itself.
    return {
      logPath,
      streamDir: logPath,
      logDisplay: logFlag,
      logDir,
      statePath: path.join(logDir, "canonical-state.json"),
      checkpointPath: path.join(logDir, "checkpoint.json"),
      snapshotsDir: path.join(logDir, "snapshots"),
    }
  }

  const projectRoot = root()
  const streamDir = eventsDir(projectRoot)
  return {
    logPath: streamDir,
    streamDir,
    logDisplay: DEFAULT_LOG_DISPLAY,
    logDir: dataDir(projectRoot),
    statePath: stateFile(projectRoot),
    checkpointPath: checkpointsFile(projectRoot),
    snapshotsDir: snapshotsDir(projectRoot),
  }
}
