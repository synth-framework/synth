#!/usr/bin/env node
// ============================================================
// SYNTH: Replay Verification (Layer 4)
// ============================================================
// Standalone replay witness.
//
// Reads the immutable event log, verifies the hash-chain, replays all
// events through the canonical replay engine, and compares the result
// against the persisted operational state.
//
// Exit 0 = replay consistent
// Exit 1 = divergence detected
// ============================================================

import { bootstrap } from "../dist/core/bootstrap.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import { rebuildState } from "../dist/runtime/replay.js"

async function main() {
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

  console.log("\n═══════════════════════════════════════════════════")
  console.log("  ✅ Replay verification PASSED")
  console.log("═══════════════════════════════════════════════════\n")
}

main().catch((err) => {
  console.error("\n  ❌ FATAL:", err.message)
  process.exit(1)
})
