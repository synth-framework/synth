// SYNTH-LOADER-003: bootstrap-free explain path resolution.
//
// `explain replay` needs to resolve the event-log / state / checkpoint paths
// for a given invocation (default project log, or an arbitrary `--log`). This
// is pure SDK path math with no bootstrap, so it lives outside
// explain-observability.ts (which imports core/bootstrap.js) to keep the thin
// entrypoint's light `explain replay` path bootstrap-free.
import path from "path"
import { root } from "../sdk/workspace/index.js"
import {
  dataDir,
  eventLogFile,
  stateFile,
  checkpointsFile,
  snapshotsDir,
} from "../sdk/paths/index.js"
import { printError } from "./print.js"

export type ExplainPaths = {
  logPath: string
  legacyLogPath: string
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
    return {
      logPath,
      legacyLogPath: logPath,
      logDisplay: logFlag,
      logDir,
      statePath: path.join(logDir, "canonical-state.json"),
      checkpointPath: path.join(logDir, "checkpoint.json"),
      snapshotsDir: path.join(logDir, "snapshots"),
    }
  }

  const projectRoot = root()
  return {
    // The canonical event-log path is the store's entry point; the partitioned
    // store routes it to event-stream internally. Pointing this at the
    // event-stream directory directly breaks the partition routing.
    logPath: eventLogFile(projectRoot),
    legacyLogPath: eventLogFile(projectRoot),
    logDisplay: DEFAULT_LOG_DISPLAY,
    logDir: dataDir(projectRoot),
    statePath: stateFile(projectRoot),
    checkpointPath: checkpointsFile(projectRoot),
    snapshotsDir: snapshotsDir(projectRoot),
  }
}
