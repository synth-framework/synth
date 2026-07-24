// ============================================================
// CLI: synth verify
// ============================================================
// Executable governance invariant verification. Emits a structured
// VerificationReport and exits non-zero when any check fails.
// ============================================================

import { runVerification } from "../verification/engine.js"
import { printJson } from "./print.js"

export async function cmdVerify(): Promise<void> {
  const report = await runVerification(process.cwd())
  printJson(report)
  if (report.status === "error") {
    process.exit(1)
  }
}
