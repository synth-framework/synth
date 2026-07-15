#!/usr/bin/env node
// ============================================================
// SYNTH: First Contact Archive Repair
// ============================================================
// Regenerates the replay report for the canonical First Contact
// evidence archive from its immutable event log.
//
// The archived replay-report.json was truncated (2 bytes) at
// creation time because the archive was assembled without a
// reproducible producer. The 32-event log is intact, so the
// report is re-derived deterministically through the frozen
// Replay engine — the same derivation the projection generator
// uses to validate the archive.
//
// Usage:
//   node scripts/repair-first-contact-archive.js
// ============================================================

import fs from "fs/promises"
import path from "path"
import { EventStore } from "../dist/infra/event-store.js"
import { InMemoryStateStore } from "../dist/infra/state-store.js"
import { createReplayVerifier } from "../dist/core/replay-verifier.js"
import { rebuildState } from "../dist/runtime/replay.js"

export const FIRST_CONTACT_ARCHIVE = path.join(
  process.cwd(),
  "examples",
  "first-contact",
  "recorded-journey",
  "evidence-archive",
)

/** Re-derive the replay report from the archived event log. */
export async function deriveReplayReport(archiveDir = FIRST_CONTACT_ARCHIVE) {
  const eventsPath = path.join(archiveDir, "events.jsonl")
  const eventStore = new EventStore(eventsPath)
  const events = await eventStore.loadAll()

  // The operational state is the state this event history produces;
  // saving it lets the verifier deep-diff live vs replayed projections.
  const stateStore = new InMemoryStateStore()
  await stateStore.save(rebuildState(events))

  const verifier = createReplayVerifier(eventStore, stateStore)
  return verifier.verify()
}

async function main() {
  const report = await deriveReplayReport()
  const reportPath = path.join(FIRST_CONTACT_ARCHIVE, "replay-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf-8")

  console.log("First Contact archive repair complete:")
  console.log(`  Events:     ${report.eventCount}`)
  console.log(`  Chain:      ${report.chainValid ? "valid" : "INVALID"}`)
  console.log(`  Consistent: ${report.consistent}`)
  console.log(`  Written:    ${reportPath}`)

  if (!report.consistent) {
    console.error("❌ Replay verification is not consistent; inspect divergences in the report.")
    process.exit(1)
  }
  console.log("✅ Replay report regenerated and consistent.")
}

const isMain = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`
if (isMain) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
