// EXP-CLI-003: extracted from synth.ts; handler behavior is unchanged.

import { createReplayVerifier } from "../core/replay-verifier.js"
import { locateEventLog } from "../infra/event-store.js"
import * as sdk from "../sdk/index.js"


export type DoctorCheckResult = { ok: boolean; detail: string; nextStep?: string }


export async function verifyReplayHealth(): Promise<DoctorCheckResult> {
  try {
    const root = sdk.workspace.root()
    await sdk.paths.ensureDataDir(root)
    // One authority for "is there a log, and where". Testing only the legacy
    // monolithic path made this report "No event log present; replay skipped"
    // for a ledger whose events live in the chunked event-stream store - an
    // ok:true that certified nothing while 448 events went unexamined.
    const located = locateEventLog(root)
    if (!located.present) {
      return { ok: true, detail: "No event log present; replay skipped" }
    }
    const ctx = await (await import("../core/bootstrap.js")).bootstrap({
      skipGenesis: true,
      infra: {
        persistence: "file",
        eventLogPath: sdk.paths.eventLogFile(root),
        statePath: sdk.paths.stateFile(root),
        checkpointPath: sdk.paths.checkpointsFile(root),
      },
    })
    const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
    const result = await verifier.verify()
    return {
      ok: result.consistent,
      detail: result.consistent
        ? `Event log consistent (${result.eventCount} events, ${located.layout} layout)`
        : `Replay inconsistent: ${result.explanation}`,
      ...(result.consistent ? {} : { nextStep: "Run 'synth explain replay' to diagnose the inconsistency, then repair or replay from a known-good snapshot." }),
    }
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      nextStep: "Ensure the project is initialized and the event log is readable.",
    }
  }
}
