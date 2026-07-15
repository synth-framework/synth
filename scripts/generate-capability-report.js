#!/usr/bin/env node
// ============================================================
// SYNTH: Capability Report Generator
// ============================================================
// Runs environment discovery and prints the agent-facing
// Capability Report (ADR-016). AI agents use this report to
// plan against discovered capabilities rather than assumed ones.
//
// Usage:
//   node scripts/generate-capability-report.js          markdown
//   node scripts/generate-capability-report.js --json   machine format
// ============================================================

import {
  createDiscoveryOrchestrator,
  createNodeObservationContext,
  createReferenceProviders,
  buildCapabilityReport,
  renderCapabilityReportMarkdown,
} from "../dist/environment/index.js"

async function main() {
  const asJson = process.argv.includes("--json")

  const ctx = createNodeObservationContext(process.cwd())
  const orchestrator = createDiscoveryOrchestrator({ providers: createReferenceProviders() })
  const { evidence } = await orchestrator.discover(ctx)
  const report = buildCapabilityReport(evidence)

  if (asJson) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(renderCapabilityReportMarkdown(report))
  }
}

main().catch((err) => {
  console.error("❌ FATAL:", err.message)
  process.exit(1)
})
