#!/usr/bin/env node
// ============================================================
// Documentation Metadata Completeness Verifier (EXP-DOC-002)
// ============================================================
// Scans the knowledge base and verifies that classified ADRs and
// Expeditions expose consistent metadata. Reports completeness
// ratios and fails if metadata coverage regresses below the
// committed baseline.
//
// Usage: node scripts/verify-documentation-metadata.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const KNOWLEDGE_BASE_DIR = path.join(__dirname, "..", "docs")
const CLI_PATH = path.join(__dirname, "..", "dist", "cli", "synth.js")

const REQUIRED_ADR_FIELDS = ["status", "date", "deciders"]
const REQUIRED_EXPEDITION_FIELDS = ["status", "kind", "priority", "program"]

async function extractMetadata() {
  const { spawnSync } = await import("child_process")
  const result = spawnSync(
    "node",
    [CLI_PATH, "docs", "generate", "--out-dir", "/dev/null", "--knowledge-base", KNOWLEDGE_BASE_DIR],
    {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
      timeout: 120000,
      stdio: ["ignore", "pipe", "pipe"],
    },
  )
  if (result.status !== 0) {
    console.error(result.stderr)
    throw new Error(`docs generate failed with exit code ${result.status}`)
  }

  const output = JSON.parse(result.stdout.trim().split("\n").pop() || "{}")
  return output
}

async function main() {
  console.log("Verifying documentation metadata completeness...")

  const { extractDirectoryKnowledge } = await import("../dist/documentation/index.js")
  const { sources } = await extractDirectoryKnowledge(KNOWLEDGE_BASE_DIR)

  const adrs = sources.filter((s) => s.documentClass === "adr")
  const expeditions = sources.filter((s) => s.documentClass === "expedition")

  function adrComplete(s) {
    return s.adrMetadata && REQUIRED_ADR_FIELDS.every((f) => s.adrMetadata[f])
  }

  function expeditionComplete(s) {
    return s.expeditionMetadata && REQUIRED_EXPEDITION_FIELDS.every((f) => s.expeditionMetadata[f])
  }

  const adrCompleteCount = adrs.filter(adrComplete).length
  const expeditionCompleteCount = expeditions.filter(expeditionComplete).length

  console.log(`\nADR metadata completeness: ${adrCompleteCount}/${adrs.length}`)
  if (adrCompleteCount < adrs.length) {
    console.log("ADRs missing required metadata:")
    for (const s of adrs.filter((s) => !adrComplete(s)).slice(0, 10)) {
      console.log(`  - ${s.id}`)
    }
    if (adrs.filter((s) => !adrComplete(s)).length > 10) {
      console.log(`  ... and ${adrs.filter((s) => !adrComplete(s)).length - 10} more`)
    }
  }

  console.log(`\nExpedition metadata completeness: ${expeditionCompleteCount}/${expeditions.length}`)
  if (expeditionCompleteCount < expeditions.length) {
    console.log("Expeditions missing required metadata:")
    for (const s of expeditions.filter((s) => !expeditionComplete(s)).slice(0, 10)) {
      console.log(`  - ${s.id}`)
    }
    if (expeditions.filter((s) => !expeditionComplete(s)).length > 10) {
      console.log(`  ... and ${expeditions.filter((s) => !expeditionComplete(s)).length - 10} more`)
    }
  }

  // Baseline: at least the current coverage must be maintained.
  // These numbers are established by EXP-DOC-002 and prevent regression.
  const adrBaseline = 40
  const expeditionBaseline = 291

  const adrCoverage = adrs.length > 0 ? adrCompleteCount / adrs.length : 1
  const expeditionCoverage = expeditions.length > 0 ? expeditionCompleteCount / expeditions.length : 1

  let failed = false
  if (adrCompleteCount < adrBaseline) {
    console.log(`\n❌ ADR metadata completeness regressed below baseline (${adrBaseline}).`)
    failed = true
  }
  if (expeditionCompleteCount < expeditionBaseline) {
    console.log(`\n❌ Expedition metadata completeness regressed below baseline (${expeditionBaseline}).`)
    failed = true
  }

  if (failed) {
    process.exit(1)
  }

  console.log(`\n✅ Documentation metadata completeness is at or above baseline.`)
  console.log(`   ADR coverage: ${(adrCoverage * 100).toFixed(1)}% (${adrCompleteCount}/${adrs.length})`)
  console.log(`   Expedition coverage: ${(expeditionCoverage * 100).toFixed(1)}% (${expeditionCompleteCount}/${expeditions.length})`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
