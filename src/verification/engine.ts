// ============================================================
// VERIFICATION ENGINE: Orchestrator
// ============================================================
// Runs all checks and produces a structured, machine-parseable report
// with prescriptive next steps.
// ============================================================

import { buildVerificationContext } from "./context.js"
import { ALL_CHECKS } from "./checks.js"
import type { VerificationReport, VerificationCheckResult } from "./types.js"

const REPORT_VERSION = 1

function findNextStep(results: VerificationCheckResult[]): string | null {
  for (const check of results) {
    if (check.status === "fail" || check.status === "warn") {
      for (const v of check.violations) {
        if (v.nextStep) return v.nextStep
      }
    }
  }
  return null
}

export async function runVerification(cwd: string): Promise<VerificationReport> {
  const ctx = await buildVerificationContext(cwd)

  // Replay is foundational: run once and share with every check.
  if (ctx.hasEventLog) {
    try {
      ctx.replayResult = await ctx.verifier.verify()
    } catch {
      ctx.replayResult = undefined
    }
  }

  const checks: VerificationCheckResult[] = []
  for (const check of ALL_CHECKS) {
    try {
      checks.push(await check(ctx))
    } catch (err) {
      checks.push({
        name: check.name || "UnknownCheck",
        status: "fail",
        message: `Check crashed: ${err instanceof Error ? err.message : String(err)}`,
        violations: [
          {
            message: `Unexpected error during verification: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
      })
    }
  }

  const summary = {
    total: checks.length,
    pass: checks.filter((c) => c.status === "pass").length,
    fail: checks.filter((c) => c.status === "fail").length,
    warn: checks.filter((c) => c.status === "warn").length,
  }

  const hasFailure = checks.some((c) => c.status === "fail")

  return {
    status: hasFailure ? "error" : "ok",
    kind: "VerificationReport",
    version: REPORT_VERSION,
    summary,
    checks,
    nextStep: findNextStep(checks),
  }
}
