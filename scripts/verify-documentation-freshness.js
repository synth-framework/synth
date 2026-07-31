#!/usr/bin/env node
// ============================================================
// Documentation Freshness Verifier (EXP-DOC-002, EXP-GUARD-002)
// ============================================================
// Regenerates all projections twice and compares the two runs.
// Exits with code 0 if generation succeeds and the output is
// deterministic, code 1 if any projection is missing or differs.
//
// Generated documentation is a derived artifact and is no longer
// tracked in version control (see EXP-GUARD-002). Freshness is
// therefore verified by reproducibility, not by comparison with
// committed blobs.
//
// Usage: node scripts/verify-documentation-freshness.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import os from "os"

const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), "docs")
const CLI_PATH = path.join(process.cwd(), "dist", "cli", "synth.js")

const REQUIRED_PROJECTIONS = [
  "README.md",
  "ARCHITECTURE.md",
  "API.md",
  "OPERATOR_GUIDE.md",
  "DEVELOPER_GUIDE.md",
  "ARCHITECT_GUIDE.md",
  "AI_CONTEXT.md",
]

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else {
      yield full
    }
  }
}

async function readDirFiles(dir) {
  const files = {}
  try {
    await fs.access(dir)
  } catch {
    return files
  }
  for await (const file of walk(dir)) {
    const relative = path.relative(dir, file)
    files[relative] = await fs.readFile(file, "utf-8")
  }
  return files
}

async function runProjection(outputDir) {
  const { spawnSync } = await import("child_process")
  // Source links in docs/generated use the prefix ".." (one level up from
  // docs/generated to docs). Regenerate with the same prefix so content
  // comparisons are not polluted by path differences.
  const linkPrefix = ".."
  const result = spawnSync(
    "node",
    [CLI_PATH, "docs", "generate", "--out-dir", outputDir, "--knowledge-base", KNOWLEDGE_BASE_DIR, "--link-prefix", linkPrefix],
    {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 120000,
    },
  )
  if (result.status !== 0) {
    console.error(result.stderr)
    throw new Error(`docs generate failed with exit code ${result.status}`)
  }
}

function extractSourceStateHash(content) {
  const match = content.match(/sourceStateHash:\s*([a-f0-9]+)/)
  return match ? match[1] : null
}

/**
 * Normalize provenance metadata for comparison.
 *
 * `computedAt` is an ISO timestamp that changes on every regeneration, so
 * masking it lets the freshness check verify that provenance is present
 * without requiring identical timestamps.
 */
function normalizeForComparison(content) {
  return content.replace(/computedAt:\s*[^\s]+/, "computedAt: <masked>")
}

async function main() {
  console.log("Verifying documentation freshness...")

  const tmpDirA = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-freshness-a-"))
  const tmpDirB = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-freshness-b-"))

  try {
    await runProjection(tmpDirA)
    await runProjection(tmpDirB)

    const runA = await readDirFiles(tmpDirA)
    const runB = await readDirFiles(tmpDirB)

    const namesA = Object.keys(runA).sort()
    const namesB = Object.keys(runB).sort()

    const missing = REQUIRED_PROJECTIONS.filter((name) => !(name in runA) || !(name in runB))
    if (missing.length > 0) {
      console.log("❌ Required projections could not be regenerated:")
      for (const name of missing) console.log(`    - ${name}`)
      process.exit(1)
    }

    let hasDiff = false
    const allNames = new Set([...namesA, ...namesB])

    for (const name of allNames) {
      if (!(name in runA)) {
        console.log(`❌ Non-deterministic: ${name} present in second run but missing in first`)
        hasDiff = true
        continue
      }
      if (!(name in runB)) {
        console.log(`❌ Non-deterministic: ${name} present in first run but missing in second`)
        hasDiff = true
        continue
      }
      if (normalizeForComparison(runA[name]) !== normalizeForComparison(runB[name])) {
        console.log(`❌ Non-deterministic: ${name} content differs between two runs from the same source`)
        hasDiff = true
        continue
      }
      const hashA = extractSourceStateHash(runA[name])
      const hashB = extractSourceStateHash(runB[name])
      if (hashA && hashB && hashA !== hashB) {
        console.log(`❌ Non-deterministic: ${name} sourceStateHash differs between two runs`)
        hasDiff = true
      }
    }

    if (hasDiff) {
      console.log("\n📝 Documentation generation is not deterministic. Investigate source ordering or non-idempotent content.")
      process.exit(1)
    }

    console.log(`✅ Documentation is fresh (${namesA.length} projection(s), deterministic across two runs).`)
    process.exit(0)
  } finally {
    await fs.rm(tmpDirA, { recursive: true, force: true })
    await fs.rm(tmpDirB, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
