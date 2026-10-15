// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.
import fs from "fs/promises"
import { bootstrap } from "../core/bootstrap.js"
import { createReplayVerifier } from "../core/replay-verifier.js"
import { printJson, printError } from "./print.js"
import { resolveExplainPaths } from "./explain-paths.js"
import { isExplainSub, EXPLAIN_USAGE, callExplainHandler } from "./verb-registry.js"
import * as sdk from "../sdk/index.js"
import { namespaceHelp } from "./command-help.js"


export async function cmdExplainHelp() {
  printJson(namespaceHelp("explain", "Explain operations — replay, lineage, proposals, snapshots, graph, diagnostics, status, identity, resume, governance, all", [
    { name: "synth explain replay", description: "Verify replay consistency between event log and current state" },
    { name: "synth explain lineage", description: "Project → Mission → Expedition → Objective tree with broken parents" },
    { name: "synth explain proposals", description: "Proposal → observations/evidence from snapshot store" },
    { name: "synth explain snapshots", description: "Snapshot version history and parents" },
    { name: "synth explain graph", description: "Aggregate graph with per-node status and violation markers" },
    { name: "synth explain diagnostics", description: "Relationship diagnostics with violation rollup and replay attribution" },
    { name: "synth explain status", description: "Validation dashboard with one verdict" },
    { name: "synth explain identity", description: "Repository identity projection from replayable evidence" },
    { name: "synth explain resume", description: "What happened, what was decided, what is next" },
    { name: "synth explain governance", description: "Governance Record lineage derived from replay" },
    { name: "synth explain agents", description: "Comprehensive machine-readable guide for AI agents operating SYNTH" },
    { name: "synth explain all", description: "Umbrella report with every section above" },
  ], { note: "Every explain subcommand is read-only. Use --log <path> to inspect an alternative project log. Use --json for machine output. Use --markdown with synth explain agents for prose output." }))
}


export async function cmdExplainReplay(flags: Record<string, string | boolean>) {
  // Ensure runtime data is in `.synth/data/` for governed projects before
  // inspecting any project-local log.
  await sdk.paths.ensureDataDir(sdk.workspace.root())

  // --log <path> (EXP-HARDEN-007): inspect any example/project log;
  // state/checkpoint paths derive from the log's directory.
  const paths = resolveExplainPaths(flags)
  if (typeof flags.log === "string") {
    try {
      await fs.access(paths.logPath)
    } catch {
      printError(`event log not found: ${flags.log}`)
    }
  }
  const ctx = await bootstrap({
    skipGenesis: true,
    infra: {
      persistence: "file",
      streamDir: paths.streamDir,
      eventLogFile: paths.eventLogFile,
      statePath: paths.statePath,
      checkpointPath: paths.checkpointPath,
      readOnly: true,
    },
  })

  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
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

export async function run(positional: string[], flags: Record<string, string | boolean>): Promise<void> {

  const sub = positional[1]
  // The valid-sub list, the usage text and every handler module live in
  // verb-registry.ts, shared with the light dispatcher in entry.ts.
  if (!isExplainSub(sub)) {
    printError(EXPLAIN_USAGE)
  } else if (sub === "replay") {
    // Preserve the compatibility CLI's bootstrap-backed replay path.
    await cmdExplainReplay(flags)
  } else {
    await callExplainHandler(sub, flags)
  }
}
