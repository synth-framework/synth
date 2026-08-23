// SYNTH-LOADER-003: light `explain replay` handler.
//
// Serves `synth explain replay` WITHOUT importing the heavy synth.js graph or
// running the 13-step bootstrap. It builds the event/state stores directly via
// createInfra and verifies replay consistency with createReplayVerifier — the
// only two pieces `explain replay` actually needs.
import fs from "fs/promises"
import * as sdk from "../sdk/index.js"
import { createInfra } from "../infra/index.js"
import { createReplayVerifier } from "../core/replay-verifier.js"
import { resolveExplainPaths } from "./explain-paths.js"
import { printJson, printError } from "./print.js"

// Minimal flag parser for `explain replay`, mirroring the CLI's raw-arg parser
// for the only flag replay cares about (--log[=path]).
export function parseReplayFlags(argv: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith("--log")) {
      const eq = arg.split("=")
      if (eq[1] !== undefined) {
        flags.log = eq[1]
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        flags.log = argv[i + 1]
        i++
      } else {
        flags.log = true
      }
    }
  }
  return flags
}

export async function runExplainReplay(flags: Record<string, string | boolean>): Promise<void> {
  await sdk.paths.ensureDataDir(sdk.workspace.root())
  const paths = resolveExplainPaths(flags)
  if (typeof flags.log === "string") {
    try {
      await fs.access(paths.logPath)
    } catch {
      printError(`event log not found: ${flags.log}`)
    }
  }

  const ctx = await createInfra({
    persistence: "file",
    eventLogPath: paths.logPath,
    statePath: paths.statePath,
    checkpointPath: paths.checkpointPath,
  })

  const verifier = createReplayVerifier(ctx.eventStore, ctx.stateStore)
  const replayResult = await verifier.verify()

  printJson({
    status: replayResult.consistent ? "ok" : "error",
    consistent: replayResult.consistent,
    eventCount: replayResult.eventCount,
    liveHash: replayResult.liveHash,
    replayHash: replayResult.replayHash,
    chainValid: replayResult.chainValid,
    explanation: replayResult.explanation,
  })
}
