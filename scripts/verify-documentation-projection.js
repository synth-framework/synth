#!/usr/bin/env node
// ============================================================
// Documentation Projection Graph Validation
// ============================================================
// Validates that the documentation projection system produced all
// required artifacts deterministically from constitutional sources.
//
// This script does NOT compare outputs against committed files.
// Under the Deterministic Projection Model, projection outputs are
// build artifacts and are excluded from version control.
//
// Usage: node scripts/verify-documentation-projection.js
// ============================================================

import { promises as fs } from "fs"
import path from "path"
import { spawnSync } from "child_process"
import os from "os"

const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), "docs")
const OUTPUT_DIR = path.join(process.cwd(), "docs", "generated")
const CLI_PATH = path.join(process.cwd(), "dist", "cli", "synth.js")

// Required projections produced by the documentation engine.
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
  const linkPrefix = path.relative(outputDir, KNOWLEDGE_BASE_DIR).replace(/\\/g, "/")
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

async function main() {
  console.log("Validating documentation projection graph...")

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "synth-docs-projection-"))
  const firstRunDir = path.join(tmpDir, "first")
  const secondRunDir = path.join(tmpDir, "second")

  try {
    // First projection run.
    await runProjection(firstRunDir)
    const firstOutputs = await readDirFiles(firstRunDir)
    const firstNames = Object.keys(firstOutputs).sort()

    // Verify all required projections exist.
    const missing = REQUIRED_PROJECTIONS.filter((name) => !(name in firstOutputs))
    if (missing.length > 0) {
      console.log("❌ Required projections are missing:")
      for (const name of missing) console.log(`    - ${name}`)
      process.exit(1)
    }

    // Verify no orphan outputs (files not declared as required projections).
    const orphans = firstNames.filter((name) => !REQUIRED_PROJECTIONS.includes(name))
    if (orphans.length > 0) {
      console.log("⚠️ Unexpected projection outputs (orphans):")
      for (const name of orphans) console.log(`    - ${name}`)
      // Orphans are warnings, not failures, to avoid blocking new projections.
    }

    // Second projection run to verify determinism.
    await runProjection(secondRunDir)
    const secondOutputs = await readDirFiles(secondRunDir)

    const firstKeys = Object.keys(firstOutputs).sort()
    const secondKeys = Object.keys(secondOutputs).sort()

    if (firstKeys.length !== secondKeys.length) {
      console.log("❌ Projection output is non-deterministic: file count differs between runs.")
      process.exit(1)
    }

    for (const name of firstKeys) {
      if (!(name in secondOutputs)) {
        console.log(`❌ Projection output is non-deterministic: ${name} missing in second run.`)
        process.exit(1)
      }
      if (firstOutputs[name] !== secondOutputs[name]) {
        console.log(`❌ Projection output is non-deterministic: ${name} differs between runs.`)
        process.exit(1)
      }
    }

    console.log(`✅ Documentation projection graph valid (${firstNames.length} projection(s), deterministic).`)
    process.exit(0)
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
