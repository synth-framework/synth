#!/usr/bin/env node
// ============================================================
// SYNTH: Replay Verification (Layer 4)
// ============================================================
// Standalone replay witness.
//
// Reads the immutable event log, verifies the hash-chain, replays all
// events through the canonical replay engine, and compares the result
// against the persisted operational state. Also validates the aggregate
// graph of the log and post-replay navigation (EXP-HARDEN-004).
//
// Exit 0 = replay consistent (graph violations are reported as warnings)
// Exit 1 = divergence detected, or graph violations with --strict-graph
//
// Flags:
//   --strict-graph   fail loudly when the aggregate graph is invalid
// ============================================================

import { bootstrap } from "../dist/core/bootstrap.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import { rebuildState } from "../dist/runtime/replay.js"

async function main() {
  const strictGraph = process.argv.includes("--strict-graph")

  console.log("\n═══════════════════════════════════════════════════")
  console.log("  SYNTH: Replay Verification (Layer 4)")
  console.log("═══════════════════════════════════════════════════\n")

  const ctx = await bootstrap({
    infra: { persistence: "file" },
    skipGenesis: true,
  })

  const events = await ctx.infra.eventStore.loadAll()
  const replayed = rebuildState(events)
  const verifier = createReplayVerifier(ctx.infra.eventStore, ctx.infra.stateStore)
  const result = await verifier.verify()

  console.log(`  Events:           ${result.eventCount}`)
  console.log(`  Chain valid:      ${result.chainValid ? "✅" : "❌"}`)
  console.log(`  Operational hash: ${result.liveHash ?? "none"}`)
  console.log(`  Replay hash:      ${result.replayHash}`)
  console.log(`  Consistent:       ${result.consistent ? "✅ PASS" : "❌ FAIL"}`)
  console.log(`  Graph valid:      ${result.graphValid ? "✅" : `⚠️  ${result.graphViolations.length} violation(s)`}`)

  if (result.graphViolations.length > 0) {
    console.log(`\n  Graph violations (reported as ${strictGraph ? "errors" : "warnings"}):`)
    for (const v of result.graphViolations.slice(0, 10)) {
      console.log(`    - [${v.kind}] ${v.message}`)
    }
    if (result.graphViolations.length > 10) {
      console.log(`    ... and ${result.graphViolations.length - 10} more`)
    }
  }

  if (!result.consistent) {
    console.log(`\n  Explanation: ${result.explanation}`)
    if (result.divergences.length > 0) {
      console.log("\n  Divergences:")
      for (const d of result.divergences.slice(0, 10)) {
        console.log(`    - ${d.key}`)
        console.log(`      live:     ${JSON.stringify(d.live).slice(0, 120)}`)
        console.log(`      replayed: ${JSON.stringify(d.replayed).slice(0, 120)}`)
      }
      if (result.divergences.length > 10) {
        console.log(`    ... and ${result.divergences.length - 10} more`)
      }
    }
    console.log("\n═══════════════════════════════════════════════════")
    console.log("  ❌ Replay verification FAILED")
    console.log("═══════════════════════════════════════════════════\n")
    process.exit(1)
  }

  // Projection summary
  console.log("\n  Projections:")
  console.log(`    WorkItems:   ${Object.keys(replayed.workItems).length}`)
  console.log(`    Plans:       ${Object.keys(replayed.plans).length}`)
  console.log(`    Milestones:  ${Object.keys(replayed.milestones).length}`)
  console.log(`    Projects:    ${Object.keys(replayed.projects).length}`)
  console.log(`    Missions:    ${Object.keys(replayed.missions).length}`)
  console.log(`    Expeditions: ${Object.keys(replayed.expeditions).length}`)
  console.log(`    Objectives:  ${Object.keys(replayed.objectives).length}`)
  console.log(`    Discoveries: ${Object.keys(replayed.discoveries).length}`)
  console.log(`    Decisions:   ${Object.keys(replayed.decisions).length}`)

  if (strictGraph && !result.graphValid) {
    console.log("\n═══════════════════════════════════════════════════")
    console.log("  ❌ Replay graph verification FAILED (--strict-graph)")
    console.log("═══════════════════════════════════════════════════\n")
    process.exit(1)
  }

  console.log("\n═══════════════════════════════════════════════════")
  console.log("  ✅ Replay verification PASSED")
  console.log("═══════════════════════════════════════════════════\n")
}

main().catch((err) => {
  console.error("\n  ❌ FATAL:", err.message)
  process.exit(1)
})
