// ============================================================
// CLI: synth verify signatures
// ============================================================
// Verify event-log signatures and Merkle roots against the project's
// committed public key. Emits a structured SignatureVerificationReport.
// ============================================================

import { EventStore } from "../infra/event-store.js"
import { verifyEventLogSignatures } from "../signing/index.js"
import { printJson } from "./print.js"

export async function cmdVerifySignatures(): Promise<void> {
  const eventStore = new EventStore()
  const events = await eventStore.loadAll()
  const report = await verifyEventLogSignatures(events)
  printJson(report)
  if (report.status === "INVALID" || report.status === "KEY_UNKNOWN") {
    process.exit(1)
  }
}
